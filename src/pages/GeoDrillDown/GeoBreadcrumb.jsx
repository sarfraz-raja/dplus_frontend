import React from "react";
import { ChevronRight, Home } from "lucide-react";

/**
 * GeoBreadcrumb — shows the current drill-down navigation path.
 * path: [{ shapeid, shapename }, ...]  (filled from /geo/breadcrumb API)
 * onNavigate(shapeid, index) — called when user clicks a crumb to go back
 */
const GeoBreadcrumb = ({ path = [], onNavigate }) => {
  return (
    <nav className="flex items-center gap-1 text-xs flex-wrap">
      {/* Root / Home crumb */}
      <button
        onClick={() => onNavigate(null, -1)}
        className="flex items-center gap-1 text-white/60 hover:text-[#F26522] transition-colors"
      >
        <Home size={12} />
        <span>Root</span>
      </button>

      {path.map((crumb, idx) => (
        <React.Fragment key={crumb.shapeid ?? idx}>
          <ChevronRight size={12} className="text-white/30 shrink-0" />
          {idx === path.length - 1 ? (
            // Last crumb → current level, not clickable
            <span className="text-[#F26522] font-medium">{crumb.shapename}</span>
          ) : (
            <button
              onClick={() => onNavigate(crumb.shapeid, idx)}
              className="text-white/60 hover:text-[#F26522] transition-colors"
            >
              {crumb.shapename}
            </button>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

export default GeoBreadcrumb;
