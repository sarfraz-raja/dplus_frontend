import React, { useEffect, useRef, useState } from 'react';
import { Copy, Check, SlidersHorizontal, ChevronDown } from 'lucide-react';
import StyleModeTint from './StyleModeTint';
import StyleModeSwitch from './StyleModeSwitch';
import ConfirmModal from '../../ConfirmModal';
import toast from 'react-hot-toast';
import { copyToClipboard } from '../../../utils/common';
import Button from '../../Button';
import PaletteEditor from '../themes/PaletteEditor';
import FieldHintMark from '../FieldHintMark';
import EditedBadge, { sameStyleValue } from './EditedBadge';
import { contrastRatio } from '../utils/contrast';
import { LOW_CONTRAST_THRESHOLD, CARD_BORDER_KEYS, guardStyleColors } from '../utils/themedStyle';
import Select from '../../Select'; // shared dropdown — replaces native <select> (CLAUDE.md §4)

// Auto-groups a field into one of four collapsible sections purely from its own
// key/type shape — no per-field `group` metadata needed on every styleFields entry across
// widgetTypeRegistry.js (which would've meant touching every existing field descriptor).
// Cross-filter toggles get their own section (checked first, before the generic Layout &
// Behavior catch-all, since they'd otherwise match no other rule and fall through to it
// anyway); colors always go together; *Weight/*Size/*Position text fields go together;
// everything else (row-count limits, donut/legend/value-label toggles) is "layout & behavior."
// Every field that only means something once a chart actually has a title — grouped and
// gated together (see `titleVisible` below) instead of scattered across Colors & Branding/
// Text Styling by generic type, which left "Show title" sitting alone in Layout & Behavior
// while its own color/font/size/position controls lived three sections away and stayed
// visible (and editable) even with the title switched off.
const TITLE_FIELD_KEYS = new Set(['showTitle', 'titleColor', 'titleWeight', 'titleSize', 'titleFont', 'titlePosition', 'titleBgColor', 'titleIcon']);
// Same "keep relevant things together" reasoning as Title above, for the widget's own
// displayed-value formatting — Decimal places previously sat alone in the Layout & Behavior
// catch-all (it's a 'number' field, not a *Weight/*Size/*Position/color match) while Value
// text size/position lived in Text Styling and Value text color in Colors & Branding, three
// sections apart from the same concern. `unit`/`numberFormat`/`showPercent` are the other
// "how is the value formatted" fields a few chart_types add (KPI_CARD/GAUGE/StatCard) —
// grouped here too rather than falling into Layout & Behavior's leftover bucket.
const VALUE_FIELD_KEYS = new Set(['valueTextColor', 'valueTextSize', 'valueDecimals', 'valuePosition', 'unit', 'numberFormat', 'showPercent']);
// The card's own base fill, shared by every widget type — split out from the generic
// "Colors & Branding" bucket so it doesn't sit mixed in with Table's own band/header colors
// below, which are a different, more specific concern (see TABLE_COLOR_FIELD_KEYS).
const BACKGROUND_FIELD_KEYS = new Set(['bgColor', 'bgGradientFrom', 'bgGradientTo']);
// The dashboard's own canvas background (dashboard / theme style only) — its own section next to
// Dashboard Title. OLD: dashboardBgColor fell through to the "Other Colors" catch-all, easy to miss.
const DASHBOARD_BG_KEYS = new Set(['dashboardBgColor', 'dashboardBgGradientFrom', 'dashboardBgGradientTo']);
// Table-only row/header coloring (Band color, Header background/text color) — grouped apart
// from the card's own Background above for the same reason Title/Value got split out: these
// three are one specific concern (how the grid itself reads, not the card's base fill), not
// "any color field," and every other chart_type never declares these keys at all, so this
// group simply never appears outside Table's own panel.
const TABLE_COLOR_FIELD_KEYS = new Set(['bandColor', 'bandTextColor', 'headerBgColor', 'headerTextColor']);
// Table frame + grid lines + their one color — every table line in one section.
const TABLE_GRID_KEYS = new Set(['tableFrame', 'gridLines', 'gridColor']);
// The remaining color fields used to all fall into one "Colors & Branding" catch-all just
// because they're color-typed — misleading once Title/Value/Background/Rows & Header (above)
// already have their own color fields too, and this bucket's actual contents vary wildly by
// widget type (Accent color on a line chart, Point color on a scatter, Series colors on a
// pie, Fill/Border/Text on a Shape — nothing these share in common except "not one of the
// groups above"). Split by what they actually draw, same reasoning as every split above:
// - Shape's own fill/border/text — unambiguous keys, only Shape ever declares them.
const SHAPE_COLOR_KEYS = new Set(['fillColor', 'borderColor', 'textColor']);
// - The chart's own drawn accent — one flat color (Accent/Point/Heat color, Waterfall's
// increase/decrease, a KPI card's shade-from/to, a heat strip's gradient) or a cycled Series
// colors palette — different chart_types use one or the other, never both, but they're the
// same underlying concern ("what color is the actual mark/series on this chart").
const ACCENT_SERIES_COLOR_KEYS = new Set(['shadeFrom', 'shadeTo', 'upColor', 'downColor', 'colorFrom', 'colorTo']);
// - `key: 'color'` alone is genuinely ambiguous — it's Accent color on most chart_types but
// Text Box's own Text color (see widgetTypeRegistry.js's own `color`/`textColor` field
// descriptors) — Shape and Text Box never appear in the same fields array as a chart_type, so
// there's no real collision at runtime, but distinguishing them here needs the field's own
// label, not just its key.
// Text Box/Shape's own typed-text styling — `fontFamily`/`textAlign` don't end in
// Weight/Size/Position, so the regex match below alone left them stranded in the generic
// Layout & Behavior catch-all while their own Font size/Weight (which DO match the regex)
// landed three sections away in Text Styling, and their color a section further still in
// Colors & Branding — the exact "one concern scattered across distant sections" problem
// Title/Value were already pulled out to fix, just for a font/align pair the regex doesn't
// happen to catch. Named generically (not e.g. TEXTBOX_TEXT_STYLE_KEYS) since any future
// field named exactly `fontFamily`/`textAlign` on another widget type means the same thing.
const TEXT_STYLE_KEYS = new Set(['fontFamily', 'textAlign']);
// Axis text has 4 fields (Color/Weight/Size/Font, see textStyleFields()'s own axisText* call in
// widgetTypeRegistry.js) — only axisTextColor was caught by the dedicated `field.key ===
// 'axisTextColor'` check below; axisTextWeight/axisTextSize matched the *Weight$/*Size$ regex
// into Text Styling, and axisTextFont matched nothing at all and fell into the generic Layout &
// Behavior catch-all — the exact "one concern scattered across distant sections" problem
// Title/Value were already pulled out to fix (see their own comments above), just missed for
// Axis when it was split out. All four now stay together.

// Big Number's comparison line (BIG_NUMBER_STYLE_FIELDS) — the change and its compared period.
const COMPARISON_FIELD_KEYS = new Set(['showDelta', 'showDeltaNote', 'deltaTextSize', 'deltaPosition']);
// The widget card's own border (CARD_BORDER_FIELDS) — `card*` keys, so no overlap with Shape's
// own borderColor (Fill & Border below).
const BORDER_FIELD_KEYS = new Set(CARD_BORDER_KEYS);
// Groups whose section header carries an on/off switch gating every other field in the group:
// group name -> the show/hide field key.
// Dashboard's own title (dashboard / theme style only) — one section instead of being spread over
// Other Colors / Text Styling / Layout & Behavior; its Show/Hide sits in the section header.
const DASHBOARD_TITLE_KEYS = new Set(['showDashboardTitle', 'dashboardTitleColor', 'dashboardTitleWeight', 'dashboardTitleSize', 'dashboardTitleFont', 'dashboardTitleAlign']);
const GROUP_TOGGLE_KEYS = { Title: 'showTitle', Border: 'showCardBorder', 'Dashboard Title': 'showDashboardTitle' };

