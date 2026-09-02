import { describe, expect, it } from 'vitest';
import { EX } from '../data/exercises.js';
import {
  cleanAnchors,
  cleanJournal,
  decodeSharePayload,
  encodeSharePayload,
  hydrateSwaps,
  journalKey,
  makeSharePayload,
  serializeSwaps,
} from '../appState.js';

describe('app state portability', () => {
  it('removes empty and invalid anchor values', () => {
    expect(cleanAnchors({ bench: '80', empty: '', zero: 0, bad: 'x' })).toEqual({ bench: 80 });
    expect(cleanAnchors({ squat: { weight: '100', reps: '5', rir: '2' } })).toEqual({
      squat: { weight: 100, reps: 5, rir: 2 },
    });
  });

  it('keeps per-set logs, pain, session RPE, readiness and notes', () => {
    expect(cleanJournal({
      a: { sets: [{ weight: '80', reps: '8', rir: '2' }, {}], pain: '1', note: 'Чисто' },
      'session:0:0': { readiness: '4', sessionRpe: '7', note: 'Добрий сон' },
    })).toEqual({
      a: { done: false, pain: 1, sets: [{ weight: 80, reps: 8, rir: 2 }], note: 'Чисто' },
      'session:0:0': { done: false, sessionRpe: 7, readiness: 4, note: 'Добрий сон' },
    });
  });

  it('keeps only usable journal entries', () => {
    expect(cleanJournal({
      a: { done: true, weight: '60', reps: '8', rir: '2', updatedAt: '2026-01-01T00:00:00.000Z' },
      b: { done: false, weight: '', reps: null },
      c: null,
    })).toEqual({
      a: { done: true, weight: 60, reps: 8, rir: 2, updatedAt: '2026-01-01T00:00:00.000Z' },
    });
  });

  it('serializes swaps as ids and restores current exercise objects', () => {
    const swaps = { '0:pushup': EX.find((exercise) => exercise.id === 'db_bench') };
    const packed = serializeSwaps(swaps);
    expect(packed).toEqual({ '0:pushup': 'db_bench' });
    expect(hydrateSwaps(packed, EX)['0:pushup'].id).toBe('db_bench');
  });

  it('round-trips a share payload with unicode safely', () => {
    const payload = makeSharePayload({
      profile: { goal: 'hyper', note: 'Програма' },
      anchors: { bb_bench: 100 },
      swaps: {},
    });
    expect(decodeSharePayload(encodeSharePayload(payload))).toEqual(payload);
  });

  it('builds stable journal keys', () => {
    expect(journalKey(2, 1, 'bb_bench')).toBe('2:1:bb_bench');
  });
});
