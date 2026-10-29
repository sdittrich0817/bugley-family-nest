import { describe, expect, it } from 'vitest';
import { SECRETS, creatureName, secretFor } from './creatures';

describe('creature lab', () => {
  it('finds the Sky Dragon secret from its recipe', () => {
    expect(secretFor({ body: 'tall', head: 'horns', wings: 'bat', tail: 'dragon', pattern: 'plain', color: '1' })?.name).toBe('Sky Dragon');
  });
  it('gives ordinary mixes a made-up name', () => {
    expect(creatureName({ body: 'round', head: 'ears', wings: 'none', tail: 'none', pattern: 'plain', color: '1' })).toBe('Bubbo-whisky');
  });
  it('has eight secret creatures with unique names', () => { expect(new Set(SECRETS.map((s) => s.name)).size).toBe(8); });
});
