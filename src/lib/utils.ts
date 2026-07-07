export function parseNames(namesStr: string | null | undefined): string[] {
  if (!namesStr) return [];
  try {
    return JSON.parse(namesStr);
  } catch {
    return [];
  }
}

export function parseJSONArray<T>(jsonStr: string | null | undefined): T[] {
  if (!jsonStr) return [];
  try {
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
