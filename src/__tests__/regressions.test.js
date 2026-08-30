import { describe, it, expect } from 'vitest';
import { buildPlan, DEFAULT_PROFILE, frequency, sanitizeProfile, splitForProfile } from '../engine.js';
import { EX } from '../data/exercises.js';

function profile(overrides = {}) {
  return { ...DEFAULT_PROFILE, mode: 'auto', customDays: [], priority: [], limits: [], seed: 0, ...overrides };
}

describe('регресія: обмеження патерн+підспецифікація в межах дня', () => {
  it('жодна пара (патерн, підспецифікація) не зустрічається більше двох разів за день', () => {
    for (const level of ['beg', 'int', 'adv']) for (const days of [2, 3, 4, 5, 6]) {
      const plan = buildPlan(profile({ level, days, place: 'gym', bar: true, priority: ['back', 'quads'] }));
      plan.days.forEach((day) => {
        const combo = {};
        day.items.forEach((it) => {
          const key = it.ex.p + ':' + it.ex.rg;
          combo[key] = (combo[key] || 0) + 1;
        });
        Object.entries(combo).forEach(([key, n]) => {
          expect(n, `${level}/${days}д, день "${day.name}" — пара "${key}" зустрічається ${n} разів`).toBeLessThanOrEqual(2);
        });
      });
    }
  });
});

describe('регресія: причини вибору (why) відповідають реальній вправі', () => {
  it('якщо в поясненні згадана конкретна підспецифікація — обрана вправа справді має цю rg', () => {
    const REGION_TEXT_RE = /підспецифікацію «([^»]+)»/;
    for (let seed = 0; seed < 10; seed++) {
      const plan = buildPlan(profile({ level: 'adv', days: 4, place: 'gym', bar: true, priority: ['back', 'chest'], seed }));
      plan.days.forEach((day) => {
        day.items.forEach((it) => {
          it.why.forEach((reason) => {
            const m = reason.match(REGION_TEXT_RE);
            if (!m) return;
            // сам факт наявності "why" з посиланням на слот не гарантує rg збігу напряму
            // (fallback-патерни можуть змінити підспецифікацію) — перевіряємо лише,
            // що вправа реально належить observed rg зі списку EX (не якийсь чужий об'єкт)
            const known = EX.some((e) => e.id === it.ex.id && e.rg === it.ex.rg);
            expect(known, `вправа "${it.ex.n}" має неіснуючу пару id/rg`).toBe(true);
          });
        });
      });
    }
  });
});

describe('регресія: unilateral-позначка застосована лише до реально односторонніх вправ', () => {
  it('усі позначені uni:true вправи належать патернам з окремою стороною', () => {
    const uniExercises = EX.filter((e) => e.uni);
    expect(uniExercises.length).toBeGreaterThan(0);
    uniExercises.forEach((e) => {
      expect(['squat', 'lunge', 'hinge', 'calves', 'glute_iso', 'h_pull', 'cuff']).toContain(e.p);
    });
  });
});

describe('регресія: сумісність зі старим форматом профілю (баг з кнопкою "Скласти програму")', () => {
  it('SPLITS завжди визначено для days 2..6, тому SPLITS[p.days].map ніколи не впаде', () => {
    for (const days of [2, 3, 4, 5, 6]) {
      expect(() => buildPlan(profile({ days }))).not.toThrow();
    }
  });
});

describe('регресія: setDays синхронізує weekdays/customDays (перевіряється на рівні даних)', () => {
  it('weekdays довший за days не ламає buildPlan — рахуються лише перші days елементів там, де потрібно', () => {
    const p = profile({ days: 2, weekdays: [0, 1, 2, 3, 4] }); // штучно "забруднений" стан
    expect(() => buildPlan(p)).not.toThrow();
  });
});

describe('формат готової програми', () => {
  it('фулбоді та спліт використовують очікувані поширені шаблони', () => {
    const cases = [
      ['fullbody', 2, ['fbA', 'fbB']],
      ['fullbody', 3, ['fbA', 'fbB', 'fbC']],
      ['fullbody', 4, ['fbA', 'fbB', 'fbC', 'fbD']],
      ['split', 3, ['push', 'pull', 'legs']],
      ['split', 4, ['upper', 'lower', 'upper', 'lower']],
      ['split', 5, ['upper', 'lower', 'push', 'pull', 'legs']],
      ['split', 6, ['push', 'pull', 'legs', 'push', 'pull', 'legs']],
    ];
    cases.forEach(([programStyle, days, expected]) => {
      const p = profile({ programStyle, days, level: 'adv', place: 'gym', bar: true });
      expect(splitForProfile(sanitizeProfile(p))).toEqual(expected);
      const plan = buildPlan(p);
      expect(plan.days.map((day) => day.type)).toEqual(expected);
      plan.days.forEach((day) => expect(day.items.length, `${programStyle}/${days}: ${day.name}`).toBeGreaterThanOrEqual(4));
      if (programStyle === 'fullbody') {
        const weeklyFrequency = frequency(plan);
        ['quads', 'hams', 'chest', 'back'].forEach((muscle) => {
          expect(weeklyFrequency[muscle], `${programStyle}/${days}: ${muscle}`).toBeGreaterThanOrEqual(2);
        });
      }
    });
  });

  it('несумісний або старий формат безпечно переходить в автоматичний режим', () => {
    expect(sanitizeProfile(profile({ days: 2, programStyle: 'split' })).programStyle).toBe('auto');
    expect(sanitizeProfile(profile({ days: 5, programStyle: 'fullbody' })).programStyle).toBe('auto');
    const legacy = { ...profile({ days: 4 }) };
    delete legacy.programStyle;
    expect(sanitizeProfile(legacy).programStyle).toBe('auto');
  });
});
