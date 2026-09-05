/* ============================================================
   ДОВІДНИКИ Й ТЕКСТИ — спільні для движка (engine.js) та UI.
   Тримаємо окремо від логіки, щоб зміна формулювання не вимагала
   чіпати generation-код, а переклад на іншу мову — лише цей файл.
   ============================================================ */
const REGION = {
  chest_up: 'Груди · верх (ключична)', chest_mid: 'Груди · середина',
  back_width: 'Спина · ширина', back_thick: 'Спина · товщина', back_low: 'Спина · низ найширших', erect: 'Спина · розгиначі',
  delt_front: 'Дельта передня', delt_side: 'Дельта середня', delt_rear: 'Дельта задня',
  bi: 'Біцепс', tri: 'Трицепс', tri_long: 'Трицепс · довга головка',
  quad: 'Квадрицепс', ham: 'Задня поверхня стегна', glute: 'Сідничні',
  calf_gastro: 'Литка · литковий', calf_soleus: 'Литка · камбалоподібний',
  core: 'Прес / кор', cuff: 'Обертова манжета',
};


const REGION_GROUP = {
  chest_up: 'chest', chest_mid: 'chest', back_width: 'back', back_thick: 'back', back_low: 'back', erect: 'back',
  delt_front: 'delts', delt_side: 'delts', delt_rear: 'delts', bi: 'biceps', tri: 'triceps', tri_long: 'triceps',
  quad: 'quads', ham: 'hams', glute: 'glutes', calf_gastro: 'calves', calf_soleus: 'calves', core: 'core', cuff: 'cuff',
};


const MUSCLE = { chest: 'Груди', back: 'Спина', quads: 'Квадрицепс', hams: 'Задня поверхня стегна', glutes: 'Сідничні', delts: 'Дельти', biceps: 'Біцепс', triceps: 'Трицепс', calves: 'Литки', core: 'Прес / кор' };


const UNI_SIDE = { squat: 'ногу', lunge: 'ногу', hinge: 'ногу', calves: 'ногу', glute_iso: 'ногу', h_pull: 'руку', cuff: 'руку' };


const uniLabel = (ex) => (ex.uni ? 'на кожну ' + (UNI_SIDE[ex.p] || 'сторону') : '');


const EQUIP_SETS = {
  gym: ['barbell', 'dumbbell', 'machine', 'cable', 'band', 'bodyweight', 'pullupbar', 'dipstation'],
  home: ['bodyweight'],
  db: ['dumbbell', 'band', 'bodyweight'],
  band: ['band', 'bodyweight'],
  bw: ['bodyweight'],
};


const PLACE_LABEL = { gym: 'Зал', home: 'Вдома', db: 'Гантелі вдома', band: 'Резинки', bw: 'Вага тіла' };
const HOME_EQUIPMENT_LABEL = { dumbbell: 'Гантелі', band: 'Резинки', pullupbar: 'Турнік' };


const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];


const SLOW_RECOVERY = { hams: 48, back: 48, quads: 48, chest: 48, glutes: 48 };


const LIMIT_LABEL = { knee: 'коліна', lowback: 'поперек', shoulder: 'плечі' };


const LEVEL_LABEL = { beg: 'Новачок', int: 'Середній', adv: 'Просунутий' };


const GOAL_LABEL = { hyper: 'Ріст м’язів', strength: 'Сила', fatloss: 'Зниження ваги', health: 'Здоров’я' };


const DAY_NAME = { fbA: 'Фулбоді A', fbB: 'Фулбоді B', fbC: 'Фулбоді C', upper: 'Верх тіла', lower: 'Низ тіла', push: 'Жимовий', pull: 'Тяговий', legs: 'Ноги' };


const SPLIT_NOTE = {
  2: 'Два фулбоді-дні: кожна група працює двічі на тиждень — мінімум, який ще дає прогрес.',
  3: 'Три фулбоді з різними акцентами. Робоча схема на будь-якому стажі, якщо обсяг рознесено рівно по днях.',
  4: 'Верх / низ двічі. Найкращий баланс частоти й обсягу для середнього рівня.',
  5: 'Верх і низ на початку тижня, далі жим / тяга / ноги.',
  6: 'Push-Pull-Legs двічі. Потребує стабільного сну й графіка.',
};

const PROGRAM_STYLE_LABEL = { auto: 'Підібрати автоматично', fullbody: 'Фулбоді', split: 'Спліт' };

const PROGRAM_STYLE_NOTE = {
  fullbody: {
    2: 'Два фулбоді-дні: усе тіло працює двічі на тиждень.',
    3: 'Три фулбоді-дні з різними акцентами та рівномірним тижневим обсягом.',
    4: 'Чотири коротші фулбоді-сесії: вища частота, але менше вправ за одне тренування.',
  },
  split: {
    3: 'Push / Pull / Legs: жимовий день, тяговий день і ноги.',
    4: 'Верх / низ двічі на тиждень: кожна велика група отримує дві сесії.',
    5: 'Верх / низ, потім Push / Pull / Legs — поширений комбінований спліт.',
    6: 'Push / Pull / Legs двічі на тиждень. Потребує стабільного відновлення.',
  },
};

const programStyleNote = (style, days) => style === 'auto'
  ? SPLIT_NOTE[days]
  : (PROGRAM_STYLE_NOTE[style] && PROGRAM_STYLE_NOTE[style][days]) || SPLIT_NOTE[days];

export {
  REGION, REGION_GROUP, MUSCLE, UNI_SIDE, uniLabel, EQUIP_SETS, PLACE_LABEL, HOME_EQUIPMENT_LABEL,
  WEEKDAYS, SLOW_RECOVERY, LIMIT_LABEL, LEVEL_LABEL, GOAL_LABEL, DAY_NAME, SPLIT_NOTE,
  PROGRAM_STYLE_LABEL, PROGRAM_STYLE_NOTE, programStyleNote,
};
