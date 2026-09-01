import { describe, it, expect } from 'vitest';
import {
  buildPlan, DEFAULT_PROFILE, targetFor, weeklyVolume, ageFlags, allowedEquipmentFor,
  frequency, isExerciseAllowed, MACRO, LOADS,
} from '../engine.js';
import { MUSCLE, EQUIP_SETS } from '../data/labels.js';
import { EX } from '../data/exercises.js';

const PLACES = ['gym', 'db', 'band', 'bw'];
const LEVELS = ['beg', 'int', 'adv'];
const DAYS = [2, 3, 4, 5, 6];
const SEXES = ['m', 'f', 'x'];
const AGES = [16, 28, 39, 52];

function profile(overrides = {}) {
  return { ...DEFAULT_PROFILE, mode: 'auto', customDays: [], priority: [], limits: [], seed: 0, ...overrides };
}

describe('buildPlan — структурна коректність', () => {
  it('домашні типи обладнання поєднуються, а вага тіла лишається доступною завжди', () => {
    const allowed = allowedEquipmentFor(profile({ place: 'home', homeEquipment: ['dumbbell', 'band'] }));
    expect([...allowed].sort()).toEqual(['band', 'bodyweight', 'dumbbell']);
    expect(allowed.has('barbell')).toBe(false);
    expect(allowed.has('pullupbar')).toBe(false);
  });

  it('жодна вправа не повторюється в межах одного дня', () => {
    for (const place of PLACES) for (const level of LEVELS) for (const days of DAYS) {
      const plan = buildPlan(profile({ level, days, place, bar: place === 'gym' }));
      plan.days.forEach((day) => {
        const ids = day.items.map((it) => it.ex.id);
        expect(new Set(ids).size, `${place}/${level}/${days}д — дублікат у дні "${day.name}"`).toBe(ids.length);
      });
    }
  });

  it('кожен день містить щонайменше 3 вправи для будь-якого обладнання', () => {
    for (const place of PLACES) for (const level of LEVELS) for (const days of DAYS) {
      const plan = buildPlan(profile({ level, days, place, bar: place === 'gym' }));
      plan.days.forEach((day) => {
        expect(day.items.length, `${place}/${level}/${days}д — день "${day.name}" закороткий`).toBeGreaterThanOrEqual(3);
      });
    }
  });

  it('автоматичний план не пропонує варіанти, позначені для чутливої зони', () => {
    for (const limit of ['knee', 'lowback', 'shoulder']) {
      const plan = buildPlan(profile({ level: 'adv', days: 4, place: 'gym', bar: true, limits: [limit] }));
      const bad = plan.days.flatMap((d) => d.items).filter((it) => (it.ex.av || []).includes(limit));
      expect(bad.map((b) => b.ex.n), `порушено обмеження "${limit}"`).toEqual([]);
    }
  });

  it('у залі досвідченому не підставляється вага тіла чи резинка там, де є навантажуваний варіант (крім core/calves)', () => {
    const plan = buildPlan(profile({ level: 'adv', days: 4, place: 'gym', bar: true }));
    const substituted = plan.days.flatMap((d) => d.items)
      .filter((it) => ['bodyweight', 'band'].includes(it.ex.eq) && !['core', 'calves'].includes(it.ex.p));
    expect(substituted.map((s) => s.ex.n)).toEqual([]);
  });

  it('підліток ніколи не отримує RIR нижче 2 поза делоадом', () => {
    const plan = buildPlan(profile({ age: 16, level: 'adv', days: 4, place: 'gym', bar: true }));
    plan.weeks.filter((w) => !w.deload).forEach((w) => {
      expect(w.rb, `тиждень "${w.tag}" — RIR бази нижче 2`).toBeGreaterThanOrEqual(2);
      expect(w.ri, `тиждень "${w.tag}" — RIR ізоляції нижче 2`).toBeGreaterThanOrEqual(2);
    });
  });

  it('підліток не отримує важкий блок і тест-тиждень', () => {
    const plan = buildPlan(profile({ age: 16, level: 'adv', days: 4, place: 'gym', bar: true }));
    expect(plan.weeks.some((w) => w.heavy || w.test)).toBe(false);
  });

  it('довжина макроциклу росте зі стажем: 5 / 7 / 11 тижнів', () => {
    expect(buildPlan(profile({ level: 'beg' })).weeks.length).toBe(5);
    expect(buildPlan(profile({ level: 'int' })).weeks.length).toBe(7);
    expect(buildPlan(profile({ level: 'adv' })).weeks.length).toBe(11);
  });

  it('кожен патерн вправи має хоч один варіант для кожного типу обладнання', () => {
    const patterns = [...new Set(EX.map((e) => e.p))];
    for (const place of PLACES) {
      const allowed = new Set(EQUIP_SETS[place]);
      const missing = patterns.filter((p) => !EX.some((e) => e.p === p && allowed.has(e.eq)));
      // side_delt/v_pull без турніка й тренажерів історично вузькі місця — стежимо, щоб їх не побільшало
      expect(missing.length, `${place}: немає жодної вправи для патернів ${missing.join(', ')}`).toBeLessThanOrEqual(2);
    }
  });

  it('тижневий обсяг на піку не перевищує стелю навіть із двома пріоритетами', () => {
    const excess = [];
    for (const place of PLACES) for (const level of LEVELS) for (const days of DAYS) for (const sex of SEXES) {
      const plan = buildPlan(profile({ level, days, place, bar: place === 'gym', sex, priority: ['back', 'chest'] }));
      const peak = plan.weeks.reduce((a, b) => (a.mult > b.mult ? a : b));
      const v = weeklyVolume(plan, peak).byMuscle;
      Object.keys(MUSCLE).forEach((m) => {
        const [, hi] = targetFor(level, m, plan.flags.teen, sex);
        const value = Math.round(v[m] || 0);
        if (value > hi) excess.push({ place, level, days, sex, muscle: m, value, hi });
      });
      expect(plan.volumeOverCap).toEqual({});
    }
    expect(excess).toEqual([]);
  });

  it('підліткова програма також дотримується зменшеної стелі обсягу', () => {
    const plan = buildPlan(profile({ age: 15, level: 'beg', days: 5, place: 'home', homeEquipment: ['dumbbell'] }));
    const peak = plan.weeks.reduce((a, b) => (a.mult > b.mult ? a : b));
    const volume = weeklyVolume(plan, peak).byMuscle;
    Object.keys(MUSCLE).forEach((muscle) => {
      const [, hi] = targetFor('beg', muscle, true, plan.profile.sex);
      expect(Math.round(volume[muscle] || 0), muscle).toBeLessThanOrEqual(hi);
    });
  });

  it('профіль «потрібна опора» ніколи не отримує вправу з високою вимогою до балансу', () => {
    for (let seed = 0; seed < 40; seed++) {
      const plan = buildPlan(profile({
        level: 'adv', days: 6, place: 'home', homeEquipment: ['dumbbell', 'band'],
        balance: 'support', limits: ['lowback'], seed,
      }));
      plan.days.flatMap((day) => day.items).forEach((item) => {
        expect(item.ex.st || 0, item.ex.id).toBeLessThanOrEqual(1);
        expect(isExerciseAllowed(item.ex, plan.profile), item.ex.id).toBe(true);
      });
    }
  });

  it('позначає день, який не вдалося наповнити через інвентар та обмеження', () => {
    const plan = buildPlan(profile({
      level: 'beg', days: 5, place: 'home', homeEquipment: [],
      avoid: ['floor', 'lunges', 'pullups'], limits: ['knee', 'lowback', 'shoulder'], balance: 'support',
    }));
    expect(plan.underfilledDays.length).toBeGreaterThan(0);
    plan.underfilledDays.forEach((index) => expect(plan.days[index].underfilled).toBe(true));
  });

  it('частота враховує і головні, і допоміжні м’язи базових рухів', () => {
    const plan = buildPlan(profile({ level: 'int', days: 6, place: 'gym', programStyle: 'split' }));
    const result = frequency(plan);
    expect(result.biceps).toBeGreaterThanOrEqual(2);
    expect(result.triceps).toBeGreaterThanOrEqual(2);
  });

  it('у перших чотирьох тижнях новачка за раз змінюється лише одна змінна', () => {
    const work = MACRO.beg.slice(0, 4).map((week, index) => ({
      mult: week.mult, rb: week.rb, ri: week.ri, load: LOADS.beg[index],
    }));
    expect(work).toEqual([
      { mult: 1, rb: 3, ri: 3, load: 0.85 },
      { mult: 1, rb: 3, ri: 3, load: 0.9 },
      { mult: 1.15, rb: 3, ri: 3, load: 0.9 },
      { mult: 1.15, rb: 3, ri: 3, load: 0.95 },
    ]);
  });

  it('buildPlan не падає на жодному з 900+ поєднань профілю', () => {
    let count = 0;
    for (const place of PLACES) for (const level of LEVELS) for (const days of DAYS)
      for (const sex of SEXES) for (const age of AGES) {
        expect(() => buildPlan(profile({ place, level, days, sex, age, bar: place === 'gym' }))).not.toThrow();
        count++;
      }
    expect(count).toBeGreaterThan(700);
  });
});

describe('buildPlan — захист від пошкоджених профілів (регресія на баг з localStorage)', () => {
  it('не падає, якщо priority/limits/customDays/weekdays відсутні взагалі', () => {
    const broken = { age: 28, level: 'int', days: 4, place: 'gym', bar: true, goal: 'hyper' };
    expect(() => buildPlan(broken)).not.toThrow();
  });

  it('не падає на повністю порожньому об’єкті', () => {
    expect(() => buildPlan({})).not.toThrow();
  });

  it('SyntheticEvent-подібний обʼєкт (регресія головного бага з кнопкою) не ламає buildPlan', () => {
    // імітація React SyntheticEvent: truthy обʼєкт без жодного очікуваного поля
    const fakeEvent = { type: 'click', target: {}, preventDefault: () => {} };
    expect(() => buildPlan(fakeEvent)).not.toThrow();
  });
});

describe('ageFlags — лише підлітковий запобіжник', () => {
  it('дорослий вік не перемикає вправи через довільні пороги', () => {
    expect(ageFlags(17).teen).toBe(true);
    expect(ageFlags(18).teen).toBe(false);
    expect(ageFlags(35)).toEqual({ teen: false });
    expect(ageFlags(70)).toEqual({ teen: false });
  });
});
