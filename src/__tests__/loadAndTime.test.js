import { describe, it, expect } from 'vitest';
import { buildPlan, DEFAULT_PROFILE, loadFor, sessionMinutes, isHeavy } from '../engine.js';
import { EX } from '../data/exercises.js';

function profile(overrides = {}) {
  return { ...DEFAULT_PROFILE, mode: 'auto', customDays: [], priority: [], limits: [], seed: 0, ...overrides };
}

describe('loadFor — відсоток від робочої ваги по тижнях', () => {
  it('делоад завжди легший за пік мезоциклу', () => {
    const plan = buildPlan(profile({ level: 'adv', days: 3, place: 'gym', bar: true }));
    const item = plan.days[0].items.find((it) => ['barbell', 'dumbbell'].includes(it.ex.eq));
    const anchors = { [item.ex.id]: 100 };
    const deload = plan.weeks.find((w) => w.deload);
    const peak = plan.weeks.reduce((a, b) => (a.mult > b.mult ? a : b));
    const deloadKg = loadFor(item, deload, false, anchors);
    const peakKg = loadFor(item, peak, false, anchors);
    expect(deloadKg).toBeLessThan(peakKg);
  });

  it('без введеної робочої ваги повертає null, а не NaN чи виняток', () => {
    const plan = buildPlan(profile({ level: 'int', days: 4, place: 'gym', bar: true }));
    const item = plan.days[0].items[0];
    expect(loadFor(item, plan.weeks[0], false, {})).toBeNull();
  });

  it('округлення завжди кратне 2.5 кг', () => {
    const plan = buildPlan(profile({ level: 'adv', days: 3, place: 'gym', bar: true }));
    const item = plan.days[0].items.find((it) => ['barbell', 'dumbbell'].includes(it.ex.eq));
    const anchors = { [item.ex.id]: 83 };
    plan.weeks.forEach((w) => {
      const kg = loadFor(item, w, false, anchors);
      if (kg !== null) expect(kg % 2.5).toBe(0);
    });
  });
});

describe('sessionMinutes — оцінка тривалості з урахуванням односторонніх вправ', () => {
  it('день з односторонньою вправою довший за той самий день без неї (за інших рівних)', () => {
    const uniExample = EX.find((e) => e.uni);
    expect(uniExample).toBeTruthy();

    const plan = buildPlan(profile({ level: 'int', days: 4, place: 'gym', bar: true }));
    const week = plan.weeks[2];
    const dayWithUni = { items: [{ ex: uniExample, base: 3 }] };
    const bilateralClone = { ...uniExample, uni: false };
    const dayWithoutUni = { items: [{ ex: bilateralClone, base: 3 }] };

    const fakePlan = { ...plan, profile: plan.profile };
    const minsUni = sessionMinutes(dayWithUni, week, fakePlan, 0);
    const minsBilateral = sessionMinutes(dayWithoutUni, week, fakePlan, 0);
    expect(minsUni).toBeGreaterThan(minsBilateral);
  });

  it('оцінка часу завжди додатна й скінченна для будь-якого дня плану', () => {
    for (const days of [2, 3, 4, 5, 6]) {
      const plan = buildPlan(profile({ level: 'adv', days, place: 'gym', bar: true }));
      const peak = plan.weeks.reduce((a, b) => (a.mult > b.mult ? a : b));
      plan.days.forEach((day, di) => {
        const mins = sessionMinutes(day, peak, plan, di);
        expect(Number.isFinite(mins)).toBe(true);
        expect(mins).toBeGreaterThan(0);
      });
    }
  });
});
