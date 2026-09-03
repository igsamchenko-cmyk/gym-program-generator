import { sanitizeHistory } from './journalAnalytics.ts';
import { sanitizeClientProfiles, sanitizeCoachEdits } from './coachTools.ts';

export const APP_STATE_VERSION = 5;
export const SHARE_PREFIX = '#p=';

const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

export function cleanAnchors(value) {
  if (!isObject(value)) return {};
  return Object.fromEntries(Object.entries(value).flatMap(([id, raw]) => {
    if (typeof raw === 'number' || typeof raw === 'string') {
      const weight = Number(raw);
      return Number.isFinite(weight) && weight > 0 ? [[id, weight]] : [];
    }
    if (!isObject(raw)) return [];
    const weight = Number(raw.weight), reps = Number(raw.reps), rir = Number(raw.rir);
    if (!Number.isFinite(weight) || weight <= 0) return [];
    return [[id, {
      weight,
      reps: Number.isFinite(reps) && reps > 0 ? reps : 8,
      rir: Number.isFinite(rir) && rir >= 0 ? rir : 2,
    }]];
  }));
}

export function cleanJournal(value) {
  if (!isObject(value)) return {};
  return Object.fromEntries(Object.entries(value).flatMap(([key, raw]) => {
    if (!isObject(raw)) return [];
    const entry = { done: !!raw.done };
    ['weight', 'reps', 'rir', 'pain', 'sessionRpe', 'readiness', 'moderateMinutes', 'vigorousMinutes', 'balanceSessions', 'mobilitySessions', 'aerobicSession0', 'aerobicSession1', 'aerobicSession2', 'aerobicSession3', 'aerobicSession4'].forEach((field) => {
      if (raw[field] == null || raw[field] === '') return;
      const number = Number(raw[field]);
      if (Number.isFinite(number) && number >= 0) entry[field] = number;
    });
    if (Array.isArray(raw.sets)) {
      entry.sets = raw.sets.slice(0, 12).map((set) => {
        if (!isObject(set)) return {};
        const clean = {};
        ['weight', 'reps', 'rir'].forEach((field) => {
          const number = Number(set[field]);
          if (set[field] !== '' && Number.isFinite(number) && number >= 0) clean[field] = number;
        });
        return clean;
      });
      while (entry.sets.length && !Object.keys(entry.sets.at(-1)).length) entry.sets.pop();
      if (!entry.sets.length) delete entry.sets;
    }
    if (typeof raw.note === 'string' && raw.note.trim()) entry.note = raw.note.trim().slice(0, 1000);
    if (typeof raw.updatedAt === 'string') entry.updatedAt = raw.updatedAt;
    return entry.done || Object.keys(entry).length > 1 ? [[key, entry]] : [];
  }));
}

export function serializeSwaps(swaps) {
  if (!isObject(swaps)) return {};
  return Object.fromEntries(Object.entries(swaps).flatMap(([key, exercise]) => {
    const id = typeof exercise === 'string' ? exercise : exercise && exercise.id;
    return typeof id === 'string' && id ? [[key, id]] : [];
  }));
}

export function hydrateSwaps(value, exercises) {
  if (!isObject(value)) return {};
  const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  return Object.fromEntries(Object.entries(value).flatMap(([key, raw]) => {
    const id = typeof raw === 'string' ? raw : raw && raw.id;
    const exercise = byId.get(id);
    return exercise ? [[key, exercise]] : [];
  }));
}

function bytesToBase64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function base64ToBytes(encoded) {
  const normalized = encoded.replaceAll('-', '+').replaceAll('_', '/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export function encodeSharePayload(payload) {
  return bytesToBase64(new TextEncoder().encode(JSON.stringify(payload)));
}

export function decodeSharePayload(encoded) {
  const value = JSON.parse(new TextDecoder().decode(base64ToBytes(encoded)));
  if (!isObject(value) || !isObject(value.profile)) throw new Error('Invalid shared program link');
  return value;
}

export function makeSharePayload({ profile, anchors, swaps, coachEdits }) {
  return {
    version: APP_STATE_VERSION,
    profile,
    anchors: cleanAnchors(anchors),
    swaps: serializeSwaps(swaps),
    coachEdits: sanitizeCoachEdits(coachEdits),
    built: true,
  };
}

export function cleanRevisions(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(-100).flatMap((raw) => {
    if (!isObject(raw) || typeof raw.summary !== 'string') return [];
    const at = typeof raw.at === 'string' && !Number.isNaN(Date.parse(raw.at)) ? raw.at : new Date(0).toISOString();
    return [{ at, summary: raw.summary.trim().slice(0, 240) }].filter((item) => item.summary);
  });
}
export function makeBackupPayload({ profile, anchors, swaps, coachEdits, journal, history, revisions, clientName, clients, autoAdjust, built }) {
  return {
    ...makeSharePayload({ profile, anchors, swaps, coachEdits }),
    journal: cleanJournal(journal),
    history: sanitizeHistory(history),
    revisions: cleanRevisions(revisions),
    clientName: typeof clientName === 'string' ? clientName.trim().slice(0, 120) : '',
    clients: sanitizeClientProfiles(clients),
    autoAdjust: autoAdjust !== false,
    built: !!built,
    exportedAt: new Date().toISOString(),
  };
}

export function journalKey(weekIndex, dayIndex, exerciseId) {
  return `${weekIndex}:${dayIndex}:${exerciseId}`;
}
