/* ============================================================
   ДВИЖОК — генерація мезоциклу, періодизація, обсяг, розминка.
   Чиста логіка без React: можна тестувати й використовувати окремо від UI.
   ============================================================ */
import { EX } from './data/exercises.js';
import { REGION, REGION_GROUP, MUSCLE, EQUIP_SETS, WEEKDAYS, SLOW_RECOVERY, LIMIT_LABEL } from './data/labels.js';
const JOINT_FRIENDLY = new Set(['seated_lat_raise', 'cable_lat_raise', 'ez_curl', 'db_hammer', 'vgrip_pulldown', 'hammer_row',
  'chest_row', 'machine_press', 'leg_press', 'hack_squat', 'rope_overhead', 'reverse_pecdeck', 'cable_face_pull', 'band_face_pull',
  'hyperext', 'seated_calf', 'db_incline', 'goblet', 'rdl_db', 'cable_row', 'lat_pulldown', 'machine_shoulder', 'leg_curl', 'leg_ext', 'low_high_fly',
  'pec_deck', 'machine_lat_raise', 'seated_leg_curl', 'standing_calf', 'machine_pullover', 't_bar_row', 'preacher_curl', 'db_seated_calf']);
// Рухи з більшою вимогою до стабілізації тулуба. Це не список «небезпечних» вправ:
// він потрібен лише для ранжування рівноцінних варіантів.
const AXIAL_HEAVY = new Set(['bb_squat', 'front_squat', 'deadlift', 'trap_bar_deadlift', 'rdl_bb', 'ohp', 'bb_row', 'band_gm']);
// Вправи, для яких технічної складності недостатньо як критерію: вони ще й
// вимагають попередньої відносної сили, контролю або складного налаштування.
const REQUIRES_FOUNDATION = new Set([
  'pushup', 'pushup_band', 'pike_pushup', 'pullup', 'pullup_band',
  'db_pullover', 'rdl_bb', 'rdl_db', 'hip_thrust', 'band_gm',
  'db_lunge', 'bulgarian', 'split_band', 'slider_curl', 'nordic',
  'single_bridge', 'db_skull', 'close_pushup', 'bench_dips',
  'hanging_leg', 'incline_fly', 'decline_pushup', 'bw_skull', 'db_hip_thrust',
  'pistol_box', 'elevated_pike', 'bw_sl_rdl', 'slider_rollout',
]);
const ADVANCED_ONLY = new Set(['weighted_dips']);
const LEVEL_RANK = { beg: 0, int: 1, adv: 2 };
const BALANCE = {
  steady: { label: 'Стабільно', note: 'Повний вибір вправ відповідно до стажу й цілі.' },
  cautious: { label: 'Іноді нестійко', note: 'Варіанти з опорою та тренажери отримають вищий пріоритет.' },
  support: { label: 'Потрібна опора', note: 'Рухи з високою вимогою до рівноваги будуть замінені, якщо є рівноцінний стабільний варіант.' },
};

const FOCUS = {
  balanced: { label: 'Збалансовано', priority: [], note: 'Рівномірний розвиток усього тіла без естетичного перекосу.' },
  glutes: { label: 'Сідниці та стегна', priority: ['glutes', 'hams'], note: 'Більше роботи на сідничні й задню поверхню стегна; стабільні варіанти отримують перевагу над складною штангою.' },
  tone: { label: 'Все тіло / тонус', priority: ['glutes', 'delts'], note: 'Рівномірна програма з додатковим акцентом на сідничні та плечі.' },
  posture: { label: 'Постава та плечі', priority: ['back', 'delts'], note: 'Додаткова частота тяг, задніх дельт і вправ для контролю лопаток.' },
  upper: { label: 'Верх тіла', priority: ['back', 'chest'], note: 'Більше роботи на спину та груди зі збереженням повноцінного низу тіла.' },
  athletic: { label: 'Сила і спортивність', priority: ['quads', 'back'], note: 'Акцент на великих рухах ніг і спини відповідно до стажу та технічної готовності.' },
};
const CUSTOM_FOCUS = { label: 'Власний акцент', note: 'Пріоритетні групи налаштовані вручну.' };

const AVOID = {
  barbell: { label: 'Штанга', note: 'усі вправи зі штангою' },
  dips: { label: 'Бруси', note: 'звичайні та зворотні бруси' },
  pullups: { label: 'Підтягування / вис', note: 'рухи на турніку' },
  lunges: { label: 'Випади', note: 'випади й спліт-присідання' },
  floor: { label: 'Вправи на підлозі', note: 'рухи лежачи, планки та віджимання від підлоги' },
};
const AVOID_IDS = {
  dips: new Set(['weighted_dips', 'bench_dips']),
  lunges: new Set(['db_lunge', 'rev_lunge_bw', 'bulgarian', 'split_band']),
  floor: new Set(['pushup', 'pushup_band', 'pike_pushup', 'glute_bridge', 'superman', 'slider_curl', 'single_bridge', 'bw_rear_raise', 'close_pushup', 'plank', 'side_plank', 'dead_bug',
    'decline_pushup', 'slider_rollout', 'elevated_pike', 'bw_skull']),
};

/* слот = патерн[@підспецифікація]; порядок у списку — чернетка, далі його впорядковує движок */
const DAY_SLOTS = {
  fbA: ['squat', 'h_push@chest_mid', 'h_pull@back_thick', 'hinge', 'side_delt', 'triceps', 'calves@calf_gastro', 'core', 'quad_iso'],
  fbB: ['hinge', 'h_push@chest_up!comp', 'v_pull@back_width', 'lunge', 'h_push@chest_up!iso', 'rear_delt', 'biceps', 'calves@calf_soleus', 'core'],
  fbC: ['squat', 'v_push', 'v_pull@back_low', 'h_pull@back_thick', 'side_delt', 'v_pull@back_width!iso', 'triceps', 'biceps', 'core'],
  upper: ['h_push@chest_mid', 'v_pull@back_width', 'v_push', 'h_pull@back_thick', 'side_delt', 'triceps', 'biceps', 'rear_delt'],
  lower: ['squat', 'hinge', 'lunge', 'quad_iso', 'ham_iso', 'calves@calf_gastro', 'core', 'glute_iso'],
  push: ['h_push@chest_mid', 'v_push', 'h_push@chest_up', 'side_delt', 'triceps@tri_long', 'core', 'triceps'],
  pull: ['v_pull@back_width', 'h_pull@back_thick', 'v_pull@back_low', 'rear_delt', 'biceps', 'core', 'biceps'],
  legs: ['squat', 'hinge', 'lunge', 'quad_iso', 'ham_iso', 'glute_iso', 'calves@calf_soleus', 'core'],
};
const DAY_NAME = { fbA: 'Фулбоді A', fbB: 'Фулбоді B', fbC: 'Фулбоді C', upper: 'Верх тіла', lower: 'Низ тіла', push: 'Жимовий', pull: 'Тяговий', legs: 'Ноги' };
const SPLITS = { 2: ['fbA', 'fbB'], 3: ['fbA', 'fbB', 'fbC'], 4: ['upper', 'lower', 'upper', 'lower'], 5: ['upper', 'lower', 'push', 'pull', 'legs'], 6: ['push', 'pull', 'legs', 'push', 'pull', 'legs'] };
const SPLIT_NOTE = {
  2: 'Два фулбоді-дні: основні рухи повторюються двічі, а менші групи розподіляються між днями й частково працюють як синергісти.',
  3: 'Три фулбоді з різними акцентами. Робоча схема на будь-якому стажі, якщо обсяг рознесено рівно по днях.',
  4: 'Верх / низ двічі. Найкращий баланс частоти й обсягу для середнього рівня.',
  5: 'Верх і низ на початку тижня, далі жим / тяга / ноги.',
  6: 'Push-Pull-Legs двічі. Потребує стабільного сну й графіка.',
};
/* Стать змінює три речі, і кожна спирається на дані, а не на звичку:
   1) стелю обсягу — при однаковому відсотку від максимуму жінки в середньому стійкіші до втоми
      й швидше відновлюються між підходами, тому низ тіла витримує більше робочих підходів;
   2) відпочинок в ізоляції — з тієї ж причини він коротший;
   3) стартові пріоритети — це усереднена преференція, а НЕ фізіологічна вимога, і її можна змінити. */
