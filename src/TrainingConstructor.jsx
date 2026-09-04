import { useState, useMemo, useEffect, useRef, Component } from "react";
import { EX } from './data/exercises.js';
import HealthPlanPanel from './components/HealthPlanPanel.jsx';
import ProgressDashboard from './components/ProgressDashboard.jsx';
import { healthWeekKey } from './healthPlan.ts';
import { sanitizeHistory, snapshotVolume } from './journalAnalytics.ts';
import { applyCoachEdits, prescriptionKey, sanitizeClientProfiles, sanitizeCoachEdits } from './coachTools.ts';
import { trainingAdaptation } from './trainingAdaptation.ts';
import { CSS } from './styles.js';
import { downloadJson, storage } from './persistence.js';
import {
  REGION, REGION_GROUP, MUSCLE, UNI_SIDE, uniLabel,
  PLACE_LABEL, HOME_EQUIPMENT_LABEL, WEEKDAYS, LEVEL_LABEL, GOAL_LABEL, PROGRAM_STYLE_LABEL, programStyleNote,
} from './data/labels.js';
import {
  SEX, BALANCE, FOCUS, CUSTOM_FOCUS, AVOID, GROUP_CAP, GOAL_GUIDANCE, dayLabel, focusForPriority, loadFor, loadStepFor, estimated1RM, e1rmConfidence, isLoadable, PROGRESSION, ageFlags, isExerciseAllowed,
  buildPlan, isHeavy, setsFor, rirFor, repsFor, tempoFor, restFor, progressionSuggestion, targetFor,
  weeklyVolume, sessionMinutes, scheduleWarnings, frequency, techMarks, warmup, warmupMinutes, applySwapsToPlan,
  DEFAULT_PROFILE, sanitizeProfile,
} from './engine.js';
import {
  APP_STATE_VERSION, SHARE_PREFIX, assignPendingAdaptation, cancelPendingAdaptation, cleanAnchors, cleanJournal, cleanPendingAdaptation, cleanRevisions, decodeSharePayload,
  diffProgramSnapshots, encodeSharePayload, hydrateSwaps, journalKey, makeBackupPayload, makeProgramSnapshot, makeSharePayload,
  serializeSwaps,
} from './appState.js';

const STATE_KEY = 'tk-state';
const roundDisplay = (value) => Math.round(value * 10) / 10;


/* ============================================================
   ІНТЕРФЕЙС
   ============================================================ */

