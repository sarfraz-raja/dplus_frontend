import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Filter, X } from "lucide-react";
import MapActions from "../../store/actions/map-actions";
import { SET_DASHBOARD_FILTER } from "../../store/reducers/map-reducer";

// Shown while a Dashboard Builder "Open on map" link's filters are active (state.map.dashboardFilter,
// set by MapActions.getUserMapSetup). "Show all" ends it: drops the link from the URL and reloads the
// user's saved setup, fitted to its cells. Renders nothing on a normal visit.
const DashboardFilterBanner = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const dashboardFilter = useSelector((state) => state.map.dashboardFilter);

  if (!dashboardFilter) return null;

  const { labels = [], skipped = [], from } = dashboardFilter;
  const summary = labels.length
    ? labels.map((l) => `${l.field}: ${l.values.join(", ")}`).join(" · ")
    : "No filter could be applied — showing all cells";
  const skippedHint = skipped.length
    ? `Not applied:\n${skipped.map((s) => `• ${s.column} — ${s.reason}`).join("\n")}`
    : undefined;

  const showAll = () => {
    dispatch(SET_DASHBOARD_FILTER(null));
    navigate("/gis-engine", { replace: true });
    dispatch(MapActions.getUserMapSetup(null, { fit: true }));
  };

  return (
    <div
      role="status"
      className="pointer-events-auto flex max-w-full items-center gap-2 rounded-lg border border-line bg-surface-1/95 px-3 py-1.5 text-ui-small text-content shadow-lg backdrop-blur"
    >
      <Filter className="h-3.5 w-3.5 shrink-0 text-[#EC7D09]" aria-hidden="true" />
      <span className="shrink-0 font-medium">
        {from ? `Filtered from “${from}”` : "Dashboard filters"}
      </span>
      <span className="min-w-0 truncate text-muted" title={summary}>{summary}</span>
      {skipped.length > 0 && (
        <span
          className="shrink-0 rounded bg-surface-2 px-1.5 py-0.5 text-ui-micro text-muted"
          title={skippedHint}
        >
          {skipped.length} not applied
        </span>
      )}
      <button
        type="button"
        onClick={showAll}
        className="ml-1 inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 font-medium text-[#EC7D09] hover:bg-hoverlay focus:outline-none focus-visible:ring-1 focus-visible:ring-[#EC7D09]"
        title="Clear the dashboard filters and go back to your saved map filters"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
        Show all
      </button>
    </div>
  );
};

export default DashboardFilterBanner;
