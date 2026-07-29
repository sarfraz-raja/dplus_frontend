import React from 'react';
import { POSITION_GRID_AREA, POSITION_TEXT_ALIGN, POSITION_ALIGN } from './titlePositions';

/**
 * Positions a widget's title (and, where the widget has one, its value/total text) anywhere
 * in a 3x3 grid over the widget's own card — an absolutely-positioned overlay so the chart
 * beneath it can always fill the full card instead of a fixed "head row" pushing it down.
 *
 * Each of title/value sits in its own named grid cell (POSITION_GRID_AREA) so two different
 * positions never fight over the same flex alignment, and two SAME positions (e.g. both
 * "center") simply stack in that one cell rather than one being clipped.
 *
 * `title`/`value` are the already-formatted node content (e.g. `${total}${unit}`) — this
 * component only ever controls placement, never formatting/color/weight/size (those stay as
 * inline styles on titleStyle/valueStyle, set by the caller exactly as before).
 */
export default function TitleValueOverlay({
  title, titleStyle, titlePosition = 'top-left', titleClassName = '',
  value, valueStyle, valuePosition = 'top-right', valueClassName = '',
}) {
  return (
    <div
      className="absolute inset-0 pointer-events-none p-2.5 grid"
      style={{
        gridTemplateAreas: '"tl tc tr" "ml mc mr" "bl bc br"',
        gridTemplateRows: '1fr 1fr 1fr',
        gridTemplateColumns: '1fr 1fr 1fr',
      }}
    >
      {title != null && title !== '' && (
        <div
          className="flex min-w-0 pointer-events-auto"
          style={{ gridArea: POSITION_GRID_AREA[titlePosition] || 'tl', ...POSITION_ALIGN[titlePosition] }}
        >
          <span className={titleClassName} style={{ textAlign: POSITION_TEXT_ALIGN[titlePosition], ...titleStyle }}>{title}</span>
        </div>
      )}
      {value != null && value !== '' && (
        <div
          className="flex min-w-0 pointer-events-auto"
          style={{ gridArea: POSITION_GRID_AREA[valuePosition] || 'tr', ...POSITION_ALIGN[valuePosition] }}
        >
          <span className={valueClassName} style={{ textAlign: POSITION_TEXT_ALIGN[valuePosition], ...valueStyle }}>{value}</span>
        </div>
      )}
    </div>
  );
}