const SEX = {
  m: { label: 'Чоловік', focus: 'upper', prio: ['back', 'chest'], cap: {}, restIso: '60–90 с',
       note: 'Стартово запропоновано акцент на верх тіла, але стать не визначає силу, технічну готовність або обовʼязковий набір вправ.' },
  f: { label: 'Жінка', focus: 'glutes', prio: ['glutes', 'hams'], cap: { glutes: 1.2, hams: 1.15, quads: 1.1 }, restIso: '45–75 с',
       note: 'Стартово запропоновано акцент на сідниці та стегна. Це видимий профіль, який можна змінити; складність вправ однаково визначають стаж, контроль руху й особисті побажання.' },
  x: { label: 'Не вказувати', focus: 'balanced', prio: [], cap: {}, restIso: '60–90 с', note: 'Нейтральні налаштування: збалансований акцент, базова стеля обсягу й базовий відпочинок.' },
};

/* Патерни, з яких збирається день у власній розкладці. Порядок усередині групи —
   від найнавантажуванішого руху до ізоляції підспецифікації. */
const GROUP_SLOTS = {
  chest: ['h_push@chest_mid!comp', 'h_push@chest_up!comp', 'h_push@chest_up!iso', 'h_push@chest_mid!iso'],
  back: ['v_pull@back_width', 'h_pull@back_thick', 'v_pull@back_low', 'h_pull@back_thick!iso', 'v_pull@back_width!iso'],
  quads: ['squat', 'lunge', 'quad_iso', 'squat'],
  hams: ['hinge@ham', 'ham_iso', 'ham_iso'],
  glutes: ['hinge@glute', 'glute_iso', 'glute_iso', 'hinge@glute'],
  delts: ['v_push', 'side_delt', 'rear_delt', 'side_delt'],
  biceps: ['biceps', 'biceps'],
  triceps: ['triceps@tri_long', 'triceps'],
  calves: ['calves@calf_gastro', 'calves@calf_soleus'],
  core: ['core', 'core'],
};
const GROUP_WEIGHT = { chest: 3, back: 4, quads: 3, hams: 2, glutes: 2, delts: 3, biceps: 1, triceps: 1, calves: 1, core: 1 };
// більше рухів на групу за одну сесію майже не додає стимулу, але додає втому й час
const GROUP_CAP = { chest: 4, back: 4, quads: 4, delts: 4, hams: 3, glutes: 3, biceps: 2, triceps: 2, calves: 2, core: 2 };

function customSlots(groups, p) {
  const ceiling = groups.reduce((a, g) => a + GROUP_CAP[g], 0);
  const budget = Math.min(slotCount(p.level, 'custom', p.days) + 1, ceiling);
  const total = groups.reduce((a, g) => a + GROUP_WEIGHT[g], 0) || 1;
  const alloc = groups.map((g) => ({ g, n: Math.min(GROUP_CAP[g], Math.max(1, Math.round((budget * GROUP_WEIGHT[g]) / total))) }));
  let sum = alloc.reduce((a, x) => a + x.n, 0);
  while (sum > budget && alloc.some((x) => x.n > 1)) { const t = alloc.slice().sort((a, b) => b.n - a.n)[0]; t.n -= 1; sum -= 1; }
  while (sum < budget && alloc.some((x) => x.n < GROUP_CAP[x.g])) {
    const t = alloc.filter((x) => x.n < GROUP_CAP[x.g]).sort((a, b) => GROUP_WEIGHT[b.g] / b.n - GROUP_WEIGHT[a.g] / a.n)[0];
    t.n += 1; sum += 1;
  }
  const required = [], extras = [];
  alloc.forEach(({ g, n }) => {
    for (let i = 0; i < n; i++) {
      const slot = { spec: GROUP_SLOTS[g][i % GROUP_SLOTS[g].length], group: g };
      (i === 0 ? required : extras).push(slot);
    }
  });
  return required.concat(extras);
}
const dayLabel = (groups) => groups.map((g) => MUSCLE[g]).join(' + ') || 'День без груп';

const PRIORITY_PATTERN = { chest: ['h_push', 'h_push@chest_up'], back: ['v_pull@back_width', 'h_pull'], quads: ['quad_iso', 'squat'], hams: ['ham_iso', 'hinge@ham'], glutes: ['glute_iso', 'hinge@glute'], delts: ['side_delt', 'rear_delt'], biceps: ['biceps'], triceps: ['triceps'], calves: ['calves'], core: ['core'] };
const FALLBACK = { v_pull: 'h_pull', h_pull: 'v_pull', quad_iso: 'lunge', ham_iso: 'hinge', glute_iso: 'hinge', rear_delt: 'h_pull', side_delt: 'v_push' };

/* ============================================================
   МАКРОЦИКЛИ
   mult — множник обсягу · rb — RIR у базових · ri — RIR в ізоляції
   tech — чи дозволені дроп-сети / часткові повтори · heavy — ротація важкого блоку
   ============================================================ */
