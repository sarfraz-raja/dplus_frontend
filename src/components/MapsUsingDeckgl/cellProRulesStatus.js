// Shared row normalisation for the Cell Pro Rules API (/kpi/multi-vendor/cell-pro-rules).
// The view row carries a static `status`/`details`; when the rule has a `query`, the backend runs
// it for the selected date and fills `value`, `value_avg`, `fail_count`, `colour`, `issues`,
// `issues_color`. Those date-specific results win over the static view columns when present.

const COLOUR_TO_STATUS = {
  red: 'Issue',
  orange: 'Warning',
  amber: 'Warning',
  yellow: 'Warning',
  green: 'OK',
};

const STATUS_HEX = { issue: '#dc2626', warning: '#d97706', ok: '#16a34a' };

const statusKey = (s = '') => {
  const v = String(s).toLowerCase();
  if (v.includes('issue'))   return 'issue';
  if (v.includes('warning')) return 'warning';
  if (v === 'ok')            return 'ok';
  return null;
};

// Accepts a status ("Issue"/"Warning"/"OK") or a colour name ("Red"/"Orange"/"Green")
export const statusColor = (s = '') => {
  const fromColour = COLOUR_TO_STATUS[String(s ?? '').trim().toLowerCase()];
  return STATUS_HEX[statusKey(fromColour || s)] || '#374151';
};

const hasValue = (v) => v !== null && v !== undefined && v !== '';

export const normalizeProRuleRow = (row) => {
  const colourStatus = COLOUR_TO_STATUS[String(row.colour ?? '').trim().toLowerCase()];
  const status = colourStatus || row.status || '';
  return {
    ...row,
    _status: status,
    _statusKey: statusKey(status),
    _details: hasValue(row.value) ? String(row.value) : row.details,
    _issues: row.issues || row.remarks || '',
    _issuesColor: row.issues_color ? statusColor(row.issues_color) : null,
  };
};

// Default report date: yesterday (local time), as YYYY-MM-DD for <input type="date">
export const defaultProRulesDate = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
