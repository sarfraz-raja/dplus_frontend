import { createContext, useCallback, useContext, useRef, useState } from 'react';

/**
 * Chart/widget animation settings (Style → Animation). Cascades widget → dashboard → theme →
 * default, like the other style fields. Five keys, all plain strings (shared across light/dark):
 *   animation     'on' | 'off'
 *   animEntrance  'draw' (ECharts' own: lines left→right, bars grow, pie sweeps)
 *                 'rise' (lines/areas grow up from the bottom too; others same as draw)
 *                 'zoom' | 'fade' (the whole card scales/fades in — CSS on the dashboard tile)
 *   animSpeed     'fast' | 'normal' | 'slow'
 *   animEasing    'smooth' | 'linear' | 'bounce' | 'elastic'
 *   animStagger   'none' | 'wave' (series/bars one after another; tiles one after another)
 * Defaults equal ECharts' own behavior, so an untouched chart animates exactly as before.
 *
 * Delivered through ChartAnimationContext rather than props, so the 12 ECharts components in
 * components/Widgets pick it up without threading five more props through every render path.
 * No provider (any chart outside Dashboard Builder) → options are left untouched.
 */
export const ANIMATION_KEYS = ['animation', 'animEntrance', 'animSpeed', 'animEasing', 'animStagger'];
export const ANIMATION_DEFAULTS = { animation: 'on', animEntrance: 'draw', animSpeed: 'normal', animEasing: 'smooth', animStagger: 'none' };

const SPEED_MS = { fast: 400, normal: 1000, slow: 2000 };
const ECHARTS_EASING = { smooth: 'cubicOut', linear: 'linear', bounce: 'bounceOut', elastic: 'elasticOut' };
// CSS has no bounce/elastic keyword — an overshoot curve is the closest single cubic-bezier.
const CSS_EASING = { smooth: 'cubic-bezier(0.215, 0.61, 0.355, 1)', linear: 'linear', bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)', elastic: 'cubic-bezier(0.34, 1.56, 0.64, 1)' };
const TILE_STAGGER_MS = 120;
const SERIES_STAGGER_MS = 200;
const ITEM_STAGGER_MS = 25;

export const ChartAnimationContext = createContext(null);
export const useChartAnimation = () => useContext(ChartAnimationContext);

