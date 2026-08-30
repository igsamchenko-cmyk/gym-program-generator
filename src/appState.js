export const APP_STATE_VERSION = 2;
export const SHARE_PREFIX = '#p=';

const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

export function cleanAnchors(value) {
  if (!isObject(value)) return {};
  return Object.fromEntries(Object.entries(value).flatMap(([id, raw]) => {
    const weight = Number(raw);
    return Number.isFinite(weight) && weight > 0 ? [[id, weight]] : [];
  }));
}

export function cleanJournal(value) {
  if (!isObject(value)) return {};
  return Object.fromEntries(Object.entries(value).flatMap(([key, raw]) => {
    if (!isObject(raw)) return [];
    const entry = { done: !!raw.done };
    ['weight', 'reps', 'rir'].forEach((field) => {
      if (raw[field] == null || raw[field] === '') return;
      const number = Number(raw[field]);
      if (Number.isFinite(number) && number >= 0) entry[field] = number;
    });
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

export function makeSharePayload({ profile, anchors, swaps }) {
  return {
    version: APP_STATE_VERSION,
    profile,
    anchors: cleanAnchors(anchors),
    swaps: serializeSwaps(swaps),
    built: true,
  };
}

export function makeBackupPayload({ profile, anchors, swaps, journal, built }) {
  return {
    ...makeSharePayload({ profile, anchors, swaps }),
    journal: cleanJournal(journal),
    built: !!built,
    exportedAt: new Date().toISOString(),
  };
}

export function journalKey(weekIndex, dayIndex, exerciseId) {
  return `${weekIndex}:${dayIndex}:${exerciseId}`;
}
