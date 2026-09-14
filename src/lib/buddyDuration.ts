export function buddyNightOptions(daysValue: unknown): number[] {
  const days = Number(daysValue);
  if (!Number.isInteger(days) || days < 1 || days > 365) return [];

  return [days - 1, days + 1]
    .filter((nights, index, values) => nights >= 1 && nights <= 366 && values.indexOf(nights) === index);
}

export function isValidBuddyDuration(daysValue: unknown, nightsValue: unknown): boolean {
  const nights = Number(nightsValue);
  return Number.isInteger(nights) && buddyNightOptions(daysValue).includes(nights);
}

export function normalizedBuddyNights(daysValue: unknown, nightsValue: unknown): number {
  const nights = Number(nightsValue);
  if (isValidBuddyDuration(daysValue, nights)) return nights;
  return buddyNightOptions(daysValue)[0] ?? 1;
}
