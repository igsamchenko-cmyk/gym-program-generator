import { describe, it, expect } from 'vitest';
import { sanitizeProfile, DEFAULT_PROFILE } from '../engine.js';

describe('sanitizeProfile — захист від застарілого профілю в localStorage', () => {
  it('null або не-обʼєкт повертає дефолтний профіль', () => {
    expect(sanitizeProfile(null)).toEqual(DEFAULT_PROFILE);
    expect(sanitizeProfile(undefined)).toEqual(DEFAULT_PROFILE);
    expect(sanitizeProfile('щось')).toEqual(DEFAULT_PROFILE);
  });

  it('відсутні поля (профіль зі старої версії) підставляються з дефолтів', () => {
    const old = { age: 39, level: 'adv', days: 3, place: 'gym', bar: true, goal: 'hyper' };
    const safe = sanitizeProfile(old);
    expect(Array.isArray(safe.priority)).toBe(true);
    expect(Array.isArray(safe.limits)).toBe(true);
    expect(Array.isArray(safe.weekdays)).toBe(true);
    expect(Array.isArray(safe.customDays)).toBe(true);
    expect(safe.age).toBe(39); // власні значення користувача не втрачаються
  });

  it('масивні поля не-масивного типу замінюються на дефолтні масиви, а не падають', () => {
    const corrupted = { age: 30, priority: 'back', limits: null, weekdays: 5, customDays: {} };
    const safe = sanitizeProfile(corrupted);
    expect(Array.isArray(safe.priority)).toBe(true);
    expect(Array.isArray(safe.limits)).toBe(true);
    expect(Array.isArray(safe.weekdays)).toBe(true);
    expect(Array.isArray(safe.customDays)).toBe(true);
  });

  it('customDays з елементами без groups отримує порожній масив groups, а не падає', () => {
    const corrupted = { customDays: [{ name: 'День 1' }, null, { groups: ['back'] }] };
    const safe = sanitizeProfile(corrupted);
    expect(safe.customDays.every((d) => Array.isArray(d.groups))).toBe(true);
    expect(safe.customDays[2].groups).toEqual(['back']);
  });

  it('старі домашні режими мігрують у комбінований вибір обладнання', () => {
    expect(sanitizeProfile({ place: 'db', bar: true }).homeEquipment).toEqual(['dumbbell', 'band', 'pullupbar']);
    expect(sanitizeProfile({ place: 'band', bar: false }).homeEquipment).toEqual(['band']);
    expect(sanitizeProfile({ place: 'bw', bar: false }).homeEquipment).toEqual([]);
    expect(sanitizeProfile({ place: 'db' }).place).toBe('home');
  });

  it('новий домашній профіль прибирає невідоме обладнання й дублікати', () => {
    const safe = sanitizeProfile({ place: 'home', homeEquipment: ['band', 'barbell', 'band', 'dumbbell'], bar: true });
    expect(safe.homeEquipment).toEqual(['band', 'dumbbell']);
    expect(safe.bar).toBe(false);
  });
});
