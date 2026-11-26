export interface EvaluationSelection { id: string }

/** Select All is a snapshot of all matching IDs, not only the visible page. */
export function selectFilteredIds(ids: string[]): Set<string> {
  return new Set(ids);
}

export function toggleEvaluationSelection(selected: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(selected);
  if (next.has(id)) next.delete(id); else next.add(id);
  return next;
}

export function visiblePageSelection(selected: ReadonlySet<string>, rows: EvaluationSelection[]): boolean | "indeterminate" {
  const count = rows.filter((row) => selected.has(row.id)).length;
  return count === 0 ? false : count === rows.length ? true : "indeterminate";
}