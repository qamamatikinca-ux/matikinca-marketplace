export type Pose = 'centre' | 'left' | 'right';
export type Point = { x: number; y: number };
// Geometric guidance only. Neither head motion nor a client score proves liveness.
export function facePose(points: Point[]): number | null {
  if (points.length < 68 || points.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) return null;
  const left = points.slice(36, 42).reduce((s, p) => s + p.x, 0) / 6;
  const right = points.slice(42, 48).reduce((s, p) => s + p.x, 0) / 6;
  const width = Math.abs(right - left);
  if (width < 15) return null;
  return (points[30].x - (left + right) / 2) / width;
}
export function matchesPose(value: number | null, target: Pose) {
  if (value === null || !Number.isFinite(value)) return false;
  return target === 'centre' ? Math.abs(value) < 0.14 : target === 'left' ? value < -0.2 : value > 0.2;
}
export function comparisonDistance(a: ArrayLike<number>, b: ArrayLike<number>): number | null {
  if (a.length !== 128 || b.length !== 128) return null;
  let sum = 0;
  for (let i = 0; i < 128; i++) {
    if (!Number.isFinite(a[i]) || !Number.isFinite(b[i])) return null;
    sum += (a[i] - b[i]) ** 2;
  }
  return Math.sqrt(sum);
}