const MACRO = {
  beg: [
    { tag: 'Техніка', mult: 1.0, rb: 3, ri: 3, tempo: '3-0-2', note: 'Заходиш у програму. Єдине завдання тижня — вивчити рухи. Ваги свідомо легкі.' },
    { tag: 'Тільки вага', mult: 1.0, rb: 3, ri: 3, tempo: '3-0-2', note: 'Схема та сама, змінюється ЛИШЕ вага: +2.5 кг там, де три підходи пройшли чисто.' },
    { tag: 'Тільки обсяг', mult: 1.15, rb: 3, ri: 2, tempo: '3-0-2', note: 'Ваги фіксуєш, додається підхід. Дві змінні одночасно не рухаємо — інакше не зрозумієш, що дало ефект.' },
    { tag: 'Тільки вага', mult: 1.15, rb: 2, ri: 2, tempo: '3-0-2', note: 'Обсяг стоїть, вага росте. Останні повторення важкі, але техніка не сиплеться.' },
    { tag: 'Делоад', mult: 0.5, rb: 4, ri: 4, tempo: '3-1-3', deload: true, note: 'Половина підходів, ваги −40 %. Це запланована частина циклу, а не пропуск.' },
  ],
  int: [
    { tag: 'Реадаптація', mult: 0.85, rb: 3, ri: 3, tempo: '3-0-2', note: 'Вхід у блок. Ваги ~85 % від робочих, відточуєш нові рухи.' },
    { tag: 'Базовий обсяг', mult: 1.0, rb: 3, ri: 2, tempo: '3-0-2', note: 'Повні робочі ваги. З цього тижня RIR розділений: база 3, ізоляція 2 — втома там, де вона дешевша.' },
    { tag: 'Тільки обсяг I', mult: 1.15, rb: 3, ri: 2, tempo: '3-0-2', tech: true, note: 'Додаються підходи, RIR не чіпаємо. Інтенсивні техніки — максимум 2 підходи на сесію і лише в ізоляції.' },
    { tag: 'Тільки обсяг II', mult: 1.3, rb: 3, ri: 2, tempo: '3-0-2', tech: true, note: 'Пік обсягу блоку. Якщо сон або настрій просіли два тижні поспіль — зупинися тут і йди в делоад.' },
    { tag: 'Тільки RIR вниз I', mult: 1.15, rb: 2, ri: 1, tempo: '2-1-2', tech: true, note: 'Обсяг повертається до базового, змінюється ЛИШЕ близькість до відмови.' },
    { tag: 'Тільки RIR вниз II', mult: 1.15, rb: 2, ri: 0, tempo: '2-1-2', tech: true, note: 'Ізоляція йде до відмови, база лишається на RIR 2. Найважчий тиждень блоку.' },
    { tag: 'Делоад', mult: 0.5, rb: 4, ri: 4, tempo: '3-1-3', deload: true, note: 'Обовʼязковий після двох тижнів роботи біля відмови.' },
  ],
  adv: [
    { tag: 'Делоад + вхід', mult: 0.55, rb: 4, ri: 4, tempo: '3-1-3', deload: true, note: 'Блок починається з розвантаження, а не з піку. Ваги 60–65 %. Буде відчуття надлишку сил — це і є пастка тижня.' },
    { tag: 'Реадаптація', mult: 0.75, rb: 3, ri: 3, tempo: '3-0-2', note: 'Ваги ~85–90 %. Відточуєш техніку рухів, які змінилися відносно минулого блоку.' },
    { tag: 'Базовий обсяг', mult: 1.0, rb: 3, ri: 1, tempo: '3-0-2', note: 'Повні робочі ваги. RIR розділено за SFR: підхід присідів до відмови коштує системної втоми в рази більше за підхід махів, а стимулу додає непропорційно мало.' },
    { tag: 'Обсяг', mult: 1.0, rb: 3, ri: 1, tempo: '3-0-2', tech: true, note: 'Старт інтенсивних технік: 2–3 підходи на ВСЮ сесію, лише ізоляція, ніколи в базових рухах.' },
    { tag: 'Важкий блок I', mult: 1.0, rb: 3, ri: 1, tempo: '2-1-X', tech: true, heavy: 'A', note: 'Ротація А: перший базовий рух дня йде у 3–6 повторів на 2 підходи. Після 20 років у діапазоні 8–15 це найменш експлуатована зона — механічне напруження, нервова адаптація, ремоделювання сухожиль.' },
    { tag: 'Важкий блок II', mult: 1.0, rb: 2, ri: 1, tempo: '2-1-X', tech: true, heavy: 'A', note: 'Та сама ротація, +2.5 кг там, де RIR дозволяє. Повноцінна розминка перед важким рухом обовʼязкова.' },
    { tag: 'Делоад', mult: 0.55, rb: 4, ri: 4, tempo: '3-1-3', deload: true, note: 'Плановий делоад перед фінальним блоком. Інтенсивні техніки прибрати повністю.' },
    { tag: 'Тільки обсяг', mult: 1.2, rb: 3, ri: 1, tempo: '3-0-2', tech: true, note: 'Змінюється ОДНА змінна: додаються підходи. RIR лишається як на тижні 3 — інакше не зрозумієш, що спрацювало.' },
    { tag: 'Тільки RIR вниз I', mult: 1.0, rb: 1, ri: 0, tempo: '2-1-2', tech: true, heavy: 'B', note: 'Обсяг назад до базового, вниз іде ЛИШЕ RIR. Важкий блок — ротація Б: другий базовий рух дня.' },
    { tag: 'RIR вниз II + тест', mult: 1.0, rb: 1, ri: 0, tempo: '2-1-X', tech: true, heavy: 'B', test: true, note: 'Тест ключових вправ. Орієнтир: тягові рухи мають перевищити фінал попереднього блоку на 2.5–5 %.' },
    { tag: 'Делоад', mult: 0.55, rb: 4, ri: 4, tempo: '3-1-3', deload: true, note: 'Обовʼязковий після трьох тижнів роботи на RIR 0–1. Без нього наступний блок стартує з боргом по відновленню — рівно та ситуація, з якої виходили.' },
  ],
};

/* Відсоток від робочої ваги по тижнях. Робоча вага = та, з якою ти зараз
   виконуєш свій цільовий діапазон повторів. Важкий блок множиться додатково:
   3–6 повторів вимагають більше, ніж 6–10. */
const LOADS = {
  beg: [0.85, 0.9, 0.9, 0.95, 0.6],
  int: [0.87, 1.0, 1.0, 1.0, 1.02, 1.02, 0.6],
  adv: [0.6, 0.875, 1.0, 1.0, 1.0, 1.02, 0.6, 1.0, 1.02, 1.04, 0.6],
};
const HEAVY_LOAD = 1.12;
Object.keys(MACRO).forEach((k) => MACRO[k].forEach((w, i) => { w.n = i + 1; w.load = LOADS[k][i]; }));

const round2 = (x) => Math.round(x / 2.5) * 2.5;
function loadFor(item, week, heavy, anchors) {
  const a = anchors && anchors[item.ex.id];
  if (!a) return null;
  return round2(a * week.load * (heavy ? HEAVY_LOAD : 1));
}
// вправи, для яких має сенс вести робочу вагу
const isLoadable = (ex) => ['barbell', 'dumbbell', 'machine', 'cable', 'dipstation'].includes(ex.eq);

const REPS = {
  strength: { comp: '3–6', iso: '8–12' },
  hyper: { comp: '6–10', iso: '10–15' },
  fatloss: { comp: '8–12', iso: '12–20' },
  health: { comp: '8–12', iso: '12–15' },
};
const VOLUME_TARGET = { beg: [8, 14], int: [11, 19], adv: [14, 23] };
const MUSCLE_CAP = { back: 1.45, quads: 1.35, delts: 1.25, glutes: 1.2, chest: 1.05, hams: 1.0, triceps: 1.05, biceps: 0.95, calves: 0.85, core: 0.85 };
const PROGRESSION = {
  beg: '+2.5 кг або +1 повтор майже щотижня — на цьому стажі нервова адаптація дає швидкий приріст.',
  int: '+2.5 кг на вправу за 2–4 тижні. Тижнева прогресія на цьому етапі вже фікція.',
  adv: '+2.5 кг на вправу за 6–10 тижнів. Це не застій, це реальний темп після 10+ років. Обсяг більше не важіль — прогрес виграється спектром повторів, точністю техніки й керуванням втомою.',
};

function ageFlags(age) {
  return {
    teen: age < 18,
    midlife: age >= 35,
    older: age >= 60,
    cuff: age >= 30,
    jointCare: age >= 35,
    axialCap: age >= 40,
    longWarm: age >= 45,
  };
}

function stableBias(p) {
  let bias = p.age >= 60 ? 4 : p.age >= 50 ? 3 : p.age >= 35 ? 2 : 0;
  if (p.level === 'beg') bias += 2;
  if (p.balance === 'cautious') bias += 2;
  if (p.balance === 'support') bias += 4;
  // Для досвідченого силовика специфічність руху важливіша за зручність тренажера.
  // Вік при цьому не є автоматичною забороною.
  if (p.goal === 'strength' && p.level === 'adv' && p.balance === 'steady') bias = Math.max(0, bias - 3);
  return bias;
}

function focusForPriority(priority) {
  const selected = Array.isArray(priority) ? priority : [];
  const match = Object.entries(FOCUS).find(([, value]) => value.priority.length === selected.length
    && value.priority.every((muscle, index) => muscle === selected[index]));
  return match ? match[0] : 'custom';
}

function isAvoidedExercise(ex, p) {
  const avoid = Array.isArray(p && p.avoid) ? p.avoid : [];
  return avoid.some((key) => {
    if (key === 'barbell') return ex.eq === 'barbell';
    if (key === 'pullups') return ex.eq === 'pullupbar';
    return Boolean(AVOID_IDS[key] && AVOID_IDS[key].has(ex.id));
  });
}

