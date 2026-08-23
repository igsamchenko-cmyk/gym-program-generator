import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
let checks = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; };
const equal = (actual, expected, message) => { assert.equal(actual, expected, message); checks++; };
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

try {
  const mod = await server.ssrLoadModule('/src/TrainingConstructor.jsx');
  const {
    default: App, EX, MUSCLE, REGION, REGION_GROUP, DEFAULT_PROFILE,
    buildPlan, weeklyVolume, sessionMinutes, sanitizeProfile, sanitizeAnchors,
    sanitizeSwaps, isProfileBuildable, isExerciseAllowed,
  } = mod;

  equal(new Set(EX.map((ex) => ex.id)).size, EX.length, 'Exercise IDs must be unique');
  EX.forEach((ex) => {
    check(Boolean(REGION[ex.rg]), 'Unknown region on ' + ex.id);
    check(Boolean(MUSCLE[ex.m]), 'Unknown primary muscle on ' + ex.id);
    check(REGION_GROUP[ex.rg] === ex.m, 'Region ' + ex.rg + ' must belong to ' + ex.m + ' on ' + ex.id);
    check(Array.isArray(ex.s) && ex.s.every((muscle) => MUSCLE[muscle]), 'Invalid secondary muscle on ' + ex.id);
  });

  const mediaExercises = EX.filter((ex) => ex.media);
  equal(mediaExercises.length, 50, 'Exercise media library must cover fifty exercises');
  equal(new Set(mediaExercises.map((ex) => ex.media.src)).size, mediaExercises.length, 'Exercise media paths must be unique');
  mediaExercises.forEach((ex) => {
    check(/^exercise-media\/[a-z0-9-]+\.webp$/.test(ex.media.src), 'Invalid media path on ' + ex.id);
    check(typeof ex.media.alt === 'string' && ex.media.alt.length >= 30, 'Exercise media needs descriptive alt text on ' + ex.id);
    check(existsSync(new URL('../public/' + ex.media.src, import.meta.url)), 'Missing exercise media file on ' + ex.id);
  });

  const corrupt = sanitizeProfile({
    age: 'abc', sex: 'bad', level: 'expert', days: 99, mode: 'custom',
    customDays: [], place: 'mars', goal: 'bulk', priority: ['back', 'fake', 'back'],
    limits: ['knee', 'fake'], weekdays: [99, 0, 0], timeCap: 13, fatigue: 'yes', seed: -4,
  });
  equal(corrupt.age, DEFAULT_PROFILE.age, 'Invalid age falls back');
  equal(corrupt.days, 6, 'Days are clamped');
  equal(corrupt.level, DEFAULT_PROFILE.level, 'Invalid level falls back');
  check(corrupt.priority.join(',') === 'back', 'Priority is deduplicated and filtered');
  check(corrupt.limits.join(',') === 'knee', 'Limits are filtered');
  equal(corrupt.weekdays.length, 6, 'Weekdays are repaired to match days');
  equal(corrupt.customDays.length, 6, 'Custom days are padded');
  check(!isProfileBuildable(corrupt), 'Empty custom layout is not buildable');
  check(isProfileBuildable(sanitizeProfile({ ...DEFAULT_PROFILE, mode: 'auto' })), 'Automatic layout is buildable');

  const anchors = sanitizeAnchors({ bb_bench: '102.37', pushup: 90, missing: 10, db_bench: -1, cable_row: Infinity });
  equal(anchors.bb_bench, 102.25, 'Valid anchor is rounded to 0.25 kg');
  check(!('pushup' in anchors) && !('missing' in anchors) && !('db_bench' in anchors), 'Invalid anchors are removed');

  const ages = [14, 17, 39, 45, 70];
  const sexes = ['m', 'f', 'x'];
  const levels = ['beg', 'int', 'adv'];
  const daysList = [2, 3, 4, 5, 6];
  const places = ['gym', 'db', 'band', 'bw'];
  const goals = ['hyper', 'strength', 'fatloss', 'health'];
  let plansBuilt = 0;
  for (const age of ages) for (const sex of sexes) for (const level of levels) {
    for (const days of daysList) for (const place of places) for (const goal of goals) {
      const profile = sanitizeProfile({ ...DEFAULT_PROFILE, age, sex, level, days, place, goal, seed: plansBuilt % 17, timeCap: null });
      const plan = buildPlan(profile);
      equal(plan.days.length, days, 'Generated plan has requested day count');
      check(plan.weeks.length > 0 && plan.days.every((day) => day.items.length >= 3), 'Every generated day is usable');
      plan.days.flatMap((day) => day.items).forEach((item) => check(isExerciseAllowed(item.ex, profile), 'Disallowed exercise ' + item.ex.id));
      const primary = new Set(plan.days.flatMap((day) => day.items.map((item) => item.ex.m)));
      check(primary.has('calves'), 'Automatic plan includes calves');
      check(primary.has('core'), 'Automatic plan includes core');
      const peak = plan.weeks.reduce((a, b) => a.mult > b.mult ? a : b);
      const volume = weeklyVolume(plan, peak).byMuscle;
      check(Object.values(volume).every(Number.isFinite), 'Volume values are finite');
      plansBuilt++;
    }
  }

  let cappedDays = 0;
  let overCapDays = 0;
  let minExercises = Infinity;
  let maxOver = 0;
  for (const age of [17, 39, 55]) for (const level of levels) for (const days of daysList) {
    for (const place of places) for (let seed = 0; seed < 20; seed++) {
      const profile = sanitizeProfile({ ...DEFAULT_PROFILE, age, level, days, place, seed, timeCap: 45 });
      const plan = buildPlan(profile);
      const peak = plan.weeks.reduce((a, b) => a.mult > b.mult ? a : b);
      plan.days.forEach((day, di) => {
        const minutes = sessionMinutes(day, peak, plan, di);
        cappedDays++;
        minExercises = Math.min(minExercises, day.items.length);
        if (minutes > 45) {
          overCapDays++;
          maxOver = Math.max(maxOver, minutes - 45);
        }
      });
    }
  }
  check(minExercises >= 3, 'Time cap never leaves fewer than three exercises');
  check(overCapDays / cappedDays < 0.03, '45-minute cap miss rate too high: ' + overCapDays + '/' + cappedDays);
  check(maxOver <= 8, 'A capped session exceeds the limit by too much: ' + maxOver + ' min');

  const covers = (day, group) => day.items.some((item) => item.ex.m === group || (item.ex.s || []).includes(group));
  let customPlans = 0;
  for (const place of places) for (const level of levels) for (const days of [2, 4, 6]) {
    for (let seed = 0; seed < 12; seed++) {
      const customDays = Array.from({ length: days }, (_, di) => {
        const count = 1 + ((seed + di) % 6);
        return { groups: Array.from({ length: count }, (_, gi) => Object.keys(MUSCLE)[(seed + di + gi) % Object.keys(MUSCLE).length]) };
      });
      for (const timeCap of [null, 45]) {
        const profile = sanitizeProfile({
          ...DEFAULT_PROFILE, age: 14 + ((seed * 7) % 57), level, days, mode: 'custom',
          customDays, place, limits: seed % 3 === 0 ? ['knee', 'lowback', 'shoulder'] : [], timeCap, seed,
        });
        const plan = buildPlan(profile);
        const peak = plan.weeks.reduce((a, b) => a.mult > b.mult ? a : b);
        plan.days.forEach((day, di) => {
          const missing = profile.customDays[di].groups.filter((group) => !covers(day, group));
          check(missing.length === 0, 'Custom day silently omitted: ' + missing.join(','));
          check((day.missingGroups || []).length === 0, 'Custom missingGroups must be empty');
          if (timeCap) equal(day.overCap, sessionMinutes(day, peak, plan, di) > timeCap, 'Custom over-cap flag is exact');
        });
        customPlans++;
      }
    }
  }

  const formerlyFailingProfile = sanitizeProfile({
    ...DEFAULT_PROFILE, age: 67, level: 'int', days: 6, mode: 'custom', place: 'bw', bar: false,
    goal: 'fatloss', limits: ['knee', 'lowback'], timeCap: 90, seed: 330077,
    customDays: [
      { groups: ['core', 'glutes', 'chest'] }, { groups: ['triceps', 'calves'] },
      { groups: ['hams', 'biceps', 'chest'] }, { groups: ['core', 'glutes', 'hams', 'back', 'delts'] },
      { groups: ['biceps', 'quads', 'core', 'back', 'chest'] },
      { groups: ['delts', 'calves', 'chest', 'quads', 'hams', 'biceps'] },
    ],
  });
  const formerlyFailingPlan = buildPlan(formerlyFailingProfile);
  formerlyFailingPlan.days.forEach((day, di) => {
    const missing = formerlyFailingProfile.customDays[di].groups.filter((group) => !covers(day, group));
    check(missing.length === 0, 'Previously failing bodyweight profile must preserve every group');
  });

  const timeConflictProfile = sanitizeProfile({
    ...DEFAULT_PROFILE, age: 66, sex: 'x', level: 'int', days: 5, mode: 'custom',
    place: 'band', bar: true, goal: 'strength', priority: ['core', 'calves'],
    limits: [], weekdays: [0, 2, 3, 5, 6], timeCap: 45, fatigue: false, seed: 667743,
    customDays: [
      { groups: ['calves', 'quads', 'hams', 'core', 'glutes'] },
      { groups: ['glutes', 'core'] }, { groups: ['triceps', 'biceps'] },
      { groups: ['core', 'quads', 'biceps', 'chest', 'delts', 'calves'] },
      { groups: ['biceps'] },
    ],
  });
  const timeConflictPlan = buildPlan(timeConflictProfile);
  check(timeConflictPlan.days.every((day) => day.missingGroups.length === 0), 'Time conflict must preserve every selected group');
  check(timeConflictPlan.days.some((day) => day.overCap), 'Impossible 45-minute custom day must be reported as over cap');

  const aggressiveSwaps = {};
  timeConflictPlan.days.forEach((day, di) => day.items.forEach((item, si) => {
    const candidate = EX.find((ex) => ex.p === item.ex.p && ex.id !== item.ex.id && isExerciseAllowed(ex, timeConflictProfile));
    if (candidate) aggressiveSwaps[di + ':' + si] = candidate.id;
  }));
  const safeAggressiveSwaps = sanitizeSwaps(aggressiveSwaps, timeConflictPlan);
  timeConflictPlan.days.forEach((day, di) => {
    const swappedItems = day.items.map((item, si) => {
      const replacement = EX.find((ex) => ex.id === safeAggressiveSwaps[di + ':' + si]);
      return replacement ? { ...item, ex: replacement } : item;
    });
    const swappedDay = { ...day, items: swappedItems };
    check(day.requestedGroups.every((group) => covers(swappedDay, group)), 'Combined saved swaps must preserve every selected group');
  });

  const sample = buildPlan(sanitizeProfile({ ...DEFAULT_PROFILE, age: 55, limits: ['shoulder'], seed: 3 }));
  const first = sample.days[0].items[0].ex;
  const goodSwap = EX.find((ex) => ex.p === first.p && ex.id !== first.id && isExerciseAllowed(ex, sample.profile));
  if (goodSwap) {
    const migrated = sanitizeSwaps({ '0:0': { id: goodSwap.id }, bad: goodSwap.id, '99:0': goodSwap.id }, sample);
    equal(migrated['0:0'], goodSwap.id, 'Legacy swap objects migrate to IDs');
    equal(Object.keys(migrated).length, 1, 'Invalid swap positions are removed');
  }
  equal(Object.keys(sanitizeSwaps({ '0:0': {} }, sample)).length, 0, 'Malformed swaps are removed');

  let store = new Map();
  globalThis.localStorage = {
    getItem: (key) => store.has(key) ? store.get(key) : null,
    setItem: (key, value) => { store.set(key, String(value)); },
    removeItem: (key) => { store.delete(key); },
    clear: () => store.clear(),
  };
  globalThis.window = { matchMedia: () => ({ matches: false }) };
  globalThis.location = { reload: () => {} };
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { clipboard: { writeText: async () => {} } } });
  globalThis.alert = () => {};

  const textOf = (value) => Array.isArray(value) ? value.map(textOf).join('') : value == null ? '' : String(value);
  let renderer;
  await act(async () => { renderer = TestRenderer.create(React.createElement(App)); await flush(); });
  const root = renderer.root;
  let ageInput = root.find((node) => node.type === 'input' && node.props.id === 'tk-age');
  await act(async () => { ageInput.props.onChange({ target: { value: '42' } }); });
  ageInput = root.find((node) => node.type === 'input' && node.props.id === 'tk-age');
  await act(async () => { ageInput.props.onBlur(); await flush(); });
  equal(root.find((node) => node.type === 'input' && node.props.id === 'tk-age').props.value, '42', 'Age typing is stable');

  const checkboxes = root.findAll((node) => node.type === 'input' && node.props.type === 'checkbox');
  await act(async () => { checkboxes.at(-1).props.onChange({ target: { checked: true } }); });
  const buildButton = root.findAllByType('button').find((button) => textOf(button.props.children) === 'Скласти програму');
  await act(async () => { buildButton.props.onClick({ synthetic: true }); await flush(); });
  check(root.findAllByType('button').some((button) => textOf(button.props.children) === 'Скинути все'), 'Synthetic click builds a plan');

  const themeButton = root.findAllByType('button').find((button) => button.props.className === 'tk-theme');
  await act(async () => { themeButton.props.onClick(); await flush(); });
  equal(root.find((node) => node.props.className === 'tk').props['data-theme'], 'dark', 'Dark theme toggles');

  const resetButton = root.findAllByType('button').find((button) => textOf(button.props.children) === 'Скинути все');
  await act(async () => { await resetButton.props.onClick(); await flush(); });
  equal(root.find((node) => node.type === 'input' && node.props.id === 'tk-age').props.value, '39', 'Reset restores default age');
  check(!store.has('tk-state'), 'Reset does not recreate deleted state');
  renderer.unmount();

  store = new Map([['tk-state', JSON.stringify({
    profile: { ...DEFAULT_PROFILE, mode: 'custom', days: 6, customDays: [] },
    built: true, swaps: { '0:0': {} }, anchors: { bb_bench: 'NaN' },
  })]]);
  await act(async () => { renderer = TestRenderer.create(React.createElement(App)); await flush(); });
  check(renderer.root.findAll((node) => node.type === 'input' && node.props.id === 'tk-age').length === 1, 'Corrupt custom state returns to wizard');
  check(!JSON.stringify(renderer.toJSON()).includes('NaN'), 'Corrupt state never renders NaN');
  renderer.unmount();

  store = new Map([['tk-state', JSON.stringify({
    version: 2, profile: timeConflictProfile, built: true, swaps: {}, anchors: {},
  })]]);
  await act(async () => { renderer = TestRenderer.create(React.createElement(App)); await flush(); });
  const conflictDays = renderer.root.findAll((node) => node.type === 'button' && node.props.className === 'tk-day');
  await act(async () => { conflictDays[3].props.onClick(); await flush(); });
  check(JSON.stringify(renderer.toJSON()).includes('Ліміт часу конфліктує з власною розкладкою'), 'Custom time conflict warning is rendered');
  check(JSON.stringify(renderer.toJSON()).includes('60 хв'), 'Custom time conflict suggests the next viable cap');
  renderer.unmount();

  const ExcelJS = (await import('exceljs/dist/exceljs.min.js')).default;
  const wb = new ExcelJS.Workbook();
  wb.addWorksheet('Тест').addRow(['Вправа', 'Підходи']);
  const buffer = await wb.xlsx.writeBuffer();
  const roundTrip = new ExcelJS.Workbook();
  await roundTrip.xlsx.load(buffer);
  equal(roundTrip.getWorksheet('Тест').getCell('A1').value, 'Вправа', 'Excel workbook round-trip succeeds');

  console.log('OK: ' + checks + ' assertions, ' + plansBuilt + ' auto profiles, ' + customPlans + ' custom profiles, ' + cappedDays + ' capped days, ' + overCapDays + ' auto days over cap.');
} finally {
  await server.close();
}