/* Чиста модель дозування: не залежить від генератора вправ або React. */
const HEAVY_LOAD = 1.12; // лише міграція старих числових орієнтирів

const round2 = (x) => Math.round(x / 2.5) * 2.5;
const GOAL_CONFIG = {
  hyper: { setFactor: 1, compRest: '2–3 хв', isoRest: '60–90 с', compPct: 0.72, isoPct: 0.65 },
  strength: { setFactor: 0.85, compRest: '3–4 хв', isoRest: '90–120 с', compPct: 0.82, isoPct: 0.68 },
  fatloss: { setFactor: 0.85, compRest: '90–120 с', isoRest: '45–75 с', compPct: 0.65, isoPct: 0.58 },
  health: { setFactor: 0.75, compRest: '90–120 с', isoRest: '60–90 с', compPct: 0.6, isoPct: 0.55 },
};
const GOAL_GUIDANCE = {
  hyper: 'Пріоритет — достатній тижневий обсяг і якісні повтори. Частота допомагає зручно розподілити цей обсяг, але сама по собі не гарантує кращий ріст.',
  strength: 'Пріоритет — важчі базові підходи на початку сесії. Вага розраховується від орієнтовного 1ПМ за фактичними вагою, повторами та RIR, без універсальної надбавки.',
  fatloss: 'Силова частина зберігає м’язи, а коротші паузи роблять сесію щільнішою. Зниження маси визначається насамперед енергетичним балансом; додай посильну аеробну активність.',
  health: 'Це силова частина загального плану здоров’я. Тижневий трекер окремо обліковує 150–300 хв помірної або 75–150 хв високої аеробної активності, баланс і рухливість.',
};
function normalizeAnchor(raw) {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) return { weight: raw, legacy: true };
  if (!raw || typeof raw !== 'object') return null;
  const weight = Number(raw.weight), reps = Number(raw.reps), rir = Number(raw.rir);
  if (!Number.isFinite(weight) || weight <= 0) return null;
  return {
    weight,
    reps: Number.isFinite(reps) && reps > 0 ? reps : 8,
    rir: Number.isFinite(rir) && rir >= 0 ? rir : 2,
    legacy: false,
  };
}
function estimated1RM(raw) {
  const anchor = normalizeAnchor(raw);
  if (!anchor || anchor.legacy) return null;
  return anchor.weight * (1 + (anchor.reps + anchor.rir) / 30);
}
function loadFor(item, week, heavy, anchors, plan) {
  if (Number(item.coach?.load) > 0) {
    const periodFactor = item.coach.fixedLoad ? 1 : week.load * (heavy ? HEAVY_LOAD : 1);
    return round2(Number(item.coach.load) * periodFactor * (plan?.adaptation?.loadFactor || 1));
  }
  const anchor = normalizeAnchor(anchors && anchors[item.ex.id]);
  if (!anchor) return null;
  if (anchor.legacy) return round2(anchor.weight * week.load * (heavy ? HEAVY_LOAD : 1));
  const range = repsFor(item, plan?.profile?.goal || 'hyper', week, heavy, plan);
  const numbers = range.match(/\d+/g)?.map(Number) || [8];
  const targetReps = numbers.length > 1 ? (numbers[0] + numbers[1]) / 2 : numbers[0];
  const targetRir = rirFor(item, week, plan);
  const repMatchedPct = 1 / (1 + (targetReps + targetRir) / 30);
  const deloadFactor = week.deload ? 0.75 : 1;
  const adaptationFactor = plan?.adaptation?.loadFactor || 1;
  return round2(estimated1RM(anchor) * repMatchedPct * deloadFactor * adaptationFactor);
}
// вправи, для яких має сенс вести робочу вагу
const isLoadable = (ex) => ['barbell', 'dumbbell', 'machine', 'cable', 'dipstation'].includes(ex.eq);

const REPS = {
  strength: { comp: '3–6', iso: '8–12' },
  hyper: { comp: '6–10', iso: '10–15' },
  fatloss: { comp: '8–12', iso: '12–20' },
  health: { comp: '8–12', iso: '12–15' },
};

const PROGRESSION = {
  beg: '+2.5 кг або +1 повтор майже щотижня — на цьому стажі нервова адаптація дає швидкий приріст.',
  int: '+2.5 кг на вправу за 2–4 тижні. Тижнева прогресія на цьому етапі вже фікція.',
  adv: 'Темп прогресу індивідуальний і зазвичай повільніший зі зростанням стажу. Орієнтуйся на фактичні повтори, RIR, техніку й відновлення; обсяг є одним із важелів, але не єдиним.',
};