function groupFor(field) {
  if (DASHBOARD_TITLE_KEYS.has(field.key)) return 'Dashboard Title';
  if (DASHBOARD_BG_KEYS.has(field.key)) return 'Dashboard Background';
  if (TITLE_FIELD_KEYS.has(field.key)) return 'Title';
  if (VALUE_FIELD_KEYS.has(field.key)) return 'Value';
  if (COMPARISON_FIELD_KEYS.has(field.key)) return 'Comparison';
  if (BACKGROUND_FIELD_KEYS.has(field.key)) return 'Background';
  if (BORDER_FIELD_KEYS.has(field.key)) return 'Border';
  if (TABLE_COLOR_FIELD_KEYS.has(field.key)) return 'Rows & Header';
  if (TABLE_GRID_KEYS.has(field.key)) return 'Grid';
  if (field.key === 'crossFilterSource' || field.key === 'crossFilterTarget') return 'Cross-Filtering';
  // Table pagination — its key ends in "Size", so the Text Styling rule below would catch it.
  if (field.key === 'pageSize') return 'Layout & Behavior';
  if (field.key === 'animation' || field.key.startsWith('anim')) return 'Animation';
  if (SHAPE_COLOR_KEYS.has(field.key)) return 'Fill & Border';
  if (['axisTextColor', 'axisTextWeight', 'axisTextSize', 'axisTextFont', 'showAxisTitles', 'showGridLines', 'yAxisTicks'].includes(field.key)) return 'Axis';
  if (field.type === 'palette' || ACCENT_SERIES_COLOR_KEYS.has(field.key) || field.key === 'seriesOpacity' || field.key === 'areaOpacity' || field.key === 'fillStyle') return 'Data colors';
  if (field.key === 'color') return field.label === 'Text color' ? 'Text' : 'Data colors';
  if (field.type === 'color') return 'Other Colors'; // safety net — shouldn't normally hit
  if (TEXT_STYLE_KEYS.has(field.key) || /Weight$|Size$|Position$/.test(field.key)) return 'Text Styling';
  return 'Layout & Behavior';
}
// Title leads when present — it's the widget's own on/off + look decision, and every other
// field in that group only applies once it's on (see `titleVisible` below). Value next — the
// widget's actual displayed number/text and how it's formatted, still core content rather
// than decoration. Background/Rows & Header follow — still colors, but each its own specific
// concern rather than one catch-all "any color field" bucket. Cross-Filtering comes next —
// the "what does this widget do" decision, worth seeing before the purely cosmetic groups.
// OLD: const GROUP_ORDER = ['Dashboard Title', 'Title', … (no Dashboard Background)
const GROUP_ORDER = ['Dashboard Title', 'Dashboard Background', 'Title', 'Value', 'Comparison', 'Background', 'Border', 'Rows & Header', 'Grid', 'Cross-Filtering', 'Layout & Behavior', 'Data colors', 'Axis', 'Fill & Border', 'Text', 'Text Styling', 'Animation', 'Other Colors'];

// Fields saved per Light/Dark mode (colors.{light,dark} — themedStyle.js). Same rule every caller
// uses for its own color-key set: every `color` field plus the palette.
const isModeField = (field) => field.type === 'color' || field.type === 'palette' || field.key === 'palette';

const isShowHide = (field) => field.type === 'select' && field.options?.length === 2
  && field.options.every((o) => ['show', 'hide'].includes(String(o.value).toLowerCase()));

// Custom widget colors are stored as one literal hex value, rendered identically regardless of
// which theme the viewer is in — so a color picked (or inherited from a Theme) while looking
// at one theme can become illegible the moment someone views the same dashboard in the other
// (see the conversation this was reported in: a near-white Title color, invisible in light
// mode, had been set while presumably looking at dark mode). This can't be fixed by making
// colors "theme-aware" without every color field storing two values — out of scope for this
// pass — so instead: warn inline, right where the mistake is easiest to catch and fix, the same
// way Y-axis truncation's own invalid-range warning already works in MappingFields.jsx.
// Below this, text reads as flatly illegible against its background (not just "a bit low
// contrast" — WCAG AA's own 4.5:1 floor would flag plenty of technically-readable combos too
// and get naggy for a cosmetic picker; this only fires for genuine near-invisible mistakes).