function exercisePreferenceScore(ex, p) {
  const bias = stableBias(p);
  let score = 0;
  if (bias > 0) {
    score += (ex.st || 0) * bias;
    score += Math.max(0, (ex.d || 1) - 1) * bias * 0.35;
    if (JOINT_FRIENDLY.has(ex.id)) score -= bias * 0.55;
    if (AXIAL_HEAVY.has(ex.id)) score += bias * 0.8;
    if (ex.eq === 'machine' || ex.eq === 'cable') score -= bias * 0.35;
  }

  // Для загального здоров'я та гіпертрофії після 35 вибираємо вправи з таким
  // самим тренувальним ефектом, але меншою технічною й системною ціною.
  const generalMidlife = p.age >= 35 && !(p.goal === 'strength' && p.level === 'adv' && p.balance === 'steady');
  if (generalMidlife) {
    if (ex.id === 'hack_squat') score -= 5;
    if (ex.id === 'leg_press') score -= 3;
    if (ex.id === 'goblet') score -= 2;
    if (ex.id === 'rdl_db') score -= 5;
    if (ex.id === 'rdl_bb') score -= 3;
    if (ex.id === 'hip_thrust') score -= 2;
    if (ex.id === 'bb_squat') score += 4;
    if (ex.id === 'front_squat') score += 3;
    if (ex.id === 'deadlift') score += 5;
  }

  if (p.focus === 'glutes') {
    if (ex.m === 'glutes') score -= 4;
    if (ex.p === 'glute_iso') score -= 3;
    if (['glute_bridge', 'hip_thrust', 'glute_machine', 'cable_kickback', 'kickback', 'band_abduct'].includes(ex.id)) score -= 3;
    if (['leg_press', 'hack_squat', 'goblet', 'step_up', 'leg_curl'].includes(ex.id)) score -= 2;
    if (['bb_squat', 'front_squat', 'deadlift', 'weighted_dips'].includes(ex.id)) score += 5;
  }
  if (p.focus === 'tone') {
    if (JOINT_FRIENDLY.has(ex.id)) score -= 1.5;
    if (AXIAL_HEAVY.has(ex.id) || ex.id === 'weighted_dips') score += 2.5;
  }
  if (p.focus === 'posture') {
    if (['chest_row', 'cable_row', 'hammer_row', 'cable_face_pull', 'band_face_pull', 'reverse_pecdeck'].includes(ex.id)) score -= 2.5;
    if (ex.id === 'weighted_dips') score += 3;
  }
  if (p.focus === 'athletic' && p.level === 'adv' && ex.t === 'comp') score -= 1.5;

  if (p.goal === 'strength' && p.level === 'adv' && p.balance === 'steady' && ex.eq === 'barbell' && ex.t === 'comp') score -= 3;
  return score;
}

function preferExercises(pool, p) {
  if (pool.length < 2) return pool;
  const scores = pool.map((ex) => exercisePreferenceScore(ex, p));
  const best = Math.min(...scores);
  return pool.filter((ex, i) => scores[i] <= best + 0.75);
}

function maxDifficultyFor(p) {
  if (p.level === 'beg' && p.age < 18) return 1;
  if (p.age < 18 || p.level === 'beg') return 2;
  return 3;
}

function meetsExperienceGate(ex, p) {
  const rank = LEVEL_RANK[p.level] ?? 0;
  if (ADVANCED_ONLY.has(ex.id)) return rank >= 2 && p.age >= 18;
  if (REQUIRES_FOUNDATION.has(ex.id)) return rank >= 1;
  return true;
}

function isExerciseAllowed(ex, p) {
  if (!ex || !p) return false;
  const allowed = new Set(EQUIP_SETS[p.place] || EQUIP_SETS.gym);
  if (p.bar) allowed.add('pullupbar');
  const limits = Array.isArray(p.limits) ? p.limits : [];
  const basic = (candidate) => allowed.has(candidate.eq)
    && candidate.d <= maxDifficultyFor(p)
    && meetsExperienceGate(candidate, p)
    && !isAvoidedExercise(candidate, p)
    && !(candidate.av || []).some((area) => limits.includes(area));
  if (!basic(ex)) return false;
  if (p.balance === 'support' && (ex.st || 0) >= 2) {
    const supported = EX.some((candidate) => candidate.p === ex.p && basic(candidate) && (candidate.st || 0) <= 1);
    if (supported) return false;
  }
  return true;
}

// manualOnly-вправи доступні у списку ручних замін, але не потрапляють
// до автоматично згенерованої програми (наприклад, рідкісний треп-гриф).
function isAutoSelectable(ex, p) {
  return !!ex && !ex.manualOnly && isExerciseAllowed(ex, p);
}

const slotSpec = (slot) => typeof slot === 'string' ? slot : slot.spec;
const slotGroup = (slot) => typeof slot === 'string' ? null : slot.group;
const slotPattern = (slot) => slotSpec(slot).split('@')[0].split('!')[0];
const exerciseCoversGroup = (ex, group) => ex.m === group || (ex.s || []).includes(group);

function missingRequestedGroups(day, items = day.items) {
  const requested = day.requestedGroups || [];
  return requested.filter((group) => !items.some((item) => exerciseCoversGroup(item.ex, group)));
}

function removalPreservesGroups(day, index) {
  if (!(day.requestedGroups || []).length) return true;
  const currentMissing = new Set(missingRequestedGroups(day));
  const nextMissing = missingRequestedGroups(day, day.items.filter((_, i) => i !== index));
  return nextMissing.every((group) => currentMissing.has(group));
}

function replacementPreservesGroups(plan, dayIndex, itemIndex, candidate) {
  const day = plan && plan.days && plan.days[dayIndex];
  if (!day) return false;
  const currentMissing = new Set(missingRequestedGroups(day));
  const items = day.items.map((item, i) => i === itemIndex ? { ...item, ex: candidate } : item);
  return missingRequestedGroups(day, items).every((group) => currentMissing.has(group));
}

function balancedSlots(full, count, dayIndex, seed) {
  if (count >= full.length) return full.slice();
  const foundation = Math.min(3, count);
  const result = full.slice(0, foundation);
  const extras = full.slice(foundation);
  const need = count - foundation;
  if (need <= 0 || !extras.length) return result;
  const offset = Math.abs((seed || 0) + dayIndex) % extras.length;
  for (let i = 0; i < need; i++) {
    let idx = (Math.floor(((i + 0.5) * extras.length) / need) + offset) % extras.length;
    while (result.includes(extras[idx])) idx = (idx + 1) % extras.length;
    result.push(extras[idx]);
  }
  return result;
}

function ensureWeeklySlot(selected, defs, pattern, protectedPatterns) {
  if (selected.some((slots) => slots.some((spec) => slotPattern(spec) === pattern))) return;
  const dayIndex = defs.findIndex((def) => def.full.some((spec) => slotPattern(spec) === pattern));
  if (dayIndex < 0) return;
  const wanted = defs[dayIndex].full.find((spec) => slotPattern(spec) === pattern);
  const slots = selected[dayIndex];
  let replaceAt = -1;
  for (let i = slots.length - 1; i >= 3; i--) {
    const current = slotPattern(slots[i]);
    if (current !== 'calves' && current !== 'core' && !protectedPatterns.has(current)) { replaceAt = i; break; }
  }
  if (replaceAt >= 0) slots[replaceAt] = wanted;
  else if (slots.length < defs[dayIndex].full.length) slots.push(wanted);
}

/* ============================================================
   ГЕНЕРАТОР
   ============================================================ */
function slotCount(level, type, days) {
  if (type.startsWith('fb')) return level === 'beg' ? 5 : level === 'int' ? 6 : 9;
  if (days >= 6) return level === 'adv' ? 6 : 5;
  if (days === 5) return level === 'adv' ? 7 : 6;
  return level === 'beg' ? 5 : level === 'int' ? 6 : 7;
}
function baseSets(level, days, type) {
  if (type === 'comp') return days <= 3 ? (level === 'beg' ? 3 : level === 'int' ? 4 : 3) : days === 4 ? (level === 'adv' ? 4 : 3) : 3;
  return days >= 5 ? 2 : level === 'beg' ? 2 : days <= 3 && level === 'adv' ? 2 : 3;
}

