/**
 * Meta Ads KPI Benchmark evaluation.
 * Returns 'green', 'yellow', or 'red' for each metric value.
 * Based on E-Commerce DACH benchmarks (2025/2026).
 */

// direction: 'higher' = higher is better, 'lower' = lower is better, 'range' = specific range
const BENCHMARKS = {
  // Performance & Kosten
  ctr:              { green: 2.0,  yellow: 1.0,  direction: 'higher', unit: '%',  label: 'CTR (Link)' },
  cpc:              { green: 0.80, yellow: 1.50, direction: 'lower',  unit: '\u20AC', label: 'CPC' },
  cpm:              { green: 10,   yellow: 20,   direction: 'lower',  unit: '\u20AC', label: 'CPM' },
  cpa:              { green: 25,   yellow: 40,   direction: 'lower',  unit: '\u20AC', label: 'CPA' },
  roas:             { green: 3.0,  yellow: 2.0,  direction: 'higher', unit: 'x',  label: 'ROAS' },
  cost_per_lpv:     { green: 0.50, yellow: 1.50, direction: 'lower',  unit: '\u20AC', label: 'Kosten/LPV' },
  cost_per_atc:     { green: 3.0,  yellow: 8.0,  direction: 'lower',  unit: '\u20AC', label: 'Kosten/ATC' },

  // Conversion & Funnel
  cvr:              { green: 2.5,  yellow: 1.5,  direction: 'higher', unit: '%',  label: 'CVR' },
  atc_rate:         { green: 8.0,  yellow: 4.0,  direction: 'higher', unit: '%',  label: 'ATC-Rate' },
  checkout_rate:    { green: 60,   yellow: 40,   direction: 'higher', unit: '%',  label: 'Checkout-Rate' },

  // Creative / Video
  hook_rate:        { green: 30,   yellow: 20,   direction: 'higher', unit: '%',  label: 'Hook Rate' },
  hold_rate:        { green: 40,   yellow: 25,   direction: 'higher', unit: '%',  label: 'Hold Rate' },
  video_view_rate_25: { green: 20, yellow: 10,   direction: 'higher', unit: '%',  label: 'VVR 25%' },
  video_view_rate_50: { green: 12, yellow: 6,    direction: 'higher', unit: '%',  label: 'VVR 50%' },
  video_view_rate_100:{ green: 6,  yellow: 3,    direction: 'higher', unit: '%',  label: 'VVR 100%' },

  // Reichweite & Auslieferung
  frequency:        { green: 2.5,  yellow: 4.0,  direction: 'lower',  unit: '',   label: 'Frequenz' },
  lpv_click_ratio:  { green: 80,   yellow: 60,   direction: 'higher', unit: '%',  label: 'LPV/Klick' },
  ctr_all:          { green: 3.0,  yellow: 1.5,  direction: 'higher', unit: '%',  label: 'CTR (alle)' },
};

/**
 * Evaluate a metric value against benchmarks.
 * @param {string} metricKey - Key from BENCHMARKS
 * @param {number} value - The metric value
 * @returns {'green'|'yellow'|'red'|null} - Color or null if no benchmark exists
 */
export function evaluateMetric(metricKey, value) {
  const b = BENCHMARKS[metricKey];
  if (!b || value === 0 || value === null || value === undefined) return null;

  if (b.direction === 'higher') {
    if (value >= b.green) return 'green';
    if (value >= b.yellow) return 'yellow';
    return 'red';
  } else {
    // lower is better
    if (value <= b.green) return 'green';
    if (value <= b.yellow) return 'yellow';
    return 'red';
  }
}

/**
 * Get benchmark info for a metric.
 */
export function getBenchmarkInfo(metricKey) {
  return BENCHMARKS[metricKey] || null;
}

/**
 * Get all benchmark keys.
 */
export function getAllBenchmarkKeys() {
  return Object.keys(BENCHMARKS);
}

/**
 * Evaluate all metrics for a data row.
 * @param {object} row - Data row with metric values
 * @returns {object} - Map of metricKey -> color
 */
export function evaluateRow(row) {
  const result = {};
  for (const key of Object.keys(BENCHMARKS)) {
    if (row[key] !== undefined) {
      result[key] = evaluateMetric(key, row[key]);
    }
  }
  return result;
}

export { BENCHMARKS };
