/**
 * Shared Meta insights parsing logic for campaigns, adsets, and ads API routes.
 */

// All fields to request from Meta Marketing API insights
export const INSIGHT_FIELDS = [
  'spend', 'impressions', 'clicks', 'reach', 'inline_link_clicks',
  'actions', 'action_values',
  'cpc', 'cpm', 'ctr', 'frequency',
  'video_thruplay_actions',
  'video_p25_watched_actions', 'video_p50_watched_actions',
  'video_p75_watched_actions', 'video_p100_watched_actions',
];

function getAction(actions, type) {
  return parseInt(actions?.find(a => a.action_type === type)?.value || '0', 10);
}
function getActionValue(actionValues, type) {
  return parseFloat(actionValues?.find(a => a.action_type === type)?.value || '0');
}

export function parseInsightsRow(row) {
  const spend = parseFloat(row.spend || '0');
  const impressions = parseInt(row.impressions || '0', 10);
  const clicks = parseInt(row.clicks || '0', 10);
  const reach = parseInt(row.reach || '0', 10);
  const inlineLinkClicks = parseInt(row.inline_link_clicks || '0', 10);

  const lpViews = getAction(row.actions, 'landing_page_view');
  const atc = getAction(row.actions, 'add_to_cart');
  const checkoutInitiated = getAction(row.actions, 'initiate_checkout');
  const purchases = getAction(row.actions, 'purchase');
  const revenue = getActionValue(row.action_values, 'purchase');

  const thruplay = parseInt(row.video_thruplay_actions?.[0]?.value || '0', 10);
  const videoP25 = parseInt(row.video_p25_watched_actions?.[0]?.value || '0', 10);
  const videoP50 = parseInt(row.video_p50_watched_actions?.[0]?.value || '0', 10);
  const videoP75 = parseInt(row.video_p75_watched_actions?.[0]?.value || '0', 10);
  const videoP100 = parseInt(row.video_p100_watched_actions?.[0]?.value || '0', 10);

  const ctr = impressions > 0 ? (inlineLinkClicks / impressions * 100) : 0;
  const ctrAll = impressions > 0 ? (clicks / impressions * 100) : 0;
  const cpc = inlineLinkClicks > 0 ? (spend / inlineLinkClicks) : 0;
  const cpm = impressions > 0 ? (spend / impressions * 1000) : 0;
  const frequency = reach > 0 ? (impressions / reach) : 0;
  const roas = spend > 0 ? (revenue / spend) : 0;
  const cpa = purchases > 0 ? (spend / purchases) : 0;
  const costPerLpv = lpViews > 0 ? (spend / lpViews) : 0;
  const costPerAtc = atc > 0 ? (spend / atc) : 0;

  const cvr = inlineLinkClicks > 0 ? (purchases / inlineLinkClicks * 100) : 0;
  const atcRate = lpViews > 0 ? (atc / lpViews * 100) : 0;
  const checkoutRate = atc > 0 ? (checkoutInitiated / atc * 100) : 0;

  const hookRate = impressions > 0 ? (thruplay / impressions * 100) : 0;
  const holdRate = thruplay > 0 && videoP25 > 0 ? (thruplay / videoP25 * 100) : 0;
  const videoViewRate25 = impressions > 0 ? (videoP25 / impressions * 100) : 0;
  const videoViewRate50 = impressions > 0 ? (videoP50 / impressions * 100) : 0;
  const videoViewRate100 = impressions > 0 ? (videoP100 / impressions * 100) : 0;
  const lpvClickRatio = inlineLinkClicks > 0 ? (lpViews / inlineLinkClicks * 100) : 0;

  return {
    spend, impressions, clicks, reach,
    link_clicks: inlineLinkClicks,
    lp_views: lpViews, atc, checkout_initiated: checkoutInitiated,
    purchases, revenue,
    cpc: +cpc.toFixed(2), cpm: +cpm.toFixed(2), cpa: +cpa.toFixed(2),
    roas: +roas.toFixed(2), cost_per_lpv: +costPerLpv.toFixed(2), cost_per_atc: +costPerAtc.toFixed(2),
    ctr: +ctr.toFixed(2), ctr_all: +ctrAll.toFixed(2),
    cvr: +cvr.toFixed(2), atc_rate: +atcRate.toFixed(2), checkout_rate: +checkoutRate.toFixed(2),
    frequency: +frequency.toFixed(1), lpv_click_ratio: +lpvClickRatio.toFixed(1),
    hook_rate: +hookRate.toFixed(1), hold_rate: +holdRate.toFixed(1),
    video_view_rate_25: +videoViewRate25.toFixed(1),
    video_view_rate_50: +videoViewRate50.toFixed(1),
    video_view_rate_100: +videoViewRate100.toFixed(1),
    thruplay, video_p25: videoP25, video_p50: videoP50, video_p75: videoP75, video_p100: videoP100,
  };
}

export function aggregateTotals(rows) {
  const totals = rows.reduce((acc, c) => ({
    spend: acc.spend + c.spend,
    impressions: acc.impressions + c.impressions,
    clicks: acc.clicks + c.clicks,
    reach: acc.reach + c.reach,
    link_clicks: acc.link_clicks + c.link_clicks,
    lp_views: acc.lp_views + c.lp_views,
    atc: acc.atc + c.atc,
    checkout_initiated: acc.checkout_initiated + c.checkout_initiated,
    purchases: acc.purchases + c.purchases,
    revenue: acc.revenue + c.revenue,
    thruplay: acc.thruplay + c.thruplay,
    video_p25: acc.video_p25 + c.video_p25,
    video_p50: acc.video_p50 + c.video_p50,
    video_p100: acc.video_p100 + c.video_p100,
  }), {
    spend: 0, impressions: 0, clicks: 0, reach: 0, link_clicks: 0,
    lp_views: 0, atc: 0, checkout_initiated: 0, purchases: 0, revenue: 0,
    thruplay: 0, video_p25: 0, video_p50: 0, video_p100: 0,
  });

  totals.ctr = totals.impressions > 0 ? +(totals.link_clicks / totals.impressions * 100).toFixed(2) : 0;
  totals.cpc = totals.link_clicks > 0 ? +(totals.spend / totals.link_clicks).toFixed(2) : 0;
  totals.cpm = totals.impressions > 0 ? +(totals.spend / totals.impressions * 1000).toFixed(2) : 0;
  totals.roas = totals.spend > 0 ? +(totals.revenue / totals.spend).toFixed(2) : 0;
  totals.cpa = totals.purchases > 0 ? +(totals.spend / totals.purchases).toFixed(2) : 0;
  totals.cvr = totals.link_clicks > 0 ? +(totals.purchases / totals.link_clicks * 100).toFixed(2) : 0;
  totals.atc_rate = totals.lp_views > 0 ? +(totals.atc / totals.lp_views * 100).toFixed(2) : 0;
  totals.checkout_rate = totals.atc > 0 ? +(totals.checkout_initiated / totals.atc * 100).toFixed(2) : 0;
  totals.frequency = totals.reach > 0 ? +(totals.impressions / totals.reach).toFixed(1) : 0;

  return totals;
}
