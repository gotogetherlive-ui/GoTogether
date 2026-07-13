export type TravelerLevel = {
  name: "Explorer" | "Pathfinder" | "Trailblazer" | "Voyager" | "Legend";
  minimum: number;
  nextMinimum: number | null;
};

const LEVELS: TravelerLevel[] = [
  { name: "Explorer", minimum: 0, nextMinimum: 3 },
  { name: "Pathfinder", minimum: 3, nextMinimum: 10 },
  { name: "Trailblazer", minimum: 10, nextMinimum: 25 },
  { name: "Voyager", minimum: 25, nextMinimum: 50 },
  { name: "Legend", minimum: 50, nextMinimum: null },
];

export function getTravelerLevel(points: number): TravelerLevel {
  const safePoints = Number.isFinite(points) ? Math.max(0, points) : 0;
  return [...LEVELS].reverse().find((level) => safePoints >= level.minimum) || LEVELS[0];
}

export function getLevelProgress(points: number): number {
  const level = getTravelerLevel(points);
  if (level.nextMinimum === null) return 100;
  const progress = ((Math.max(0, points) - level.minimum) / (level.nextMinimum - level.minimum)) * 100;
  return Math.min(100, Math.max(0, progress));
}

export function formatCreditPoints(points: number | string | null | undefined): string {
  const value = Number(points || 0);
  return value.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}
