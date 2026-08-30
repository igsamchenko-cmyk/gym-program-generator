import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import TrainingConstructor, { HomeEquipmentPanel } from '../TrainingConstructor.jsx';
import {
  AVOID, FOCUS, SEX, DEFAULT_PROFILE,
  buildPlan, frequency, isAvoidedExercise, isExerciseAllowed, sanitizeProfile,
} from '../engine.js';
import { EX } from '../data/exercises.js';

function profile(overrides = {}) {
  return {
    ...DEFAULT_PROFILE,
    mode: 'auto', customDays: [], limits: [], avoid: [], seed: 0,
    ...overrides,
  };
}

const items = (plan) => plan.days.flatMap((day) => day.items);

describe('акцент програми та особисті виключення', () => {
  it('анкета рендерить видимий акцент і особисті виключення', () => {
    const html = renderToStaticMarkup(createElement(TrainingConstructor));
    expect(html).toContain('Акцент програми');
    expect(html).toContain('Сідниці та стегна');
    expect(html).toContain('Формат тренувань');
    expect(html).toContain('Підібрати автоматично');
    expect(html).toContain('Фулбоді');
    expect(html).toContain('Спліт');
    expect(html).toContain('Виключити з програми');
    expect(html).toContain('Без виключень');
    expect(html).toContain('Необов’язково');
    expect(html).toContain('Вправи на підлозі');
    expect(html).toContain('.tk::before');
    expect(html).toContain('fitness-center-light-v1.jpg');
    expect(html).toContain('fitness-center-dark-v1.jpg');
    expect(html).toContain('--bar-glass:rgba(20,24,26,.72)');
    expect(html).toContain('backdrop-filter:blur(8px)');
    expect(html).toContain('prefers-reduced-transparency:reduce');
    expect(html).toContain('tk-card tk-card-dense');
    expect(html).toMatch(/class="tk-bar"[\s\S]*?<\/button><\/div><div class="tk-credit"/);
  });

  it('домашнє обладнання можна поєднувати, а рекомендації містять безпечні заміни', () => {
    const html = renderToStaticMarkup(createElement(HomeEquipmentPanel, { value: ['dumbbell', 'band'] }));
    expect(html).toContain('Що є вдома');
    expect(html).toContain('Гантелі');
    expect(html).toContain('Резинки');
    expect(html).toContain('Вага тіла');
    expect(html).toContain('доступна завжди');
    expect(html).toContain('Що стане у пригоді вдома');
    expect(html).toContain('рюкзак');
    expect(html).toContain('стільці на колесах');
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(2);
  });

  it('жіночий стартовий профіль видимий, а старі збережені дані мігрують без втрат', () => {
    expect(SEX.f.focus).toBe('glutes');
    expect(FOCUS[SEX.f.focus].priority).toEqual(['glutes', 'hams']);

    const oldFemale = sanitizeProfile({ sex: 'f', priority: ['glutes', 'hams'], days: 3 });
    expect(oldFemale.focus).toBe('glutes');
    expect(oldFemale.avoid).toEqual([]);

    const corrupted = sanitizeProfile({ focus: 'вигаданий', avoid: ['barbell', 'вигадане', 'dips', 'barbell'] });
    expect(corrupted.focus).toBe('upper');
    expect(corrupted.avoid).toEqual(['barbell', 'dips']);
  });

  it('сідничний профіль реально додає пряме покриття у фулбоді новачка', () => {
    const balanced = buildPlan(profile({ sex: 'f', age: 28, level: 'beg', days: 3, focus: 'balanced', priority: [] }));
    const glutes = buildPlan(profile({ sex: 'f', age: 28, level: 'beg', days: 3, focus: 'glutes', priority: ['glutes', 'hams'] }));
    const balancedFrequency = frequency(balanced);
    const gluteFrequency = frequency(glutes);

    expect(gluteFrequency.glutes || 0).toBeGreaterThan(balancedFrequency.glutes || 0);
    expect(gluteFrequency.glutes).toBeGreaterThanOrEqual(2);
    expect(gluteFrequency.hams).toBeGreaterThanOrEqual(2);
  });

  it('профіль «Сідниці та стегна» не віддає перевагу штанговим присіданням чи брусам', () => {
    for (const level of ['beg', 'int', 'adv']) for (const age of [16, 28, 45])
      for (const sex of ['m', 'f']) for (const days of [2, 3, 4, 5, 6]) for (let seed = 0; seed < 30; seed++) {
        const plan = buildPlan(profile({ sex, age, level, days, focus: 'glutes', priority: ['glutes', 'hams'], goal: 'hyper', seed }));
        const ids = items(plan).map((item) => item.ex.id);
        expect(ids, `${level}/${age}/${sex}/${days}д/${seed}: присідання зі штангою`).not.toContain('bb_squat');
        expect(ids, `${level}/${age}/${sex}/${days}д/${seed}: бруси з вагою`).not.toContain('weighted_dips');
      }
  });

  it('кожне «не хочу виконувати» однаково фільтрує генератор і ручні заміни', () => {
    for (const avoidKey of Object.keys(AVOID)) for (const level of ['beg', 'int', 'adv'])
      for (let seed = 0; seed < 24; seed++) {
        const p = profile({ sex: 'f', age: 28, level, days: 4, focus: 'glutes', priority: ['glutes', 'hams'], avoid: [avoidKey], seed });
        const plan = buildPlan(p);
        items(plan).forEach((item) => {
          expect(isAvoidedExercise(item.ex, plan.profile), `${avoidKey}/${level}/${seed}: ${item.ex.id}`).toBe(false);
        });
        EX.filter((exercise) => isAvoidedExercise(exercise, plan.profile)).forEach((exercise) => {
          expect(isExerciseAllowed(exercise, plan.profile), `${avoidKey}: ручна заміна ${exercise.id}`).toBe(false);
        });
      }
  });

  it('усі профілі акценту лишають автоматичні дні повними та валідними', () => {
    for (const [focus, config] of Object.entries(FOCUS)) for (const place of ['gym', 'db', 'band', 'bw'])
      for (const days of [2, 4, 6]) for (let seed = 0; seed < 12; seed++) {
        const plan = buildPlan(profile({ focus, priority: config.priority, place, bar: place === 'gym', days, seed }));
        plan.days.forEach((day) => {
          expect(day.items.length, `${focus}/${place}/${days}д/${seed}`).toBeGreaterThanOrEqual(4);
          day.items.forEach((item) => expect(isExerciseAllowed(item.ex, plan.profile)).toBe(true));
        });
      }
  });
});
