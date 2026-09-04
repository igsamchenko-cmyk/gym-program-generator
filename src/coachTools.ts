export type PrescriptionEdit = {
  sets?: number;
  reps?: string;
  rir?: number;
  tempo?: string;
  rest?: string;
  load?: number;
  fixedSets?: boolean;
  fixedLoad?: boolean;
};

export type CustomExercise = PrescriptionEdit & {
  id: string;
  day: number;
  name: string;
  type: 'comp' | 'iso';
  muscle: string;
};

export type CoachEdits = {
  prescriptions: Record<string, PrescriptionEdit>;
  customExercises: CustomExercise[];
};

const finite = (value: unknown, min: number, max: number): number | undefined => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : undefined;
};

export function sanitizeCoachEdits(value: unknown): CoachEdits {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const rawPrescriptions = source.prescriptions && typeof source.prescriptions === 'object' ? source.prescriptions as Record<string, unknown> : {};
  const prescriptions = Object.fromEntries(Object.entries(rawPrescriptions).slice(0, 200).flatMap(([key, raw]) => {
    if (!raw || typeof raw !== 'object') return [];
    const item = raw as Record<string, unknown>;
    const clean: PrescriptionEdit = {};
    const sets = finite(item.sets, 1, 12), rir = finite(item.rir, 0, 10), load = finite(item.load, 0, 1000);
    if (sets !== undefined) clean.sets = Math.round(sets);
    if (rir !== undefined) clean.rir = Math.round(rir);
    if (load !== undefined) clean.load = load;
    if (item.fixedSets === true) clean.fixedSets = true;
    if (item.fixedLoad === true) clean.fixedLoad = true;
    if (typeof item.reps === 'string' && /^\d{1,3}(?:[–-]\d{1,3}|\s*с)?$/u.test(item.reps.trim())) clean.reps = item.reps.trim().replace('-', '–');
    if (typeof item.tempo === 'string' && /^(?:\d|X|—)-(?:\d|X|—)-(?:\d|X|—)$/iu.test(item.tempo.trim())) clean.tempo = item.tempo.trim().toUpperCase();
    if (typeof item.rest === 'string' && item.rest.trim()) clean.rest = item.rest.trim().slice(0, 40);
    return Object.keys(clean).length ? [[key.slice(0, 180), clean]] : [];
  }));
  const customExercises = Array.isArray(source.customExercises) ? source.customExercises.slice(0, 50).flatMap((raw): CustomExercise[] => {
    if (!raw || typeof raw !== 'object') return [];
    const item = raw as Record<string, unknown>;
    const name = typeof item.name === 'string' ? item.name.trim().slice(0, 120) : '';
    const day = finite(item.day, 0, 5);
    if (!name || day === undefined) return [];
    const load = finite(item.load, 0, 1000);
    return [{
      id: typeof item.id === 'string' ? item.id.slice(0, 100) : 'custom-' + Math.random().toString(36).slice(2),
      day: Math.round(day), name,
      type: item.type === 'iso' ? 'iso' : 'comp',
      muscle: typeof item.muscle === 'string' ? item.muscle.slice(0, 40) : 'core',
      sets: Math.round(finite(item.sets, 1, 12) ?? 3),
      reps: typeof item.reps === 'string' ? item.reps.slice(0, 20) : '8–12',
      rir: Math.round(finite(item.rir, 0, 10) ?? 2),
      tempo: typeof item.tempo === 'string' ? item.tempo.slice(0, 20) : '2-0-2',
      rest: typeof item.rest === 'string' ? item.rest.slice(0, 40) : '90 с',
      ...(load === undefined ? {} : { load }),
    }];
  }) : [];
  return { prescriptions, customExercises };
}

export function prescriptionKey(day: number, exerciseId: string): string {
  return day + ':' + exerciseId;
}

const REGION_FOR_MUSCLE: Record<string, string> = {
  chest: 'chest_mid', back: 'back_thick', quads: 'quad', hams: 'ham',
  glutes: 'glute', delts: 'delt_side', biceps: 'bi', triceps: 'tri',
  calves: 'calf_gastro', core: 'core',
};
export function applyCoachEdits(plan: any, value: unknown) {
  const edits = sanitizeCoachEdits(value);
  const next = { ...plan, days: plan.days.map((day: any, dayIndex: number) => ({
    ...day,
    items: day.items.map((item: any) => ({ ...item, coach: edits.prescriptions[prescriptionKey(dayIndex, item.ex.id)] || undefined })),
  })) };
  edits.customExercises.forEach((custom) => {
    const day = next.days[custom.day];
    if (!day) return;
    day.items.push({
      base: custom.sets || 3, boost: false,
      why: ['власна вправа, додана тренером вручну'], coach: { ...custom, ...(edits.prescriptions[prescriptionKey(custom.day, custom.id)] || {}) },
      ex: {
        id: custom.id, n: custom.name, p: 'custom', t: custom.type, m: custom.muscle,
        s: [], rg: REGION_FOR_MUSCLE[custom.muscle] || 'core', eq: custom.load == null ? 'bodyweight' : 'dumbbell', tp: custom.tempo || '2-0-2',
        cue: 'Виконуй у контрольованій амплітуді відповідно до індивідуально перевіреної техніки.',
        err: 'Не використовуй вправу без попереднього навчання техніки та зрозумілих критеріїв зупинки.',
        manualOnly: true,
      },
    });
  });
  return next;
}

export type ClientProfile = {
  id: string;
  name: string;
  savedAt: string;
  state: Record<string, unknown>;
};

export function sanitizeClientProfiles(value: unknown): ClientProfile[] {
  if (!Array.isArray(value)) return [];
  return value.slice(-20).flatMap((raw): ClientProfile[] => {
    if (!raw || typeof raw !== 'object') return [];
    const item = raw as Record<string, unknown>;
    if (!item.state || typeof item.state !== 'object' || !(item.state as Record<string, unknown>).profile) return [];
    const name = typeof item.name === 'string' ? item.name.trim().slice(0, 120) : '';
    if (!name) return [];
    return [{
      id: typeof item.id === 'string' ? item.id.slice(0, 100) : 'client-' + Math.random().toString(36).slice(2),
      name,
      savedAt: typeof item.savedAt === 'string' ? item.savedAt : new Date(0).toISOString(),
      state: item.state as Record<string, unknown>,
    }];
  });
}
export function exerciseRecords(history: any[] = []) {
  const records = new Map<string, { name: string; e1rm: number; weight: number; reps: number; at: string }>();
  history.forEach((session) => (session.exercises || []).forEach((exercise: any) => (exercise.sets || []).forEach((set: any) => {
    const weight = Number(set.weight), reps = Number(set.reps), rir = Number(set.rir || 0);
    if (!(weight > 0) || !(reps > 0)) return;
    const e1rm = Math.round(weight * (1 + (reps + rir) / 30) * 10) / 10;
    const current = records.get(exercise.exerciseId);
    if (!current || e1rm > current.e1rm) records.set(exercise.exerciseId, { name: exercise.name, e1rm, weight, reps, at: session.completedAt });
  })));
  // e1RM має сенс порівнювати в межах тієї самої вправи, а не ранжувати
  // жим ногами проти згинання рук. Список нейтрально впорядковано за назвою.
  return [...records.values()].sort((a, b) => a.name.localeCompare(b.name, 'uk-UA'));
}
