import React, { useEffect, useState } from 'react';
import Button from '../../Button';
import PaletteEditor from '../themes/PaletteEditor';
import FieldHintMark from '../FieldHintMark';
import { contrastRatio } from '../utils/contrast';
import { LOW_CONTRAST_THRESHOLD } from '../utils/themedStyle';

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
const TITLE_FIELD_KEYS = new Set(['showTitle', 'titleColor', 'titleWeight', 'titleSize', 'titleFont', 'titlePosition', 'titleBgColor']);
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
// Table-only row/header coloring (Band color, Header background/text color) — grouped apart
// from the card's own Background above for the same reason Title/Value got split out: these
// three are one specific concern (how the grid itself reads, not the card's base fill), not
// "any color field," and every other chart_type never declares these keys at all, so this
// group simply never appears outside Table's own panel.
const TABLE_COLOR_FIELD_KEYS = new Set(['bandColor', 'bandTextColor', 'headerBgColor', 'headerTextColor']);
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

function groupFor(field) {
  if (TITLE_FIELD_KEYS.has(field.key)) return 'Title';
  if (VALUE_FIELD_KEYS.has(field.key)) return 'Value';
  if (BACKGROUND_FIELD_KEYS.has(field.key)) return 'Background';
  if (TABLE_COLOR_FIELD_KEYS.has(field.key)) return 'Rows & Header';
  if (field.key === 'crossFilterSource' || field.key === 'crossFilterTarget') return 'Cross-Filtering';
  if (SHAPE_COLOR_KEYS.has(field.key)) return 'Fill & Border';
  if (['axisTextColor', 'axisTextWeight', 'axisTextSize', 'axisTextFont'].includes(field.key)) return 'Axis';
  if (field.type === 'palette' || ACCENT_SERIES_COLOR_KEYS.has(field.key)) return 'Accent & Series';
  if (field.key === 'color') return field.label === 'Text color' ? 'Text' : 'Accent & Series';
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
const GROUP_ORDER = ['Title', 'Value', 'Background', 'Rows & Header', 'Cross-Filtering', 'Layout & Behavior', 'Accent & Series', 'Axis', 'Fill & Border', 'Text', 'Text Styling', 'Other Colors'];

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

function ColorRow({ field, current, resolvedDefaults, value, onChange }) {
  const swatchValue = current || resolvedDefaults[field.key] || '#000000';
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
  const resolveBg = (key) => (key === 'auto' ? resolvedDefaults.bgColor : value?.[key] || resolvedDefaults[key]);
  const bgForContrast = Array.isArray(field.contrastBg)
    ? field.contrastBg.map(resolveBg).find((v) => v)
    : field.contrastBg
      ? resolveBg(field.contrastBg)
      : null;
  const ratio = bgForContrast ? contrastRatio(swatchValue, bgForContrast) : null;
  const lowContrast = ratio != null && ratio < LOW_CONTRAST_THRESHOLD;
  return (
    <div className="dbe-style-row">
      <span className="dbe-style-row-label"><span className="dbe-style-row-label-text">{field.label}</span><FieldHintMark hint={field.hint} /></span>
      <label className={`dbe-style-color-pill${isSet ? ' set' : ''}${lowContrast ? ' low-contrast' : ''}`}>
        <span className="dbe-style-color-swatch" style={{ background: swatchValue }}>
          <input type="color" value={swatchValue} onChange={(e) => onChange(field.key, e.target.value)} />
        </span>
        <input
          type="text"
          value={current || ''}
          placeholder={resolvedDefaults[field.key] || 'auto'}
          onChange={(e) => onChange(field.key, e.target.value)}
        />
      </label>
      {lowContrast && (
        <span className="dbe-style-contrast-warning">⚠ Barely visible against its background — pick a color with more contrast.</span>
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

function SwitchRow({ field, current, onChange }) {
  const onValue = field.options.find((o) => String(o.value).toLowerCase() === 'show')?.value ?? field.options[0].value;
  const offValue = field.options.find((o) => String(o.value).toLowerCase() === 'hide')?.value ?? field.options[1].value;
  const checked = (current || field.default) === onValue;
  return (
    <div className="dbe-style-row dbe-style-row-inline">
      <span className="dbe-style-row-label">{field.label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(field.key, checked ? offValue : onValue)}
        className={`dbe-style-switch${checked ? ' on' : ''}`}
      >
        <span className="dbe-style-switch-knob" />
      </button>
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
      <span className="dbe-style-row-label">{field.label}</span>
      <select value={current} onChange={(e) => onChange(field.key, e.target.value)}>
        {(field.options || []).map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </label>
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

function FieldRow({ field, value, resolvedDefaults, onChange }) {
  const raw = value?.[field.key];
  // A field only counts as an explicit override once it holds a real value — an empty
  // string (cleared text input) or undefined (cleared via the × below) both mean "inherit
  // from the dashboard theme/local default," same as never having touched it. A palette's
  // "empty" is `[]`/undefined, never `''` (it's an array field, not text) — checked
  // separately so an untouched palette doesn't read as "overridden with nothing".
  const isOverridden = field.type === 'palette'
    ? Array.isArray(raw) && raw.length > 0
    : raw !== undefined && raw !== null && raw !== '';
  const current = field.type === 'palette' ? (raw ?? field.default ?? []) : (raw ?? field.default ?? '');

  let row = null;
  if (field.type === 'color') row = <ColorRow field={field} current={current} resolvedDefaults={resolvedDefaults} value={value} onChange={onChange} />;
  else if (field.type === 'palette') row = <PaletteRow field={field} current={current} onChange={onChange} />;
  else if (field.type === 'number') row = <SliderRow field={field} current={current} resolvedDefaults={resolvedDefaults} onChange={onChange} />;
  else if (field.type === 'text') row = <TextRow field={field} current={current} onChange={onChange} />;
  else if (field.type === 'textarea') row = <TextAreaRow field={field} current={current} onChange={onChange} />;
  else if (field.type === 'position') row = <PositionPickerRow field={field} current={current} onChange={onChange} />;
  else if (field.type === 'iconSelect') row = <IconSelectRow field={field} current={current} onChange={onChange} />;
  else if (field.type === 'select') {
    if (isShowHide(field)) row = <SwitchRow field={field} current={current} onChange={onChange} />;
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
  const showClear = isOverridden && !isShowHide(field) && !isSegmented;

  return (
    <div className={`dbe-style-field-wrap${isOverridden ? '' : ' inherited'}`}>
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
 * Header/Cross-Filtering/Layout & Behavior/Accent & Series/Axis/Fill & Border/Text/Text
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
 */
export default function WidgetStyleFields({ fields = [], value = {}, onChange, resolvedDefaults = {}, deferred = false, onApply, columns = 1 }) {
  const [pending, setPending] = useState(value);
  useEffect(() => { if (deferred) setPending(value); }, [deferred, value]);

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
  const showTitleField = fields.find((f) => f.key === 'showTitle');
  const titleVisible = !showTitleField || (activeValue.showTitle ?? showTitleField.default) !== 'hide';
  const visibleFields = titleVisible ? fields : fields.filter((f) => f.key === 'showTitle' || !TITLE_FIELD_KEYS.has(f.key));

  const grouped = GROUP_ORDER.map((group) => ({
    group,
    fields: visibleFields.filter((f) => groupFor(f) === group),
  })).filter((g) => g.fields.length > 0);

  return (
    <div className="dbe-style-fields">
      {grouped.map(({ group, fields: groupFields }) => {
        // "Show title" surfaces in the Title section's own header (a right-aligned switch
        // next to the section name) rather than as just another row inside it — it's the
        // on/off gate for every other field in this group, not a peer of them, so it reads
        // better as part of the header than buried in the list it controls.
        const inlineToggleField = group === 'Title' ? groupFields.find((f) => f.key === 'showTitle') : null;
        const bodyFields = inlineToggleField ? groupFields.filter((f) => f.key !== 'showTitle') : groupFields;
        const toggleChecked = inlineToggleField
          ? (activeValue[inlineToggleField.key] ?? inlineToggleField.default) === 'show'
          : false;
        return (
          <details key={group} className="dbe-style-subsection" open>
            <summary>
              {group}
              {inlineToggleField && (
                <span
                  className="ml-auto flex items-center gap-1.5 normal-case tracking-normal font-medium text-[10px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  {toggleChecked ? 'Show' : 'Hide'}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={toggleChecked}
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
                {bodyFields.map((field) => (
                  <FieldRow key={field.key} field={field} value={activeValue} resolvedDefaults={resolvedDefaults} onChange={handleChange} />
                ))}
              </div>
            )}
          </details>
        );
      })}
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
        /* Card chrome (background/border/header) stays the same light styling regardless of
           the app's own light/dark theme — same "editor chrome, not content" rule already
           applied to the Add Widget icons, the Light/Dark switch and the left panel's other
           section headers (ADD WIDGET/SELECTED WIDGET/SELECTED WIDGET STYLE). The actual color
           VALUES a field shows (e.g. Title color's swatch) are unaffected by this — those
           already follow the Light/Dark MODE switch above, a separate, deliberate mechanism,
           not the app theme. */
        .dbe-style-subsection {
          border:1px solid rgb(226 232 240); border-radius:12px; background:#fff; overflow:hidden;
          box-shadow:0 1px 2px rgba(15,23,42,0.04);
        }
        /* Header row — smaller text + less padding than before (was 11px/10px 12px), since a
           popover like the Dashboard Theme one stacks 7 of these and the extra height per row
           added up fast. */
        .dbe-style-subsection summary {
          cursor:pointer; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.02em;
          color:#334155; padding:6px 12px; list-style:none; display:flex; align-items:center; gap:6px;
        }
        .dbe-style-subsection summary:hover { background:rgb(248 250 252); }
        .dbe-style-subsection[open] summary { border-bottom:1px solid rgb(241 245 249); }
        .dbe-style-subsection summary::-webkit-details-marker { display:none; }
        .dbe-style-subsection summary::before { content:'▸'; font-size:9px; color:#94a3b8; transition:transform .1s; }
        .dbe-style-subsection[open] summary::before { transform:rotate(90deg); }
        .dbe-style-subsection-body { display:flex; flex-direction:column; gap:14px; padding:12px; }
        .dbe-style-row { display:flex; flex-direction:column; gap:6px; min-height:50px; justify-content:flex-start; }
        .dbe-style-row-inline { flex-direction:row; align-items:center; justify-content:space-between; min-height:auto; }
        /* flex + nowrap so a long label ("Background gradient from") + the hint mark stay on
           one line instead of the marker wrapping to its own line in a narrow 2-column cell —
           the label text truncates with an ellipsis instead, the marker itself never shrinks. */
        .dbe-style-row-label { display:flex; align-items:center; gap:1px; max-width:100%; font-size:11px; color:#334155; }
        .dbe-style-row-label-text { flex:1 1 auto; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .dbe-style-row-label-line { display:flex; align-items:center; justify-content:space-between; }
        .dbe-style-slider-line { display:flex; align-items:center; gap:8px; }
        .dbe-style-slider-line input[type="range"] { flex:1; height:6px; }
        .dbe-style-value-pill {
          font-size:10px; font-weight:600; color:#EC7D09; background:rgba(236,125,9,0.12);
          border-radius:4px; padding:2px 6px; min-width:24px; text-align:center; flex-shrink:0;
        }
        .dbe-style-row input[type="range"] { width:100%; accent-color:#EC7D09; }
        .dbe-style-color-pill {
          display:flex; align-items:center; gap:0; border:1px solid rgb(226 232 240); border-radius:10px;
          overflow:hidden; background:#fff; transition:border-color .1s, box-shadow .1s;
        }
        .dbe-style-color-pill:focus-within, .dbe-style-color-pill.set { border-color:#EC7D09; box-shadow:0 0 0 3px rgba(236,125,9,0.12); }
        .dbe-style-color-pill.low-contrast { border-color:#f59e0b; }
        .dbe-style-contrast-warning { font-size:10px; line-height:1.3; color:#b45309; }
        .dbe-style-color-swatch {
          position:relative; width:30px; height:30px; flex-shrink:0; cursor:pointer;
          border-right:1px solid rgb(226 232 240);
          background-image: linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%);
          background-size: 8px 8px; background-position: 0 0, 0 4px, 4px -4px, -4px 0;
        }
        .dbe-style-color-swatch input[type="color"] { position:absolute; inset:0; opacity:0; cursor:pointer; padding:0; border:none; }
        .dbe-style-color-pill input[type="text"] {
          flex:1; min-width:0; font-size:11px; font-family:monospace; padding:6px 10px; border:none; background:transparent; color:#1e293b;
        }
        .dbe-style-color-pill input[type="text"]::placeholder { color:#64748b; opacity:1; }
        .dbe-style-color-pill input[type="text"]:focus { outline:none; }
        .dbe-style-row select {
          width:100%; font-size:11px; padding:7px 10px; border:1px solid rgb(226 232 240); border-radius:10px; background:#fff; color:#1e293b;
          transition:border-color .1s, box-shadow .1s;
        }
        .dbe-style-row select:focus {
          outline:none; border-color:#EC7D09; box-shadow:0 0 0 3px rgba(236,125,9,0.12);
        }
        .dbe-style-text-input {
          width:100%; font-size:11px; padding:7px 10px; border:1px solid rgb(226 232 240); border-radius:10px; background:#fff; color:#1e293b; box-sizing:border-box;
          transition:border-color .1s, box-shadow .1s;
        }
        .dbe-style-text-input:focus { outline:none; border-color:#EC7D09; box-shadow:0 0 0 3px rgba(236,125,9,0.12); }
        .dbe-style-textarea { resize:vertical; min-height:70px; font-family:inherit; }
        /* Pill-track segmented control (a light track with a floating "active" pill) instead
           of a solid-fill flat bar — same shape the reference mockup's Weight (Reg/Med/Bold)
           and Solid/Gradient tabs use. */
        .dbe-style-segmented { display:flex; gap:2px; padding:2px; background:rgb(241 245 249); border-radius:10px; }
        .dbe-style-segmented button {
          flex:1; padding:6px 0; font-size:11px; font-weight:500; color:#64748b; background:transparent; cursor:pointer;
          text-align:center; border-radius:8px; border:none; transition:background .12s, color .12s, box-shadow .12s;
        }
        .dbe-style-segmented button.active { background:#fff; color:#0f172a; font-weight:700; box-shadow:0 1px 2px rgba(15,23,42,0.1); }
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
        /* Reserves a gutter for the × clear button below, on the wrap itself rather than on
           any one row type's own right-aligned content — a value pill (slider), a switch, a
           select, all sit flush against the row's right edge, and every one of them would
           otherwise collide with the button rendered on top of that same corner. Reserved
           unconditionally (not just when the button is actually rendered) so a field doesn't
           visibly reflow every time it's overridden/cleared. */
        /* min-width:0 overrides the grid item's default min-width:auto — without it, a field
           whose content has a wide intrinsic minimum (a <select> sized to its longest option,
           e.g. "Times New Roman") refuses to shrink to its 1fr grid track and forces the whole
           panel wider than its own fixed pixel width, pushing content out past the right edge
           instead of wrapping/truncating inside it (see the conversation this was reported in —
           the panel-resize handle appeared to "break" once this class of field existed, but the
           resize logic itself, in ChartLibrary.jsx, was never the actual cause). */
        .dbe-style-field-wrap { position:relative; min-width:0; padding-right:20px; }
        .dbe-style-field-wrap.inherited { opacity:0.6; }
        .dbe-style-field-clear {
          position:absolute; top:0; right:0; width:16px; height:16px; border-radius:50%;
          border:1px solid rgb(203 213 225); background:#fff; color:#475569; font-size:11px;
          line-height:1; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0;
        }
        .dbe-style-field-clear:hover { background:#fee2e2; border-color:#fca5a5; color:#dc2626; }
        .dbe-style-actions { display:flex; gap:8px; margin-top:8px; padding-top:8px; border-top:1px solid rgb(226 232 240); }
        .dbe-style-actions > * { flex:1; }
      `}</style>
    </div>
  );
}
