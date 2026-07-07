export function parseInrToPaise(value: unknown): number {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0 || value > 100_000_000) return 0;
    return Math.round(value * 100);
  }
  if (typeof value !== 'string' || value.length > 40) return 0;
  const normalized = value.trim().replace(/^INR\s*/i, '').replace(/^₹\s*/, '').replace(/,/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return 0;
  const rupees = Number(normalized);
  if (!Number.isFinite(rupees) || rupees <= 0 || rupees > 100_000_000) return 0;
  return Math.round(rupees * 100);
}