function Header({ theme, onToggle }) {
  const dark = theme === 'dark';
  return (
    <>
      <div className="tk-bar">
        <span className="tk-mark">Конструктор тренувань</span>
        <span className="tk-sub">Тренувальний блок · Повтори в запасі · Розвантаження</span>
        <button type="button" className="tk-theme" aria-pressed={dark} onClick={onToggle}
          aria-label={dark ? 'Увімкнути світлу тему' : 'Увімкнути темну тему'}>
          {dark ? '☀ Світла тема' : '◐ Темна тема'}
        </button>
      </div>
      <div className="tk-credit" aria-label="Developed by Ihor Samchenko">
        <span>developed by</span><strong>Ihor Samchenko</strong>
      </div>
    </>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  return <div className={'tk-toast' + (toast.type === 'bad' ? ' bad' : '')} role="status" aria-live="polite">{toast.message}</div>;
}

function ageNote(p) {
  const f = ageFlags(p.age);
  if (f.teen) return 'До 18: RIR не нижче 2, обсяг −20 %, технічно складні рухи прибрано, тест максимумів не призначається.';
  if (p.balance !== 'steady') return 'Вправи з опорою отримують перевагу через зазначений контроль рівноваги, а не через паспортний вік.';
  return 'Для дорослих вік не забороняє вправи й не змінює їх автоматично; вибір визначають стаж, ціль, контроль руху та чутливі зони.';
}

function OptRow({ options, value, onChange, multi, ariaLabel }) {
  const active = (k) => (multi ? value.includes(k) : value === k);
  const toggle = (k) => { if (!multi) return onChange(k); onChange(value.includes(k) ? value.filter((x) => x !== k) : [...value, k]); };
  return (
    <div className="tk-opts" {...(ariaLabel ? { role: 'group', 'aria-label': ariaLabel } : {})}>
      {options.map(([k, label]) => (
        <button key={k} type="button" className="tk-opt" aria-pressed={active(k)} onClick={() => toggle(k)}>{label}</button>
      ))}
    </div>
  );
}

function HelpLabel({ label, note, children }) {
  return (
    <details className="tk-help" name="tk-context-help">
      <summary aria-label={'Пояснення: ' + label}>
        <span className="tk-help-label">{label}</span>
        {note && <span className="tk-help-note">— {note}</span>}
        <span className="tk-help-icon" aria-hidden="true">i</span>
      </summary>
      <div className="tk-help-body">{children}</div>
    </details>
  );
}

function ReadingGuide() {
  const terms = [
    ['Тренувальний блок', 'Послідовність тижнів програми: від входження в навантаження до важчих фаз і розвантаження. У спортивній термінології це мезоцикл, а не річний макроцикл.'],
    ['3 × 8–12', 'Три робочі підходи по 8–12 повторів. Розминочні та підвідні підходи сюди не входять.'],
    ['RIR 2', 'Зупини підхід, коли відчуваєш, що зміг би виконати ще приблизно два чисті повтори. RIR 0 — повторів у запасі немає.'],
    ['Темп 3-0-2', 'Три секунди опускання, без паузи, дві секунди підйому. X означає швидкий контрольований підйом.'],
    ['База та ізоляція', 'Базова вправа навантажує кілька суглобів і груп; ізоляційна переважно спрямована на одну групу.'],
    ['Тижневий обсяг', 'Кількість робочих підходів на м’язову групу за тиждень. Висота стовпчика показує відносний обсяг, а не вагу.'],
    ['Делоад / DL', 'Запланований легший тиждень зі зменшеними вагою й кількістю підходів для відновлення.'],
    ['Важкий блок', 'Підходи на 3–6 повторів у вибраних базових вправах. Це не тест максимуму й не вимога працювати до відмови.'],
    ['SFR', 'Співвідношення тренувального стимулу до втоми: перевагу отримує варіант, що добре навантажує м’яз без зайвої системної втоми.'],
    ['Відпочинок', 'Зазначений час між робочими підходами. Якщо дихання або техніка ще не відновилися, відпочинь трохи довше.'],
  ];
  return (
    <details className="tk-reading">
      <summary>
        <span className="tk-reading-heading">
          <strong>Як читати програму</strong>
          <small>RIR, темп, підходи, делоад та інші позначення</small>
        </span>
        <span className="tk-reading-arrow" aria-hidden="true">⌄</span>
      </summary>
      <div className="tk-reading-body">
        <p className="tk-reading-intro">Відкрий цей словник у будь-який момент, якщо позначення біля вправи або тижня незрозуміле.</p>
        <div className="tk-reading-grid">
          {terms.map(([term, explanation]) => (
            <div className="tk-reading-item" key={term}><b>{term}</b><span>{explanation}</span></div>
          ))}
        </div>
      </div>
    </details>
  );
}

function HomeEquipmentPanel({ value = [], onChange = () => {} }) {
  const options = [
    ['dumbbell', 'Гантелі', 'звичайні або регульовані'],
    ['band', 'Резинки', 'довгі петлі чи еспандери'],
    ['pullupbar', 'Турнік', 'надійно закріплений'],
  ];
  const toggle = (key) => onChange(value.includes(key) ? value.filter((item) => item !== key) : [...value, key]);
  return (
    <div className="tk-home">
      <strong className="tk-home-title">Що є вдома</strong>
      <p className="tk-home-intro">Обери все доступне — варіанти можна поєднувати.</p>
      <div className="tk-home-grid">
        {options.map(([key, label, note]) => {
          const selected = value.includes(key);
          return (
            <button key={key} type="button" className="tk-home-item" aria-pressed={selected} onClick={() => toggle(key)}>
              <span className="tk-home-check" aria-hidden="true">{selected ? '✓' : ''}</span>
              <span className="tk-home-copy"><b>{label}</b><small>{note}</small></span>
            </button>
          );
        })}
      </div>
      <p className="tk-home-bodyweight"><b>Вага тіла</b> · доступна завжди, окремо обирати не потрібно.</p>
      <div className="tk-home-kit">
        <h4>Що стане у пригоді вдома</h4>
        <div className="tk-home-kit-grid">
          <div>
            <h5>Варто придбати</h5>
            <ul>
              <li>регульовані гантелі — найзручніше для поступового збільшення ваги;</li>
              <li>довгі резинки різного опору та дверний анкер;</li>
              <li>неслизький килимок і стійку лаву або степ;</li>
              <li>турнік — лише з кріпленням, розрахованим на твою вагу.</li>
            </ul>
          </div>
          <div>
            <h5>Можна знайти вдома</h5>
            <ul>
              <li>рюкзак із книжками або пляшками як регульоване обтяження;</li>
              <li>рушники на гладкій підлозі замість слайдерів;</li>
              <li>низьку стійку сходинку для зашагувань;</li>
              <li>важкий стійкий стілець — тільки як опору для рівноваги.</li>
            </ul>
          </div>
        </div>
        <p className="tk-home-safe">Не використовуй стільці на колесах, скляні меблі, хиткі опори або резинки без надійного кріплення. Перед кожним підходом перевіряй стійкість.</p>
      </div>
    </div>
  );
}

function ExclusionMenu({ value, onChange, floorWarning }) {
  const toggle = (key) => onChange(value.includes(key) ? value.filter((item) => item !== key) : [...value, key]);
  return (
    <details className="tk-exclude" open={value.length > 0 ? true : undefined}>
      <summary>
        <span className="tk-exclude-heading">
          <strong>Виключити з програми</strong>
          <small>Необов’язково — відкрий, якщо певні рухи тобі не підходять</small>
        </span>
        <span className="tk-exclude-state">{value.length ? `Обрано: ${value.length}` : 'Без виключень'}</span>
      </summary>
      <div className="tk-exclude-body">
        <p className="tk-exclude-intro">Позначені категорії не потраплять ні в готову програму, ні до списку ручних замін.</p>
        <div className="tk-exclude-grid">
          {Object.entries(AVOID).map(([key, option]) => {
            const selected = value.includes(key);
            return (
              <button key={key} type="button" className="tk-exclude-item" aria-pressed={selected} onClick={() => toggle(key)}>
                <span className="tk-exclude-box" aria-hidden="true">{selected ? '✓' : ''}</span>
                <span className="tk-exclude-copy"><b>{option.label}</b><small>{option.note}</small></span>
              </button>
            );
          })}
        </div>
        {floorWarning && <p className="tk-exclude-warning">Для тренувань лише з вагою тіла це суттєво скоротить вибір вправ.</p>}
      </div>
    </details>
  );
}

function WarmupItem({ item }) {
  const [open, setOpen] = useState(false);
  const text = typeof item === 'string' ? item : item.text;
  const media = typeof item === 'string' ? null : item.media;
  return (
    <li>
      <div className="tk-warm-head">
        <span>{text}</span>
        {media && (
          <button type="button" className="tk-warm-toggle" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
            {open ? 'Сховати техніку' : 'Показати техніку'}
          </button>
        )}
      </div>
      {open && media && (
        <div className="tk-warm-guide">
          <figure className="tk-media">
            <img loading="lazy" src={import.meta.env.BASE_URL + media.src} alt={media.alt || text} />
            <figcaption>Початкова й кінцева позиції руху</figcaption>
          </figure>
          <div className="tk-warm-notes">
            <div className="tk-warm-note"><b>Підказка</b>{item.cue}</div>
            <div className="tk-warm-note bad"><b>Типова помилка</b>{item.err}</div>
          </div>
        </div>
      )}
    </li>
  );
}

function FreqCheck({ p }) {
  const f = {};
  (p.customDays || []).slice(0, p.days).forEach((d) => (d.groups || []).forEach((g) => { f[g] = (f[g] || 0) + 1; }));
  const missing = Object.keys(MUSCLE).filter((k) => !f[k]);
  const once = Object.keys(f).filter((k) => f[k] === 1);
  const empty = Array.from({ length: p.days }).some((_, i) => !(p.customDays[i] && p.customDays[i].groups.length));
  const thin = Array.from({ length: p.days }).map((_, i) => {
    const g = (p.customDays[i] && p.customDays[i].groups) || [];
    return { i, n: g.reduce((a, x) => a + GROUP_CAP[x], 0) };
  }).filter((x) => x.n > 0 && x.n <= 3);
  return (
    <div className="tk-warm" style={{ marginBottom: 0 }}>
      <strong style={{ fontSize: 13 }}>Перевірка розкладки</strong>
      <ul>
        {empty && <li style={{ color: 'var(--hot)' }}>Є день без жодної групи — його треба заповнити.</li>}
        {once.length > 0 && <li>Раз на тиждень: {once.map((k) => MUSCLE[k]).join(', ')}. Це може бути достатньо, якщо тижневий обсяг і якість підходів збережені; другий день часто лише допомагає зручніше розподілити роботу.</li>}
        {missing.length > 0 && <li>Не тренуються зовсім: {missing.map((k) => MUSCLE[k]).join(', ')}.</li>}
        {thin.length > 0 && <li>Короткі дні: {thin.map((x) => 'День ' + (x.i + 1)).join(', ')} — не більше {thin[0].n} вправ. Більше рухів на дрібну групу за одну сесію майже не додає стимулу, тож або додай сусідню групу, або залиш як є.</li>}
        {!empty && !once.length && !missing.length && <li>Кожна група працює щонайменше двічі на тиждень — розкладка збалансована.</li>}
      </ul>
    </div>
  );
}

function Wizard({ p, set, onBuild }) {
  const [screen, setScreen] = useState({ activity: '', symptoms: '', condition: '', intensity: '', supervision: false });
  const [ageDraft, setAgeDraft] = useState(String(p.age));
  // eslint-disable-next-line react-hooks/set-state-in-effect -- імпорт профілю синхронізує зовнішнє значення
  useEffect(() => { setAgeDraft(String(p.age)); }, [p.age]);
  const commitAge = () => {
    const parsed = Number(ageDraft);
    const age = Number.isFinite(parsed) && ageDraft !== '' ? Math.min(70, Math.max(14, Math.round(parsed))) : p.age;
    setAgeDraft(String(age));
    if (age !== p.age) set({ age });
  };
  const setDay = (i, groups) => {
    const cd = Array.from({ length: Math.max(p.days, i + 1) }).map((_, k) => p.customDays[k] || { groups: [] });
    cd[i] = { groups };
    set({ customDays: cd });
  };
  const setDays = (n) => {
    // При зменшенні днів старі weekdays/customDays можуть лишити «мертві» записи
    // за межами нової кількості — обрізаємо; при збільшенні добудовуємо порожніми.
    const weekdays = p.weekdays.slice(0, n);
    const customDays = Array.from({ length: n }).map((_, i) => p.customDays[i] || { groups: [] });
    const programStyle = (p.programStyle === 'fullbody' && n > 4) || (p.programStyle === 'split' && n < 3) ? 'auto' : p.programStyle;
    set({ days: n, weekdays, customDays, programStyle });
  };
  const toggleDay = (i) => {
    let w = p.weekdays.includes(i) ? p.weekdays.filter((x) => x !== i) : [...p.weekdays, i];
    w.sort((a, b) => a - b);
    if (w.length > p.days) w = w.slice(w.length - p.days);
    set({ weekdays: w });
  };
  const changeSex = (sex) => set({ sex });
  const changeFocus = (focus) => set({ focus, priority: FOCUS[focus].priority.slice() });
  const changePriority = (priority) => {
    const limited = priority.slice(-2);
    set({ priority: limited, focus: focusForPriority(limited) });
  };
  const focusInfo = FOCUS[p.focus] || CUSTOM_FOCUS;
  const customReady = p.mode !== 'custom' || Array.from({ length: p.days }).every((_, i) => p.customDays[i] && p.customDays[i].groups.length);
  const screenComplete = screen.activity && screen.symptoms && screen.condition && screen.intensity;
  const medicalBlock = screen.symptoms === 'yes' || screen.condition !== 'no';
  const teenReady = p.age >= 18 || screen.supervision;
  const timeCapReady = [45, 60, 75, 90, 120].includes(p.timeCap);
  const ready = customReady && screenComplete && !medicalBlock && teenReady && timeCapReady;
  return (
    <div className="tk-card tk-card-dense">
      <div className="tk-eyebrow">Крок 1 — параметри</div>
      <h2 className="tk-h">Розкажи про себе</h2>
      <p className="tk-p">Довжина тренувального блоку залежить від стажу: 5 тижнів для новачка, 7 для середнього рівня, 11 для просунутого.</p>

      <div className="tk-field">
        <label className="tk-lbl" htmlFor="tk-age">Вік</label>
        <input id="tk-age" className="tk-num" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={2}
          value={ageDraft} onChange={(e) => setAgeDraft(e.target.value.replace(/\D/g, '').slice(0, 2))}
          onBlur={commitAge} onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') { setAgeDraft(String(p.age)); e.currentTarget.blur(); }
          }} />
        <div className="tk-hint">{ageNote(p)} Діапазон автоматичного конструктора — 14–70 років.</div>
      </div>

      <div className="tk-field">
        <HelpLabel label="Баланс і контроль руху">Оціни не силу, а здатність утримувати положення без хитання, втрати траєкторії чи потреби хапатися за опору. Відповідь допомагає замінити нестійкі вправи на варіанти з опорою.</HelpLabel>
        <OptRow options={Object.entries(BALANCE).map(([k, v]) => [k, v.label])} value={p.balance} onChange={(v) => set({ balance: v })} />
        <div className="tk-hint">{BALANCE[p.balance].note} Це точніший критерій вибору вправи, ніж паспортний вік.</div>
      </div>

      <div className="tk-field">
        <span className="tk-lbl">Стать</span>
        <OptRow options={Object.entries(SEX).map(([k, v]) => [k, v.label])} value={p.sex} onChange={changeSex} />
        <div className="tk-hint">{SEX[p.sex].note}</div>
      </div>

      <div className="tk-field">
        <HelpLabel label="Стаж силових тренувань">Рахуй період регулярних тренувань, а не час від першого відвідування залу. Після тривалої перерви краще тимчасово обрати нижчий рівень — це змінить складність вправ, обсяг і довжину циклу.</HelpLabel>
        <OptRow options={[['beg', 'До 6 місяців'], ['int', '6–24 місяці'], ['adv', 'Понад 2 роки']]} value={p.level} onChange={(v) => set({ level: v })} />
        <div className="tk-hint">{PROGRESSION[p.level]}</div>
      </div>

      <div className="tk-field">
        <span className="tk-lbl">Днів на тиждень</span>
        <OptRow options={[['2', '2'], ['3', '3'], ['4', '4'], ['5', '5'], ['6', '6']]} value={String(p.days)} onChange={(v) => setDays(Number(v))} />
        <div className="tk-hint">Обирай кількість днів, яку реально зможеш підтримувати щотижня.</div>
      </div>

      <div className="tk-field">
        <HelpLabel label="Як скласти програму">Готова програма сама розподілить групи по днях. У власній розкладці ти визначаєш групи кожного дня, а застосунок усе одно підбирає вправи, порядок і обсяг.</HelpLabel>
        <OptRow options={[['auto', 'Готова програма'], ['custom', 'Налаштувати дні вручну']]} value={p.mode} onChange={(v) => set({ mode: v })} />
        <div className="tk-hint">{p.mode === 'auto' ? 'Застосунок розподілить вправи й обсяг за вибраним форматом.' : 'Обери групи для кожного дня. Слоти всередині дня розподіляються за розміром групи, а порядок вправ і підспецифікації рахує той самий движок, що й у готових шаблонах.'}</div>
      </div>

      {p.mode === 'auto' && (
        <div className="tk-field">
          <HelpLabel label="Формат тренувань">Фулбоді навантажує основні групи в кожній сесії. Спліт розподіляє їх між окремими днями. Автоматичний режим обирає формат за кількістю тренувань.</HelpLabel>
          <OptRow options={[
            ['auto', PROGRAM_STYLE_LABEL.auto],
            ...(p.days <= 4 ? [['fullbody', PROGRAM_STYLE_LABEL.fullbody]] : []),
            ...(p.days >= 3 ? [['split', PROGRAM_STYLE_LABEL.split]] : []),
          ]} value={p.programStyle} onChange={(programStyle) => set({ programStyle })} />
          <div className="tk-hint">{programStyleNote(p.programStyle, p.days)}</div>
        </div>
      )}

      {p.mode === 'custom' && (
        <div className="tk-field">
          {Array.from({ length: p.days }).map((_, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <span className="tk-lbl">День {i + 1} <span style={{ fontWeight: 400, color: 'var(--steel)' }}>{(p.customDays[i] && p.customDays[i].groups.length) ? '— ' + dayLabel(p.customDays[i].groups) : '— групи не обрано'}</span></span>
              <OptRow multi options={Object.entries(MUSCLE)} value={(p.customDays[i] && p.customDays[i].groups) || []}
                onChange={(v) => setDay(i, v)} />
            </div>
          ))}
          <FreqCheck p={p} />
        </div>
      )}

      <div className="tk-field">
        <span className="tk-lbl">Дні тижня <span style={{ fontWeight: 400, color: 'var(--steel)' }}>— обери рівно {p.days}</span></span>
        <div className="tk-wdays">
          {WEEKDAYS.map((w, i) => (
            <button key={i} type="button" className="tk-wd" aria-pressed={p.weekdays.includes(i)} onClick={() => toggleDay(i)}>{w}</button>
          ))}
        </div>
        <div className="tk-hint">
          {p.weekdays.length === p.days
            ? 'Конструктор перевірить, чи вистачає годин між сесіями, які вантажать ту саму групу.'
            : 'Можна пропустити — тоді перевірки відновлення між днями не буде.'}
        </div>
      </div>

      <div className="tk-field">
        <HelpLabel label="Тривалість однієї сесії" note="обов’язково">Ліміт охоплює розминку, робочі підходи й відпочинок. Якщо часу бракує, програма спершу скорочує допоміжний обсяг, зберігаючи основні рухи.</HelpLabel>
        <OptRow ariaLabel="Тривалість сесії" options={[['45', '45 хв'], ['60', '60 хв'], ['75', '75 хв'], ['90', '90 хв'], ['120', '120 хв · максимум']]}
          value={p.timeCap == null ? '' : String(p.timeCap)} onChange={(v) => set({ timeCap: Number(v) })} />
        <div className="tk-hint">Для більшості клієнтів практичний орієнтир — 60–90 хв. 120 хв — аварійна верхня межа, а не рекомендована тривалість. Конструктор спершу зрізає ізоляційні підходи й другорядні вправи; базові рухи чіпає останніми.</div>
      </div>

      <div className="tk-field">
        <span className="tk-lbl">Де тренуєшся</span>
        <OptRow options={[['gym', 'Зал'], ['home', 'Вдома']]} value={p.place}
          onChange={(place) => set({ place, bar: place === 'gym' || p.homeEquipment.includes('pullupbar') })} />
        {p.place === 'home' && <HomeEquipmentPanel value={p.homeEquipment} onChange={(homeEquipment) => set({ homeEquipment, bar: homeEquipment.includes('pullupbar') })} />}
      </div>

      <div className="tk-field">
        <HelpLabel label="Головна ціль">Гіпертрофія налаштовує програму на ріст м’язів, сила — на важчі підходи й довший відпочинок, здоров’я — на кероване навантаження, зниження ваги — на щільніші сесії. Втрата ваги все одно залежить насамперед від харчування.</HelpLabel>
        <OptRow options={[['hyper', 'Гіпертрофія'], ['strength', 'Сила'], ['fatloss', 'Зниження ваги'], ['health', 'Здоров’я']]} value={p.goal} onChange={(v) => set({ goal: v })} />
        <div className="tk-hint">{GOAL_GUIDANCE[p.goal]}</div>
      </div>

      <div className="tk-field">
        <HelpLabel label="Акцент програми">Це готовий профіль пріоритетів: він змінює частоту груп і порядок рівноцінних вправ, але не прибирає тренування решти тіла.</HelpLabel>
        <OptRow options={Object.entries(FOCUS).map(([k, v]) => [k, v.label])} value={p.focus} onChange={changeFocus} />
        <div className="tk-hint">{focusInfo.note} Це стартовий профіль, а не обмеження за статтю.</div>
      </div>

      <div className="tk-field">
        <HelpLabel label="Пріоритетні групи" note="не більше двох">Обрані групи отримують додаткове пряме навантаження і ставляться раніше в сесії. Більше двох пріоритетів розмиває акцент і надмірно збільшує тривалість тренування.</HelpLabel>
        <OptRow multi options={Object.entries(MUSCLE)} value={p.priority} onChange={changePriority} />
        <div className="tk-hint">Пріоритетна група отримує додаткову вправу і ставиться на початок дня, поки ти свіжий. Ручна зміна створює власний акцент.</div>
      </div>

      <div className="tk-field">
        <ExclusionMenu value={p.avoid} onChange={(avoid) => set({ avoid })}
          floorWarning={p.place === 'home' && p.homeEquipment.length === 0 && p.avoid.includes('floor')} />
      </div>

      <div className="tk-field">
        <HelpLabel label="Чутливі зони">Позначені зони виключають відповідні вправи і з автоматичного плану, і з ручних замін. Це консервативний фільтр, а не діагноз. Гострий або наростаючий біль — привід зупинитися й звернутися до фахівця.</HelpLabel>
        <OptRow multi options={[['knee', 'Коліна'], ['lowback', 'Поперек'], ['shoulder', 'Плечі']]} value={p.limits} onChange={(v) => set({ limits: v })} />
      </div>

      <div className="tk-field">
        <HelpLabel label="Короткий скринінг перед тренуванням">Відповіді не зберігаються і не потрапляють у посилання. Це не діагностика, а запобіжник перед автоматичною програмою.</HelpLabel>
        <div className="tk-hint">Автоматичний режим не охоплює вагітність і післяпологовий період, реабілітацію, остеопороз та індивідуальне ведення відомих захворювань, включно з контрольованою гіпертензією.</div>
        <span className="tk-lbl">Чи тренувався регулярно протягом останніх місяців?</span>
        <OptRow ariaLabel="Регулярна активність" options={[['yes', 'Так'], ['no', 'Ні']]} value={screen.activity} onChange={(activity) => setScreen((s) => ({ ...s, activity }))} />
        <span className="tk-lbl" style={{ marginTop: 10 }}>Є біль у грудях, запаморочення, непритомність або незвична задишка?</span>
        <OptRow ariaLabel="Симптоми" options={[['no', 'Ні'], ['yes', 'Так']]} value={screen.symptoms} onChange={(symptoms) => setScreen((s) => ({ ...s, symptoms }))} />
        <span className="tk-lbl" style={{ marginTop: 10 }}>Є відоме серцево-судинне, метаболічне чи ниркове захворювання?</span>
        <OptRow ariaLabel="Відомі захворювання" options={[['no', 'Ні'], ['yes', 'Так'], ['unsure', 'Не впевнений']]} value={screen.condition} onChange={(condition) => setScreen((s) => ({ ...s, condition }))} />
        <span className="tk-lbl" style={{ marginTop: 10 }}>Запланована інтенсивність</span>
        <OptRow ariaLabel="Запланована інтенсивність" options={[['moderate', 'Помірна'], ['vigorous', 'Висока']]} value={screen.intensity} onChange={(intensity) => setScreen((s) => ({ ...s, intensity }))} />
        {medicalBlock && <div className="tk-alert" style={{ marginTop: 10 }}><b>Потрібна індивідуальна оцінка</b>Автоматичний план не створюється за наявності симптомів, відомого захворювання або невизначеної відповіді. Узгодь початок і інтенсивність тренувань із медичним фахівцем.</div>}
        {screen.activity === 'no' && screen.intensity === 'vigorous' && !medicalBlock && <div className="tk-hint">Після перерви почни з помірної інтенсивності й нарощуй її поступово.</div>}
      </div>
      {p.age < 18 && (
        <label className="tk-check">
          <input type="checkbox" checked={screen.supervision} onChange={(e) => setScreen((s) => ({ ...s, supervision: e.target.checked }))} />
          <span>Тренування проходитимуть із належним навчанням техніки та наглядом відповідального дорослого або кваліфікованого тренера.</span>
        </label>
      )}
      <button className="tk-cta" disabled={!ready} onClick={() => onBuild()}>
        {!customReady ? 'Заповни всі дні розкладки' : !timeCapReady ? 'Обери тривалість сесії' : !screenComplete ? 'Заверши короткий скринінг' : medicalBlock ? 'Спершу отримай індивідуальну оцінку' : !teenReady ? 'Підтвердь нагляд' : 'Скласти програму'}
      </button>
    </div>
  );
}

