import { describe, it, expect } from 'vitest';
import { DASH_LESSONS, makeDashBrain, DASH_FINISH_X } from './dash-learning';
import { createDash, replayDash } from './dash-engine';
import { defaultDash } from './play-extra';
describe('Glow Dash example learning', () => {
  it('changes its prediction when the child adds a near-obstacle jump example', () => {
    expect(makeDashBrain(DASH_LESSONS.slice(0, 1))?.predict(125, false)).toBe('wait');
    expect(makeDashBrain(DASH_LESSONS.slice(0, 2))?.predict(125, false)).toBe('jump');
  });
  it('learns not to jump far away or keep jumping in the air', () => {
    const brain = makeDashBrain(DASH_LESSONS);
    expect(brain?.predict(230, false)).toBe('wait');
    expect(brain?.predict(125, true)).toBe('wait');
  });
  for (const speed of ['slow', 'normal', 'fast'] as const) it(`runs the actual ${speed} physics with learned jumps and replayable inputs`, () => {
    const config = { ...defaultDash(), speed, pads: false }, r = createDash(config), brain = makeDashBrain(DASH_LESSONS), jumps: number[] = [];
    for (let t = 0; t < 4000 && r.view().x < DASH_FINISH_X; t++) {
      const v = r.view(), o = r.obstacles.find(o => o.x >= v.x - 22);
      const jump = !!o && brain?.predict(o.x - v.x, v.y < 298) === 'jump';
      if (jump) jumps.push(v.tick);
      r.step(jump);
    }
    const v = r.view();
    expect(v.x).toBeGreaterThanOrEqual(DASH_FINISH_X);
    expect(v.hits).toBe(0);
    expect(replayDash(config, v.tick, jumps).orbs).toBe(v.orbs);
    r.dispose();
  });
});