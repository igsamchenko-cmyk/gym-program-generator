import { describe, it, expect } from 'vitest';
import {
  buildPlan, DEFAULT_PROFILE, estimated1RM, loadFor, repsFor, scheduleWarnings,
  progressionSuggestion, sessionMinutes, setsFor, warmupMinutes,
} from '../engine.js';
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

  it('розраховує орієнтовний 1ПМ із ваги, повторів і RIR', () => {
    expect(estimated1RM({ weight: 100, reps: 8, rir: 2 })).toBeCloseTo(133.33, 1);
  });

  it('силовий режим не використовує універсальну надбавку +12%', () => {
    const plan = buildPlan(profile({ level: 'adv', goal: 'strength', days: 3, place: 'gym' }));
    const item = plan.days[0].items.find((entry) => entry.ex.t === 'comp' && ['barbell', 'dumbbell', 'machine'].includes(entry.ex.eq));
    const anchors = { [item.ex.id]: { weight: 100, reps: 5, rir: 2 } };
    const week = plan.weeks.find((entry) => !entry.deload);
    expect(loadFor(item, week, false, anchors, plan)).toBe(loadFor(item, week, true, anchors, plan));
    expect(plan.weeks.some((entry) => entry.heavy)).toBe(false);
  });

  it('новачок у силовому режимі починає з 6–8, а не з 3–6 повторів', () => {
    const plan = buildPlan(profile({ level: 'beg', goal: 'strength', days: 3, place: 'gym' }));
    const item = plan.days[0].items.find((entry) => entry.ex.t === 'comp');
    expect(repsFor(item, 'strength', plan.weeks[0], false, plan)).toBe('6–8');
  });

  it('рекомендація прогресії підвищує вагу лише після всіх виконаних підходів без болю', () => {
    const plan = buildPlan(profile({ level: 'beg', goal: 'strength', days: 3, place: 'gym' }));
    const item = plan.days[0].items.find((entry) => entry.ex.t === 'comp');
    const week = plan.weeks[0];
    const count = setsFor(item, week, plan, false);
    const ready = { pain: 0, sets: Array.from({ length: count }, () => ({ reps: 8, rir: 3 })) };
    expect(progressionSuggestion(ready, item, week, plan, false)).toContain('додай');
    expect(progressionSuggestion({ ...ready, pain: 4 }, item, week, plan, false)).toContain('Не підвищуй');
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

  it('додаткові пункти розминки збільшують оцінку часу', () => {
    const plain = buildPlan(profile({ level: 'int', days: 3, limits: [], balance: 'steady', focus: 'balanced' }));
    const full = buildPlan(profile({ level: 'int', days: 3, limits: ['knee', 'lowback', 'shoulder'], balance: 'cautious', focus: 'glutes' }));
    expect(warmupMinutes(full, full.days[0])).toBeGreaterThan(warmupMinutes(plain, plain.days[0]));
  });

  it('цілі змінюють фактичний обсяг і щільність, а не лише текст', () => {
    const hyper = buildPlan(profile({ level: 'int', days: 3, goal: 'hyper' }));
    const fatloss = buildPlan(profile({ level: 'int', days: 3, goal: 'fatloss' }));
    const health = buildPlan(profile({ level: 'int', days: 3, goal: 'health' }));
    const weekH = hyper.weeks[2], weekF = fatloss.weeks[2], weekHealth = health.weeks[2];
    const totalSets = (plan, week) => plan.days.flatMap((day) => day.items).reduce((sum, item) => sum + setsFor(item, week, plan, false), 0);
    expect(totalSets(fatloss, weekF)).toBeLessThan(totalSets(hyper, weekH));
    expect(totalSets(health, weekHealth)).toBeLessThan(totalSets(hyper, weekH));
    expect(sessionMinutes(fatloss.days[0], weekF, fatloss, 0)).toBeLessThan(sessionMinutes(hyper.days[0], weekH, hyper, 0));
  });

  it('календар враховує допоміжні м’язи сусідніх днів', () => {
    const squat = EX.find((exercise) => exercise.id === 'bb_squat');
    const glute = EX.find((exercise) => exercise.m === 'glutes');
    const plan = {
      profile: { ...profile(), weekdays: [0, 1] },
      days: [{ items: [{ ex: squat }] }, { items: [{ ex: glute }] }],
    };
    expect(scheduleWarnings(plan).join(' ')).toContain('Сідничні');
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
