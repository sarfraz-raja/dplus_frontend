// One naming rule for every copy in the Dashboard Builder — dashboards, widgets (charts) and tabs:
// "Name (1)", "Name (2)" … (lowest free number), never "Name (Copy)". Single copies are named
// automatically; batch copies (Clone dashboard with "duplicate widgets") pre-fill these names in
// the Clone dialog's editable list. See CLAUDE.md §4.

// Strips a trailing " (Copy)" (the old fixed suffix) or " (N)" counter, so copying a copy suggests
// "A (2)" rather than "A (Copy) (Copy)" / "A (1) (1)". Only 1–3 digit counters count, so a real
// name like "Revenue (2024)" keeps its year.
export function baseCopyName(name) {
  return String(name || '').replace(/\s*\(Copy\)$/i, '').replace(/\s*\(\d{1,3}\)$/, '').trim();
}

// Lowest N such that "<baseName> (N)" isn't in `takenNames` (a Set of existing names).
export function nextCopyName(baseName, takenNames) {
  let n = 1;
  while (takenNames.has(`${baseName} (${n})`)) n += 1;
  return `${baseName} (${n})`;
}

// The name for a copy of `name`.
export function copyNameFor(name, takenNames) {
  return nextCopyName(baseCopyName(name), takenNames);
}