const LAST_IN_DAY = { calves: 8, core: 9 };
function orderScore(it, p) {
  const e = it.ex;
  if (LAST_IN_DAY[e.p]) return LAST_IN_DAY[e.p];
  const prio = p.priority.includes(e.m);
  if (e.t === 'comp') return prio ? 1 : e.sd >= 2 ? 2 : 3;
  return prio ? 5 : 6;
}

const HEAVY_RANK = { squat: 0, hinge: 0, h_push: 1, v_push: 2, v_pull: 2, h_pull: 2, lunge: 3 };
function markHeavy(day) {
  const h = day.items.map((it, i) => ({ it, i })).filter((x) => x.it.ex.t === 'comp' && HEAVY_RANK[x.it.ex.p] !== undefined)
    .sort((a, b) => HEAVY_RANK[a.it.ex.p] - HEAVY_RANK[b.it.ex.p] || b.it.ex.sd - a.it.ex.sd || a.i - b.i);
  day.heavyA = h[0] ? h[0].i : -1;
  day.heavyB = h[1] ? h[1].i : -1;
  return day;
}

function buildPlan(pRaw) {
  const p = sanitizeProfile(pRaw);
  if (!isProfileBuildable(p)) throw new Error('У власній розкладці кожен тренувальний день має містити хоча б одну групу м’язів');
  const allowed = new Set(EQUIP_SETS[p.place] || EQUIP_SETS.gym);
  if (p.bar) allowed.add('pullupbar');
  const fl = ageFlags(p.age);
  const usedWeek = new Set();
  let counter = 0;

  let counterSeed = ((p.seed || 0) * 7) % 11;
  let combo = {};
  // pick() повертає вправу та пояснення одним обʼєктом — без спільного мутабельного буфера.
  const pick = (spec, usedDay, depth = 0) => {
    const [head, wantType] = spec.split('!');
    const [pattern, wantRg] = head.split('@');
    const why = [];
    const cut = (fn, text) => { const r = pool.filter(fn); if (r.length && r.length < pool.length) { pool = r; if (text) why.push(text); } else if (r.length) pool = r; };

    let pool = EX.filter((e) => e.p === pattern && allowed.has(e.eq) && !e.manualOnly);
    if (p.limits.length) {
      const before = pool.length;
      pool = pool.filter((e) => !(e.av || []).some((a) => p.limits.includes(a)));
      if (pool.length < before) why.push('обмеження (' + p.limits.map((l) => LIMIT_LABEL[l]).join(', ') + '): рухи з ризиком для цієї зони виключені');
    }
    if (p.avoid.length) {
      const before = pool.length;
      pool = pool.filter((e) => !isAvoidedExercise(e, p));
      if (pool.length < before) why.push('особисті побажання: небажані типи вправ виключені з добору');
    }
    const beforeReadiness = pool.length;
    pool = pool.filter((e) => e.d <= maxDifficultyFor(p) && meetsExperienceGate(e, p));
    if (pool.length < beforeReadiness) {
      why.push(fl.teen && p.level === 'beg'
        ? 'підліток-новачок: залишено рухи початкової складності з легкою прогресією навантаження'
        : 'стаж: вправи, що потребують попередньої відносної сили або складного контролю, відкладено до наступного рівня');
    }
    if (p.balance === 'support') {
      cut((e) => (e.st || 0) <= 1, 'потрібна опора: рух із високою вимогою до рівноваги замінено стабільним');
    }
    if (!pool.length) { const fb = FALLBACK[pattern]; return fb && depth < 2 ? pick(fb + (wantType ? '!' + wantType : ''), usedDay, depth + 1) : { ex: null, why: [] }; }
    if (wantRg) cut((e) => e.rg === wantRg, 'слот націлений на підспецифікацію «' + REGION[wantRg] + '»');
    if (wantType) cut((e) => e.t === wantType, null);
    if (p.place === 'gym' && p.level !== 'beg' && !['core', 'calves'].includes(pattern)) cut((e) => e.eq !== 'bodyweight' && e.eq !== 'band', null);
    const fd = pool.filter((e) => !usedDay.has(e.id) && (combo[e.p + ':' + e.rg] || 0) < 2);
    if (!fd.length) { const fb = FALLBACK[pattern]; return fb && depth < 2 ? pick(fb, usedDay, depth + 1) : { ex: null, why: [] }; }
    const fresh = fd.filter((e) => !combo[e.p + ':' + e.rg]);
    pool = fresh.length ? fresh : fd;
    const preferred = preferExercises(pool, p);
    if (preferred.length < pool.length) {
      const ageReason = p.age >= 35 ? 'вік ' + p.age + ' + ' : '';
      why.push(ageReason + 'акцент програми, стаж, ціль і стабільність: обрано варіант із кращим співвідношенням стимулу до технічної втоми');
      pool = preferred;
    }
    const fw = pool.filter((e) => !usedWeek.has(e.id)); if (fw.length) pool = fw;
    if (depth > 0) why.push('прямого варіанту під цей слот немає в доступному інвентарі — взято найближчий патерн');
    return { ex: pool[(counter++ + counterSeed) % pool.length], why };
  };

  const pickRequested = (slot, group, usedDay) => {
    const specs = [...new Set([slotSpec(slot), ...(GROUP_SLOTS[group] || [])])];
    for (const spec of specs) {
      const picked = pick(spec, usedDay);
      if (picked.ex && exerciseCoversGroup(picked.ex, group)) return picked;
    }

    const preferredPatterns = new Map((GROUP_SLOTS[group] || []).map((spec, i) => [slotPattern(spec), i]));
    const pool = EX.filter((ex) => !usedDay.has(ex.id) && exerciseCoversGroup(ex, group) && isAutoSelectable(ex, p));
    if (!pool.length) return { ex: null, why: [] };
    const score = (ex) => (ex.m === group ? 0 : 20)
      + (preferredPatterns.has(ex.p) ? preferredPatterns.get(ex.p) : 10)
      + (usedWeek.has(ex.id) ? 3 : 0)
      + ((combo[ex.p + ':' + ex.rg] || 0) * 2)
      + exercisePreferenceScore(ex, p);
    const bestScore = Math.min(...pool.map(score));
    const best = pool.filter((ex) => score(ex) === bestScore).sort((a, b) => a.id.localeCompare(b.id));
    return {
      ex: best[(counter++ + counterSeed) % best.length],
      why: ['власна розкладка: рух гарантовано зберігає обрану групу «' + MUSCLE[group] + '»'],
    };
  };

  const boostLeft = {}, boostUsed = {};
  p.priority.forEach((m) => { boostLeft[m] = p.days >= 5 ? 1 : 2; });

  const defs = p.mode === 'custom'
    ? p.customDays.slice(0, p.days).map((d) => ({
        type: 'custom', name: d.name || dayLabel(d.groups), full: customSlots(d.groups, p), requestedGroups: d.groups.slice(),
      }))
    : SPLITS[p.days].map((t) => ({ type: t, name: DAY_NAME[t], full: DAY_SLOTS[t], requestedGroups: [] }));
  const selectedSlots = defs.map((def, dayIndex) => def.type === 'custom'
    ? def.full.slice()
    : balancedSlots(def.full, slotCount(p.level, def.type, p.days), dayIndex, p.seed));
  if (p.mode === 'auto') {
    const protectedPatterns = new Set(p.priority.flatMap((muscle) => (PRIORITY_PATTERN[muscle] || []).map(slotPattern)));
    ensureWeeklySlot(selectedSlots, defs, 'calves', protectedPatterns);
    ensureWeeklySlot(selectedSlots, defs, 'core', protectedPatterns);
  }

  const days = defs.map(({ type, name, full, requestedGroups }, dayIndex) => {
    let slots = selectedSlots[dayIndex].slice();
    p.priority.forEach((mus) => {
      const list = PRIORITY_PATTERN[mus] || [];
      const start = (boostUsed[mus] || 0) % Math.max(1, list.length);
      let pat = null;
      for (let offset = 0; offset < list.length; offset++) {
        const candidate = list[(start + offset) % list.length];
        const base = slotPattern(candidate);
        const already = slots.filter((slot) => (PRIORITY_PATTERN[mus] || []).some((item) => slotPattern(item) === slotPattern(slot))).length;
        if (full.some((slot) => slotPattern(slot) === base) && already < (GROUP_CAP[mus] || 3)) { pat = candidate; break; }
      }
      if (pat && boostLeft[mus] > 0 && slots.length < 10) {
        slots.push(pat); boostLeft[mus] -= 1; boostUsed[mus] = (boostUsed[mus] || 0) + 1;
      }
    });
    const usedDay = new Set();
    combo = {};
    let items = [];
    slots.forEach((slot) => {
      const spec = slotSpec(slot);
      const requestedGroup = slotGroup(slot);
      const alreadyCovered = requestedGroup && items.some((item) => exerciseCoversGroup(item.ex, requestedGroup));
      const { ex, why } = requestedGroup && !alreadyCovered ? pickRequested(slot, requestedGroup, usedDay) : pick(spec, usedDay);
      if (!ex) return;
      usedDay.add(ex.id); usedWeek.add(ex.id);
      combo[ex.p + ':' + ex.rg] = (combo[ex.p + ':' + ex.rg] || 0) + 1;
      items.push({
        ex, base: baseSets(p.level, p.days, ex.t), boost: p.priority.includes(ex.m),
        why: why.slice(), requestedGroup,
      });
    });

    // Якщо частину додаткових слотів довелося зняти, добираємо з патернів цього ж дня.
    const want = slots.length;
    if (items.length < want) {
      for (const slot of full.concat(full)) {
        if (items.length >= want) break;
        const spec = slotSpec(slot);
        const requestedGroup = slotGroup(slot);
        const alreadyCovered = requestedGroup && items.some((item) => exerciseCoversGroup(item.ex, requestedGroup));
        const { ex, why } = requestedGroup && !alreadyCovered ? pickRequested(slot, requestedGroup, usedDay) : pick(spec, usedDay);
        if (!ex) continue;
        usedDay.add(ex.id); usedWeek.add(ex.id);
        combo[ex.p + ':' + ex.rg] = (combo[ex.p + ':' + ex.rg] || 0) + 1;
        items.push({
          ex, base: baseSets(p.level, p.days, ex.t), boost: p.priority.includes(ex.m),
          why: why.slice(), requestedGroup,
        });
      }
    }
    // впорядкування: важке й пріоритетне на свіжу → база → ізоляція → литки → кор
    items = items.map((it, i) => ({ it, i })).sort((a, b) => orderScore(a.it, p) - orderScore(b.it, p) || a.i - b.i).map((x) => x.it);
    // рознесення однакових патернів і підспецифікацій: два вертикальні хвати поспіль конкурують між собою
    const same = (a, b) => a.ex.p === b.ex.p || a.ex.rg === b.ex.rg;
    const tiers = [];
    items.forEach((it) => {
      const key = LAST_IN_DAY[it.ex.p] ? 2 : it.ex.t === 'comp' ? 0 : 1;
      (tiers[key] = tiers[key] || []).push(it);
    });
    tiers.forEach((tier) => {
      for (let i = 0; i < tier.length - 1; i++) {
        if (!same(tier[i], tier[i + 1])) continue;
        for (let j = i + 2; j < tier.length; j++) {
          if (!same(tier[i], tier[j]) && (j + 1 >= tier.length || !same(tier[i + 1], tier[j + 1]))) {
            const t = tier[i + 1]; tier[i + 1] = tier[j]; tier[j] = t; break;
          }
        }
      }
    });
    items = tiers.filter(Boolean).flat();
    items.forEach((it, i) => {
      const w = it.why;
      if (it.boost) w.unshift('пріоритетна група — рух виведено ближче до початку, поки ти свіжий');
      if (i === 0) w.push('перший рух дня: найбільша віддача від свіжої нервової системи');
      if (it.ex.t === 'iso') w.push('ізоляція: сюди винесена дешева втома, тому RIR тут нижчий, ніж у базових рухах');
      if (LAST_IN_DAY[it.ex.p]) w.push('у кінець сесії — щоб не забирати стабілізацію в базових рухів');
    });
    const day = markHeavy({ type, name, items, requestedGroups });
    day.missingGroups = missingRequestedGroups(day);
    return day;
  });

  // Підліткова безпека має діяти на рівні даних тижня, які UI показує напряму.
  const weeks = fl.teen
    ? MACRO[p.level].map((week) => ({
        ...week, heavy: undefined, test: undefined,
        rb: Math.max(week.rb, 2), ri: Math.max(week.ri, 2),
      }))
    : MACRO[p.level];
  const plan = { profile: p, flags: fl, weeks, days };

  // Ліміт часу: зменшуємо обсяг і допоміжні вправи, але зберігаємо хоча б одне покриття кожної обраної групи.
  if (p.timeCap) {
    const peak = plan.weeks.reduce((a, b) => (a.mult > b.mult ? a : b));
    plan.days.forEach((d, di) => {
      let guard = 0, trimmed = 0;
      const lastRemovable = (predicate) => {
        for (let i = d.items.length - 1; i >= 0; i--) {
          if (predicate(d.items[i]) && removalPreservesGroups(d, i)) return i;
        }
        return -1;
      };
      while (sessionMinutes(d, peak, plan, di) > p.timeCap && guard++ < 60) {
        const isoSet = [...d.items].reverse().find((it) => it.ex.t === 'iso' && it.base > 1);
        if (isoSet) { isoSet.base -= 1; trimmed++; continue; }

        if (d.items.length > 3) {
          let cutAt = lastRemovable((it) => it.ex.t === 'iso' && !p.priority.includes(it.ex.m));
          if (cutAt < 0) cutAt = lastRemovable((it) => it.ex.t === 'iso');
          if (cutAt >= 0) {
            d.items.splice(cutAt, 1); markHeavy(d); trimmed++; continue;
          }
        }

        const compSet = [...d.items].reverse().find((it) => it.ex.t === 'comp' && it.base > 2);
        if (compSet) { compSet.base -= 1; trimmed++; continue; }

        if (d.items.length > 3) {
          let cutAt = lastRemovable((it) => !p.priority.includes(it.ex.m));
          if (cutAt < 0) cutAt = lastRemovable(() => true);
          if (cutAt >= 0) {
            d.items.splice(cutAt, 1); markHeavy(d); trimmed++; continue;
          }
        }
        break;
      }
      d.trimmed = trimmed;
      d.capRequiredMinutes = sessionMinutes(d, peak, plan, di);
      d.overCap = d.capRequiredMinutes > p.timeCap;
      d.missingGroups = missingRequestedGroups(d);
    });
  }
  return plan;
}

