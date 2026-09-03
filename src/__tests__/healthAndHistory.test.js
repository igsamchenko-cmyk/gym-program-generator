import { describe, expect, it } from 'vitest';
import { aerobicEquivalent, healthProgress, healthTargets, healthWeekKey } from '../healthPlan.ts';
import { historySummary, sanitizeHistory, setVolume, snapshotVolume } from '../journalAnalytics.ts';

describe('повний план здоров’я', () => {
  it('рахує еквівалент помірної аеробної активності', () => {
    expect(aerobicEquivalent({ moderateMinutes: 90, vigorousMinutes: 30 })).toBe(150);
    expect(healthProgress({}, { moderateMinutes: 90, vigorousMinutes: 30 }).aerobicPercent).toBe(100);
  });

  it('пріоритезує три сесії балансу для старших людей або потреби в опорі', () => {
    expect(healthTargets({ age: 65 }).balanceSessions).toBe(3);
    expect(healthTargets({ age: 40, balance: 'support' }).balanceSessions).toBe(3);
    expect(healthTargets({ age: 40, balance: 'steady' }).balanceSessions).toBe(2);
    expect(healthWeekKey(2)).toBe('health:2');
  });
});

describe('історія тренувань', () => {
  const exercises = [{
    exerciseId: 'bench',
    name: 'Жим',
    sets: [{ weight: 80, reps: 8, rir: 2 }, { weight: 80, reps: 7, rir: 1 }],
  }];

  it('обчислює тоннаж за фактично заповненими підходами', () => {
    expect(setVolume(exercises[0].sets[0])).toBe(640);
    expect(snapshotVolume(exercises)).toBe(1200);
  });

  it('санітизує історію та формує короткий тренд', () => {
    const history = sanitizeHistory([{
      id: '1',
      completedAt: '2026-09-03T10:00:00.000Z',
      week: 2,
      day: 1,
      dayName: 'Верх',
      goal: 'strength',
      readiness: '4',
      sessionRpe: '7',
      exercises,
    }]);
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ volume: 1200, completedSets: 2, readiness: 4, sessionRpe: 7 });
    expect(historySummary(history)).toMatchObject({ sessions: 1, averageRpe: 7, averageReadiness: 4, totalSets: 2 });
  });

  it('відкидає пошкоджені записи й обмежує історію двомастами сесіями', () => {
    const valid = Array.from({ length: 205 }, (_, index) => ({
      id: String(index),
      completedAt: new Date(2026, 0, index + 1).toISOString(),
      exercises: [],
    }));
    expect(sanitizeHistory([null, { completedAt: 3 }, ...valid])).toHaveLength(200);
  });
});