// Copies the hex a color row shows — its own value, or the real default it inherits (a
// placeholder can't be selected/copied, so this is the way to reuse a default elsewhere).
function CopyColorButton({ color }) {
  const [copied, setCopied] = useState(false);
  if (!color) return null;
  const copy = (e) => {
    e.preventDefault();
    e.stopPropagation();
    copyToClipboard(color).then((ok) => {
      if (!ok) return;
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  };
  return (
    <button type="button" className="dbe-style-color-copy" title={copied ? 'Copied' : `Copy ${color}`} aria-label={`Copy color ${color}`} onClick={copy}>
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

// `applied`: set only when the saved color is NOT what the chart draws — guardStyleColors drops an
// unreadable text/line color (or computes band/header text) at render. The swatch then shows the
// color actually drawn, and the saved value is shown struck through with an explanation.
// `rejected`: { value, hint } when the last pick was refused for being unreadable (not saved).
function ColorRow({ field, current, resolvedDefaults, value, onChange, applied, rejected = null }) {
  const notApplied = applied !== undefined;
  // OLD: const swatchValue = current || resolvedDefaults[field.key] || '#000000';
  const swatchValue = (notApplied ? applied : current) || resolvedDefaults[field.key] || '#000000';
  const isSet = !!current;
  // `field.contrastBg` — 'auto' compares against this widget's own resolved background
  // (resolvedDefaults.bgColor, already theme-correct — see ChartLibrary.jsx's own
  // resolvedBgColor); a field key (e.g. 'bandColor') compares against that sibling field's
  // current-or-default value instead (Band text color against Band color, Header text color
  // against Header background color) — whichever this text color actually renders on top of.
  // Can also be an array of candidates checked in order (e.g. Title color: its own
  // Title background if one is set, else the widget's own background) — a single fixed key
  // can't express "prefer titleBgColor, but fall back to the widget bg when it's unset,"
  // which previously made this warning check the wrong surface whenever a Title background
  // WAS picked (see themedStyle.js's Light/Dark mode work — this surfaced there).
  // 'auto' used to just read resolvedDefaults.bgColor — wrong whenever a gradient is actually
  // the background (bgGradientFrom, not bgColor): the warning compared text against the plain
  // white/navy default instead of the gradient's own first stop (where text is positioned,
  // top-left), flagging e.g. white text as unreadable against a dark gradient it reads fine on.
  // Mirrors the bg-resolution order every widget component itself uses (bgColor, then
  // bgGradientFrom, then the theme default).
  const resolveBg = (key) => (key === 'auto'
    ? value?.bgColor || value?.bgGradientFrom || resolvedDefaults.bgColor || resolvedDefaults.bgGradientFrom
    : value?.[key] || resolvedDefaults[key]);
  const bgForContrast = Array.isArray(field.contrastBg)
    ? field.contrastBg.map(resolveBg).find((v) => v)
    : field.contrastBg
      ? resolveBg(field.contrastBg)
      : null;
  const ratio = bgForContrast ? contrastRatio(swatchValue, bgForContrast) : null;
  const lowContrast = !notApplied && !rejected && ratio != null && ratio < LOW_CONTRAST_THRESHOLD;
  return (
    <div className="dbe-style-row">
      <span className="dbe-style-row-label"><span className="dbe-style-row-label-text">{field.label}</span><FieldHintMark hint={field.hint} /></span>
      <label className={`dbe-style-color-pill${isSet ? ' set' : ''}${lowContrast ? ' low-contrast' : ''}`}>
        <span className="dbe-style-color-swatch" style={{ background: swatchValue }}>
          <input type="color" value={swatchValue} onChange={(e) => onChange(field.key, e.target.value)} />
        </span>
        <input
          type="text"
          className={notApplied ? 'line-through' : undefined}
          value={current || ''}
          placeholder={resolvedDefaults[field.key] || 'auto'}
          onChange={(e) => onChange(field.key, e.target.value)}
        />
        <CopyColorButton color={current || resolvedDefaults[field.key]} />
      </label>
      {lowContrast && (
        <span className="dbe-style-contrast-warning">⚠ Barely visible against its background — pick a color with more contrast.</span>
      )}
      {rejected && (
        <span className="dbe-style-contrast-warning">⚠ {rejected.value} is too close to the background to read. Saved anyway — consider a {rejected.hint} color.</span>
      )}
      {notApplied && !rejected && (
        // Band/header text only — auto-picked because none was set (themedStyle.js's
        // guardStyleColors), not a contrast override of an explicit pick.
        <span className="dbe-style-contrast-warning">
          ⚠ No text color set — using {applied || 'a readable default'} for contrast. Pick your own if you'd rather.
        </span>
      )}
    </div>
  );
}

function SliderRow({ field, current, resolvedDefaults = {}, onChange }) {
  // Sensible defaults for fields with no declared min/max (e.g. valueTextSize/axisTextSize,
  // whose real per-widget fallback varies too much to hardcode a single schema default).
  const isSizeField = /Size$/.test(field.key);
  const min = field.min ?? (isSizeField ? 8 : 1);
  const max = field.max ?? (isSizeField ? 48 : 50);
  // Never show the literal word "auto" — always a real number, so the slider's own handle
  // position and its pill always agree, and dragging from here always starts from (and
  // applies) a real value instead of a placeholder. Prefers the field's actual currently-
  // resolved value (resolvedDefaults, when the caller supplied one) over the schema default
  // or an arbitrary midpoint.
  const fallback = resolvedDefaults[field.key] ?? field.default ?? Math.round((min + max) / 2);
  const numeric = current === '' || current == null ? fallback : Number(current);
  return (
    <div className="dbe-style-row">
      <span className="dbe-style-row-label">{field.label}</span>
      <div className="dbe-style-slider-line">
        <input
          type="range"
          min={min}
          max={max}
          value={numeric}
          onChange={(e) => onChange(field.key, Number(e.target.value))}
        />
        <span className="dbe-style-value-pill">{numeric}</span>
      </div>
    </div>
  );
}

// `onInherit`: shown when this level sets the switch — clears it so the value comes from the level
// above again (dashboard / theme / default). Same "Use inherited" wording as the section toggles.
function SwitchRow({ field, current, onChange, onInherit = null }) {
  const onValue = field.options.find((o) => String(o.value).toLowerCase() === 'show')?.value ?? field.options[0].value;
  const offValue = field.options.find((o) => String(o.value).toLowerCase() === 'hide')?.value ?? field.options[1].value;
  const checked = (current || field.default) === onValue;
  return (
    <div className="dbe-style-row dbe-style-row-inline">
      <span className="dbe-style-row-label">{field.label}</span>
      <span className="flex items-center gap-1.5 shrink-0">
        {onInherit && (
          <button type="button" className="dbe-style-inherit-btn" title="Clear override — inherit from theme/dashboard" onClick={onInherit}>
            Use inherited
          </button>
        )}
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(field.key, checked ? offValue : onValue)}
          className={`dbe-style-switch${checked ? ' on' : ''}`}
        >
          <span className="dbe-style-switch-knob" />
        </button>
      </span>
    </div>
  );
}

function SegmentedRow({ field, current, onChange }) {
  const active = current || field.default;
  return (
    <div className="dbe-style-row">
      <span className="dbe-style-row-label">{field.label}</span>
      <div className="dbe-style-segmented">
        {field.options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(field.key, opt.value)}
            className={active === opt.value ? 'active' : ''}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// Separate standalone icon buttons, no shared pill-track background — unlike SegmentedRow's
// 2-option track (Reg/Med/Bold etc.), a row of icon glyphs reads better as individually
// bordered buttons sitting on the panel's own background, the same way PositionPickerRow's own
// 3x3 grid buttons don't share one enclosing track either. For a select whose options are
// better recognized as icons than read as words — currently just Shape's Rectangle/Ellipse/
// Line, but general for any `field.options[].icon` (a lucide-react component reference, set
// directly on the field descriptor in widgetTypeRegistry.js — no separate icon-name lookup
// table to keep in sync). Falls back to the option's label as a title tooltip, not visible
// text, so this only fits options a small glyph can actually represent unambiguously.
function IconSelectRow({ field, current, onChange }) {
  const active = current || field.default;
  return (
    <div className="dbe-style-row">
      <span className="dbe-style-row-label">{field.label}</span>
      <div className="dbe-style-icon-select">
        {field.options.map((opt) => {
          const Icon = opt.icon;
          return (
            <button
              key={opt.value}
              type="button"
              title={opt.label}
              aria-label={opt.label}
              onClick={() => onChange(field.key, opt.value)}
              className={active === opt.value ? 'active' : ''}
            >
              {Icon ? <Icon size={15} /> : opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SelectRow({ field, current, onChange }) {
  return (
    <label className="dbe-style-row">
      <span className="dbe-style-row-label"><span className="dbe-style-row-label-text">{field.label}</span><FieldHintMark hint={field.hint} /></span>
      <Select value={current} onChange={(e) => onChange(field.key, e.target.value)}>
        {(field.options || []).map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </Select>
    </label>
  );
}

// Table "Rows per page": the preset list plus "Custom…", which shows a number box for any
// other count. Saved as 'off' or the row count as a string — a value that isn't one of the
// presets is a custom one, so no extra key is needed.
const PAGE_SIZE_MIN = 1;
const PAGE_SIZE_MAX = 1000;
const PAGER_DEFAULT_COLOR = '#EC7D09';
function PageSizeRow({ field, current, value: styleValue = {}, resolvedDefaults = {}, onChange }) {
  const pagerColor = styleValue.pagerColor || resolvedDefaults.pagerColor || '';
  // Typed code, kept locally so a half-typed value (#EC7) isn't saved; follows outside changes.
  const [hexDraft, setHexDraft] = useState(styleValue.pagerColor || '');
  useEffect(() => {
    setHexDraft((d) => (d.toLowerCase() === (styleValue.pagerColor || '').toLowerCase() ? d : styleValue.pagerColor || ''));
  }, [styleValue.pagerColor]);
  const value = current == null || current === '' ? field.default : String(current);
  const isPreset = (field.options || []).some((opt) => opt.value === value);
  const [customMode, setCustomMode] = useState(!isPreset);
  const [draft, setDraft] = useState(isPreset ? '' : value);
  useEffect(() => {
    if (!isPreset) { setCustomMode(true); setDraft(value); }
  }, [value, isPreset]);
  const commit = (raw) => {
    const n = Math.round(Number(raw));
    if (!raw || Number.isNaN(n)) return;
    const clamped = Math.min(PAGE_SIZE_MAX, Math.max(PAGE_SIZE_MIN, n));
    setDraft(String(clamped));
    onChange(field.key, String(clamped));
  };
  return (
    <div className="dbe-style-row">
      <span className="dbe-style-row-label"><span className="dbe-style-row-label-text">{field.label}</span><FieldHintMark hint={field.hint} /></span>
      <div className="flex items-center gap-1.5">
      <Select
        className="flex-1 min-w-0"
        value={customMode ? 'custom' : value}
        onChange={(e) => {
          if (e.target.value === 'custom') {
            setCustomMode(true);
            setDraft(isPreset && value !== 'off' ? value : '');
          } else {
            setCustomMode(false);
            onChange(field.key, e.target.value);
          }
        }}
      >
        {(field.options || []).map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        <option value="custom">Custom</option>
      </Select>
      {customMode && (
        <input
          type="number"
          min={PAGE_SIZE_MIN}
          max={PAGE_SIZE_MAX}
          step={1}
          autoFocus={!draft}
          placeholder="Rows"
          title={`Rows per page (${PAGE_SIZE_MIN}–${PAGE_SIZE_MAX})`}
          aria-label="Custom rows per page"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(e.currentTarget.value); }}
          className="dbe-style-text-input !w-16 shrink-0"
        />
      )}
      {/* Pager color — the highlighted current-page button. Same swatch + hex box as ColorRow:
          pick with the swatch or type a code (#rgb / #rrggbb, saved once it's a valid hex);
          the small × puts it back to the default. */}
      <span className="relative shrink-0 w-[108px]">
        <label className={`dbe-style-color-pill${styleValue.pagerColor ? ' set' : ''}`} title="Pager color">
          <span className="dbe-style-color-swatch" style={{ background: pagerColor || PAGER_DEFAULT_COLOR }}>
            <input
              type="color"
              aria-label="Pager color"
              value={/^#[0-9a-f]{6}$/i.test(pagerColor) ? pagerColor : PAGER_DEFAULT_COLOR}
              onChange={(e) => { setHexDraft(e.target.value); onChange('pagerColor', e.target.value); }}
            />
          </span>
          <input
            type="text"
            aria-label="Pager color code"
            value={hexDraft}
            placeholder={PAGER_DEFAULT_COLOR}
            maxLength={7}
            onChange={(e) => {
              let v = e.target.value.trim();
              if (v && !v.startsWith('#')) v = `#${v}`;
              setHexDraft(v);
              // Full #rrggbb saves while typing; a short #rgb only on blur (it may be the start of one).
              if (/^#[0-9a-f]{6}$/i.test(v)) onChange('pagerColor', v.toLowerCase());
            }}
            onBlur={() => {
              const v = hexDraft;
              if (/^#[0-9a-f]{3}$/i.test(v)) {
                const full = `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`.toLowerCase();
                setHexDraft(full);
                onChange('pagerColor', full);
              } else if (!/^#[0-9a-f]{6}$/i.test(v)) {
                setHexDraft(styleValue.pagerColor || '');
              }
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          />
        </label>
        {styleValue.pagerColor && (
          <button
            type="button"
            onClick={() => { setHexDraft(''); onChange('pagerColor', undefined); }}
            title="Reset pager color"
            aria-label="Reset pager color"
            className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 rounded-full bg-slate-500 text-white text-[9px] leading-none inline-flex items-center justify-center hover:bg-slate-700"
          >
            ×
          </button>
        )}
      </span>
      </div>
    </div>
  );
}

// A 3x3 grid of small clickable squares instead of a 9-option dropdown — position is a
// spatial concept, easier to pick visually than to read off a list of "top-center"/"mid-
// right" text labels. `field.options` is already laid out in the same row-major order
// (top-left..top-right, mid-left..mid-right, bottom-left..bottom-right — see
// POSITION_OPTIONS in Widgets/titlePositions.js), so it maps directly onto the grid.
function PositionPickerRow({ field, current, onChange }) {
  return (
    <div className="dbe-style-row">
      <span className="dbe-style-row-label">{field.label}</span>
      <div className="dbe-style-position-grid">
        {(field.options || []).map((opt) => (
          <button
            key={opt.value}
            type="button"
            title={opt.label}
            aria-label={opt.label}
            onClick={() => onChange(field.key, opt.value)}
            className={current === opt.value ? 'active' : ''}
          >
            <span />
          </button>
        ))}
      </div>
    </div>
  );
}

function TextRow({ field, current, onChange }) {
  return (
    <label className="dbe-style-row">
      <span className="dbe-style-row-label">{field.label}</span>
      <input
        type="text"
        value={current}
        placeholder={field.placeholder || ''}
        onChange={(e) => onChange(field.key, e.target.value)}
        className="dbe-style-text-input"
      />
    </label>
  );
}

// Multi-line variant of TextRow — currently only Text Box's own `text` field uses this (the
// widget's actual displayed content, which needs real line breaks, unlike every other 'text'
// field here — axis titles, units — which are short single-line labels).
function TextAreaRow({ field, current, onChange }) {
  return (
    <label className="dbe-style-row">
      <span className="dbe-style-row-label">{field.label}</span>
      <textarea
        value={current}
        placeholder={field.placeholder || ''}
        onChange={(e) => onChange(field.key, e.target.value)}
        rows={4}
        className="dbe-style-text-input dbe-style-textarea"
      />
    </label>
  );
}

function PaletteRow({ field, current, onChange }) {
  return (
    <div className="dbe-style-row" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 6 }}>
      <span className="dbe-style-row-label">{field.label}</span>
      <PaletteEditor value={current} onChange={(next) => onChange(field.key, next)} />
    </div>
  );
}

function FieldRow({ field, value, resolvedDefaults, onChange, markOverrides = false, applied, rejected = null }) {
  const raw = value?.[field.key];
  // A field only counts as an explicit override once it holds a real value — an empty
  // string (cleared text input) or undefined (cleared via the × below) both mean "inherit
  // from the dashboard theme/local default," same as never having touched it. A palette's
  // "empty" is `[]`/undefined, never `''` (it's an array field, not text) — checked
  // separately so an untouched palette doesn't read as "overridden with nothing".
  const isOverridden = field.type === 'palette'
    ? Array.isArray(raw) && raw.length > 0
    : raw !== undefined && raw !== null && raw !== '';
  // Selects/position pickers show the inherited value (resolvedDefaults — the chart's own or the
  // dashboard's) while unset, like sliders and color swatches already do; otherwise an
  // inherited "Bold" title read as the field's own "Normal" default.
  const inheritable = field.type === 'select' || field.type === 'position';
  const current = field.type === 'palette'
    ? (raw ?? field.default ?? [])
    : (raw ?? (inheritable ? resolvedDefaults?.[field.key] : undefined) ?? field.default ?? '');

  let row = null;
  if (field.type === 'color') row = <ColorRow field={field} current={current} resolvedDefaults={resolvedDefaults} value={value} onChange={onChange} applied={applied} rejected={rejected} />;
  else if (field.type === 'palette') row = <PaletteRow field={field} current={current} onChange={onChange} />;
  else if (field.type === 'number') row = <SliderRow field={field} current={current} resolvedDefaults={resolvedDefaults} onChange={onChange} />;
  else if (field.type === 'text') row = <TextRow field={field} current={current} onChange={onChange} />;
  else if (field.type === 'textarea') row = <TextAreaRow field={field} current={current} onChange={onChange} />;
  else if (field.type === 'position') row = <PositionPickerRow field={field} current={current} onChange={onChange} />;
  else if (field.type === 'pageSize') row = <PageSizeRow field={field} current={current} value={value} resolvedDefaults={resolvedDefaults} onChange={onChange} />;
  else if (field.type === 'iconSelect') row = <IconSelectRow field={field} current={current} onChange={onChange} />;
  else if (field.type === 'select') {
    if (isShowHide(field)) row = <SwitchRow field={field} current={current} onChange={onChange} onInherit={isOverridden ? () => onChange(field.key, undefined) : null} />;
    else if (field.options?.length === 2 && !field.asDropdown) row = <SegmentedRow field={field} current={current} onChange={onChange} />;
    else row = <SelectRow field={field} current={current} onChange={onChange} />;
  }
  if (!row) return null;

  // Switch/segmented 2-option fields already show both states on the control itself (the
  // active button/knob position) — the × here only ever adds a third "inherit theme/default"
  // state, which is meaningless for these since their fallback (field.default) is a hardcoded
  // constant, never theme-dependent, unlike color/size/text fields where a dashboard-level
  // theme genuinely can supply a different value than the field's own default.
  const isSegmented = field.type === 'select' && field.options?.length === 2 && !field.asDropdown;
  // OLD: isOverridden && !isShowHide(field) && !isSegmented — set switches/segmented pairs had no way
  // back to the inherited value. Switches now carry their own "Use inherited"; segmented pairs get the ×.
  const showClear = isOverridden && !isShowHide(field);

  return (
    // `field.fullWidth` spans every column of a multi-column section (e.g. Rows per page, whose
    // dropdown + number box need the room).
    <div className={`dbe-style-field-wrap${field.fullWidth ? ' col-span-full' : ''}${isOverridden ? '' : ' inherited'}${markOverrides && isOverridden ? ' override-marked' : ''}`}>
      {row}
      {showClear && (
        <button
          type="button"
          className="dbe-style-field-clear"
          title="Clear override — inherit from theme/default"
          aria-label={`Clear ${field.label} override`}
          onClick={() => onChange(field.key, undefined)}
        >
          ×
        </button>
      )}
    </div>
  );
}

/**
 * Renders the style controls for a selected widget, driven entirely by its type's
 * `styleFields` metadata (see widgetTypeRegistry.js) — one generic renderer instead of
 * hand-written fields per widget type. `value` is the widget's raw `style` object (may be
 * missing keys — falls back to each field's own `default` for display only).
 *
 * Fields are auto-grouped into collapsible sections by concern (Title/Value/Background/Rows &
 * Header/Cross-Filtering/Layout & Behavior/Data colors/Axis/Fill & Border/Text/Text
 * Styling — see groupFor above, and GROUP_ORDER for the fixed display order) and rendered with
 * richer controls per
 * type — color swatch+hex, a slider for numbers, a switch for show/hide toggles, a
 * segmented button pair for other 2-option selects, a plain dropdown otherwise.
 *
 * `resolvedDefaults`: optional `{ [fieldKey]: realCurrentColor }` map for `type:'color'`
 * fields whose schema `default` is `null` (titleColor/bgColor/etc. — theme-dependent, so the
 * registry can't hardcode one) — without this an unset field would show a black placeholder
 * instead of the color it's actually currently rendering with.
 *
 * `deferred`: when true, edits are staged locally and only committed via the "Apply changes"
 * button (calls `onApply(fullStyleObject)`); "Reset" reverts to the last-applied `value`.
 * When false (default, unchanged from before this redesign), every edit calls `onChange`
 * immediately — existing callers that don't pass `deferred` see no behavior change.
 *
 * `columns`: opt-in multi-column layout for each group's field rows — default 1 (the
 * original single-column stack, correct for the narrow Dashboard Style popover/per-widget
 * panel this was originally built for). Wide contexts with a lot of horizontal room to spare
 * (ThemeManager.jsx's Settings tab, which has 10+ fields) can pass a higher value instead of
 * leaving most of the panel empty.
 *
 * `groupFooters`: optional `{ [groupName]: ReactNode }` rendered at the bottom of that group's
 * body while its fields are visible — e.g. the Dashboard Style popover's "Apply to all widgets"
 * button under Border.
 *
 * `markOverrides`: draws a bar beside every field this level sets itself, so it's clear which
 * values are overrides and which are inherited (the Dashboard Style popover, over its Theme).
 *
 * `collapsedByDefault`: every group starts closed (just its header row), so a long field list
 * opens as a compact list of sections — used by the narrow Dashboard Style popover and the
 * Selected Widget Style panel. No longer read: every panel now starts with all sections closed
 * except those holding a value set at this level (isGroupSet); kept so existing callers still pass it.
 *
 * `savedValue`: the last-saved style, shaped exactly like `value` (same resolveStyleForMode). Every
 * section (and the Shared / colors box) whose fields differ from it gets an "Edited" badge and is
 * held open until the change is saved or undone — so reopening the panel shows where the unsaved
 * edits are. Omitted = no tracking (unchanged behavior).
 */
export default function WidgetStyleFields({ fields = [], value = {}, onChange, resolvedDefaults = {}, deferred = false, onApply, columns = 1, groupFooters = {}, markOverrides = false, collapsedByDefault = false, colorMode = null, colorFooter = null, onColorModeChange = null, savedValue = null }) {
  const [pending, setPending] = useState(value);
  useEffect(() => { if (deferred) setPending(value); }, [deferred, value]);
  // Sections start closed unless something in them is set at this level (see isGroupSet below);
  // a section the user opens/closes keeps that state until the field list changes (another
  // chart type / widget).
  const [toggledGroups, setToggledGroups] = useState({});
  // Colors refused on pick (unreadable on the background) — shown under the field, never saved.
  const [rejectedColors, setRejectedColors] = useState({});
  const fieldSig = fields.map((f) => f.key).join(',');
  // OLD: one effect reset BOTH on [fieldSig, colorMode] — so switching Light ↔ Dark collapsed every
  // section. Now: a different field list (another chart/widget) resets sections; a mode switch keeps
  // each section exactly as it was (its current open state is pinned) and only clears refused picks.
  const openStateRef = useRef({});
  useEffect(() => { setToggledGroups({}); }, [fieldSig]);
  const prevModeRef = useRef(colorMode);
  useEffect(() => {
    if (prevModeRef.current === colorMode) return;
    prevModeRef.current = colorMode;
    setToggledGroups((prev) => ({ ...openStateRef.current, ...prev }));
    setRejectedColors({});
  }, [colorMode]);

  // Copy colors to the other mode: the current mode's colors are captured, the box switches to the
  // target mode (onColorModeChange), and once this panel re-renders in that mode — where the
  // caller's onChange writes to it — every color is written there. Replace, not merge: a color
  // unset here is cleared there too. A color unreadable in the target mode is skipped (left to its
  // default), the same rule as picking one. Saved only with the panel's normal Save.
  // The two big boxes (Shared / per-mode colors) collapse independently; both start open.
  const [boxOpen, setBoxOpen] = useState({ shared: true, colors: true });
  const toggleBox = (k) => setBoxOpen((prev) => ({ ...prev, [k]: !prev[k] }));
  const [copyConfirmOpen, setCopyConfirmOpen] = useState(false);
  const [pendingCopy, setPendingCopy] = useState(null); // { to, values }
  useEffect(() => {
    if (!pendingCopy || colorMode !== pendingCopy.to) return;
    const { to, values } = pendingCopy;
    setPendingCopy(null);
    const write = deferred ? (k, v) => setPending((prev) => ({ ...prev, [k]: v })) : onChange;
    const targetBg = values.bgColor || values.bgGradientFrom || resolvedDefaults.bgColor;
    const checked = guardStyleColors({ ...values, bgColor: targetBg }, to === 'dark');
    const skipped = [];
    let copied = 0;
    Object.entries(values).forEach(([k, v]) => {
      const isSet = Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && v !== '';
      if (isSet && typeof v === 'string' && checked[k] !== v) {
        skipped.push(fields.find((f) => f.key === k)?.label || k);
        write(k, undefined);
        return;
      }
      write(k, isSet ? v : undefined);
      if (isSet) copied += 1;
    });
    const modeName = to === 'dark' ? 'Dark' : 'Light';
    toast.success(`Copied ${copied} color${copied === 1 ? '' : 's'} to ${modeName}${skipped.length ? ` · skipped ${skipped.length} unreadable (${skipped.join(', ')})` : ''}`);
  }, [colorMode, pendingCopy]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!fields.length) {
    return <div className="dbe-style-empty">No style options for this widget.</div>;
  }

  const activeValue = deferred ? pending : value;
  const handleChange = deferred
    ? (key, val) => setPending((prev) => ({ ...prev, [key]: val }))
    : onChange;

  // Only chart_types that actually declare a `showTitle` field (currently just TABLE — every
  // other type always renders its title, so this gate never applies to them) get the rest of
  // the Title group hidden while it's switched off — those color/font/size/position controls
  // are genuinely inert with no title to apply to, so showing them edits nothing.
  // Same gate for Border, except it defaults to OFF: its toggle is `default: null` ("unset —
  // follow the dashboard/theme"), so the switch shows the inherited state from
  // `resolvedDefaults` until this level sets its own, and the other border fields only appear
  // once it's actually on.
  const toggleState = (key) => {
    const field = fields.find((f) => f.key === key);
    if (!field) return null;
    const own = activeValue[key];
    const isOwn = own !== undefined && own !== null && own !== '';
    const effective = isOwn ? own : (resolvedDefaults[key] ?? field.default);
    return { field, isOwn, on: key === 'showCardBorder' ? effective === 'show' : effective !== 'hide' };
  };
  const titleToggle = toggleState('showTitle');
  const dashTitleToggle = toggleState('showDashboardTitle');
  const dashTitleVisible = !dashTitleToggle || dashTitleToggle.on;
  const borderToggle = toggleState('showCardBorder');
  const titleVisible = !titleToggle || titleToggle.on;
  const borderVisible = !borderToggle || borderToggle.on;
  const visibleFields = fields.filter((f) => {
    // Drawn inside another field's row (e.g. pagerColor in Rows per page), not on its own.
    if (f.inlineIn) return false;
    if (!titleVisible && f.key !== 'showTitle' && TITLE_FIELD_KEYS.has(f.key)) return false;
    if (!dashTitleVisible && f.key !== 'showDashboardTitle' && DASHBOARD_TITLE_KEYS.has(f.key)) return false;
    if (!borderVisible && f.key !== 'showCardBorder' && BORDER_FIELD_KEYS.has(f.key)) return false;
    return true;
  });

  const groupList = (list) => GROUP_ORDER.map((group) => ({
    group,
    fields: list.filter((f) => groupFor(f) === group),
  })).filter((g) => g.fields.length > 0);

  // `colorMode` ('light' | 'dark'): split the panel into a Shared box (sizes, fonts, positions,
  // toggles — one value for both modes) and a tinted box holding only the per-mode colors of the
  // mode being edited, so it's obvious which fields change with the Light | Dark switch.
  // Without it, the original single list (one group per section) is rendered unchanged.
  const split = !!colorMode;

  // What the chart really draws for each color: run the same render-time guard renderChartWidget
  // uses (guardStyleColors), against the background this widget actually has. Only for panels that
  // know their mode (colorMode); a key comes back only when the saved value is replaced.
  const guarded = colorMode
    ? guardStyleColors({ ...activeValue, bgColor: activeValue.bgColor || resolvedDefaults.bgColor }, colorMode === 'dark')
    : null;
  const appliedFor = (key) => {
    const own = activeValue[key];
    if (!guarded || !own || guarded[key] === own) return undefined;
    return guarded[key] || resolvedDefaults[key] || null;
  };

  // Block on pick: a complete hex that the render guard would drop (unreadable on this widget's
  // background) is not saved — the field keeps its previous value and says why. Backgrounds are
  // never blocked; a color that only becomes unreadable later (background/theme changed) is still
  // caught by the render guard + the "can't be seen" note above.
  const bgFor = (key) => (key === 'titleColor' && activeValue.titleBgColor) || activeValue.bgColor || resolvedDefaults.bgColor || (colorMode === 'dark' ? '#22273C' : '#ffffff');
  const commitChange = (key, val) => {
    if (colorMode && typeof val === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(val)) {
      const field = fields.find((f) => f.key === key);
      // #fff → #ffffff, so a typed short hex is checked too.
      const full = val.length === 4 ? `#${val[1]}${val[1]}${val[2]}${val[2]}${val[3]}${val[3]}` : val;
      if (field?.type === 'color') {
        const check = guardStyleColors({ ...activeValue, [key]: full, bgColor: activeValue.bgColor || resolvedDefaults.bgColor }, colorMode === 'dark');
        if (check[key] !== full) {
          // Used to block the pick entirely (field kept its old value, nothing saved) — now just
          // warns and still saves it: a user picking a low-contrast color on purpose (e.g. testing,
          // or a background that'll change later) shouldn't be stopped outright.
          const bg = bgFor(key);
          const hint = (contrastRatio(bg, '#000000') ?? 0) >= (contrastRatio(bg, '#ffffff') ?? 0) ? 'darker' : 'lighter';
          setRejectedColors((prev) => ({ ...prev, [key]: { value: val, hint } }));
          handleChange(key, full);
          return;
        }
      }
    }
    setRejectedColors((prev) => {
      if (!(key in prev)) return prev;
      const { [key]: _drop, ...rest } = prev;
      return rest;
    });
    handleChange(key, val);
  };
  // Saved colors the chart can't use right now (set before this check existed, or the background
  // changed since) — offered as one "Remove unreadable colors" click in the colors box header.
  const otherMode = colorMode === 'dark' ? 'light' : 'dark';
  const startCopy = () => {
    setCopyConfirmOpen(false);
    const values = Object.fromEntries(fields.filter(isModeField).map((f) => [f.key, activeValue[f.key]]));
    // The palette is often edited outside this field list (PaletteEditor in the Data tab / colorFooter /
    // Themes) but is still a per-mode color — include it whenever this level has one.
    if (!('palette' in values) && Array.isArray(activeValue.palette)) values.palette = activeValue.palette;
    setPendingCopy({ to: otherMode, values });
    onColorModeChange?.(otherMode);
  };
  const unreadableKeys = colorMode ? fields.filter((f) => f.type === 'color' && appliedFor(f.key) !== undefined).map((f) => f.key) : [];
  const sharedGroups = groupList(split ? visibleFields.filter((f) => !isModeField(f)) : visibleFields);
  const colorGroups = split ? groupList(visibleFields.filter(isModeField)) : [];

  // A section counts as edited when any of its fields holds a value at this level (same test as
  // FieldRow's isOverridden — an empty palette doesn't count).
  const isGroupSet = (groupFields) => groupFields.some((f) => {
    const v = activeValue?.[f.key];
    return Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && v !== '';
  });
  // Unsaved edits (vs `savedValue`). Checked over every field — incl. ones hidden right now (title
  // switched off) and inline ones (pagerColor → its host row's group) — so a section never loses
  // its badge just because its fields are hidden.
  const editedKeys = savedValue
    ? new Set(fields.filter((f) => !sameStyleValue(activeValue?.[f.key], savedValue?.[f.key])).map((f) => f.key))
    : new Set();
  const groupOfField = (f) => groupFor(f.inlineIn ? (fields.find((x) => x.key === f.inlineIn) || f) : f);
  const isGroupEdited = (group, shared) => fields.some((f) => editedKeys.has(f.key)
    && groupOfField(f) === group
    && (!split || (shared ? !isModeField(f) : isModeField(f))));
  const sharedEdited = fields.some((f) => editedKeys.has(f.key) && (!split || !isModeField(f)));
  const colorsEdited = split && fields.some((f) => editedKeys.has(f.key) && isModeField(f));
  const renderGroups = (grouped, { shared = true } = {}) => grouped.map(({ group, fields: groupFields }) => {
        const groupId = `${shared ? 's' : 'c'}:${group}`;
        const edited = isGroupEdited(group, shared);
        // OLD: open={!collapsedByDefault} — every section open (or all closed) regardless of content.
        // OLD: const isOpen = toggledGroups[groupId] ?? isGroupSet(groupFields);
        // An edited section is held open until saved (or the edit is undone).
        const isOpen = edited || (toggledGroups[groupId] ?? isGroupSet(groupFields));
        openStateRef.current[groupId] = isOpen; // remembered so a Light ↔ Dark switch keeps it
        // "Show title" surfaces in the Title section's own header (a right-aligned switch
        // next to the section name) rather than as just another row inside it — it's the
        // on/off gate for every other field in this group, not a peer of them, so it reads
        // better as part of the header than buried in the list it controls.
        const toggleKey = GROUP_TOGGLE_KEYS[group];
        const toggle = toggleKey === 'showTitle' ? titleToggle : toggleKey === 'showCardBorder' ? borderToggle : toggleKey === 'showDashboardTitle' ? dashTitleToggle : null;
        // Section on/off toggles (Show title / Border) are shared settings — only in the Shared box.
        const inlineToggleField = shared ? (toggle?.field || null) : null;
        const bodyFields = inlineToggleField ? groupFields.filter((f) => f.key !== inlineToggleField.key) : groupFields;
        const toggleChecked = !!toggle?.on;
        // Only an inheritable toggle (`default: null`) can go back to "follow the dashboard/theme".
        const canInherit = !!inlineToggleField && inlineToggleField.default == null && toggle.isOwn;
        const footer = shared && (group === 'Border' ? borderVisible : true) ? groupFooters[group] : null;
        return (
          <details key={group} className="dbe-style-subsection" open={isOpen}>
            <summary
              title={edited ? 'Unsaved changes — stays open until saved' : undefined}
              onClick={(e) => { e.preventDefault(); if (!edited) setToggledGroups((prev) => ({ ...prev, [groupId]: !isOpen })); }}
            >
              {/* OLD: {group} as bare text — in a narrow panel the header's right-side controls got pushed
                  past the edge (switch cut off). The name now shrinks with an ellipsis; controls never do. */}
              {/* Wraps at word breaks ("DASHBOARD / TITLE") instead of "DASHB…" when the header is tight. */}
              {/* OLD: min-w-0 break-words — split inside words ("DASHBO/ARD"). Now breaks only at spaces and never
                  narrower than the longest word (flex min-width stays at min-content). */}
              {/* OLD: <span className="flex-1 break-normal leading-tight">{group}</span> */}
              <span className="flex flex-1 flex-wrap items-center gap-1.5 break-normal leading-tight">
                {group}
                {edited && <EditedBadge />}
              </span>
              {inlineToggleField && (
                <span
                  className="ml-auto flex shrink-0 items-center gap-1.5 normal-case tracking-normal font-normal text-dbe-meta"
                  onClick={(e) => e.stopPropagation()}
                >
                  {canInherit && (
                    <button
                      type="button"
                      title="Clear override — inherit from theme/dashboard"
                      aria-label={`Clear ${inlineToggleField.label} override`}
                      onClick={() => handleChange(inlineToggleField.key, undefined)}
                      // --stack: two lines ("Use / inherited") in section headers, to leave room for the name.
                      className="dbe-style-inherit-btn dbe-style-inherit-btn--stack"
                    >
                      {/* OLD: ↺ icon only */}
                      Use inherited
                    </button>
                  )}
                  {/* Show/Hide word dropped while "Use inherited" is shown (no room for both); the switch
                      position and its tooltip still say which. */}
                  {!canInherit && (toggleChecked ? 'Show' : 'Hide')}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={toggleChecked}
                    title={toggleChecked ? 'Show' : 'Hide'}
                    aria-label={`${group}: ${toggleChecked ? 'shown' : 'hidden'}`}
                    onClick={() => handleChange(inlineToggleField.key, toggleChecked ? 'hide' : 'show')}
                    className={`dbe-style-switch${toggleChecked ? ' on' : ''}`}
                  >
                    <span className="dbe-style-switch-knob" />
                  </button>
                </span>
              )}
            </summary>
            {bodyFields.length > 0 && (
              <div
                className="dbe-style-subsection-body"
                style={columns > 1 ? { display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, columnGap: 24 } : undefined}
              >
                {/* Taller controls (sliders, dropdowns, colors, positions) share the grid; one-line
                    show/hide switches go in their own block underneath, so rows line up instead of
                    a short switch sitting next to a tall dropdown. */}
                {bodyFields.filter((f) => !isShowHide(f)).map((field) => (
                  <FieldRow key={field.key} field={field} value={activeValue} resolvedDefaults={resolvedDefaults} onChange={commitChange} markOverrides={markOverrides} applied={appliedFor(field.key)} rejected={rejectedColors[field.key] || null} />
                ))}
                {bodyFields.some(isShowHide) && (
                  <div
                    className="dbe-style-switch-block"
                    style={columns > 1 ? { gridColumn: '1 / -1', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, columnGap: 24 } : undefined}
                  >
                    {bodyFields.filter(isShowHide).map((field) => (
                      <FieldRow key={field.key} field={field} value={activeValue} resolvedDefaults={resolvedDefaults} onChange={commitChange} markOverrides={markOverrides} applied={appliedFor(field.key)} rejected={rejectedColors[field.key] || null} />
                    ))}
                  </div>
                )}
                {footer && <div className="col-span-full">{footer}</div>}
              </div>
            )}
          </details>
        );
  });

  return (
    <div className="dbe-style-fields">
      {split ? (
        <>
          {sharedGroups.length > 0 && (
            <div className="dbe-style-box-shared">
              {/* Held open while it holds unsaved edits (sharedEdited), like its sections. */}
              <button type="button" className="dbe-style-box-toggle" aria-expanded={boxOpen.shared || sharedEdited} onClick={() => { if (!sharedEdited) toggleBox('shared'); }}>
                {/* OLD: ChevronRight on the left + SlidersHorizontal icon */}
                <span>
                  <span className="dbe-style-box-head">
                    {/* OLD: Shared · both modes */}
                    Shared
                    <ChevronDown size={13} strokeWidth={2.5} aria-hidden="true" className={`dbe-style-box-chevron${boxOpen.shared || sharedEdited ? '' : ' closed'}`} />
                    {sharedEdited && <EditedBadge />}
                  </span>
                  <span className="dbe-style-box-hint block">Same in Light &amp; Dark</span>
                </span>
              </button>
              {(boxOpen.shared || sharedEdited) && <div className="dbe-style-fields mt-2">{renderGroups(sharedGroups)}</div>}
            </div>
          )}
          {(colorGroups.length > 0 || colorFooter) && (
            <StyleModeTint
              mode={colorMode}
              open={boxOpen.colors || colorsEdited}
              onToggle={() => { if (!colorsEdited) toggleBox('colors'); }}
              badge={colorsEdited ? <EditedBadge /> : null}
              // Row 1: title … mode switch. Row 2: hint … "Copy to Dark →" (StyleModeTint lays them out).
              headerRight={onColorModeChange ? <StyleModeSwitch value={colorMode} onChange={onColorModeChange} showHint={false} className="!mb-0" tone={colorMode === 'dark' ? 'dark' : 'light'} compact /> : null}
              hintRight={onColorModeChange ? (
                // OLD: text link "Copy to Dark →" on the hint line. Now a 22px icon button beside the switch.
                <button
                  type="button"
                  className="dbe-style-icon-btn"
                  title={`Copy these colors to ${otherMode === 'dark' ? 'Dark' : 'Light'} mode`}
                  aria-label={`Copy these colors to ${otherMode === 'dark' ? 'Dark' : 'Light'} mode`}
                  onClick={() => setCopyConfirmOpen(true)}
                >
                  <Copy size={12} aria-hidden="true" />
                </button>
              ) : null}
            >
              {copyConfirmOpen && (
                <div className="dbe-style-copy-confirm">
                  <span>Copy these colors to {otherMode === 'dark' ? 'Dark' : 'Light'} mode? Its current colors are replaced; unreadable ones are skipped.</span>
                  <span className="flex justify-end gap-1">
                    <button type="button" className="dbe-style-inherit-btn" onClick={() => setCopyConfirmOpen(false)}>Cancel</button>
                    <button type="button" className="dbe-style-copy-go" onClick={startCopy}>Copy</button>
                  </span>
                </div>
              )}
              {unreadableKeys.length > 0 && (
                <div className="dbe-style-unreadable-bar">
                  <span>⚠ {unreadableKeys.length} saved color{unreadableKeys.length === 1 ? '' : 's'} can't be seen in this mode.</span>
                  <button type="button" className="dbe-style-inherit-btn" onClick={() => unreadableKeys.forEach((k) => handleChange(k, undefined))}>
                    Remove unreadable colors
                  </button>
                </div>
              )}
              <div className="dbe-style-fields">{renderGroups(colorGroups, { shared: false })}</div>
              {colorFooter}
            </StyleModeTint>
          )}
        </>
      ) : renderGroups(sharedGroups)}
      {/* OLD: <ConfirmModal …> — a full dialog was too big for this; now an inline confirm bar in the colors box. */}
      {deferred && (
        <div className="dbe-style-actions">
          <Button variant="secondary" size="sm" fullWidth onClick={() => setPending(value)}>Reset</Button>
          <Button variant="primary" size="sm" fullWidth onClick={() => onApply?.(pending)}>Apply changes</Button>
        </div>
      )}
      {/* Kept inline here (not in DashboardCanvasEditor.jsx's own stylesheet) so these
          controls render correctly wherever this component is used, including contexts where
          DashboardCanvasEditor isn't mounted at all — e.g. ChartLibrary.jsx's own Style tab. */}
      <style>{`
        /* Card treatment — each section is its own bordered, shadowed white/dark card (the
           header sits at the card's own top edge with a divider once open) instead of a flat
           colored bar sitting directly on the panel background. Same underlying field system,
           just a more modern "grouped settings card" look — see the conversation's reference
           mockup this was asked to move toward (colors kept as this app's own orange/slate
           palette, not copied from the mockup's blue). */
        .dbe-style-fields { display:flex; flex-direction:column; gap:6px; }
        /* Shared (both modes) box — neutral, so it reads as separate from the tinted per-mode
           colors box (StyleModeTint) below it. */
        /* OLD: box-shadow:inset 0 0 0 1px — now a real 1px border, identical to the colors box (StyleModeTint). */
        /* Mockup light mode: the box is a white card and its group rows are light grey (OLD: slate-100 box, white rows). */
        .dbe-style-box-shared { padding:10px; border-radius:var(--dbe-card-radius); background:var(--dbe-surface-card); border:1px solid var(--dbe-border); box-shadow:var(--dbe-card-shadow); } /* card (D) */
        .dbe-style-box-head { display:flex; align-items:center; gap:6px; font-size:var(--dbe-fs-h2); font-weight:600; text-transform:uppercase; letter-spacing:.06em; color:#475569; }
        /* OLD margin: 1px 0 8px */
        .dbe-style-box-hint { font-size:var(--dbe-fs-meta); color:#94a3b8; margin:1px 0 0; }
        .dbe-style-box-toggle { display:flex; align-items:center; gap:6px; width:100%; padding:2px 4px; margin:-2px -4px; border:none; border-radius:6px; background:none; text-align:left; cursor:pointer; }
        .dbe-style-box-toggle:hover .dbe-style-box-chevron { color:#EC7D09; }
        .dbe-style-box-chevron { color:#94a3b8; transition:transform .15s, color .15s; }
        .dbe-style-box-chevron.closed { transform:rotate(-90deg); }
        /* Card chrome (background/border/header) stays the same light styling regardless of
           the app's own light/dark theme — same "editor chrome, not content" rule already
           applied to the Add Widget icons, the Light/Dark switch and the left panel's other
           section headers (ADD WIDGET/SELECTED WIDGET/SELECTED WIDGET STYLE). The actual color
           VALUES a field shows (e.g. Title color's swatch) are unaffected by this — those
           already follow the Light/Dark MODE switch above, a separate, deliberate mechanism,
           not the app theme. */
        /* OLD: radius 12px + soft shadow, white header. Mockup: light-grey header row, white body when open. */
        .dbe-style-subsection {
          border:1px solid rgb(226 232 240); border-radius:8px; background:#fff; overflow:hidden;
        }
        .dbe-style-subsection > summary { background:var(--dbe-surface-element); } /* element row (E) */
        /* Header row — smaller text + less padding than before (was 11px/10px 12px), since a
           popover like the Dashboard Theme one stacks 7 of these and the extra height per row
           added up fast. */
        .dbe-style-subsection summary {
          cursor:pointer; font-size:var(--dbe-fs-h3); font-weight:600; text-transform:uppercase; letter-spacing:.02em;
          color:#334155; padding:6px 12px; list-style:none; display:flex; align-items:center; gap:6px;
        }
        .dbe-style-subsection summary:hover { background:rgb(241 245 249); } /* OLD: slate-50 — now the resting color */
        .dbe-style-subsection[open] summary { border-bottom:1px solid rgb(241 245 249); }
        .dbe-style-subsection summary::-webkit-details-marker { display:none; }
        .dbe-style-subsection summary::before { content:'▸'; font-size:9px; color:#94a3b8; transition:transform .1s; }
        .dbe-style-subsection[open] summary::before { transform:rotate(90deg); }
        .dbe-style-subsection-body { display:flex; flex-direction:column; gap:14px; padding:12px; }
        /* Show/hide switches: one evenly spaced block of single-line rows under the other fields. */
        .dbe-style-switch-block { display:grid; row-gap:8px; padding-top:10px; border-top:1px dashed rgb(226 232 240); }
        .dbe-style-switch-block .dbe-style-row-inline { min-height:24px; }
        .dbe-style-inherit-btn {
          border:1px solid rgb(226 232 240); background:#fff; border-radius:4px; padding:0 6px; line-height:16px;
          font-size:var(--dbe-fs-meta); font-weight:400; color:#64748b; cursor:pointer; white-space:nowrap;
        }
        .dbe-style-inherit-btn--stack { width:min-content; white-space:normal; text-align:center; line-height:1.15; padding:2px 6px; }
        .dbe-style-inherit-btn:hover { border-color:rgba(236,125,9,0.5); color:#EC7D09; }
        .dbe-style-icon-btn { display:flex; align-items:center; justify-content:center; width:22px; height:22px; flex-shrink:0; border:1px solid rgb(226 232 240); border-radius:6px; background:#fff; color:#64748b; cursor:pointer; }
        /* Dark colors box (mockup): group rows are dark translucent rows on the navy box instead of white
           cards; labels light; value pills stay white so colors read true. Light box unchanged. */
        [data-mode="dark"] .dbe-style-subsection { background:var(--dbe-dark-element); border-color:var(--dbe-dark-border); box-shadow:none; } /* OLD bg rgba(255,255,255,0.06) */
        [data-mode="dark"] .dbe-style-subsection summary { color:#e2e8f0; background:transparent; }
        [data-mode="dark"] .dbe-style-subsection summary:hover { background:rgba(255,255,255,0.05); }
        [data-mode="dark"] .dbe-style-subsection[open] summary { border-bottom-color:rgba(255,255,255,0.08); }
        [data-mode="dark"] .dbe-style-subsection summary::before { color:#94a3b8; }
        [data-mode="dark"] .dbe-style-row-label { color:#cbd5e1; }
        [data-mode="dark"] .dbe-style-contrast-warning { color:#fbbf24; }
        /* Bars inside the Dark colors box (copy-colors confirm, unreadable-colors notice) — dark too,
           not white boxes on the navy card. Light box keeps the light versions. */
        [data-mode="dark"] .dbe-style-copy-confirm,
        [data-mode="dark"] .dbe-style-unreadable-bar { background:var(--dbe-dark-element); border-color:rgba(236,125,9,0.45); color:#e2e8f0; }
        [data-mode="dark"] .dbe-style-inherit-btn { background:rgba(255,255,255,0.08); border-color:rgba(255,255,255,0.15); color:#cbd5e1; }
        [data-mode="dark"] .dbe-style-inherit-btn:hover { border-color:#EC7D09; color:#fff; }
        [data-mode="dark"] .dbe-style-icon-btn { background:rgba(255,255,255,0.08); border-color:rgba(255,255,255,0.12); color:#cbd5e1; }
        .dbe-style-icon-btn:hover { border-color:rgba(236,125,9,0.5); color:#EC7D09; }
        .dbe-style-link { border:none; background:none; padding:0; font:inherit; color:#EC7D09; cursor:pointer; text-decoration:underline; text-underline-offset:2px; }
        .dbe-style-link:hover { color:#EC7D09; }
        /* OLD: one row (text | buttons) — wrapped into a tall ragged column in the narrow left panel. */
        .dbe-style-copy-confirm { display:flex; flex-direction:column; gap:6px; margin-bottom:8px; padding:6px 8px; border-radius:8px; background:#fff; border:1px solid rgba(236,125,9,0.5); font-size:var(--dbe-fs-meta); color:#334155; }
        .dbe-style-copy-go { border:none; border-radius:4px; padding:0 8px; line-height:18px; font-size:var(--dbe-fs-meta); font-weight:600; color:#fff; background:#EC7D09; cursor:pointer; }
        .dbe-style-copy-go:hover { background:#EC7D09; opacity:.9; }
        .dbe-style-unreadable-bar { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:8px; padding:6px 8px; border-radius:8px; background:rgba(236,125,9,0.08); border:1px solid rgba(236,125,9,0.35); font-size:var(--dbe-fs-meta); color:#7c2d12; }
        .dbe-style-row { display:flex; flex-direction:column; gap:6px; min-height:50px; justify-content:flex-start; }
        .dbe-style-row-inline { flex-direction:row; align-items:center; justify-content:space-between; min-height:auto; }
        /* The label takes the row's free space, so it wraps (at word breaks) only when the row
           really is too narrow — without this it shrank to its longest word, one word per line. */
        .dbe-style-row-inline > .dbe-style-row-label { flex:1 1 auto; min-width:0; }
        /* flex + nowrap so a long label ("Background gradient from") + the hint mark stay on
           one line instead of the marker wrapping to its own line in a narrow 2-column cell —
           the label text truncates with an ellipsis instead, the marker itself never shrinks. */
        .dbe-style-row-label { display:flex; align-items:center; gap:1px; max-width:100%; font-size:var(--dbe-fs-body); color:#334155; }
        .dbe-style-row-label-text { flex:1 1 auto; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .dbe-style-row-label-line { display:flex; align-items:center; justify-content:space-between; }
        .dbe-style-slider-line { display:flex; align-items:center; gap:8px; }
        .dbe-style-slider-line input[type="range"] { flex:1; height:6px; }
        .dbe-style-value-pill {
          font-size:var(--dbe-fs-meta); font-weight:600; color:#EC7D09; background:rgba(236,125,9,0.12);
          border-radius:4px; padding:2px 6px; min-width:24px; text-align:center; flex-shrink:0;
        }
        .dbe-style-row input[type="range"] { width:100%; accent-color:#EC7D09; }
        .dbe-style-color-pill {
          display:flex; align-items:center; gap:0; border:1px solid rgb(226 232 240); border-radius:10px;
          overflow:hidden; background:#fff; transition:border-color .1s, box-shadow .1s;
        }
        .dbe-style-color-pill:focus-within, .dbe-style-color-pill.set { border-color:#EC7D09; box-shadow:0 0 0 3px rgba(236,125,9,0.12); }
        .dbe-style-color-pill.low-contrast { border-color:#f59e0b; }
        .dbe-style-contrast-warning { font-size:var(--dbe-fs-meta); line-height:1.3; color:#b45309; }
        .dbe-style-color-swatch {
          position:relative; width:30px; height:30px; flex-shrink:0; cursor:pointer;
          border-right:1px solid rgb(226 232 240);
          background-image: linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%);
          background-size: 8px 8px; background-position: 0 0, 0 4px, 4px -4px, -4px 0;
        }
        .dbe-style-color-swatch input[type="color"] { position:absolute; inset:0; opacity:0; cursor:pointer; padding:0; border:none; }
        .dbe-style-color-pill input[type="text"] {
          flex:1; min-width:0; font-size:var(--dbe-fs-body); font-family:inherit; font-variant-numeric:tabular-nums; padding:6px 10px; border:none; background:transparent; color:#1e293b;
        }
        .dbe-style-color-pill input[type="text"]::placeholder { color:#64748b; opacity:1; }
        .dbe-style-color-copy {
          flex-shrink:0; display:flex; align-items:center; justify-content:center; width:24px; height:24px; margin-right:3px;
          border:none; border-radius:6px; background:transparent; color:#94a3b8; cursor:pointer;
        }
        .dbe-style-color-copy:hover { background:rgb(241 245 249); color:#334155; }
        .dbe-style-color-pill input[type="text"]:focus { outline:none; }
        .dbe-style-row select, .dbe-style-row .dp-select {
          width:100%; font-size:var(--dbe-fs-body); padding:7px 10px; border:1px solid rgb(226 232 240); border-radius:10px; background:#fff; color:#1e293b;
          transition:border-color .1s, box-shadow .1s;
        }
        .dbe-style-row select:focus, .dbe-style-row .dp-select:focus {
          outline:none; border-color:#EC7D09; box-shadow:0 0 0 3px rgba(236,125,9,0.12);
        }
        .dbe-style-text-input {
          width:100%; font-size:var(--dbe-fs-body); padding:7px 10px; border:1px solid rgb(226 232 240); border-radius:10px; background:#fff; color:#1e293b; box-sizing:border-box;
          transition:border-color .1s, box-shadow .1s;
        }
        .dbe-style-text-input:focus { outline:none; border-color:#EC7D09; box-shadow:0 0 0 3px rgba(236,125,9,0.12); }
        .dbe-style-textarea { resize:vertical; min-height:70px; font-family:inherit; }
        /* Pill-track segmented control (a light track with a floating "active" pill) instead
           of a solid-fill flat bar — same shape the reference mockup's Weight (Reg/Med/Bold)
           and Solid/Gradient tabs use. */
        .dbe-style-segmented { display:flex; gap:2px; padding:2px; background:rgb(241 245 249); border-radius:10px; }
        .dbe-style-segmented button {
          flex:1; padding:6px 0; font-size:var(--dbe-fs-body); font-weight:400; color:#64748b; background:transparent; cursor:pointer;
          text-align:center; border-radius:8px; border:none; transition:background .12s, color .12s, box-shadow .12s;
        }
        .dbe-style-segmented button.active { background:#fff; color:#0f172a; font-weight:600; box-shadow:0 1px 2px rgba(15,23,42,0.1); }
        /* Orange accent, not a slate shade — a dark-on-dark active pill (#334155 on the
           ~8%-white track over dark navy) read as barely-there in dark mode; the accent color
           is unambiguous regardless of theme. */
        /* Bare icons — no box/border/background at all, just the glyph itself, colored to show
           selection. Sits directly on the panel like a plain label, not a control chrome. */
        .dbe-style-icon-select { display:flex; flex-wrap:wrap; gap:10px; }
        .dbe-style-icon-select button {
          width:24px; height:24px; display:flex; align-items:center; justify-content:center;
          border:none; background:none; padding:0; color:#94a3b8; cursor:pointer; transition:color .12s;
        }
        .dbe-style-icon-select button:hover { color:#EC7D09; }
        .dbe-style-icon-select button.active { color:#EC7D09; }
        .dbe-style-position-grid {
          display:grid; grid-template-columns:repeat(3, 1fr); gap:4px; width:72px; padding:6px;
          background:rgb(241 245 249); border-radius:10px;
        }
        .dbe-style-position-grid button {
          width:20px; height:20px; border:none; border-radius:6px;
          background:transparent; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0;
        }
        .dbe-style-position-grid button span { width:6px; height:6px; border-radius:50%; background:rgb(203 213 225); transition:background .12s; }
        .dbe-style-position-grid button:hover { background:#fff; }
        .dbe-style-position-grid button.active { background:#fff; box-shadow:0 1px 2px rgba(15,23,42,0.1); }
        .dbe-style-position-grid button.active span { background:#EC7D09; width:8px; height:8px; }
        .dbe-style-switch {
          width:34px; height:19px; border-radius:999px; background:rgb(203 213 225); position:relative;
          border:none; cursor:pointer; transition:background .15s; flex-shrink:0;
        }
        .dbe-style-switch.on { background:#EC7D09; }
        .dbe-style-switch-knob {
          position:absolute; top:2px; left:2px; width:15px; height:15px; border-radius:50%; background:#fff;
          transition:transform .15s; box-shadow:0 1px 2px rgba(0,0,0,0.2);
        }
        .dbe-style-switch.on .dbe-style-switch-knob { transform:translateX(15px); }
        /* The × clear button below sits in the top-right corner, on the field's LABEL line —
           so only the label reserves room for it, and the control under it (color pill, select,
           slider, text box) runs to the full width. The button is never shown on a row whose
           control shares the label's line (switches/segmented pairs, see showClear), so
           nothing else can collide with it. Reserved unconditionally so a label doesn't reflow
           when the field is overridden/cleared. */
        /* min-width:0 overrides the grid item's default min-width:auto — without it, a field
           whose content has a wide intrinsic minimum (a <select> sized to its longest option,
           e.g. "Times New Roman") refuses to shrink to its 1fr grid track and forces the whole
           panel wider than its own fixed pixel width, pushing content out past the right edge
           instead of wrapping/truncating inside it (see the conversation this was reported in —
           the panel-resize handle appeared to "break" once this class of field existed, but the
           resize logic itself, in ChartLibrary.jsx, was never the actual cause). */
        .dbe-style-field-wrap { position:relative; min-width:0; }
        .dbe-style-field-wrap > .dbe-style-row:not(.dbe-style-row-inline) > .dbe-style-row-label { padding-right:20px; }
        .dbe-style-field-wrap.inherited { opacity:0.6; }
        .dbe-style-field-wrap.override-marked { box-shadow:inset 2px 0 0 #64748b; padding-left:8px; }
        .dbe-style-field-clear {
          position:absolute; top:0; right:0; width:15px; height:15px; border-radius:50%;
          border:1px solid rgb(203 213 225); background:#fff; color:#475569; font-size:var(--dbe-fs-body);
          line-height:1; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0;
        }
        .dbe-style-field-clear:hover { background:#fee2e2; border-color:#fca5a5; color:#dc2626; }
        .dbe-style-actions { display:flex; gap:8px; margin-top:8px; padding-top:8px; border-top:1px solid rgb(226 232 240); }
        .dbe-style-actions > * { flex:1; }
      `}</style>
    </div>
  );
}