const isHeavy = (di, idx, week, plan) => (week.heavy === 'A' && idx === plan.days[di].heavyA) || (week.heavy === 'B' && idx === plan.days[di].heavyB);

function setsFor(item, week, plan, heavy) {
  if (heavy) return 2;
  const m = plan.flags.teen ? 0.8 : 1;
  let n = Math.max(1, Math.round(item.base * week.mult * m));
  // запобіжник: обсяг зрізається з ізоляції, база не чіпається
  if (plan.profile.fatigue && item.ex.t === 'iso' && !week.deload) n = Math.max(1, n - 1);
  return n;
}
function rirFor(item, week, plan) {
  const raw = item.ex.t === 'comp' ? week.rb : week.ri;
  if (week.deload) return raw;
  const floor = plan.flags.teen || plan.profile.level === 'beg' ? 2 : 0;
  return Math.max(raw, floor);
}
function repsFor(item, goal, week, heavy) {
  if (heavy) return '3–6';
  if (item.ex.u === 'time') return week.deload ? '20–40 с' : '30–60 с';
  return REPS[goal][item.ex.t];
}
function tempoFor(item, week, heavy) {
  if (item.ex.tp === '—') return '—';
  if (heavy) return '2-1-X';
  if (week.deload) return '3-1-3';
  return item.ex.tp;
}
function restFor(item, plan, heavy) {
  if (heavy) return '3 хв';
  if (item.ex.t === 'iso') return (SEX[plan.profile.sex] || SEX.x).restIso;
  return plan.profile.goal === 'strength' ? '3 хв' : '2–3 хв';
}
function targetFor(level, muscle, teen, sex) {
  const [lo, hi] = VOLUME_TARGET[level];
  const k = (MUSCLE_CAP[muscle] || 1) * (teen ? 0.8 : 1) * ((SEX[sex] || SEX.x).cap[muscle] || 1);
  return [Math.round(lo * k), Math.round(hi * k)];
}
function weeklyVolume(plan, week) {
  const byMuscle = {}, byRegion = {};
  plan.days.forEach((d, di) =>
    d.items.forEach((it, i) => {
      const s = setsFor(it, week, plan, isHeavy(di, i, week, plan));
      byMuscle[it.ex.m] = (byMuscle[it.ex.m] || 0) + s;
      byRegion[it.ex.rg] = (byRegion[it.ex.rg] || 0) + s;
      (it.ex.s || []).forEach((sec) => { byMuscle[sec] = (byMuscle[sec] || 0) + s * 0.5; });
    })
  );
  return { byMuscle, byRegion };
}
const restSec = (str) => { const m = str.match(/(\d+)(?:–(\d+))?\s*(хв|с)/); if (!m) return 90; const v = m[2] ? (+m[1] + +m[2]) / 2 : +m[1]; return m[3] === 'хв' ? v * 60 : v; };
function sessionMinutes(day, week, plan, di) {
  let sec = 0;
  day.items.forEach((it, i) => {
    const h = isHeavy(di, i, week, plan);
    const sets = setsFor(it, week, plan, h);
    const reps = it.ex.u === 'time' ? 1 : parseInt(repsFor(it, plan.profile.goal, week, h), 10) + 2;
    const tempo = (tempoFor(it, week, h).match(/\d+/g) || ['2', '0', '2']).reduce((a, b) => a + +b, 0) || 4;
    const work = it.ex.u === 'time' ? 45 : reps * tempo;
    const rest = restSec(restFor(it, plan, h));
    if (it.ex.uni) sec += sets * (work + rest) * 2;
    else sec += sets * (work + rest);
  });
  return Math.round((sec + 420) / 60); // +7 хв розминки
}

