import { describe, expect, it } from 'vitest';
import { cleanPendingAdaptation, cleanRevisions, diffProgramSnapshots, makeProgramSnapshot, makeSharePayload, APP_STATE_VERSION } from '../appState.js';
import { applyCoachEdits, exerciseRecords, sanitizeCoachEdits } from '../coachTools.ts';
import { aerobicSchedule, healthProgress } from '../healthPlan.ts';
import { attendanceSummary } from '../journalAnalytics.ts';
import { trainingAdaptation } from '../trainingAdaptation.ts';
import { loadFor, setsFor } from '../prescription.js';
import { buildPlan, DEFAULT_PROFILE, sessionMinutes, weeklyVolume } from '../engine.js';

describe('professional workflow safeguards', () => {
  it('adapts the next session from readiness, RPE and pain', () => {
    expect(trainingAdaptation([]).level).toBe('normal');
    expect(trainingAdaptation([{ readiness: 2, sessionRpe: 7 }])).toMatchObject({
      level: 'reduce', setFactor: 0.8, loadFactor: 0.9,
    });
    expect(trainingAdaptation([
      { readiness: 2, sessionRpe: 9 },
      { readiness: 3, sessionRpe: 8, exercises: [{ pain: 4 }] },
    ])).toMatchObject({ level: 'recover', setFactor: 0.65, loadFactor: 0.85 });
  });

  it('sanitizes and applies prescription edits and custom exercises', () => {
    const edits = sanitizeCoachEdits({
      prescriptions: { '0:press': { sets: 4, reps: '6-8', rir: 2, tempo: '3-0-1', rest: '2 хв', load: 70 } },
      customExercises: [{ id: 'custom-one', day: 0, name: 'Моя тяга', muscle: 'back', type: 'comp', sets: 3 }],
    });
    const plan = {
      days: [{ name: 'A', items: [{ base: 3, ex: { id: 'press', n: 'Жим', m: 'chest', p: 'h_push', t: 'comp' } }] }],
    };
    const result = applyCoachEdits(plan, edits);
    expect(result.days[0].items[0].coach).toMatchObject({ sets: 4, reps: '6–8', load: 70 });
    expect(result.days[0].items[1].ex).toMatchObject({ id: 'custom-one', n: 'Моя тяга', rg: 'back_thick' });
  });

  it('keeps coach edits in a share payload', () => {
    const payload = makeSharePayload({
      profile: { age: 30 }, anchors: {}, swaps: {},
      coachEdits: { prescriptions: { '0:x': { sets: 4 } }, customExercises: [] },
    });
    expect(payload.version).toBe(APP_STATE_VERSION);
    expect(payload.coachEdits.prescriptions['0:x'].sets).toBe(4);
  });

  it('matches planned weight to target reps and RIR instead of a fixed goal percent', () => {
    const item = { base: 3, ex: { id: 'press', t: 'comp', eq: 'barbell' } };
    const week = { rb: 3, ri: 2, load: 0.87, mult: 1 };
    const plan = { profile: { goal: 'strength', level: 'int', fatigue: false }, flags: { teen: false } };
    const result = loadFor(item, week, false, { press: { weight: 100, reps: 5, rir: 3 } }, plan);
    expect(result).toBe(100);
  });

  it('uses movement-specific secondary set credits', () => {
    const plan = {
      profile: { goal: 'hyper', level: 'int', fatigue: false },
      flags: { teen: false },
      days: [{ items: [{ base: 2, ex: { id: 'press', m: 'chest', s: ['triceps', 'delts'], rg: 'chest_mid', p: 'h_push', t: 'comp' } }] }],
    };
    const volume = weeklyVolume(plan, { rb: 3, ri: 2, mult: 1 });
    expect(volume.byMuscle).toMatchObject({ chest: 2, triceps: 1, delts: 0.7 });
  });

  it('builds concrete progressive aerobic sessions and counts actual minutes', () => {
    const first = aerobicSchedule({ level: 'beg' }, 0);
    const later = aerobicSchedule({ level: 'beg' }, 3);
    expect(first).toHaveLength(4);
    expect(later).toHaveLength(5);
    expect(later[0].minutes).toBeGreaterThan(first[0].minutes);
    expect(healthProgress({ level: 'beg' }, { aerobicSession0: 30, aerobicSession1: 30 }, 0).aerobic).toBe(60);
  });

  it('derives exercise records from performed sets', () => {
    const records = exerciseRecords([{
      completedAt: '2026-01-01T00:00:00.000Z',
      exercises: [{ exerciseId: 'row', name: 'Тяга', sets: [{ weight: 80, reps: 8, rir: 2 }] }],
    }]);
    expect(records[0]).toMatchObject({ name: 'Тяга', weight: 80, reps: 8 });
    expect(records[0].e1rm).toBeGreaterThan(100);
  });
  it('uses goal-specific volume budgets and keeps health sessions below hypertrophy', () => {
    const plans = Object.fromEntries(['hyper', 'strength', 'fatloss', 'health'].map((goal) => {
      const plan = buildPlan({ ...DEFAULT_PROFILE, goal, level: 'adv', days: 3 });
      const peak = plan.weeks.reduce((a, b) => a.mult > b.mult ? a : b);
      const sets = plan.days.flatMap((day) => day.items).reduce((sum, item) => sum + setsFor(item, peak, plan, false), 0);
      return [goal, { sets, maxMinutes: Math.max(...plan.days.map((day, index) => sessionMinutes(day, peak, plan, index))) }];
    }));
    expect(plans.health.sets).toBeLessThan(plans.hyper.sets);
    expect(plans.fatloss.sets).toBeLessThan(plans.hyper.sets);
    expect(plans.strength.sets).toBeLessThan(plans.hyper.sets);
    expect(plans.health.maxMinutes).toBeLessThan(90);
  });

  it('applies manual prescriptions through periodization unless explicitly fixed', () => {
    const week = { rb: 3, ri: 2, load: 0.6, mult: 0.6, deload: true };
    const plan = { profile: { goal: 'hyper', level: 'int', fatigue: false }, flags: { teen: false } };
    const item = { base: 3, coach: { sets: 4, load: 100 }, ex: { id: 'press', t: 'comp', eq: 'barbell' } };
    expect(setsFor(item, week, plan, false)).toBe(2);
    expect(loadFor(item, week, false, {}, plan)).toBe(60);
    const fixed = { ...item, coach: { ...item.coach, fixedSets: true, fixedLoad: true } };
    expect(setsFor(fixed, week, plan, false)).toBe(4);
    expect(loadFor(fixed, week, false, {}, plan)).toBe(100);
  });

  it('clears an earlier fatigue signal after a normal latest session', () => {
    expect(trainingAdaptation([{ readiness: 2 }, { readiness: 4, sessionRpe: 7 }]).level).toBe('normal');
  });

  it('stores restorable revision snapshots and exposes exact differences', () => {
    const first = makeProgramSnapshot({ profile: { goal: 'health', days: 3 }, anchors: {}, swaps: {}, coachEdits: {} });
    const second = makeProgramSnapshot({ profile: { goal: 'health', days: 4 }, anchors: {}, swaps: {}, coachEdits: {} });
    const revisions = cleanRevisions([{ id: 'r1', at: '2026-09-04T00:00:00.000Z', summary: 'Початкова', snapshot: first }]);
    expect(revisions[0].snapshot.profile.days).toBe(3);
    expect(diffProgramSnapshots(first, second)).toContainEqual(expect.objectContaining({ path: 'profile.days', before: '3', after: '4' }));
  });

  it('sanitizes a one-time adaptation target and calculates 28-day attendance', () => {
    expect(cleanPendingAdaptation({ week: 1, day: 2, sourceId: 's1', decision: { level: 'reduce', setFactor: 0.8, loadFactor: 0.9, message: 'ok' } })).toMatchObject({ week: 1, day: 2 });
    const now = new Date('2026-09-04T12:00:00.000Z').getTime();
    const history = Array.from({ length: 6 }, (_, index) => ({
      id: 's' + index, completedAt: new Date(now - index * 86400000).toISOString(), week: 1, day: 1, dayName: 'A', goal: 'health', exercises: [],
    }));
    expect(attendanceSummary(history, 3, now)).toEqual({ completed: 6, planned: 12, percent: 50 });
  });
});
