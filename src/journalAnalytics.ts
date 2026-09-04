export type SetLog = { weight?: number; reps?: number; rir?: number };

export type ExerciseSnapshot = {
  exerciseId: string;
  name: string;
  sets: SetLog[];
  pain?: number;
};

export type SessionSnapshot = {
  id: string;
  completedAt: string;
  week: number;
  day: number;
  dayName: string;
  goal: string;
  readiness?: number;
  sessionRpe?: number;
  note?: string;
  exercises: ExerciseSnapshot[];
  volume: number;
  completedSets: number;
  plannedSets?: number;
};

const numberOrUndefined = (value: unknown): number | undefined => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
};

export function setVolume(set: SetLog = {}): number {
  return (numberOrUndefined(set.weight) ?? 0) * (numberOrUndefined(set.reps) ?? 0);
}

export function snapshotVolume(exercises: ExerciseSnapshot[] = []): number {
  return Math.round(exercises.reduce((total, exercise) => (
    total + (exercise.sets || []).reduce((sum, set) => sum + setVolume(set), 0)
  ), 0));
}

export function sanitizeHistory(value: unknown): SessionSnapshot[] {
  if (!Array.isArray(value)) return [];
  return value.slice(-200).flatMap((raw): SessionSnapshot[] => {
    if (!raw || typeof raw !== 'object') return [];
    const item = raw as Record<string, unknown>;
    if (typeof item.completedAt !== 'string' || !Array.isArray(item.exercises)) return [];
    const exercises = item.exercises.slice(0, 20).flatMap((entry): ExerciseSnapshot[] => {
      if (!entry || typeof entry !== 'object') return [];
      const exercise = entry as Record<string, unknown>;
      if (typeof exercise.exerciseId !== 'string' || typeof exercise.name !== 'string') return [];
      const sets = Array.isArray(exercise.sets)
        ? exercise.sets.slice(0, 12).map((set) => {
            if (!set || typeof set !== 'object') return {};
            const source = set as Record<string, unknown>;
            return Object.fromEntries(['weight', 'reps', 'rir'].flatMap((field) => {
              const number = numberOrUndefined(source[field]);
              return number === undefined ? [] : [[field, number]];
            })) as SetLog;
          })
        : [];
      const pain = numberOrUndefined(exercise.pain);
      return [{ exerciseId: exercise.exerciseId.slice(0, 100), name: exercise.name.slice(0, 160), sets, ...(pain === undefined ? {} : { pain }) }];
    });
    const volume = snapshotVolume(exercises);
    const readiness = numberOrUndefined(item.readiness);
    const sessionRpe = numberOrUndefined(item.sessionRpe);
    const plannedSets = numberOrUndefined(item.plannedSets);
    return [{
      id: typeof item.id === 'string' ? item.id.slice(0, 120) : item.completedAt,
      completedAt: item.completedAt,
      week: Math.max(1, Math.round(numberOrUndefined(item.week) ?? 1)),
      day: Math.max(1, Math.round(numberOrUndefined(item.day) ?? 1)),
      dayName: typeof item.dayName === 'string' ? item.dayName.slice(0, 120) : 'Тренування',
      goal: typeof item.goal === 'string' ? item.goal.slice(0, 40) : 'unknown',
      exercises,
      volume,
      completedSets: exercises.reduce((sum, exercise) => sum + exercise.sets.filter((set) => set.reps != null).length, 0),
      ...(plannedSets === undefined ? {} : { plannedSets: Math.round(plannedSets) }),
      ...(readiness === undefined ? {} : { readiness }),
      ...(sessionRpe === undefined ? {} : { sessionRpe }),
      ...(typeof item.note === 'string' && item.note.trim() ? { note: item.note.trim().slice(0, 1000) } : {}),
    }];
  });
}

export function attendanceSummary(history: SessionSnapshot[] = [], plannedSessionsPerWeek = 0, now = Date.now()) {
  const since = now - 28 * 24 * 60 * 60 * 1000;
  const completed = sanitizeHistory(history).filter((session) => {
    const timestamp = new Date(session.completedAt).getTime();
    return Number.isFinite(timestamp) && timestamp >= since && timestamp <= now;
  }).length;
  const planned = Math.max(0, Math.round(Number(plannedSessionsPerWeek) || 0) * 4);
  return { completed, planned, percent: planned ? Math.min(100, Math.round(completed / planned * 100)) : null };
}

export function historySummary(history: SessionSnapshot[] = []) {
  const safeHistory = sanitizeHistory(history);
  const recent = safeHistory.slice(-12);
  const average = (values: Array<number | undefined>) => {
    const usable = values.filter((value): value is number => typeof value === 'number');
    return usable.length ? Math.round(usable.reduce((sum, value) => sum + value, 0) / usable.length * 10) / 10 : null;
  };
  return {
    recent,
    sessions: safeHistory.length,
    averageRpe: average(recent.map((session) => session.sessionRpe)),
    averageReadiness: average(recent.map((session) => session.readiness)),
    totalSets: recent.reduce((sum, session) => sum + session.completedSets, 0),
    maxVolume: Math.max(1, ...recent.map((session) => session.volume)),
  };
}
