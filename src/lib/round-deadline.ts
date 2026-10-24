export function customRoundSeconds(timer: number): number {
  return timer > 0 ? Math.min(timer, 240) : 240;
}
export function elapsedRoundSeconds(startWall: number, startMonotonic: number, nowWall: number, nowMonotonic: number): number {
  return Math.max(0, nowWall - startWall, nowMonotonic - startMonotonic) / 1000;
}