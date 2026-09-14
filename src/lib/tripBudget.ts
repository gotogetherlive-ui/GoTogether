export function parseTripBudget(value?: string | string[]): string {
  const raw = (Array.isArray(value) ? value[0] : value || '').trim();
  return /^\d+(\.\d{1,2})?$/.test(raw) && Number(raw) <= 1_000_000_000 ? String(Number(raw)) : '';
}

// Match the price priority on TripCard. Unknown/non-numeric prices are excluded
// only when a budget is specified; currency symbols and comma separators work.
export const TRIP_BUDGET_PRICE_SQL = String.raw`(CASE
  WHEN BTRIM(COALESCE(NULLIF(t.gotogether_price, ''), NULLIF(t.b2c_price, ''), t.b2b_price))
    ~* '^(₹|INR|Rs\.?)?[[:space:]]*[0-9][0-9,]*(\.[0-9]{1,2})?[[:space:]]*$'
  THEN REGEXP_REPLACE(REGEXP_REPLACE(COALESCE(NULLIF(t.gotogether_price, ''), NULLIF(t.b2c_price, ''), t.b2b_price), '^[^0-9]*', ''), '[^0-9.]', '', 'g')::numeric
  ELSE NULL END)`;
