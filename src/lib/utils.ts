export function parseNames(namesStr: string | null | undefined): string[] {
  if (!namesStr) return [];
  try {
    return JSON.parse(namesStr);
  } catch {
    return [];
  }
}
