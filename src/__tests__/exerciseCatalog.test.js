import { existsSync, statSync } from 'node:fs';
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

describe('каталог додаткових вправ', () => {
  it('містить 119 унікальних вправ і всі 21 новий запис', () => {
    expect(EX).toHaveLength(119);
    expect(new Set(EX.map((exercise) => exercise.id)).size).toBe(EX.length);
    ADDED_IDS.forEach((id) => expect(EX.some((exercise) => exercise.id === id), id).toBe(true));
    expect(EX.some((exercise) => exercise.id === 'sissy_squat')).toBe(false);
  });

  it('для кожної вправи існує непорожня локальна схема', () => {
    EX.forEach((exercise) => {
      const relative = exercise.media.src.replace(/^\//, '');
      const file = join(process.cwd(), 'public', relative);
      expect(existsSync(file), `${exercise.id}: ${file}`).toBe(true);
      expect(statSync(file).size, exercise.id).toBeGreaterThan(0);
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

  it('складні варіанти не пропонуються початківцям', () => {
    const beginnerHome = profile({ level: 'beg', place: 'home', bar: false });
    ['decline_pushup', 'bw_skull', 'bw_sl_rdl', 'db_hip_thrust', 'slider_rollout',
      'pistol_box', 'elevated_pike'].forEach((id) => {
      const exercise = EX.find((item) => item.id === id);
      expect(isExerciseAllowed(exercise, beginnerHome), id).toBe(false);
    });
  });
});