const prefersReducedMotion = () => {
  try { return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
};

/**
 * Resolves the effective settings. `layers` is most-specific first (widget, then dashboard —
 * the dashboard style is already theme-merged); an empty value means "inherit".
 * `disabled` forces it off (export capture), `index` is the tile's position for a dashboard wave.
 */
export function resolveAnimation(layers, { disabled = false, index = 0 } = {}) {
  const pick = (key) => {
    for (const layer of layers) if (layer?.[key]) return layer[key];
    return ANIMATION_DEFAULTS[key];
  };
  const entrance = pick('animEntrance');
  const stagger = pick('animStagger');
  const easingKey = pick('animEasing');
  const duration = SPEED_MS[pick('animSpeed')] ?? SPEED_MS.normal;
  return {
    enabled: pick('animation') !== 'off' && !disabled && !prefersReducedMotion(),
    entrance,
    duration,
    easing: ECHARTS_EASING[easingKey] || ECHARTS_EASING.smooth,
    cssEasing: CSS_EASING[easingKey] || CSS_EASING.smooth,
    stagger,
    delay: stagger === 'wave' ? index * TILE_STAGGER_MS : 0,
  };
}

/** Stable string for memoizing a resolved value / re-keying a tile so a changed entrance replays. */
export const animationSignature = (anim) => (anim
  ? [anim.enabled, anim.entrance, anim.duration, anim.easing, anim.stagger, anim.delay].join('|')
  : 'none');

/** CSS entrance class + inline timing for the card-level effects (zoom/fade). */
export function cardEntrance(anim) {
  if (!anim?.enabled || (anim.entrance !== 'zoom' && anim.entrance !== 'fade')) return { className: '', style: undefined };
  return {
    className: anim.entrance === 'zoom' ? 'dbe-enter-zoom' : 'dbe-enter-fade',
    style: { animationDuration: `${anim.duration}ms`, animationDelay: `${anim.delay}ms`, animationTimingFunction: anim.cssEasing },
  };
}

const withSeries = (option, fn) => {
  if (!option?.series) return option;
  return { ...option, series: Array.isArray(option.series) ? option.series.map(fn) : fn(option.series, 0) };
};

/** Adds the resolved animation settings to an ECharts option. */
export function applyChartAnimation(option, anim) {
  if (!anim) return option;
  if (!anim.enabled) return { ...option, animation: false };
  // Zoom/fade animate the card itself — the chart inside just appears, so the two don't fight.
  const cardLevel = anim.entrance === 'zoom' || anim.entrance === 'fade';
  const out = {
    ...option,
    animation: true,
    animationDuration: cardLevel ? 0 : anim.duration,
    animationEasing: anim.easing,
  };
  if (cardLevel) return out;
  const wave = anim.stagger === 'wave';
  return withSeries(out, (s, i) => {
    const base = anim.delay + (wave ? i * SERIES_STAGGER_MS : 0);
    // Lines/areas reveal as one shape, so only a per-series delay applies; bars, slices and
    // points animate per item, so a wave also ripples across each series' own items.
    const perItem = wave && s.type !== 'line' && s.type !== 'gauge';
    return { ...s, animationDelay: perItem ? (idx) => base + Math.min(idx * ITEM_STAGGER_MS, anim.duration) : base };
  });
}

// ---- 'rise' for line/area -------------------------------------------------------------------
// ECharts only reveals lines left→right. To grow them up from the bottom, the chart first renders
// with every point flattened onto the y-axis' lower bound (axis range pinned so it can't jump),
// then the real values are set as an *update*, which ECharts animates point by point.

const yOf = (v) => (Array.isArray(v) ? v[1] : (v && typeof v === 'object' ? v.value : v));
const withY = (v, y) => {
  if (v == null) return v;
  if (Array.isArray(v)) return [v[0], y];
  if (typeof v === 'object') return { ...v, value: Array.isArray(v.value) ? [v.value[0], y] : y };
  return y;
};
const pinYAxis = (option, extent) => {
  const pin = (ax) => ({ ...ax, min: extent[0], max: extent[1] });
  return { ...option, yAxis: Array.isArray(option.yAxis) ? option.yAxis.map((ax, i) => (i === 0 ? pin(ax) : ax)) : pin(option.yAxis || {}) };
};
const hasLineSeries = (option) => (Array.isArray(option?.series) ? option.series : [option?.series]).some((s) => s?.type === 'line');

/**
 * For LineAreaChart/AreaChart: returns the option to pass to ReactECharts plus an onChartReady
 * that plays the rise on first mount. Anything other than an enabled 'rise' is just
 * applyChartAnimation (onChartReady undefined).
 */
export function useRiseEntrance(option, anim) {
  const rise = !!anim?.enabled && anim.entrance === 'rise' && hasLineSeries(option);
  const [played, setPlayed] = useState(false);
  const latestRef = useRef(option);
  latestRef.current = option;
  const animRef = useRef(anim);
  animRef.current = anim;

  const onChartReady = useCallback((chart) => {
    const a = animRef.current;
    const real = latestRef.current;
    const dom = chart.getDom?.();
    if (dom) dom.style.opacity = '0'; // hide the one frame drawn before the flattened state
    requestAnimationFrame(() => {
      try {
        const extent = chart.getModel().getComponent('yAxis', 0)?.axis?.scale?.getExtent();
        if (!extent) throw new Error('no y axis');
        const pinned = pinYAxis(real, extent);
        const flat = withSeries(pinned, (s) => (s.type === 'line' && Array.isArray(s.data)
          ? { ...s, data: s.data.map((v) => (yOf(v) == null ? v : withY(v, extent[0]))) }
          : s));
        chart.setOption({ ...flat, animation: false }, { notMerge: true });
        if (dom) dom.style.opacity = '';
        const wave = a.stagger === 'wave';
        chart.setOption(withSeries({
          ...pinned,
          animation: true,
          animationDurationUpdate: a.duration,
          animationEasingUpdate: a.easing,
        }, (s, i) => ({ ...s, animationDelayUpdate: a.delay + (wave ? i * SERIES_STAGGER_MS : 0) })), { notMerge: false });
      } catch {
        if (dom) dom.style.opacity = '';
      }
      // Hand control back to the normal option once the rise has finished (same values, so
      // nothing visibly changes; the axis un-pins to the identical auto range).
      setTimeout(() => setPlayed(true), a.delay + a.duration + (a.stagger === 'wave' ? 1000 : 0) + 50);
    });
  }, []);

  if (!rise || played) return { option: applyChartAnimation(option, anim), onChartReady: undefined };
  // Until it has played, ReactECharts gets the plain option with animation off. If the chart
  // re-renders mid-rise (e.g. new data), that option simply replaces the rise — it snaps to the
  // final chart rather than ending up half-drawn.
  return { option: { ...option, animation: false }, onChartReady };
}