/* Перевірка календаря: чи вистачає годин між сесіями, що вантажать ту саму групу */
function scheduleWarnings(plan) {
  const wd = plan.profile.weekdays || [];
  if (wd.length !== plan.days.length) return [];
  const out = [];
  for (let i = 0; i < plan.days.length; i++) {
    for (let j = i + 1; j < plan.days.length; j++) {
      let gap = wd[j] - wd[i];
      if (gap < 0) gap += 7;
      const back = 7 - gap;
      const hours = Math.min(gap, back) * 24;
      if (hours >= 48) continue;
      const a = new Set(plan.days[i].items.map((it) => it.ex.m));
      const shared = plan.days[j].items.map((it) => it.ex.m).filter((m) => a.has(m) && SLOW_RECOVERY[m]);
      const uniq = [...new Set(shared)];
      if (uniq.length) {
        out.push(WEEKDAYS[wd[i]] + ' → ' + WEEKDAYS[wd[j]] + ' — лише ' + hours + ' год між сесіями, а спільно навантажені: ' +
          uniq.map((m) => MUSCLE[m]).join(', ') + '. Рознеси дні або прийми, що друга сесія піде на недовідновленому.');
      }
    }
  }
  return out;
}

function frequency(plan) {
  const f = {};
  plan.days.forEach((d) => {
    const seen = new Set(d.items.map((it) => it.ex.m));
    seen.forEach((m) => { f[m] = (f[m] || 0) + 1; });
  });
  return f;
}
// ліміт інтенсивних технік: максимум 2 підходи на сесію, лише ізоляція
function techMarks(day, week, plan) {
  if (!week.tech || week.deload || (plan && plan.profile.fatigue)) return new Set();
  const out = new Set();
  day.items.forEach((it, i) => { if (out.size < 2 && it.ex.t === 'iso' && it.ex.tech) out.add(i); });
  return out;
}
const WARMUP_GUIDES = {
  general: {
    text: '5 хв загальної розминки + суглобова гімнастика',
  },
  externalRotation: {
    text: 'Зовнішня ротація з гумкою 2×15–20 — підготувати обертову манжету, лікоть притиснутий',
    media: { src: 'exercise-media/ext-rotation.webp', alt: 'Зовнішня ротація плеча з гумкою: початкова й кінцева позиції' },
    cue: 'Лікоть притисни до боку, передпліччя відведи назовні без повороту корпусу.',
    err: 'Лікоть відривається від тулуба або рух створюється поворотом спини.',
  },
  supportedBalance: {
    text: 'Баланс біля стійкої опори 2×20–30 с на ногу — без ризику падіння',
    media: { src: 'warmup-media/supported-balance.webp', alt: 'Баланс на одній нозі з легкою опорою рукою' },
    cue: 'Лише торкайся опори пальцями, тримай таз рівно й дивись в одну точку.',
    err: 'Повністю висіти на руці, завалювати таз або затримувати дихання.',
  },
  bandAbduction: {
    text: 'Відведення стегна з міні-резинкою 2×15 — активація середньої сідничної перед цільовою роботою',
    media: { src: 'exercise-media/band-abduct.webp', alt: 'Відведення стегна з міні-резинкою: початкова й кінцева позиції' },
    cue: 'Носок дивиться вперед, таз не розвертається, ногу відводь у комфортній амплітуді.',
    err: 'Нахиляти корпус убік або розкривати носок назовні замість руху стегна.',
  },
  legExtension: {
    text: 'Розгинання ніг 1×20 з мінімальною вагою — прогріти колінний суглоб',
    media: { src: 'exercise-media/leg-ext.webp', alt: 'Розгинання ніг у тренажері: початкова й кінцева позиції' },
    cue: 'Використай легку вагу, рухайся плавно й лише в безболісній амплітуді.',
    err: 'Ривок із нижньої точки або важка вага, що змушує відривати таз від сидіння.',
  },
  deadBug: {
    text: 'Мертвий жук 2×8 на бік — увімкнути стабілізацію перед осьовими рухами',
    media: { src: 'exercise-media/dead-bug.webp', alt: 'Мертвий жук: початкова й кінцева позиції' },
    cue: 'Притисни поперек до підлоги й повільно опускай протилежні руку та ногу.',
    err: 'Відривати поперек, поспішати або одночасно опускати руку й ногу з одного боку.',
  },
  wallSlide: {
    text: 'Ковзання руками по стіні 1×10 — повернути комфортну амплітуду плечам перед жимами',
    media: { src: 'warmup-media/wall-slide.webp', alt: 'Ковзання руками по стіні з позиції W у позицію Y' },
    cue: 'Ребра тримай опущеними, ковзай руками вгору лише до комфортної висоти без болю.',
    err: 'Прогинати поперек, тягнути плечі до вух або силоміць притискати руки до стіни.',
  },
  squatHold: {
    text: 'Присідання вагою тіла 1×15 + утримання в нижній точці 20 с — розкачати амплітуду кульшового й гомілковостопного',
    media: { src: 'exercise-media/bw-squat.webp', alt: 'Присідання вагою тіла: верхня й нижня позиції' },
    cue: 'Тримай повну стопу на підлозі, коліна спрямовуй уздовж носків, глибина — контрольована.',
    err: 'Відривати пʼяти, зводити коліна всередину або втрачати нейтральне положення спини.',
  },
};