function ExRow({ item, idx, week, plan, heavy, tech, onSwap, onCoachEdit, onRemoveCustom, anchors, onAnchor, log, onLog }) {
  const [open, setOpen] = useState(false);
  const [swap, setSwap] = useState(false);
  const [why, setWhy] = useState(false);
  const [edit, setEdit] = useState(false);
  const p = plan.profile;
  const sets = setsFor(item, week, plan, heavy);
  const alts = EX.filter((e) => e.p === item.ex.p && e.t === item.ex.t && e.id !== item.ex.id && isExerciseAllowed(e, p));
  const tempo = tempoFor(item, week, heavy);
  const rawAnchor = anchors[item.ex.id];
  const anchor = typeof rawAnchor === 'object' && rawAnchor
    ? rawAnchor
    : rawAnchor ? { weight: rawAnchor, reps: 8, rir: 2 } : {};
  const e1rm = typeof rawAnchor === 'object' && rawAnchor ? estimated1RM(rawAnchor) : null;
  const e1rmQuality = typeof rawAnchor === 'object' && rawAnchor ? e1rmConfidence(rawAnchor) : null;
  const loadUnit = item.ex.eq === 'dumbbell' ? 'кг на одну гантель' : 'кг';
  const progression = progressionSuggestion(log, item, week, plan, heavy);
  const setLog = (index, field, value) => {
    const next = Array.from({ length: sets }, (_, i) => ({ ...((log.sets || [])[i] || {}) }));
    if (value === '') delete next[index][field];
    else next[index][field] = value;
    onLog('sets', next);
  };

  return (
    <div className="tk-ex">
      <div className="tk-idx">{String(idx + 1).padStart(2, '0')}</div>
      <div className="tk-exbody">
        <div className="tk-exname">
          {item.ex.n}
          {heavy && <span className="tk-badge tk-b-heavy">ВАЖКИЙ БЛОК</span>}
          {item.boost && <span className="tk-badge tk-b-prio">ПРІОРИТЕТ</span>}
          {item.ex.manualOnly && <span className="tk-badge tk-b-tech">ЛИШЕ РУЧНА ЗАМІНА</span>}
        </div>
        <div className="tk-presc">
          {sets} × {repsFor(item, p.goal, week, heavy, plan)}{item.ex.uni ? ' ' + uniLabel(item.ex) : ''} <i>·</i> RIR {rirFor(item, week, plan)} <i>·</i> темп {tempo} <i>·</i> {restFor(item, plan, heavy)}
        </div>
        {isLoadable(item.ex) && (
          <div className="tk-load">
            {loadFor(item, week, heavy, anchors, plan) && <b>{loadFor(item, week, heavy, anchors, plan)} {loadUnit}</b>}
            <input className="tk-wnum" aria-label={item.ex.eq === 'dumbbell' ? 'Орієнтир ваги однієї гантелі' : 'Орієнтир ваги'} type="number" step="0.1" min="0" placeholder={item.ex.eq === 'dumbbell' ? 'кг/гантель' : 'вага, кг'}
              value={anchor.weight || ''} onChange={(e) => onAnchor(item.ex.id, 'weight', e.target.value)} />
            <input className="tk-wnum" aria-label="Повтори з орієнтирною вагою" type="number" step="1" min="1" max="30" placeholder="повтори"
              value={anchor.reps || ''} onChange={(e) => onAnchor(item.ex.id, 'reps', e.target.value)} />
            <input className="tk-wnum" aria-label="RIR орієнтирного підходу" type="number" step="1" min="0" max="10" placeholder="RIR"
              value={anchor.rir ?? ''} onChange={(e) => onAnchor(item.ex.id, 'rir', e.target.value)} />
            {e1rm && <span style={{ fontSize: 11, color: 'var(--steel)' }}>орієнтовний 1ПМ ≈ {roundDisplay(e1rm)} кг · {e1rmQuality.label} · планова вага залежить від цілі й тижня</span>}
            {e1rmQuality && !e1rmQuality.eligible && <span style={{ fontSize: 11, color: 'var(--hot)' }}>Цей підхід не є якірним для e1RM: автоматичний розрахунок не використовує понад 15 повторів або RIR понад 5.</span>}
            {rawAnchor && typeof rawAnchor !== 'object' && <span style={{ fontSize: 11, color: 'var(--hot)' }}>старий орієнтир: підтвердь повтори або RIR, щоб перейти на розрахунок від орієнтовного 1ПМ</span>}
          </div>
        )}
        <div className="tk-tags">
          {REGION[item.ex.rg]}{item.ex.s && item.ex.s.length ? ' + ' + item.ex.s.map((x) => MUSCLE[x]).join(', ') : ''} · {item.ex.t === 'comp' ? 'базова' : 'ізоляція'}
          {tech && <span className="tk-badge tk-b-tech">останній підхід: дроп-сет або 3–5 часткових у розтягнутій позиції</span>}
        </div>
        <div className="tk-log">
          <label className="tk-logdone">
            <input type="checkbox" checked={!!log.done} onChange={(e) => onLog('done', e.target.checked)} />
            Виконано
          </label>
          {Array.from({ length: sets }, (_, setIndex) => (
            <div key={setIndex} style={{ display: 'flex', gap: 6, alignItems: 'end', flexWrap: 'wrap' }}>
              <b style={{ fontSize: 11 }}>Підхід {setIndex + 1}</b>
              {isLoadable(item.ex) && <label className="tk-logfield">{item.ex.eq === 'dumbbell' ? 'кг/гантель' : 'кг'}<input type="number" min="0" step="0.1" value={log.sets?.[setIndex]?.weight ?? ''} onChange={(e) => setLog(setIndex, 'weight', e.target.value)} /></label>}
              <label className="tk-logfield">{item.ex.u === 'time' ? 'сек' : 'повт.'}<input type="number" min="0" step="1" value={log.sets?.[setIndex]?.reps ?? ''} onChange={(e) => setLog(setIndex, 'reps', e.target.value)} /></label>
              <label className="tk-logfield">RIR<input type="number" min="0" max="10" step="1" value={log.sets?.[setIndex]?.rir ?? ''} onChange={(e) => setLog(setIndex, 'rir', e.target.value)} /></label>
            </div>
          ))}
          <label className="tk-logfield">Біль 0–10
            <input type="number" min="0" max="10" step="1" value={log.pain ?? ''} onChange={(e) => onLog('pain', e.target.value)} />
          </label>
          <label className="tk-logfield" style={{ minWidth: 220 }}>Нотатка
            <input type="text" maxLength="1000" value={log.note ?? ''} onChange={(e) => onLog('note', e.target.value)} />
          </label>
        </div>
        {progression && <div className="tk-hint" style={{ marginTop: 7 }}><b>Наступний крок:</b> {progression}</div>}
        <button className="tk-mini" onClick={() => setOpen(!open)}>{open ? 'Згорнути техніку' : 'Техніка'}</button>
        {alts.length > 0 && <button className="tk-mini" onClick={() => setSwap(!swap)}>Замінити</button>}
        <button className="tk-mini" onClick={() => setEdit(!edit)}>{edit ? 'Закрити редактор' : 'Редагувати призначення'}</button>
        {item.ex.id.startsWith('custom-') && <button className="tk-mini tk-danger" onClick={onRemoveCustom}>Видалити власну вправу</button>}
        {item.why && item.why.length > 0 && <button className="tk-mini" onClick={() => setWhy(!why)}>{why ? 'Згорнути' : 'Чому саме ця вправа'}</button>}
        {edit && (
          <div className="tk-coach-editor">
            <label>Базові підходи<input type="number" min="1" max="12" placeholder={String(sets)} value={item.coach?.sets ?? ''} onChange={(e) => onCoachEdit('sets', e.target.value)} /></label>
            <label>Повтори<input type="text" maxLength="12" placeholder={repsFor(item, p.goal, week, heavy, plan)} value={item.coach?.reps ?? ''} onChange={(e) => onCoachEdit('reps', e.target.value)} /></label>
            <label>RIR<input type="number" min="0" max="10" placeholder={String(rirFor(item, week, plan))} value={item.coach?.rir ?? ''} onChange={(e) => onCoachEdit('rir', e.target.value)} /></label>
            <label>Темп<input type="text" maxLength="12" placeholder={tempo} value={item.coach?.tempo ?? ''} onChange={(e) => onCoachEdit('tempo', e.target.value)} /></label>
            <label>Пауза<input type="text" maxLength="40" placeholder={restFor(item, plan, heavy)} value={item.coach?.rest ?? ''} onChange={(e) => onCoachEdit('rest', e.target.value)} /></label>
            {isLoadable(item.ex) && <label>Базова вага, {loadUnit}<input type="number" min="0" max="1000" step="0.1" value={item.coach?.load ?? ''} onChange={(e) => onCoachEdit('load', e.target.value)} /></label>}
            {isLoadable(item.ex) && <label>Крок доступної ваги, кг<input type="number" min="0.1" max="50" step="0.1" placeholder={String(loadStepFor(item))} value={item.coach?.loadStep ?? ''} onChange={(e) => onCoachEdit('loadStep', e.target.value)} /></label>}
            {item.coach?.sets && <label className="tk-check"><input type="checkbox" checked={!!item.coach.fixedSets} onChange={(e) => onCoachEdit('fixedSets', e.target.checked)} /><span>Фіксувати підходи в усі тижні</span></label>}
            {isLoadable(item.ex) && item.coach?.load && <label className="tk-check"><input type="checkbox" checked={!!item.coach.fixedLoad} onChange={(e) => onCoachEdit('fixedLoad', e.target.checked)} /><span>Фіксувати вагу в усі тижні</span></label>}
            <p className="tk-hint">Без фіксації ручне значення є базовим і змінюється за тижневою періодизацією та на делоаді. Крок ваги за замовчуванням залежить від типу обладнання; для гантелей значення вказується на одну гантель. Для конкретного стека чи мікродисків введи фактичний крок.</p>
            <button type="button" className="tk-mini" onClick={() => onCoachEdit('__reset', '')}>Скинути ручні правки</button>
          </div>
        )}
        {why && (
          <div className="tk-why">
            <ul>{item.why.map((r, i) => <li key={i}>{r}</li>)}</ul>
          </div>
        )}
        {open && (
          <div className="tk-tech">
            <p><strong>Як виконувати</strong>{item.ex.cue}</p>
            <p><strong>Типові помилки</strong>{item.ex.err}</p>
            {heavy && <p><strong>Важкий блок</strong>Два підходи по 3–6 повторів, темп 2-1-X, повноцінна розминка обовʼязкова. Решта вправ дня без змін.</p>}
            {item.ex.media ? (
              <figure className="tk-media">
                <img src={import.meta.env.BASE_URL + item.ex.media.src} alt={item.ex.media.alt}
                  width="1200" height="800" loading="lazy" decoding="async" />
                <figcaption>Схема руху · початкова та кінцева фази</figcaption>
              </figure>
            ) : <p className="tk-media-pending">Схематична демонстрація для цієї вправи ще готується.</p>}
          </div>
        )}
        {swap && <div className="tk-swap">{alts.map((a) => (<button key={a.id} className="tk-opt" onClick={() => { onSwap(a); setSwap(false); }}>{a.n}</button>))}</div>}
      </div>
    </div>
  );
}

