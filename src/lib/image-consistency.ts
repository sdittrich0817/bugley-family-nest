export function passesCharacterCheck(result: { pass: boolean; score: number; issues?: string } | null): boolean {
  return result !== null && result.pass === true && result.score >= 70 && result.issues !== 'check unavailable';
}