const warmupGuide = (id) => ({ id, ...WARMUP_GUIDES[id] });

function warmup(plan, day) {
  const f = plan.flags, out = [];
  const pats = new Set((day ? day.items : []).map((it) => it.ex.p));
  const has = (...xs) => xs.some((x) => pats.has(x));
  const upper = has('h_push', 'v_push', 'v_pull', 'h_pull');
  const legs = has('squat', 'lunge', 'quad_iso');
  const hinge = has('hinge', 'ham_iso');

  if (f.longWarm) out.push(warmupGuide('general'));
  if (f.cuff && upper) out.push(warmupGuide('externalRotation'));
  if (f.older || plan.profile.balance !== 'steady') out.push(warmupGuide('supportedBalance'));
  if (['glutes', 'tone'].includes(plan.profile.focus) && (legs || hinge)) out.push(warmupGuide('bandAbduction'));
  if (plan.profile.limits.includes('knee') && legs) out.push(warmupGuide('legExtension'));
  if (plan.profile.limits.includes('lowback') && (hinge || legs)) out.push(warmupGuide('deadBug'));
  if (plan.profile.limits.includes('shoulder') && upper) out.push(warmupGuide('wallSlide'));
  if ((legs || hinge) && !plan.profile.limits.includes('knee')) out.push(warmupGuide('squatHold'));

  const first = day && day.items && day.items[0] && day.items[0].ex;
  out.push({
    id: 'rampSets',
    text: '2–3 підвідні підходи в першій базовій вправі, від легкої ваги до робочої',
    media: first && first.media ? { ...first.media } : null,
    cue: first ? 'Повтори техніку вправи «' + first.n + '», поступово додаючи вагу без наближення до відмови.' : 'Поступово підведи навантаження до робочого.',
    err: 'Перетворювати підвідні підходи на важкі робочі або різко переходити до повної ваги.',
  });
  return out;
}

const DEFAULT_PROFILE = {
  age: 39, sex: 'm', level: 'adv', days: 3, mode: 'auto',
  customDays: [{ groups: ['back', 'biceps'] }, { groups: ['chest', 'delts', 'triceps'] }, { groups: ['quads', 'hams', 'glutes', 'calves'] }],
  place: 'gym', bar: true, goal: 'hyper', focus: 'upper', priority: ['back', 'chest'], avoid: [], limits: [], balance: 'steady',
  weekdays: [0, 2, 4], timeCap: null, fatigue: false, seed: 0,
};
const DEFAULT_WEEKDAYS = {
  2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 4, 5], 6: [0, 1, 2, 3, 4, 5],
};
const PROFILE_VALUES = {
  sex: new Set(['m', 'f', 'x']),
  level: new Set(['beg', 'int', 'adv']),
  mode: new Set(['auto', 'custom']),
  place: new Set(['gym', 'db', 'band', 'bw']),
  goal: new Set(['hyper', 'strength', 'fatloss', 'health']),
  focus: new Set([...Object.keys(FOCUS), 'custom']),
  avoid: new Set(Object.keys(AVOID)),
  balance: new Set(Object.keys(BALANCE)),
  timeCap: new Set([45, 60, 75, 90]),
};
const cloneDefaultProfile = () => ({
  ...DEFAULT_PROFILE,
  priority: DEFAULT_PROFILE.priority.slice(),
  avoid: DEFAULT_PROFILE.avoid.slice(),
  limits: [],
  weekdays: DEFAULT_PROFILE.weekdays.slice(),
  customDays: DEFAULT_PROFILE.customDays.map((day) => ({ ...day, groups: day.groups.slice() })),
});
const uniqueAllowed = (value, allowed, max = Infinity) => {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item) => allowed.has(item)))].slice(0, max);
};
const safeInteger = (value, fallback, min, max) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
};

function sanitizeProfile(saved) {
  const fallback = cloneDefaultProfile();
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return fallback;
  const days = safeInteger(saved.days, fallback.days, 2, 6);
  const muscleKeys = new Set(Object.keys(MUSCLE));
  const savedPriority = saved.priority === undefined ? fallback.priority.slice() : uniqueAllowed(saved.priority, muscleKeys, 2);
  const inferredFocus = focusForPriority(savedPriority);
  const safe = {
    age: safeInteger(saved.age, fallback.age, 14, 70),
    sex: PROFILE_VALUES.sex.has(saved.sex) ? saved.sex : fallback.sex,
    level: PROFILE_VALUES.level.has(saved.level) ? saved.level : fallback.level,
    days,
    mode: PROFILE_VALUES.mode.has(saved.mode) ? saved.mode : fallback.mode,
    place: PROFILE_VALUES.place.has(saved.place) ? saved.place : fallback.place,
    bar: typeof saved.bar === 'boolean' ? saved.bar : fallback.bar,
    goal: PROFILE_VALUES.goal.has(saved.goal) ? saved.goal : fallback.goal,
    focus: PROFILE_VALUES.focus.has(saved.focus) ? saved.focus : inferredFocus,
    balance: PROFILE_VALUES.balance.has(saved.balance) ? saved.balance : fallback.balance,
    priority: savedPriority,
    avoid: uniqueAllowed(saved.avoid, PROFILE_VALUES.avoid),
    limits: uniqueAllowed(saved.limits, new Set(Object.keys(LIMIT_LABEL))),
    weekdays: uniqueAllowed(saved.weekdays, new Set([0, 1, 2, 3, 4, 5, 6]), days).sort((a, b) => a - b),
    timeCap: PROFILE_VALUES.timeCap.has(Number(saved.timeCap)) ? Number(saved.timeCap) : null,
    fatigue: typeof saved.fatigue === 'boolean' ? saved.fatigue : false,
    seed: safeInteger(saved.seed, 0, 0, 1000000),
    customDays: [],
  };
  if (safe.weekdays.length !== days) safe.weekdays = DEFAULT_WEEKDAYS[days].slice();
  const sourceDays = Array.isArray(saved.customDays) ? saved.customDays : [];
  safe.customDays = Array.from({ length: days }, (_, i) => {
    const raw = sourceDays[i];
    const name = raw && typeof raw.name === 'string' ? raw.name.trim().slice(0, 80) : undefined;
    return { groups: uniqueAllowed(raw && raw.groups, muscleKeys), ...(name ? { name } : {}) };
  });
  return safe;
}

function isProfileBuildable(profile) {
  const safe = sanitizeProfile(profile);
  return safe.mode === 'auto' || (safe.customDays.length === safe.days && safe.customDays.every((day) => day.groups.length > 0));
}
export {
  JOINT_FRIENDLY, AXIAL_HEAVY, REQUIRES_FOUNDATION, ADVANCED_ONLY, BALANCE, FOCUS, CUSTOM_FOCUS, AVOID, DAY_SLOTS, SPLITS, SEX,
  GROUP_SLOTS, GROUP_WEIGHT, GROUP_CAP, customSlots, dayLabel,
  PRIORITY_PATTERN, FALLBACK, MACRO, LOADS, HEAVY_LOAD, round2, loadFor, isLoadable,
  REPS, VOLUME_TARGET, MUSCLE_CAP, PROGRESSION, ageFlags, stableBias,
  focusForPriority, isAvoidedExercise, exercisePreferenceScore, preferExercises, maxDifficultyFor, meetsExperienceGate, isExerciseAllowed, isAutoSelectable,
  slotCount, baseSets, LAST_IN_DAY, orderScore, HEAVY_RANK, markHeavy, buildPlan,
  isHeavy, setsFor, rirFor, repsFor, tempoFor, restFor, targetFor, weeklyVolume,
  restSec, sessionMinutes, scheduleWarnings, frequency, techMarks, WARMUP_GUIDES, warmup,
  DEFAULT_PROFILE, sanitizeProfile, isProfileBuildable,
};