function VolumePanel({ plan, week }) {
  const { byMuscle, byRegion } = weeklyVolume(plan, week);
  const freq = frequency(plan);
  const subs = {};
  Object.entries(byRegion).forEach(([rg, v]) => {
    const g = REGION_GROUP[rg];
    (subs[g] = subs[g] || []).push([rg, Math.round(v)]);
  });
  return (
    <div className="tk-card">
      <div className="tk-eyebrow">Тижневий обсяг · робочі підходи</div>
      <div className="tk-vol">
        {Object.keys(MUSCLE).map((k) => {
          const [lo, hi] = targetFor(plan.profile.level, k, plan.flags.teen, plan.profile.sex, plan.profile.goal);
          const v = Math.round(byMuscle[k] || 0);
          const fr = freq[k] || 0;
          const cls = v < lo ? 'low' : v > hi ? 'over' : '';
          const parts = (subs[k] || []).filter(([, n]) => n > 0);
          return (
            <div className="tk-volrow" key={k}>
              <span>{MUSCLE[k]}</span>
              <span className="tk-track"><span className={'tk-fill ' + cls} style={{ width: Math.min(100, (v / (hi * 1.25)) * 100) + '%' }} /></span>
              <span className="tk-volnum">{v} <span style={{ opacity: 0.55 }}>/{hi}</span></span>
              {v > 0 && fr < 2 && <span className="tk-split" style={{ color: 'var(--hot)' }}>частота {fr}×/тиж — перевір, чи зручно виконати весь обсяг якісно; другий день може лише полегшити його розподіл</span>}
              {parts.length > 1 && <span className="tk-split">{parts.map(([rg, n]) => REGION[rg].split(' · ')[1] + ' ' + n).join(' · ')}</span>}
            </div>
          );
        })}
      </div>
      <p className="tk-hint" style={{ marginTop: 14 }}>
        Друге число — консервативна стеля для рівня «{LEVEL_LABEL[plan.profile.level]}» і цілі «{GOAL_LABEL[plan.profile.goal]}»; вона різна по групах. Сіре заповнення нижче орієнтиру не означає автоматично недостатню програму: потреба залежить від стажу, пріоритетів, непрямої роботи та переносимості. Другий рядок під групою — розподіл по підспецифікаціях:
        різні тяги змінюють акцент роботи спини, а положення коліна змінює відносний внесок литкового й камбалоподібного м’язів.
      </p>
      {Object.keys(plan.volumeTrimmed || {}).length > 0 && (
        <p className="tk-hint">Генератор автоматично зменшив зайві підходи на піковому тижні, щоб жодна група не перевищувала свою верхню межу.</p>
      )}
      {Object.keys(plan.volumeAdded || {}).length > 0 && (
        <p className="tk-hint">Генератор додав підходи до нижніх орієнтирів там, де це не порушувало стелю обсягу або вибраний ліміт часу.</p>
      )}
      {Object.keys(plan.volumeBelowFloor || {}).length > 0 && (
        <p className="tk-hint" style={{ color: 'var(--hot)' }}>
          Нижній орієнтир не досягнуто для: {Object.entries(plan.volumeBelowFloor).map(([muscle, value]) => MUSCLE[muscle] + ' ' + value.value + '/' + value.lo).join(', ')}.
          Причина — доступні вправи, розклад або ліміт часу; це позначено явно, а не приховано.
        </p>
      )}
    </div>
  );
}

