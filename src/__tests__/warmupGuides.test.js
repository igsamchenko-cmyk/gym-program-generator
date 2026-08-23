import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { EX } from '../data/exercises.js';
import { ageFlags, DEFAULT_PROFILE, WARMUP_GUIDES, warmup } from '../engine.js';

const byId = new Map(EX.map((exercise) => [exercise.id, exercise]));

function fullWarmup() {
  const plan = {
    flags: ageFlags(65),
    profile: {
      ...DEFAULT_PROFILE,
      balance: 'cautious', focus: 'glutes',
      limits: ['knee', 'lowback', 'shoulder'],
    },
  };
  const day = {
    items: [
      { ex: byId.get('machine_press') },
      { ex: byId.get('leg_press') },
      { ex: byId.get('hyperext') },
    ],
  };
  return { day, items: warmup(plan, day) };
}

describe('схеми розминки', () => {
  it('повертає структуровані рухи відповідно до профілю й вправ дня', () => {
    const { items } = fullWarmup();
    expect(items.map((item) => item.id)).toEqual([
      'general', 'externalRotation', 'supportedBalance', 'bandAbduction',
      'legExtension', 'deadBug', 'wallSlide', 'rampSets',
    ]);
    items.forEach((item) => expect(typeof item.text).toBe('string'));
  });

  it('кожна заявлена схема існує локально та має доступний опис техніки', () => {
    Object.entries(WARMUP_GUIDES).filter(([, guide]) => guide.media).forEach(([id, guide]) => {
      expect(existsSync(resolve('public', guide.media.src)), `${id}: ${guide.media.src}`).toBe(true);
      expect(guide.media.alt.length, `${id}: alt`).toBeGreaterThan(12);
      expect(guide.cue.length, `${id}: cue`).toBeGreaterThan(20);
      expect(guide.err.length, `${id}: err`).toBeGreaterThan(20);
    });
  });

  it('підвідні підходи перевикористовують схему першої вправи дня', () => {
    const { day, items } = fullWarmup();
    const ramp = items.find((item) => item.id === 'rampSets');
    expect(ramp.media).toEqual(day.items[0].ex.media);
    expect(ramp.cue).toContain(day.items[0].ex.n);
  });
});