function setsFor(item, week, plan, heavy) {
  const manual = Number(item.coach?.sets);
  if (heavy && !manual) return 2;
  const m = plan.flags.teen ? 0.8 : 1;
  const goalFactor = (GOAL_CONFIG[plan.profile.goal] || GOAL_CONFIG.hyper).setFactor;
  let n = manual > 0
    ? Math.max(1, Math.round(manual * (item.coach?.fixedSets ? 1 : week.mult) * m))
    : Math.max(1, Math.round(item.base * week.mult * m * goalFactor));
  // запобіжник: обсяг зрізається з ізоляції, база не чіпається
  if (plan.profile.fatigue && item.ex.t === 'iso' && !week.deload) n = Math.max(1, n - 1);
  if (plan.adaptation?.setFactor < 1 && !week.deload) n = Math.max(1, Math.floor(n * plan.adaptation.setFactor));
  return n;
}
function rirFor(item, week, plan) {
  const raw = Number.isFinite(Number(item.coach?.rir)) ? Number(item.coach.rir) : item.ex.t === 'comp' ? week.rb : week.ri;
  if (week.deload) return raw;
  const floor = plan.flags.teen || plan.profile.level === 'beg' ? 2 : 0;
  return Math.max(raw, floor);
}
function repsFor(item, goal, week, heavy, plan) {
  if (item.coach?.reps) return item.coach.reps;
  if (heavy && goal !== 'strength') return '3–6';
  if (item.ex.u === 'time') return week.deload ? '20–40 с' : '30–60 с';
  if (goal === 'strength' && item.ex.t === 'comp') {
    if (plan?.profile?.level === 'beg') return '6–8';
    if (plan?.profile?.level === 'int') return '4–6';
  }
  return REPS[goal][item.ex.t];
}
function tempoFor(item, week, heavy) {
  if (item.coach?.tempo) return item.coach.tempo;
  if (item.ex.tp === '—') return '—';
  if (heavy) return '2-1-X';
  if (week.deload) return '3-1-3';
  return item.ex.tp;
}
function restFor(item, plan, heavy) {
  if (item.coach?.rest) return item.coach.rest;
  if (heavy) return '3–4 хв';
  const config = GOAL_CONFIG[plan.profile.goal] || GOAL_CONFIG.hyper;
  return item.ex.t === 'iso' ? config.isoRest : config.compRest;
}
function progressionSuggestion(log, item, week, plan, heavy) {
  if (!log || !Array.isArray(log.sets) || !log.sets.length) return '';
  if (Number(log.pain) >= 4) return 'Не підвищуй навантаження: зафіксовано біль 4/10 або вище. Перевір техніку, амплітуду й доцільність вправи.';
  const range = repsFor(item, plan.profile.goal, week, heavy, plan);
  const numbers = range.match(/\d+/g)?.map(Number) || [];
  if (item.ex.u === 'time' || numbers.length < 2) return '';
  const [low, high] = numbers;
  const complete = log.sets.length >= setsFor(item, week, plan, heavy)
    && log.sets.every((set) => Number.isFinite(Number(set.reps)) && Number.isFinite(Number(set.rir)));
  if (!complete) return 'Заповни повтори й RIR кожного підходу — після цього з’явиться рекомендація прогресії.';
  const plannedRir = rirFor(item, week, plan);
  if (log.sets.every((set) => Number(set.reps) >= high && Number(set.rir) >= plannedRir)) {
    return 'Усі підходи досягли верхньої межі з потрібним запасом: наступного разу додай найменший доступний крок ваги.';
  }
  if (log.sets.some((set) => Number(set.reps) < low || Number(set.rir) < plannedRir)) {
    return 'Залиши або трохи зменш вагу, доки всі підходи не ввійдуть у діапазон із запланованим RIR.';
  }
  return 'Залиши цю вагу й спробуй додати повтори в межах діапазону.';
}

export { HEAVY_LOAD, round2, GOAL_CONFIG, GOAL_GUIDANCE, normalizeAnchor, estimated1RM, loadFor, isLoadable, REPS, PROGRESSION, setsFor, rirFor, repsFor, tempoFor, restFor, progressionSuggestion };
