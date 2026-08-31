import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EX } from '../data/exercises.js';
import { buildPlan, DEFAULT_PROFILE, isAutoSelectable, isExerciseAllowed } from '../engine.js';

const ADDED_IDS = [
  'decline_pushup', 'db_overhead_ext', 'band_overhead_ext', 'bw_skull',
  'bw_sl_rdl', 'db_hip_thrust', 'db_seated_calf', 'band_straight_arm',
  'incline_db_curl', 'bb_incline', 'pec_deck', 'machine_lat_raise',
  'seated_leg_curl', 'standing_calf', 'preacher_curl', 'machine_pullover',
  't_bar_row', 'slider_rollout', 'pistol_box',
  'elevated_pike', 'trap_bar_deadlift',
];

function profile(overrides = {}) {
  return {
    ...DEFAULT_PROFILE,
    level: 'adv',
    mode: 'auto',
    place: 'gym',
    bar: true,
    priority: [],
    limits: [],
    customDays: [],
    ...overrides,
  };
}

function webpDimensions(buffer) {
  const chunk = buffer.toString('ascii', 12, 16);

  if (chunk === 'VP8X') {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3),
    };
  }

  if (chunk === 'VP8 ') {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }

  if (chunk === 'VP8L') {
    const bits = buffer.readUInt32LE(21);
    return {
      width: 1 + (bits & 0x3fff),
      height: 1 + ((bits >>> 14) & 0x3fff),
    };
  }

  throw new Error(`Непідтримуваний WebP chunk: ${chunk}`);
}

describe('каталог додаткових вправ', () => {
  it('містить 118 унікальних вправ і всі 21 новий запис', () => {
    expect(EX).toHaveLength(118);
    expect(new Set(EX.map((exercise) => exercise.id)).size).toBe(EX.length);
    ADDED_IDS.forEach((id) => expect(EX.some((exercise) => exercise.id === id), id).toBe(true));
    expect(EX.some((exercise) => exercise.id === 'sissy_squat')).toBe(false);
    expect(EX.some((exercise) => exercise.id === 'bench_dips')).toBe(false);
  });

  it('для кожної вправи існує непорожня локальна схема', () => {
    EX.forEach((exercise) => {
      const relative = exercise.media.src.replace(/^\//, '');
      const file = join(process.cwd(), 'public', relative);
      expect(existsSync(file), `${exercise.id}: ${file}`).toBe(true);
      expect(statSync(file).size, exercise.id).toBeGreaterThan(0);
    });
    expect(EX.find((exercise) => exercise.id === 'leg_press').media.src)
      .toBe('exercise-media/leg-press-v2.webp');
    expect(EX.find((exercise) => exercise.id === 'leg_press_calf').media.src)
      .toBe('exercise-media/leg-press-calf-v3.webp');
    expect(EX.find((exercise) => exercise.id === 'rope_overhead').media.src)
      .toBe('exercise-media/rope-overhead-v2.webp');
    expect(EX.find((exercise) => exercise.id === 'deadlift').media.src)
      .toBe('exercise-media/deadlift-v2.webp');
    expect(EX.find((exercise) => exercise.id === 'db_skull').media.src)
      .toBe('exercise-media/db-skull-v2.webp');
    expect(EX.find((exercise) => exercise.id === 'incline_fly').media.src)
      .toBe('exercise-media/incline-fly-v2.webp');
    expect(EX.find((exercise) => exercise.id === 'db_row').media.src)
      .toBe('exercise-media/db-row-v2.webp');
    expect(EX.find((exercise) => exercise.id === 'machine_pullover').media.src)
      .toBe('exercise-media/machine-pullover-v2.webp');
  });

  it('усі локальні схеми є справжніми WebP розміром 1200×800', () => {
    EX.forEach((exercise) => {
      const relative = exercise.media.src.replace(/^\//, '');
      const file = join(process.cwd(), 'public', relative);
      const buffer = readFileSync(file);
      expect(buffer.toString('ascii', 0, 4), exercise.id).toBe('RIFF');
      expect(buffer.toString('ascii', 8, 12), exercise.id).toBe('WEBP');
      expect(webpDimensions(buffer), exercise.id).toEqual({ width: 1200, height: 800 });
    });
  });

  it('треп-гриф доступний вручну, але не потрапляє в автоматичну програму', () => {
    const trapBar = EX.find((exercise) => exercise.id === 'trap_bar_deadlift');
    const advancedGym = profile();
    expect(trapBar.manualOnly).toBe(true);
    expect(isExerciseAllowed(trapBar, advancedGym)).toBe(true);
    expect(isAutoSelectable(trapBar, advancedGym)).toBe(false);

    for (let seed = 0; seed < 40; seed++) {
      const plan = buildPlan(profile({ days: 6, seed, priority: ['hams', 'back'] }));
      expect(plan.days.flatMap((day) => day.items).some((item) => item.ex.manualOnly)).toBe(false);
    }
  });

  it('чутлива зона змінює автоматичний добір, але не оголошує вправу забороненою вручну', () => {
    const benchPress = EX.find((exercise) => exercise.id === 'bb_bench');
    const shoulderSensitive = profile({ limits: ['shoulder'] });
    expect(isExerciseAllowed(benchPress, shoulderSensitive)).toBe(true);
    expect(isAutoSelectable(benchPress, shoulderSensitive)).toBe(false);
  });

  it('«Супермен» лишається ручним додатковим варіантом кора', () => {
    const superman = EX.find((exercise) => exercise.id === 'superman');
    expect(superman.p).toBe('core');
    expect(superman.manualOnly).toBe(true);
    expect(isExerciseAllowed(superman, profile())).toBe(true);
    expect(isAutoSelectable(superman, profile())).toBe(false);
  });

  it('складні варіанти не пропонуються початківцям', () => {
    const beginnerHome = profile({ level: 'beg', place: 'home', bar: false });
    ['decline_pushup', 'bw_skull', 'bw_sl_rdl', 'db_hip_thrust', 'slider_rollout',
      'pistol_box', 'elevated_pike'].forEach((id) => {
      const exercise = EX.find((item) => item.id === id);
      expect(isExerciseAllowed(exercise, beginnerHome), id).toBe(false);
    });
  });
});