function CoachWorkspacePanel({
  days, clientName, onClientName, revisions, onSaveRevision, onRestoreRevision, currentSnapshot,
  autoAdjust, onAutoAdjust, adaptation, onAddCustom, clients, onSaveClient, onLoadClient, onDeleteClient,
}) {
  const [draft, setDraft] = useState({ day: 0, name: '', muscle: 'back', type: 'comp', sets: 3, reps: '8–12', rir: 2, tempo: '2-0-2', rest: '90 с' });
  const [revisionNote, setRevisionNote] = useState('');
  const change = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
  return (
    <details className="tk-card tk-coach-workspace">
      <summary><b>Робоче місце тренера</b><span>клієнт, власні вправи, ревізії та автоадаптація</span></summary>
      <div className="tk-coach-body">
        <label className="tk-wide-label">Ім’я або код клієнта
          <input type="text" maxLength="120" value={clientName} onChange={(e) => onClientName(e.target.value)} placeholder="Наприклад: Клієнт А" />
        </label>
        <p className="tk-hint">Профілі зберігаються лише на цьому пристрої в IndexedDB (або браузерному резервному сховищі). Це не зашифрована CRM: використовуй код клієнта замість чутливих даних і регулярно експортуй резервну копію.</p>
        <div className="tk-client-actions">
          <button type="button" className="tk-mini" disabled={!clientName.trim()} onClick={onSaveClient}>Зберегти профіль клієнта</button>
          {clients.map((client) => (
            <span className="tk-client" key={client.id}>
              <button type="button" className="tk-mini" onClick={() => onLoadClient(client.id)}>{client.name}</button>
              <button type="button" className="tk-mini tk-danger" aria-label={'Видалити профіль ' + client.name} onClick={() => onDeleteClient(client.id)}>×</button>
            </span>
          ))}
        </div>
        <label className="tk-check">
          <input type="checkbox" checked={autoAdjust} onChange={(e) => onAutoAdjust(e.target.checked)} />
          <span><b>Автоматично коригувати наступну сесію за журналом.</b> Низька готовність, session-RPE 9–10 або біль ≥4/10 зменшують підходи й планову вагу.</span>
        </label>
        <div className={'tk-adaptation ' + adaptation.level}><b>Поточне рішення:</b> {adaptation.message}</div>

        <h3 className="tk-subhead">Додати власну вправу</h3>
        <div className="tk-coach-editor">
          <label>День<select value={draft.day} onChange={(e) => change('day', Number(e.target.value))}>{days.map((day, index) => <option value={index} key={index}>{index + 1}. {day.name}</option>)}</select></label>
          <label>Назва<input type="text" maxLength="120" value={draft.name} onChange={(e) => change('name', e.target.value)} /></label>
          <label>Основна група<select value={draft.muscle} onChange={(e) => change('muscle', e.target.value)}>{Object.entries(MUSCLE).map(([key, name]) => <option value={key} key={key}>{name}</option>)}</select></label>
          <label>Тип<select value={draft.type} onChange={(e) => change('type', e.target.value)}><option value="comp">базова</option><option value="iso">ізоляція</option></select></label>
          <label>Підходи<input type="number" min="1" max="12" value={draft.sets} onChange={(e) => change('sets', e.target.value)} /></label>
          <label>Повтори<input type="text" maxLength="12" value={draft.reps} onChange={(e) => change('reps', e.target.value)} /></label>
          <label>RIR<input type="number" min="0" max="10" value={draft.rir} onChange={(e) => change('rir', e.target.value)} /></label>
          <button type="button" className="tk-mini" disabled={!draft.name.trim()} onClick={() => { onAddCustom(draft); change('name', ''); }}>Додати до програми</button>
        </div>

        <h3 className="tk-subhead">Історія змін програми</h3>
        <div className="tk-revision-add">
          <input type="text" maxLength="240" value={revisionNote} onChange={(e) => setRevisionNote(e.target.value)} placeholder="Що і чому змінено" />
          <button type="button" className="tk-mini" onClick={() => { onSaveRevision(revisionNote); setRevisionNote(''); }}>Зберегти ревізію</button>
        </div>
        {revisions.length ? (
          <ul className="tk-revisions">{revisions.slice(-6).reverse().map((revision, index) => {
            const changes = revision.snapshot ? diffProgramSnapshots(revision.snapshot, currentSnapshot) : [];
            return <li key={revision.id || revision.at + index}>
              <b>{new Date(revision.at).toLocaleDateString('uk-UA')}</b> {revision.summary}
              {revision.snapshot ? <>
                <div><button type="button" className="tk-mini" onClick={() => onRestoreRevision(revision)}>Відновити цю версію</button></div>
                <details><summary>Точна різниця ({changes.length})</summary>
                  {changes.length ? <ul>{changes.slice(0, 30).map((change) => <li key={change.path}><code>{change.path}</code>: {change.before} → {change.after}</li>)}</ul> : <p>Ця версія збігається з поточною.</p>}
                </details>
              </> : <small> Старий запис без знімка — відкат недоступний.</small>}
            </li>;
          })}</ul>
        ) : <p className="tk-hint">Ревізій ще немає. Згенерована або вручну зафіксована зміна з’явиться тут.</p>}
      </div>
    </details>
  );
}
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="tk" data-theme={this.props.theme}>
          <style>{CSS}</style>
          <Header theme={this.props.theme} onToggle={this.props.onThemeToggle} />
          <div className="tk-main">
            <div className="tk-alert">
              <b>Щось пішло не так</b>
              Сталася непередбачена помилка. Найімовірніша причина — застарілі дані в збереженому профілі.
            </div>
            <button className="tk-cta" onClick={async () => { try { await storage.delete('tk-state'); } catch (e) {} location.reload(); }}>
              Скинути збережені дані й почати заново
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function TrainingConstructorInner({ theme, onThemeToggle }) {
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [anchors, setAnchors] = useState({});
  const [journal, setJournal] = useState({});
  const [sessionHistory, setSessionHistory] = useState([]);
  const [coachEdits, setCoachEdits] = useState({ prescriptions: {}, customExercises: [] });
  const [programRevisions, setProgramRevisions] = useState([]);
  const [clientName, setClientName] = useState('');
  const [clients, setClients] = useState([]);
  const [autoAdjust, setAutoAdjust] = useState(true);
  const [pendingAdaptation, setPendingAdaptation] = useState(null);
  const [screeningRequired, setScreeningRequired] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [plan, setPlan] = useState(null);
  const [wk, setWk] = useState(0);
  const [day, setDay] = useState(0);
  const [swaps, setSwaps] = useState({});
  const [buildErr, setBuildErr] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const importRef = useRef(null);
  const initialLoadRef = useRef(false);
  const storageErrorRef = useRef(false);
  const set = (patch) => setProfile((s) => ({ ...s, ...patch }));
  const showToast = (message, type = 'ok') => {
    setToast({ message, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3600);
  };
  const applyPortableState = (raw, includeJournal = true, requireScreening = false) => {
    if (!raw || typeof raw !== 'object' || !raw.profile) throw new Error('Файл не містить профілю програми');
    const safe = sanitizeProfile(raw.profile);
    setProfile(safe);
    setAnchors(cleanAnchors(raw.anchors));
    setSwaps(hydrateSwaps(raw.swaps, EX));
    setJournal(includeJournal ? cleanJournal(raw.journal) : {});
    setSessionHistory(includeJournal ? sanitizeHistory(raw.history) : []);
    setCoachEdits(sanitizeCoachEdits(raw.coachEdits));
    setProgramRevisions(includeJournal ? cleanRevisions(raw.revisions) : []);
    setClientName(includeJournal && typeof raw.clientName === 'string' ? raw.clientName.slice(0, 120) : '');
    setClients(includeJournal ? sanitizeClientProfiles(raw.clients) : []);
    setAutoAdjust(raw.autoAdjust !== false);
    setPendingAdaptation(cleanPendingAdaptation(raw.pendingAdaptation));
    setScreeningRequired(requireScreening && raw.built !== false);
    setPlan(requireScreening || raw.built === false ? null : buildPlan(safe));
    setWk(0);
    setDay(0);
    setBuildErr(null);
  };
  const build = (p) => {
    try {
      const prof = p || profile;
      setPlan(buildPlan(prof));
      setScreeningRequired(false);
      setPendingAdaptation(null);
      const revisionAt = new Date().toISOString();
      setProgramRevisions((current) => [...current, {
        at: revisionAt,
        id: 'revision-' + revisionAt,
        summary: screeningRequired ? 'Імпортований план допущено після нового скринінгу' : 'Створено нову версію програми',
        snapshot: makeProgramSnapshot({ profile: prof, anchors, swaps: {}, coachEdits }),
      }].slice(-30));
      setWk(0); setDay(0); setSwaps({}); setBuildErr(null);
    } catch (e) { setBuildErr(e.message || String(e)); }
  };
  const variant = () => {
    try {
      const prof = { ...profile, seed: (profile.seed || 0) + 1 };
      setProfile(prof); setPlan(buildPlan(prof)); setSwaps({}); setPendingAdaptation(null); setBuildErr(null);
    } catch (e) { setBuildErr(e.message || String(e)); }
  };
  const setFatigue = (v) => {
    try {
      const prof = { ...profile, fatigue: v };
      setProfile(prof); setPlan(buildPlan(prof)); setBuildErr(null);
    } catch (e) { setBuildErr(e.message || String(e)); }
  };

  // збереження між сесіями
  useEffect(() => {
    if (initialLoadRef.current) return;
    initialLoadRef.current = true;
    (async () => {
      try {
        if (location.hash.startsWith(SHARE_PREFIX)) {
          const shared = decodeSharePayload(location.hash.slice(SHARE_PREFIX.length));
          applyPortableState(shared, false, true);
          history.replaceState(null, '', location.pathname + location.search);
          showToast('Посилання отримано — заверши власний скринінг перед відкриттям плану');
          setLoaded(true);
          return;
        }
        const r = await storage.get(STATE_KEY);
        if (r && r.value) {
          const st = JSON.parse(r.value);
          applyPortableState(st, true);
        }
      } catch (e) {
        if (location.hash.startsWith(SHARE_PREFIX)) {
          history.replaceState(null, '', location.pathname + location.search);
          showToast('Не вдалося відкрити програму з посилання', 'bad');
        }
      }
      setLoaded(true);
    })();
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);
  useEffect(() => {
    if (!loaded) return;
    (async () => {
      try {
        await storage.set(STATE_KEY, JSON.stringify({
          version: APP_STATE_VERSION,
          profile,
          anchors: cleanAnchors(anchors),
          swaps: serializeSwaps(swaps),
          journal: cleanJournal(journal),
          history: sanitizeHistory(sessionHistory),
          coachEdits: sanitizeCoachEdits(coachEdits),
          revisions: cleanRevisions(programRevisions),
          clientName,
          clients: sanitizeClientProfiles(clients),
          autoAdjust,
          pendingAdaptation: cleanPendingAdaptation(pendingAdaptation),
          built: !!plan,
        }));
        storageErrorRef.current = false;
      } catch (e) {
        if (!storageErrorRef.current) showToast('Не вдалося зберегти дані на пристрої. Експортуй резервну копію та перевір вільне місце браузера.', 'bad');
        storageErrorRef.current = true;
      }
    })();
  }, [profile, anchors, swaps, journal, sessionHistory, coachEdits, programRevisions, clientName, clients, autoAdjust, pendingAdaptation, plan, loaded]);
  const reset = async () => {
    if ((Object.keys(journal).length || sessionHistory.length) && !window.confirm('Скинути профіль, поточний журнал та всю історію? Перед цим можна зберегти резервну копію.')) return;
    try { await storage.delete(STATE_KEY); } catch (e) {}
    setAnchors({});
    setSwaps({});
    setJournal({});
    setSessionHistory([]);
    setCoachEdits({ prescriptions: {}, customExercises: [] });
    setProgramRevisions([]);
    setClientName('');
    setClients([]);
    setPendingAdaptation(null);
    setScreeningRequired(false);
    setPlan(null);
  };
  const updateAnchor = (id, field, raw) => {
    setAnchors((current) => {
      const next = { ...current };
      const previous = typeof current[id] === 'object' && current[id]
        ? current[id]
        : current[id] ? { weight: current[id], reps: 8, rir: 2 } : { reps: 8, rir: 2 };
      const anchor = { ...previous };
      if (raw === '') delete anchor[field];
      else {
        const value = Number(raw);
        if (Number.isFinite(value) && value >= 0) anchor[field] = value;
      }
      if (!anchor.weight || anchor.weight <= 0) delete next[id];
      else next[id] = { weight: anchor.weight, reps: anchor.reps || 8, rir: anchor.rir ?? 2 };
      return next;
    });
  };
  const updateCoachPrescription = (dayIndex, exerciseId, field, raw) => {
    setCoachEdits((current) => {
      const key = prescriptionKey(dayIndex, exerciseId);
      const prescriptions = { ...current.prescriptions };
      if (field === '__reset') delete prescriptions[key];
      else {
        const edit = { ...(prescriptions[key] || {}) };
        if (raw === '') delete edit[field];
        else if (['fixedSets', 'fixedLoad'].includes(field)) edit[field] = !!raw;
        else if (['sets', 'rir', 'load', 'loadStep'].includes(field)) {
          const value = Number(raw);
          if (Number.isFinite(value) && value >= 0) edit[field] = value;
        } else edit[field] = String(raw).slice(0, 40);
        if (Object.keys(edit).length) prescriptions[key] = edit;
        else delete prescriptions[key];
      }
      return sanitizeCoachEdits({ ...current, prescriptions });
    });
  };
  const saveSnapshotRevision = (summary, nextCoachEdits = coachEdits) => {
    const at = new Date().toISOString();
    const revision = {
      id: 'revision-' + at,
      at,
      summary: String(summary || 'Ручне коригування призначень').trim().slice(0, 240),
      snapshot: makeProgramSnapshot({ profile, anchors, swaps, coachEdits: nextCoachEdits }),
    };
    setProgramRevisions((current) => cleanRevisions([...current, revision]));
  };
  const addCustomExercise = (draft) => {
    const id = 'custom-' + new Date().toISOString().replace(/\D/gu, '');
    const next = sanitizeCoachEdits({
      ...coachEdits,
      customExercises: [...coachEdits.customExercises, { ...draft, id }],
    });
    setCoachEdits(next);
    saveSnapshotRevision('Додано власну вправу: ' + draft.name, next);
  };
  const removeCustomExercise = (exerciseId) => {
    const exercise = coachEdits.customExercises.find((item) => item.id === exerciseId);
    const next = sanitizeCoachEdits({
      prescriptions: Object.fromEntries(Object.entries(coachEdits.prescriptions).filter(([key]) => !key.endsWith(':' + exerciseId))),
      customExercises: coachEdits.customExercises.filter((item) => item.id !== exerciseId),
    });
    setCoachEdits(next);
    saveSnapshotRevision('Видалено власну вправу: ' + (exercise?.name || exerciseId), next);
  };
  const saveClientProfile = () => {
    const name = clientName.trim();
    if (!name) return;
    const state = makeBackupPayload({
      profile, anchors, swaps, coachEdits, journal, history: sessionHistory,
      revisions: programRevisions, clientName: name, autoAdjust, pendingAdaptation, built: !!plan,
    });
    setClients((current) => {
      const existing = current.find((client) => client.name.toLocaleLowerCase('uk-UA') === name.toLocaleLowerCase('uk-UA'));
      const saved = { id: existing?.id || 'client-' + Date.now().toString(36), name, savedAt: new Date().toISOString(), state };
      return sanitizeClientProfiles([...current.filter((client) => client.id !== saved.id), saved]);
    });
    showToast('Профіль клієнта збережено');
  };
  const loadClientProfile = (id) => {
    const client = clients.find((item) => item.id === id);
    if (!client) return;
    applyPortableState(client.state, true, false);
    setClients(clients);
    setClientName(client.name);
    showToast('Профіль клієнта відкрито');
  };
  const deleteClientProfile = (id) => {
    const client = clients.find((item) => item.id === id);
    if (!client || !window.confirm('Видалити локальний профіль клієнта «' + client.name + '»?')) return;
    setClients((current) => current.filter((item) => item.id !== id));
    showToast('Профіль клієнта видалено');
  };
  const saveRevision = (summary) => {
    saveSnapshotRevision(summary);
    showToast('Ревізію програми зі знімком збережено');
  };
  const restoreRevision = (revision) => {
    if (!revision?.snapshot || !window.confirm('Відновити цю версію програми? Поточний журнал тренувань залишиться без змін.')) return;
    const safe = sanitizeProfile(revision.snapshot.profile);
    setProfile(safe);
    setAnchors(cleanAnchors(revision.snapshot.anchors));
    setSwaps(hydrateSwaps(revision.snapshot.swaps, EX));
    setCoachEdits(sanitizeCoachEdits(revision.snapshot.coachEdits));
    setPlan(buildPlan(safe));
    setWk(0);
    setDay(0);
    setPendingAdaptation(null);
    showToast('Версію програми відновлено');
  };
  const deleteSession = (id) => {
    if (!window.confirm('Видалити цей завершений запис? Дію неможливо скасувати без резервної копії.')) return;
    const removed = sessionHistory.find((session) => session.id === id);
    setSessionHistory((current) => current.filter((session) => session.id !== id));
    if (removed) {
      updateLog(`session:${removed.week - 1}:${removed.day - 1}`, 'done', false);
      setPendingAdaptation((current) => cancelPendingAdaptation(current, removed.id));
    }
    showToast('Помилковий запис видалено');
  };
  const updateLog = (key, field, raw) => {
    const match = key.match(/^session:(\d+):(\d+)$/u) || key.match(/^(\d+):(\d+):/u);
    const meaningful = field !== 'done' && raw !== '' && (field !== 'sets' || raw.some((set) => Object.keys(set).length));
    if (autoAdjust && match && meaningful) {
      const targetWeek = Number(match[1]), targetDay = Number(match[2]);
      const targetDone = journal[`session:${targetWeek}:${targetDay}`]?.done;
      if (!targetDone) setPendingAdaptation((current) => assignPendingAdaptation(current, targetWeek, targetDay, targetDone));
    }
    setJournal((current) => {
      const entry = { ...(current[key] || {}) };
      if (field === 'done') entry.done = !!raw;
      else if (field === 'sets') {
        entry.sets = raw.map((set) => Object.fromEntries(Object.entries(set).flatMap(([key, value]) => {
          const number = Number(value);
          return Number.isFinite(number) && number >= 0 ? [[key, number]] : [];
        })));
        while (entry.sets.length && !Object.keys(entry.sets.at(-1)).length) entry.sets.pop();
        if (!entry.sets.length) delete entry.sets;
      } else if (field === 'note') {
        if (typeof raw === 'string' && raw.trim()) entry.note = raw.slice(0, 1000);
        else delete entry.note;
      }
      else if (raw === '') delete entry[field];
      else {
        const value = Number(raw);
        if (Number.isFinite(value) && value >= 0) entry[field] = value;
      }
      const hasData = entry.done || entry.weight != null || entry.reps != null || entry.rir != null
        || entry.pain != null || entry.sessionRpe != null || entry.readiness != null
        || entry.moderateMinutes != null || entry.vigorousMinutes != null
        || entry.balanceSessions != null || entry.mobilitySessions != null
        || Object.keys(entry).some((key) => key.startsWith('aerobicSession'))
        || (entry.sets && entry.sets.length) || entry.note;
      const next = { ...current };
      if (!hasData) delete next[key];
      else next[key] = { ...entry, updatedAt: new Date().toISOString() };
      return next;
    });
  };
  const shareProgram = async () => {
    try {
      const payload = makeSharePayload({ profile, anchors, swaps, coachEdits });
      const url = location.href.split('#')[0] + SHARE_PREFIX + encodeSharePayload(payload);
      if (navigator.share) await navigator.share({ title: 'Моя програма тренувань', text: 'Відкрий програму тренувань', url });
      else await navigator.clipboard.writeText(url);
      showToast(navigator.share ? 'Програму надіслано' : 'Посилання скопійовано');
    } catch (e) {
      if (e?.name !== 'AbortError') showToast('Не вдалося створити посилання', 'bad');
    }
  };
  const exportBackup = () => {
    try {
      const stamp = new Date().toISOString().slice(0, 10);
      downloadJson(`gym-program-backup-${stamp}.json`, makeBackupPayload({ profile, anchors, swaps, coachEdits, journal, history: sessionHistory, revisions: programRevisions, clientName, clients, autoAdjust, pendingAdaptation, built: !!plan }));
      showToast('Резервну копію збережено');
    } catch (e) { showToast('Не вдалося створити резервну копію', 'bad'); }
  };
  const importBackup = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      applyPortableState(JSON.parse(await file.text()), true, true);
      showToast('Копію відновлено — заверши новий скринінг перед тренуванням');
    } catch (e) {
      showToast('Не вдалося прочитати резервну копію: ' + (e.message || String(e)), 'bad');
    } finally {
      event.target.value = '';
    }
  };

  const adaptation = useMemo(() => {
    if (!autoAdjust) return { level: 'normal', message: 'Автоматичну корекцію вимкнено.' };
    if (!pendingAdaptation) return { level: 'normal', message: 'Одноразову корекцію наступної сесії не заплановано.' };
    const target = pendingAdaptation.week == null
      ? 'Очікує першої фактично розпочатої незавершеної сесії'
      : `Тиждень ${pendingAdaptation.week + 1}, день ${pendingAdaptation.day + 1}`;
    return {
      ...pendingAdaptation.decision,
      message: `${target}: ${pendingAdaptation.decision.message}`,
    };
  }, [autoAdjust, pendingAdaptation]);
  const view = useMemo(() => {
    if (!plan) return null;
    const edited = applyCoachEdits(plan, coachEdits);
    return applySwapsToPlan(edited, swaps);
  }, [plan, swaps, coachEdits]);
  const currentSnapshot = useMemo(
    () => makeProgramSnapshot({ profile, anchors, swaps, coachEdits }),
    [profile, anchors, swaps, coachEdits],
  );

  const [exporting, setExporting] = useState(false);
  const exportXlsx = async () => {
    setExporting(true);
    try {
      // ExcelJS важить понад 900 КБ у стисненому вигляді — підвантажуємо лише
      // тим, хто реально натиснув «Експорт», а не всім при кожному відкритті сторінки.
      const { default: ExcelJS } = await import('exceljs/dist/exceljs.min.js');
      const wb = new ExcelJS.Workbook();
      const addSheet = (name, rows) => {
        const ws = wb.addWorksheet(name.replace(/[\\/?*[\]:]/g, '-').slice(0, 31));
        rows.forEach((r) => ws.addRow(r));
        ws.columns.forEach((col) => {
          let max = 8;
          col.eachCell({ includeEmpty: true }, (cell) => { max = Math.max(max, String(cell.value ?? '').length); });
          col.width = Math.min(60, max + 2);
        });
        ws.getRow(1).font = { bold: true };
        return ws;
      };

      const per = [['Тиждень', 'Фаза', 'Обсяг', 'RIR база', 'RIR ізоляція', 'Темп', '% від робочої', 'Інструкція']];
      weeks.forEach((w, i) => per.push([i + 1, w.tag, Math.round(w.mult * 100) + ' %', w.rb, w.ri, w.tempo, Math.round(w.load * 100) + ' %', w.note]));
      addSheet('Періодизація', per);

      view.days.forEach((d, di) => {
        const rows = [['№', 'Вправа', 'Підспецифікація', 'Тип', 'На кожну', ...weeks.map((w, i) => 'Т' + (i + 1))]];
        d.items.forEach((it, i) => {
          rows.push([i + 1, it.ex.n, REGION[it.ex.rg], it.ex.t === 'comp' ? 'база' : 'ізоляція', it.ex.uni ? (UNI_SIDE[it.ex.p] || 'сторону') : '—',
            ...weeks.map((w) => {
              const h = isHeavy(di, i, w, view);
              const kg = loadFor(it, w, h, anchors, view);
              return setsFor(it, w, view, h) + '×' + repsFor(it, profile.goal, w, h, view) + ' RIR' + rirFor(it, w, view) + (kg ? ' · ' + kg + (it.ex.eq === 'dumbbell' ? 'кг/гантель' : 'кг') : '');
            })]);
        });
        const nm = ((di + 1) + '. ' + (profile.weekdays.length === profile.days ? WEEKDAYS[profile.weekdays[di]] + ' ' : '') + d.name);
        addSheet(nm, rows);
      });

      const vol = [['Група', 'Підходи на піку', 'Стеля', 'Частота/тиж']];
      const peak = weeks.reduce((a, b) => (a.mult > b.mult ? a : b));
      const vv = weeklyVolume(view, peak).byMuscle, fr = frequency(view);
      Object.keys(MUSCLE).forEach((k) => vol.push([MUSCLE[k], Math.round(vv[k] || 0), targetFor(profile.level, k, view.flags.teen, profile.sex, profile.goal)[1], fr[k] || 0]));
      addSheet('Обсяг', vol);

      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'programa-' + weeks.length + 'tyzhniv.xlsx';
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e) { showToast('Експорт не вдався: ' + e.message, 'bad'); }
    finally { setExporting(false); }
  };

  if (!plan || !view) {
    return (
      <div className="tk" data-theme={theme}><style>{CSS}</style>
        <Header theme={theme} onToggle={onThemeToggle} />
        <Toast toast={toast} />
        <div className="tk-main">
          {buildErr && (
            <div className="tk-alert">
              <b>Не вдалося скласти програму</b>
              {buildErr}. Найімовірніша причина — застарілий збережений профіль. Спробуй скинути дані й заповнити анкету заново.
              <div style={{ marginTop: 10 }}>
                <button className="tk-mini" style={{ paddingLeft: 0 }} onClick={reset}>Скинути збережені дані</button>
              </div>
            </div>
          )}
          {screeningRequired && (
            <div className="tk-alert">
              <b>Імпортований план ще не допущено до виконання</b>
              Дані програми завантажено, але відповіді іншої людини не замінюють твій скринінг. Заповни анкету нижче; план відкриється лише після проходження перевірки.
            </div>
          )}
          <div className="tk-card">
            <div className="tk-eyebrow">Уже маєш резервну копію?</div>
            <p className="tk-p">Імпортуй JSON-файл — профіль, програма та журнал відновляться на цьому пристрої.</p>
            <button className="tk-mini" style={{ paddingLeft: 0 }} onClick={() => importRef.current?.click()}>Імпортувати резервну копію</button>
            <input ref={importRef} className="tk-file" aria-label="Імпорт резервної копії" type="file" accept="application/json,.json" onChange={importBackup} />
          </div>
          <Wizard p={profile} set={set} onBuild={build} />
        </div>
      </div>
    );
  }

  const weeks = view.weeks;
  const week = weeks[Math.min(wk, weeks.length - 1)];
  const appliesHere = autoAdjust && pendingAdaptation?.week === wk && pendingAdaptation?.day === day;
  const sessionPlan = appliesHere ? { ...view, adaptation: pendingAdaptation.decision } : view;
  const marks = techMarks(view.days[day], week, sessionPlan);
  const warm = warmup(view, view.days[day]);
  const alerts = scheduleWarnings(view);
  const mins = sessionMinutes(view.days[day], week, sessionPlan, day);
  const dayLabelFor = (i) => (profile.weekdays.length === profile.days ? WEEKDAYS[profile.weekdays[i]] + ' · ' : (i + 1) + '. ');

  const copy = async () => {
    const out = [`Тренувальний блок ${weeks.length} тижнів · ${LEVEL_LABEL[profile.level]} · ${profile.age} р. · ${GOAL_LABEL[profile.goal]} · ${profile.days} дн/тиж`];
    weeks.forEach((w, wi) => {
      out.push('', `ТИЖДЕНЬ ${wi + 1} — ${w.tag} · RIR база ${w.rb} / ізоляція ${w.ri} · темп ${w.tempo}`);
      view.days.forEach((d, di) => {
        out.push(`  ${d.name}`);
        d.items.forEach((it, i) => {
          const h = isHeavy(di, i, w, view);
          out.push(`   ${i + 1}. ${it.ex.n} — ${setsFor(it, w, view, h)} × ${repsFor(it, profile.goal, w, h, view)}${it.ex.uni ? ' ' + uniLabel(it.ex) : ''} · RIR ${rirFor(it, w, view)}${h ? ' · ВАЖКИЙ БЛОК' : ''}`);
        });
      });
    });
    try { await navigator.clipboard.writeText(out.join('\n')); showToast('План скопійовано'); }
    catch { showToast('Скопіювати не вдалося — спробуй резервну копію', 'bad'); }
  };
  const dayDone = view.days[day].items.reduce((total, item) => total + (journal[journalKey(wk, day, item.ex.id)]?.done ? 1 : 0), 0);
  const sessionKey = `session:${wk}:${day}`;
  const sessionLog = journal[sessionKey] || {};
  const completeSession = () => {
    if (sessionLog.done) {
      showToast('Цю сесію вже збережено. Видали помилковий запис в історії, якщо потрібно записати її заново.', 'bad');
      return;
    }
    const exercises = view.days[day].items.map((item) => {
      const log = journal[journalKey(wk, day, item.ex.id)] || {};
      const sets = Array.isArray(log.sets) ? log.sets.filter((set) => Object.keys(set).length) : [];
      return {
        exerciseId: item.ex.id,
        name: item.ex.n,
        sets,
        ...(log.pain == null ? {} : { pain: log.pain }),
      };
    });
    const completedSets = exercises.reduce((sum, exercise) => (
      sum + exercise.sets.filter((set) => set.reps != null).length
    ), 0);
    if (!completedSets) {
      showToast('Заповни фактичні повтори хоча б одного підходу перед завершенням сесії', 'bad');
      return;
    }
    const completedAt = new Date().toISOString();
    const snapshot = {
      id: `${completedAt}:${wk}:${day}`,
      completedAt,
      week: wk + 1,
      day: day + 1,
      dayName: view.days[day].name,
      goal: profile.goal,
      exercises,
      volume: snapshotVolume(exercises),
      completedSets,
      plannedSets: view.days[day].items.reduce((sum, item, index) => sum + setsFor(item, week, sessionPlan, isHeavy(day, index, week, sessionPlan)), 0),
      ...(sessionLog.readiness == null ? {} : { readiness: sessionLog.readiness }),
      ...(sessionLog.sessionRpe == null ? {} : { sessionRpe: sessionLog.sessionRpe }),
      ...(sessionLog.note ? { note: sessionLog.note } : {}),
    };
    setSessionHistory((current) => sanitizeHistory([...current, snapshot]));
    setAnchors((current) => {
      const next = { ...current };
      exercises.forEach((exercise) => {
        const best = exercise.sets.filter((set) => Number(set.weight) > 0 && Number(set.reps) > 0 && Number(set.reps) <= 15 && set.rir != null && Number(set.rir) <= 5)
          .sort((a, b) => (Number(b.weight) * (1 + (Number(b.reps) + Number(b.rir || 0)) / 30))
            - (Number(a.weight) * (1 + (Number(a.reps) + Number(a.rir || 0)) / 30)))[0];
        if (best) next[exercise.exerciseId] = { weight: Number(best.weight), reps: Number(best.reps), rir: Number(best.rir || 0) };
      });
      return next;
    });
    const decision = trainingAdaptation([...sessionHistory, snapshot]);
    if (autoAdjust && decision.level !== 'normal') {
      setPendingAdaptation({ week: null, day: null, sourceId: snapshot.id, decision });
    } else setPendingAdaptation(null);
    updateLog(sessionKey, 'done', true);
    showToast('Сесію додано до історії' + (decision.level !== 'normal' && autoAdjust ? '; корекція застосовується до наступної фактично розпочатої сесії' : ''));
  };

  return (
    <div className="tk" data-theme={theme}>
      <style>{CSS}</style>
      <Header theme={theme} onToggle={onThemeToggle} />
      <Toast toast={toast} />
      <div className="tk-main">
        <div className="tk-card">
          <div className="tk-chips">
            {clientName && <span className="tk-chip">Клієнт: {clientName}</span>}
            <span className="tk-chip">{profile.age} р.</span>
            {profile.sex !== 'x' && <span className="tk-chip">{SEX[profile.sex].label}</span>}
            <span className="tk-chip">{profile.mode === 'custom' ? 'Власна розкладка' : profile.programStyle === 'auto' ? 'Формат: авто' : PROGRAM_STYLE_LABEL[profile.programStyle]}</span>
            <span className="tk-chip">{LEVEL_LABEL[profile.level]}</span>
            <span className="tk-chip">{profile.days} дн/тиж</span>
            <span className="tk-chip">{PLACE_LABEL[profile.place]}</span>
            {profile.place === 'home' && profile.homeEquipment.map((item) => <span className="tk-chip" key={'equipment-' + item}>{HOME_EQUIPMENT_LABEL[item]}</span>)}
            <span className="tk-chip">{GOAL_LABEL[profile.goal]}</span>
            <span className="tk-chip">{(FOCUS[profile.focus] || CUSTOM_FOCUS).label}</span>
            <span className="tk-chip">{weeks.length} тижнів</span>
            {profile.priority.map((m) => <span className="tk-chip" key={m}>↑ {MUSCLE[m]}</span>)}
            {profile.avoid.map((key) => <span className="tk-chip" key={'avoid-' + key}>× {AVOID[key].label}</span>)}
          </div>
          <div className="tk-actions">
            <button className="tk-mini" style={{ paddingLeft: 0 }} onClick={() => setPlan(null)}>Змінити параметри</button>
            <button className="tk-mini" onClick={copy}>Скопіювати</button>
            <button className="tk-mini" onClick={shareProgram}>Поділитися</button>
            <button className="tk-mini" onClick={exportBackup}>Резервна копія</button>
            <button className="tk-mini" onClick={() => importRef.current?.click()}>Імпортувати</button>
            <button className="tk-mini" onClick={exportXlsx} disabled={exporting}>{exporting ? 'Готую файл…' : 'Експорт у Excel'}</button>
            <button className="tk-mini" onClick={variant}>Інший варіант</button>
            <button className="tk-mini" onClick={reset}>Скинути все</button>
          </div>
          <input ref={importRef} className="tk-file" aria-label="Імпорт резервної копії" type="file" accept="application/json,.json" onChange={importBackup} />
          <label className="tk-check" style={{ marginTop: 12, marginBottom: 0 }}>
            <input type="checkbox" checked={profile.fatigue} onChange={(e) => setFatigue(e.target.checked)} />
            <span>Сон або енергія просіли другий тиждень поспіль — увімкнути запобіжник. Інтенсивні техніки знімаються, з ізоляції йде по одному підходу, база лишається недоторканою.</span>
          </label>
        </div>

        {alerts.length > 0 && (
          <div className="tk-alert">
            <b>Відновлення між сесіями</b>
            {alerts.map((a, i) => <div key={i} style={{ marginBottom: i < alerts.length - 1 ? 6 : 0 }}>{a}</div>)}
          </div>
        )}

        <ReadingGuide />

        {appliesHere && (
          <div className={'tk-alert tk-adaptation ' + pendingAdaptation.decision.level}><b>Одноразова корекція цієї сесії</b>
            Підходи ×{pendingAdaptation.decision.setFactor}; планова вага ×{pendingAdaptation.decision.loadFactor}. Решта плану й експорт не змінені.
          </div>
        )}

        <CoachWorkspacePanel days={view.days} clientName={clientName} onClientName={setClientName}
          revisions={programRevisions} onSaveRevision={saveRevision} onRestoreRevision={restoreRevision} currentSnapshot={currentSnapshot}
          autoAdjust={autoAdjust} onAutoAdjust={(value) => { setAutoAdjust(value); if (!value) setPendingAdaptation(null); }}
          adaptation={adaptation} onAddCustom={addCustomExercise} clients={clients}
          onSaveClient={saveClientProfile} onLoadClient={loadClientProfile} onDeleteClient={deleteClientProfile} />

        <ProgressDashboard history={sessionHistory} onDelete={deleteSession}
          plannedSets={view.days[day].items.reduce((sum, item, index) => sum + setsFor(item, week, sessionPlan, isHeavy(day, index, week, sessionPlan)), 0)} plannedSessionsPerWeek={profile.days} />

        {profile.goal === 'health' && (
          <HealthPlanPanel profile={profile} weekIndex={wk} log={journal[healthWeekKey(wk)] || {}} onChange={(field, value) => updateLog(healthWeekKey(wk), field, value)} />
        )}

        <div className="tk-card">
          <div className="tk-eyebrow">Тренувальний блок · висота стовпчика = обсяг тижня</div>
          <div className="tk-ramp">
            {weeks.map((w, i) => (
              <button key={i} className="tk-wk" aria-pressed={i === wk} onClick={() => setWk(i)} title={w.tag}>
                <span style={{ height: Math.round(Math.min(w.mult, 1.5) * 55) + '%', background: w.deload ? 'var(--dl)' : w.heavy ? 'var(--hot)' : 'var(--deep)', opacity: w.deload || w.heavy ? 1 : 0.35 + 0.45 * (w.mult - 0.5) }} />
                <b>{w.deload ? 'DL' : i + 1}</b>
              </button>
            ))}
          </div>
          <div className="tk-wkmeta">
            <span className="tk-rir">RIR {week.rb}<small>база</small></span>
            <span className="tk-rir">RIR {week.ri}<small>ізоляція</small></span>
            <span style={{ fontSize: 13, color: 'var(--steel)' }}>
              Тиждень {wk + 1} з {weeks.length} — {week.tag} · темп {week.tempo}
              {week.mult !== 1 && ' · обсяг ' + (week.mult < 1 ? '−' : '+') + Math.round(Math.abs(week.mult - 1) * 100) + ' %'}
            </span>
          </div>
          <p className="tk-p" style={{ marginBottom: 0 }}>{week.note}</p>
        </div>

        <div className="tk-card tk-card-dense">
          <div className="tk-days">
            {view.days.map((d, i) => (
              <button key={i} className="tk-day" aria-pressed={i === day} onClick={() => setDay(i)}>{dayLabelFor(i)}{d.name}</button>
            ))}
          </div>
          <div className="tk-meta">
            ~{mins} хв разом із розминкою (~{roundDisplay(warmupMinutes(view, view.days[day]))} хв) · {view.days[day].items.length} вправ
            {' · ' + (view.automaticTimeCap ? 'аварійна межа для старого профілю ' : 'обраний ліміт ') + view.effectiveTimeCap + ' хв'}
            {view.days[day].trimmed ? ' · обсяг скорочено за пріоритетами' : ''}
            {view.days[day].overCap ? ' · у ліміт не вкладається навіть після скорочення — лишились самі базові рухи' : ''}
          </div>
          {view.effectiveTimeCap === 120 && mins > 100 && (
            <div className="tk-alert" style={{ marginTop: -4 }}>
              <b>Довга сесія</b>{mins} хв. Межа 120 хв є аварійним запобіжником, а не цільовою тривалістю. Для більшості клієнтів доцільніше обрати 60–90 хв і прийняти явно показаний недобір другорядного обсягу.
            </div>
          )}
          {view.days[day].timeCompromised && (
            <div className="tk-alert" style={{ marginTop: 10 }}>
              <b>Компроміс заради обраного часу</b>
              Щоб суворо вкластися у {view.effectiveTimeCap} хв, конструктор після ізоляції скоротив частину базового обсягу або покриття груп. Перевір червоний список недобраного тижневого обсягу нижче; за потреби обери довшу сесію або більше тренувальних днів.
            </div>
          )}
          {view.days[day].underfilled && (
            <div className="tk-alert" style={{ marginTop: 10 }}>
              <b>День не вдалося повністю наповнити</b>
              Доступна кількість вправ: {view.days[day].items.length}. Це наслідок вибраного інвентарю та обмежень. Додай доступний інвентар, послаб виключення або обери менше тренувальних днів.
            </div>
          )}
          <div className="tk-warm">
            <strong style={{ fontSize: 13 }}>Розминка</strong>
            <ul>{warm.map((item) => <WarmupItem key={item.id} item={item} />)}</ul>
          </div>
          <div className="tk-journal-progress">
            <span><b>{dayDone}/{view.days[day].items.length}</b> вправ виконано</span>
            <span>Журнал зберігається на пристрої</span>
          </div>
          <div className="tk-log" style={{ marginBottom: 10 }}>
            <label className="tk-logfield">Готовність до сесії 1–5
              <input type="number" min="1" max="5" step="1" value={sessionLog.readiness ?? ''} onChange={(e) => updateLog(sessionKey, 'readiness', e.target.value)} />
            </label>
            <label className="tk-logfield">Session-RPE 0–10
              <input type="number" min="0" max="10" step="1" value={sessionLog.sessionRpe ?? ''} onChange={(e) => updateLog(sessionKey, 'sessionRpe', e.target.value)} />
            </label>
            <label className="tk-logfield" style={{ minWidth: 260 }}>Нотатка тренера / про сесію
              <input type="text" maxLength="1000" value={sessionLog.note ?? ''} onChange={(e) => updateLog(sessionKey, 'note', e.target.value)} />
            </label>
          </div>
          {view.days[day].items.map((it, i) => {
            const key = journalKey(wk, day, it.ex.id);
            return (
              <ExRow key={it.ex.id} item={it} idx={i} week={week} plan={sessionPlan}
                heavy={isHeavy(day, i, week, view)} tech={marks.has(i)}
                anchors={anchors} onAnchor={updateAnchor}
                log={journal[key] || {}} onLog={(field, value) => updateLog(key, field, value)}
                onCoachEdit={(field, value) => updateCoachPrescription(day, plan.days[day].items[i]?.ex.id || it.ex.id, field, value)}
                onRemoveCustom={() => removeCustomExercise(it.ex.id)}
                onSwap={(ex) => setSwaps((s) => ({ ...s, [day + ':' + plan.days[day].items[i].ex.id]: ex }))} />
            );
          })}
          <button className="tk-cta" style={{ marginTop: 14 }} onClick={completeSession} disabled={!!sessionLog.done}>
            {sessionLog.done ? 'Сесію вже збережено' : 'Завершити та зберегти сесію'}
          </button>
        </div>

        {week.test && (
          <div className="tk-card">
            <div className="tk-eyebrow">Протокол тесту</div>
            <p className="tk-p" style={{ marginBottom: 10 }}>Тестуються лише рухи, позначені важким блоком — по одному на день. Решта сесії йде як звичайно, але після тесту.</p>
            <div className="tk-rule"><b>Схема виходу</b>Розминка → 5 повторів на 50 % → 3 на 70 % → 1 на 85 % → цільова спроба на 3–6 повторів. Між підвідними 2 хв, перед цільовою — 4 хв.</div>
            <div className="tk-rule"><b>Критерій успіху</b>Тягові рухи мають перевищити фінал попереднього блоку на 2.5–5 %. Жимові — повернути або перевищити попередній максимум у робочому діапазоні. Якщо не вийшло — це лише сигнал переглянути дані: техніку, специфічність тесту, навантаження, обсяг, сон, харчування й випадкову варіативність. Один тест не встановлює причину.</div>
            <div className="tk-rule"><b>Чого не робити</b>Не тестувати всі рухи в один день і не йти в сингли: одне повторення на максимум після трьох тижнів RIR 0–1 дає ризик, непропорційний інформації, яку воно приносить.</div>
          </div>
        )}

        <VolumePanel plan={view} week={week} />

        <div className="tk-card tk-card-dense">
          <div className="tk-eyebrow">Правила блоку</div>
          <div className="tk-rule"><b>RIR як практичний орієнтир</b>Базові рухи — {week.rb}, ізоляція — {week.ri}. Це шаблон керування втомою, а не доведена єдина оптимальна дистанція до відмови; техніка й відновлення мають вищий пріоритет.</div>
          <div className="tk-rule"><b>Одна змінна за раз</b>Шаблон змінює обсяг або близькість до відмови окремо, щоб легше оцінювати реакцію. Це практичне правило контролю, а не обов’язкова умова прогресу.</div>
          <div className="tk-rule"><b>Ціль — {GOAL_LABEL[profile.goal]}</b>{GOAL_GUIDANCE[profile.goal]}</div>
          <div className="tk-rule"><b>Темп</b>Опускання-пауза-підйом у секундах. X = вибуховий підйом. На делоаді темп сповільнюється до 3-1-3: те саме навантаження для тканин при меншій вазі.</div>
          <div className="tk-rule"><b>Правило застою</b>Якщо у вправі два тренування поспіль не додав ні повтору, ні ваги — зріж робочу вагу на 10 % і зайди в діапазон заново. Це не крок назад, а перезапуск прогресії.</div>
          <div className="tk-rule"><b>Реалістичний темп прогресу</b>{PROGRESSION[profile.level]}</div>
          <div className="tk-rule"><b>Акцент програми — {(FOCUS[profile.focus] || CUSTOM_FOCUS).label}</b>{(FOCUS[profile.focus] || CUSTOM_FOCUS).note}</div>
          {profile.avoid.length > 0 && <div className="tk-rule"><b>Особисті виключення</b>Не потрапляють у програму та заміни: {profile.avoid.map((key) => AVOID[key].label.toLowerCase()).join(', ')}.</div>}
          <div className="tk-rule"><b>Ліміт інтенсивних технік</b>Дроп-сети й часткові повтори в розтягнутій позиції — максимум 2 підходи на всю сесію, лише в ізоляції, ніколи в базових рухах. На делоад-тижнях прибрати повністю. За межею відмови втома росте швидше за стимул.</div>
          {(view.flags.teen || profile.balance !== 'steady') && <div className="tk-rule"><b>Індивідуальний вибір вправ</b>{ageNote(profile)}</div>}
        </div>

        <p className="tk-foot">Межі продукту: 14–70 років; автоматичні плани не призначені для вагітності чи післяпологового періоду, реабілітації, остеопорозу або відомих серцево-судинних, метаболічних чи ниркових станів, зокрема контрольованої гіпертензії. Це навчальний локальний прототип, не медична порада і не зашифрована комерційна CRM. Різкий біль, оніміння, біль у грудях, непритомність чи незвична задишка — привід зупинити тренування й звернутися по медичну допомогу.</p>
      </div>
    </div>
  );
}

export default function TrainingConstructor() {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('tk-theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch (e) { return 'light'; }
  });
  useEffect(() => { try { localStorage.setItem('tk-theme', theme); } catch (e) {} }, [theme]);
  const toggleTheme = () => setTheme((value) => value === 'dark' ? 'light' : 'dark');
  return (
    <ErrorBoundary theme={theme} onThemeToggle={toggleTheme}>
      <TrainingConstructorInner theme={theme} onThemeToggle={toggleTheme} />
    </ErrorBoundary>
  );
}

export { HelpLabel, ReadingGuide, HomeEquipmentPanel };
