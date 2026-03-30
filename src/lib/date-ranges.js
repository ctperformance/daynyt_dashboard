export const DATE_RANGES = {
  today: { label: 'Heute', days: 0 },
  yesterday: { label: 'Gestern', days: 1 },
  '7d': { label: '7 Tage', days: 7 },
  '14d': { label: '14 Tage', days: 14 },
  '30d': { label: '30 Tage', days: 30 },
  '90d': { label: '90 Tage', days: 90 },
};

/**
 * Returns { since, until } ISO date strings for a given range key.
 * "today" = today only, "yesterday" = yesterday only, "7d" = last 7 days, etc.
 */
export function getDateRange(rangeKey) {
  const range = DATE_RANGES[rangeKey];
  if (!range) return getDateRange('30d');

  const now = new Date();
  const until = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const since = new Date(until);

  if (rangeKey === 'today') {
    // today only
  } else if (rangeKey === 'yesterday') {
    since.setDate(since.getDate() - 1);
    until.setDate(until.getDate() - 1);
  } else {
    since.setDate(since.getDate() - range.days);
  }

  return {
    since: since.toISOString().split('T')[0],
    until: until.toISOString().split('T')[0],
  };
}
