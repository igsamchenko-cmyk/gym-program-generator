import { describe, it, expect } from 'vitest';
import {
  ADVANCED_ONLY, REQUIRES_FOUNDATION, DEFAULT_PROFILE,
  buildPlan, isExerciseAllowed, maxDifficultyFor,
} from '../engine.js';
import { EX } from '../data/exercises.js';

const EX_BY_ID = new Map(EX.map((exercise) => [exercise.id, exercise]));
const gated = new Set([...REQUIRES_FOUNDATION, ...ADVANCED_ONLY]);

function profile(overrides = {}) {
  return {
    ...DEFAULT_PROFILE,
    mode: 'auto', customDays: [], priority: [], limits: [],
    place: 'gym', bar: true, balance: 'steady', seed: 0,
    ...overrides,
  };
}

function expectPlanEligible(plan, label) {
  plan.days.forEach((day) => day.items.forEach((item) => {
    expect(isExerciseAllowed(item.ex, plan.profile), `${label}: ${item.ex.id} не відповідає профілю`).toBe(true);
  }));
}

describe('пороги силової й технічної готовності', () => {
  it('бруси з додатковою вагою доступні лише дорослому просунутому атлету', () => {
    const dips = EX_BY_ID.get('weighted_dips');
    expect(dips.eq).toBe('dipstation');
    expect(dips.d).toBe(3);
    expect(isExerciseAllowed(dips, profile({ level: 'beg', age: 30 }))).toBe(false);
    expect(isExerciseAllowed(dips, profile({ level: 'int', age: 30 }))).toBe(false);
    expect(isExerciseAllowed(dips, profile({ level: 'adv', age: 16 }))).toBe(false);
    expect(isExerciseAllowed(dips, profile({ level: 'adv', age: 30 }))).toBe(true);
  });

  it('новачку не пропонуються вправи, що вимагають попередньої силової бази', () => {
    for (const sex of ['m', 'f', 'x']) {
      const p = profile({ level: 'beg', age: 28, sex });
      REQUIRES_FOUNDATION.forEach((id) => {
        expect(isExerciseAllowed(EX_BY_ID.get(id), p), `${sex}: новачку доступна ${id}`).toBe(false);
      });
    }
  });

  it('підліток-новачок обмежений вправами початкової складності', () => {
    expect(maxDifficultyFor(profile({ level: 'beg', age: 16 }))).toBe(1);
    expect(maxDifficultyFor(profile({ level: 'beg', age: 18 }))).toBe(2);
    for (const sex of ['m', 'f', 'x']) for (const goal of ['hyper', 'strength', 'fatloss', 'health'])
      for (const days of [2, 3, 4, 5, 6]) for (let seed = 0; seed < 12; seed++) {
        const plan = buildPlan(profile({ level: 'beg', age: 16, sex, goal, days, seed }));
        plan.days.flatMap((day) => day.items).forEach((item) => {
          expect(item.ex.d, `${sex}/${goal}/${days}д/${seed}: ${item.ex.id}`).toBeLessThanOrEqual(1);
          expect(gated.has(item.ex.id), `${sex}/${goal}/${days}д/${seed}: ${item.ex.id}`).toBe(false);
        });
      }
  });

  it('автоматичні плани всіх категорій використовують той самий фільтр, що й ручна заміна', () => {
    for (const level of ['beg', 'int', 'adv']) for (const age of [16, 25, 45, 65])
      for (const sex of ['m', 'f', 'x']) for (const place of ['gym', 'db', 'band', 'bw'])
        for (const days of [2, 4, 6]) for (let seed = 0; seed < 6; seed++) {
          const plan = buildPlan(profile({ level, age, sex, place, bar: place === 'gym', days, seed }));
          expectPlanEligible(plan, `${level}/${age}/${sex}/${place}/${days}д/${seed}`);
          plan.days.forEach((day) => {
            expect(day.items.length, `${level}/${age}/${sex}/${place}/${days}д/${seed}: надто короткий день`).toBeGreaterThanOrEqual(4);
          });
        }
  });

  it('власні розкладки новачків не обходять пороги через повторення однієї групи', () => {
    const groupSets = [['chest'], ['chest', 'triceps'], ['back'], ['quads', 'hams', 'glutes'], ['delts', 'triceps']];
    for (const age of [16, 28, 45]) for (const sex of ['m', 'f']) for (const groups of groupSets)
      for (let seed = 0; seed < 20; seed++) {
        const p = profile({
          level: 'beg', age, sex, days: 2, seed, mode: 'custom',
          customDays: [{ groups }, { groups }], weekdays: [0, 3],
        });
        const plan = buildPlan(p);
        expectPlanEligible(plan, `custom/${age}/${sex}/${groups.join('+')}/${seed}`);
        expect(plan.days.flatMap((day) => day.items).filter((item) => gated.has(item.ex.id))).toEqual([]);
      }
  });
});
