import { useState, useMemo, useEffect, Component } from "react";
import { EX } from './data/exercises.js';
import {
  REGION, REGION_GROUP, MUSCLE, UNI_SIDE, uniLabel, EQUIP_SETS,
  PLACE_LABEL, WEEKDAYS, LEVEL_LABEL, GOAL_LABEL, SPLIT_NOTE,
} from './data/labels.js';
import {
  SEX, BALANCE, GROUP_CAP, dayLabel, loadFor, isLoadable, PROGRESSION, ageFlags, isExerciseAllowed,
  buildPlan, isHeavy, setsFor, rirFor, repsFor, tempoFor, restFor, targetFor,
  weeklyVolume, sessionMinutes, scheduleWarnings, frequency, techMarks, warmup,
  DEFAULT_PROFILE, sanitizeProfile,
} from './engine.js';

/* Автономне сховище: той самий контракт {get,set,delete}, що й window.storage
   у середовищі Claude-артефактів, але на звичайному localStorage браузера.
   Завдяки однаковій формі відповіді решта коду нижче не змінюється. */
const storage = {
  async get(key) {
    try {
      const v = localStorage.getItem(key);
      return v === null ? null : { key, value: v };
    } catch (e) { return null; }
  },
  async set(key, value) {
    try { localStorage.setItem(key, value); return { key, value }; } catch (e) { return null; }
  },
  async delete(key) {
    try { localStorage.removeItem(key); return { key, deleted: true }; } catch (e) { return null; }
  },
};

/* ============================================================
   ІНТЕРФЕЙС
   ============================================================ */
const CSS = `
.tk{--ink:#14181A;--surf:#E9EDEA;--card:#FFF;--steel:#66736F;--line:#D3D9D5;--deep:#2E2A72;--link:#2E2A72;--dl:#2FA090;--hot:#B4402F;
 --bar:#14181A;--bar-text:#EDF0EE;--bar-muted:#8A9B95;--alert:#FBEFEC;--alert-line:#E6C3B9;
 --fitness-bg:url('fitness-background-light.webp');
 font-family:system-ui,-apple-system,'Segoe UI',sans-serif;background-color:var(--surf);background-image:var(--fitness-bg);
 background-repeat:no-repeat;background-position:center top;background-size:cover;background-attachment:fixed;
 color:var(--ink);min-height:100vh;line-height:1.5;color-scheme:light;}
.tk[data-theme="dark"]{--ink:#F1F5F3;--surf:#0B0E0D;--card:#151A18;--steel:#A8B4B0;--line:#303A36;--deep:#584FC5;--link:#AAA5FF;--dl:#4FC4B0;--hot:#E87360;
 --bar:#070908;--bar-text:#F1F5F3;--bar-muted:#93A29C;--alert:#2B1815;--alert-line:#704036;
 --fitness-bg:url('fitness-background-dark.webp');color-scheme:dark;}
.tk *{box-sizing:border-box;}
.tk-bar{background:var(--bar);color:var(--bar-text);padding:18px 20px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;}
.tk-mark{font-family:'Arial Black','Segoe UI',system-ui,sans-serif;font-weight:700;font-size:17px;letter-spacing:-.02em;}
.tk-sub{font-family:ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',monospace;font-size:11px;color:var(--bar-muted);text-transform:uppercase;letter-spacing:.1em;}
.tk-theme{font:inherit;font-family:ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',monospace;font-size:11px;color:var(--bar-text);background:transparent;border:1px solid var(--bar-muted);border-radius:2px;padding:7px 10px;cursor:pointer;margin-left:auto;}
.tk-theme:hover{border-color:var(--bar-text);}
.tk-theme:focus-visible{outline:2px solid var(--bar-text);outline-offset:2px;}
.tk-credit{position:fixed;right:16px;bottom:14px;z-index:20;display:flex;align-items:baseline;gap:6px;padding:7px 11px;
 background:var(--card);color:var(--steel);border:1px solid var(--line);border-radius:999px;box-shadow:0 5px 18px rgba(0,0,0,.14);
 pointer-events:none;white-space:nowrap;}
.tk-credit span{font-family:ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',monospace;font-size:8px;text-transform:uppercase;letter-spacing:.12em;}
.tk-credit strong{font-family:Georgia,'Times New Roman',serif;font-size:13px;font-style:italic;font-weight:600;letter-spacing:.01em;color:var(--ink);}
.tk-main{max-width:900px;margin:0 auto;padding:20px 16px 64px;}
.tk-card{background:var(--card);border:1px solid var(--line);border-radius:4px;padding:20px;margin-bottom:14px;}
.tk-eyebrow{font-family:ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',monospace;font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:var(--steel);margin-bottom:10px;}
.tk-h{font-family:'Arial Black','Segoe UI',system-ui,sans-serif;font-weight:500;font-size:20px;letter-spacing:-.02em;margin:0 0 6px;}
.tk-p{font-size:14px;color:var(--steel);margin:0 0 14px;}
.tk-field{margin-bottom:20px;}
.tk-lbl{display:block;font-size:13px;font-weight:600;margin-bottom:8px;}
.tk-hint{font-size:12px;color:var(--steel);margin-top:6px;}
.tk-opts{display:flex;flex-wrap:wrap;gap:6px;}
.tk-opt{font:inherit;font-size:13px;padding:8px 13px;border:1px solid var(--line);background:var(--card);color:var(--ink);border-radius:2px;cursor:pointer;}
.tk-opt:hover{border-color:var(--link);}
.tk-opt[aria-pressed="true"]{background:var(--deep);border-color:var(--deep);color:#fff;}
.tk-opt:focus-visible,.tk-wk:focus-visible,.tk-day:focus-visible,.tk-mini:focus-visible{outline:2px solid var(--link);outline-offset:2px;}
.tk-num{font:inherit;font-family:ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',monospace;width:88px;padding:9px 11px;border:1px solid var(--line);border-radius:2px;background:var(--card);color:var(--ink);}
.tk-cta{font:inherit;font-family:'Arial Black','Segoe UI',system-ui,sans-serif;font-weight:500;font-size:15px;width:100%;padding:15px;background:var(--deep);color:#fff;border:none;border-radius:3px;cursor:pointer;}
.tk-cta[disabled]{background:#A9B3AF;cursor:not-allowed;}
.tk-check{display:flex;gap:10px;align-items:flex-start;font-size:13px;color:var(--steel);margin-bottom:14px;}
.tk-check input{margin-top:3px;flex-shrink:0;}
.tk-ramp{display:flex;align-items:flex-end;gap:3px;height:112px;margin-bottom:2px;}
.tk-wk{flex:1;display:flex;flex-direction:column;justify-content:flex-end;background:none;border:none;padding:0;cursor:pointer;height:100%;min-width:0;}
.tk-wk span{display:block;border-radius:2px 2px 0 0;transition:height .18s ease;}
.tk-wk b{font-family:ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',monospace;font-size:10px;font-weight:500;color:var(--steel);padding-top:7px;border-top:1px solid var(--line);overflow:hidden;}
.tk-wk[aria-pressed="true"] b{color:var(--ink);border-top:2px solid var(--ink);padding-top:6px;}
.tk-wkmeta{display:flex;gap:18px;flex-wrap:wrap;align-items:baseline;margin:16px 0 8px;}
.tk-rir{font-family:'Arial Black','Segoe UI',system-ui,sans-serif;font-weight:700;font-size:22px;letter-spacing:-.03em;}
.tk-rir small{font-family:ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',monospace;font-size:11px;font-weight:400;color:var(--steel);display:block;letter-spacing:0;}
.tk-days{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;}
.tk-day{font:inherit;font-size:13px;padding:8px 13px;border:1px solid var(--line);background:var(--card);border-radius:2px;cursor:pointer;color:var(--ink);}
.tk-day[aria-pressed="true"]{background:var(--deep);border-color:var(--deep);color:#fff;}
.tk-warm{background:var(--surf);border-radius:3px;padding:12px 14px;margin-bottom:16px;font-size:13px;}
.tk-warm ul{margin:6px 0 0;padding-left:18px;}
.tk-warm li{margin-bottom:3px;}
.tk-ex{border-top:1px solid var(--line);padding:14px 0;display:flex;gap:14px;}
.tk-idx{font-family:ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',monospace;font-size:12px;color:var(--steel);padding-top:2px;min-width:22px;}
.tk-exbody{flex:1;min-width:0;}
.tk-exname{font-weight:600;font-size:15px;margin-bottom:4px;}
.tk-badge{font-family:ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',monospace;font-size:10px;letter-spacing:.06em;padding:2px 6px;border-radius:2px;margin-left:6px;white-space:nowrap;}
.tk-b-heavy{background:var(--hot);color:#fff;}
.tk-b-prio{background:var(--deep);color:#fff;}
.tk-b-tech{background:var(--surf);color:var(--steel);border:1px solid var(--line);}
.tk-presc{font-family:ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',monospace;font-size:13px;}
.tk-presc i{color:var(--steel);font-style:normal;}
.tk-tags{font-size:12px;color:var(--steel);margin-top:4px;}
.tk-mini{font:inherit;font-size:12px;background:none;border:none;color:var(--link);cursor:pointer;padding:6px 8px 0 0;text-decoration:underline;text-underline-offset:3px;}
.tk-tech{background:var(--surf);border-left:2px solid var(--link);padding:11px 13px;margin-top:10px;font-size:13px;}
.tk-tech p{margin:0 0 7px;}
.tk-tech p:last-child{margin:0;}
.tk-tech strong{font-size:11px;font-family:ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',monospace;text-transform:uppercase;letter-spacing:.08em;color:var(--steel);display:block;margin-bottom:2px;}
.tk-media{margin:0 0 11px;background:#111318;border:1px solid var(--line);border-radius:3px;overflow:hidden;}
.tk-media img{display:block;width:100%;height:auto;aspect-ratio:3/2;object-fit:contain;background:#111318;}
.tk-media figcaption{padding:7px 10px;color:#BCC5C1;background:#111318;font-size:11px;font-family:ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',monospace;}
.tk-media-pending{color:var(--steel);font-size:12px;}
.tk-swap{margin-top:10px;display:flex;flex-wrap:wrap;gap:6px;}
.tk-vol{display:flex;flex-direction:column;gap:11px;}
.tk-volrow{display:grid;grid-template-columns:110px 1fr 60px;gap:10px;align-items:center;font-size:13px;}
.tk-track{height:7px;background:var(--surf);border-radius:4px;overflow:hidden;}
.tk-fill{height:100%;background:var(--deep);}
.tk-fill.low{background:#A9B3AF;}
.tk-fill.over{background:var(--hot);}
.tk-volnum{font-family:ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',monospace;font-size:12px;color:var(--steel);text-align:right;}
.tk-split{grid-column:1/-1;font-family:ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',monospace;font-size:11px;color:var(--steel);margin-top:-6px;}
.tk-foot{font-size:12px;color:var(--steel);border-top:1px solid var(--line);padding-top:14px;}
.tk-chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;}
.tk-chip{font-family:ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',monospace;font-size:11px;padding:4px 9px;background:var(--surf);border:1px solid var(--line);border-radius:2px;color:var(--steel);}
.tk-rule{border-top:1px solid var(--line);padding:12px 0 0;margin-top:12px;font-size:13px;}
.tk-load{display:flex;align-items:center;gap:8px;margin-top:6px;flex-wrap:wrap;}
.tk-load b{font-family:ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',monospace;font-size:14px;background:var(--deep);color:#fff;padding:2px 8px;border-radius:2px;}
.tk-wnum{font:inherit;font-family:ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',monospace;width:104px;padding:5px 8px;border:1px solid var(--line);border-radius:2px;background:var(--card);color:var(--ink);font-size:12px;}
.tk-why{background:var(--card);border:1px dashed var(--line);border-left:2px solid var(--dl);padding:10px 12px;margin-top:9px;font-size:12.5px;}
.tk-why ul{margin:4px 0 0;padding-left:16px;}
.tk-why li{margin-bottom:2px;color:var(--steel);}
.tk-alert{background:var(--alert);border:1px solid var(--alert-line);border-radius:3px;padding:12px 14px;font-size:13px;margin-bottom:14px;}
.tk-alert b{display:block;font-size:11px;font-family:ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',monospace;text-transform:uppercase;letter-spacing:.08em;color:var(--hot);margin-bottom:4px;}
.tk-meta{font-family:ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',monospace;font-size:11px;color:var(--steel);margin-bottom:12px;}
.tk-wdays{display:flex;gap:4px;flex-wrap:wrap;}
.tk-wd{font:inherit;font-family:ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',monospace;font-size:12px;width:42px;padding:8px 0;border:1px solid var(--line);background:var(--card);color:var(--ink);border-radius:2px;cursor:pointer;}
.tk-wd[aria-pressed="true"]{background:var(--deep);border-color:var(--deep);color:#fff;}
.tk-rule b{display:block;font-size:11px;font-family:ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',monospace;text-transform:uppercase;letter-spacing:.08em;color:var(--steel);margin-bottom:3px;}
@media (max-width:760px){.tk{background-position:left top;background-size:auto 100vh;background-attachment:scroll;}}
@media (max-width:520px){.tk-volrow{grid-template-columns:92px 1fr 52px;}.tk-ramp{height:92px;}.tk-credit{right:8px;bottom:8px;padding:6px 9px;}.tk-credit strong{font-size:12px;}}
@media (prefers-reduced-motion:reduce){.tk-wk span{transition:none;}}
`;

function Header({ theme, onToggle }) {
  const dark = theme === 'dark';
  return (
    <div className="tk-bar">
      <span className="tk-mark">Конструктор тренувань</span>
      <span className="tk-sub">Макроцикл · Повтори в запасі · Розвантаження</span>
      <button type="button" className="tk-theme" aria-pressed={dark} onClick={onToggle}
        aria-label={dark ? 'Увімкнути світлу тему' : 'Увімкнути темну тему'}>
        {dark ? '☀ Світла тема' : '◐ Темна тема'}
      </button>
      <div className="tk-credit" aria-label="Developed by Ihor Samchenko">
        <span>developed by</span><strong>Ihor Samchenko</strong>
      </div>
    </div>
  );
}

function ageNote(p) {
  const f = ageFlags(p.age);
  if (f.teen) return 'До 18: RIR не нижче 2, обсяг −20 %, технічно складні рухи прибрано, тест максимумів не призначається.';
  const on = [];
  if (f.midlife) on.push('для загального здоровʼя та гіпертрофії пріоритет мають гак, жим ногами, румунська тяга й рухи з опорою');
  if (p.goal === 'strength' && p.level === 'adv' && p.balance === 'steady') on.push('досвід і силова ціль зберігають специфічні вправи зі штангою');
  if (f.longWarm) on.push('подовжена розминка');
  if (f.older) on.push('у розминку додано безпечну роботу на баланс');
  return on.length
    ? 'Вік не є забороною сам по собі. Увімкнено: ' + on.join(', ') + '.'
    : 'Вік не накладає автоматичних заборон; вибір визначають стаж, ціль, баланс і зазначені обмеження.';
}

function OptRow({ options, value, onChange, multi }) {
  const active = (k) => (multi ? value.includes(k) : value === k);
  const toggle = (k) => { if (!multi) return onChange(k); onChange(value.includes(k) ? value.filter((x) => x !== k) : [...value, k]); };
  return (
    <div className="tk-opts">
      {options.map(([k, label]) => (
        <button key={k} type="button" className="tk-opt" aria-pressed={active(k)} onClick={() => toggle(k)}>{label}</button>
      ))}
    </div>
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
        {once.length > 0 && <li>Раз на тиждень: {once.map((k) => MUSCLE[k]).join(', ')}. Для росту зазвичай треба двічі — або постав групу ще в один день, або прийми, що вона буде на підтримці.</li>}
        {missing.length > 0 && <li>Не тренуються зовсім: {missing.map((k) => MUSCLE[k]).join(', ')}.</li>}
        {thin.length > 0 && <li>Короткі дні: {thin.map((x) => 'День ' + (x.i + 1)).join(', ')} — не більше {thin[0].n} вправ. Більше рухів на дрібну групу за одну сесію майже не додає стимулу, тож або додай сусідню групу, або залиш як є.</li>}
        {!empty && !once.length && !missing.length && <li>Кожна група працює щонайменше двічі на тиждень — розкладка збалансована.</li>}
      </ul>
    </div>
  );
}

function Wizard({ p, set, onBuild }) {
  const [ok, setOk] = useState(false);
  const [ageDraft, setAgeDraft] = useState(String(p.age));
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
    set({ days: n, weekdays, customDays });
  };
  const toggleDay = (i) => {
    let w = p.weekdays.includes(i) ? p.weekdays.filter((x) => x !== i) : [...p.weekdays, i];
    w.sort((a, b) => a - b);
    if (w.length > p.days) w = w.slice(w.length - p.days);
    set({ weekdays: w });
  };
  const customReady = p.mode !== 'custom' || Array.from({ length: p.days }).every((_, i) => p.customDays[i] && p.customDays[i].groups.length);
  return (
    <div className="tk-card">
      <div className="tk-eyebrow">Крок 1 — параметри</div>
      <h2 className="tk-h">Розкажи про себе</h2>
      <p className="tk-p">Довжина макроциклу залежить від стажу: 5 тижнів для новачка, 7 для середнього рівня, 11 для просунутого.</p>

      <div className="tk-field">
        <label className="tk-lbl" htmlFor="tk-age">Вік</label>
        <input id="tk-age" className="tk-num" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={2}
          value={ageDraft} onChange={(e) => setAgeDraft(e.target.value.replace(/\D/g, '').slice(0, 2))}
          onBlur={commitAge} onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') { setAgeDraft(String(p.age)); e.currentTarget.blur(); }
          }} />
        <div className="tk-hint">{ageNote(p)}</div>
      </div>

      <div className="tk-field">
        <span className="tk-lbl">Баланс і контроль руху</span>
        <OptRow options={Object.entries(BALANCE).map(([k, v]) => [k, v.label])} value={p.balance} onChange={(v) => set({ balance: v })} />
        <div className="tk-hint">{BALANCE[p.balance].note} Це точніший критерій вибору вправи, ніж паспортний вік.</div>
      </div>

      <div className="tk-field">
        <span className="tk-lbl">Стать</span>
        <OptRow options={Object.entries(SEX).map(([k, v]) => [k, v.label])} value={p.sex}
          onChange={(v) => set({ sex: v, priority: SEX[p.sex].prio.join() === p.priority.join() ? SEX[v].prio : p.priority })} />
        <div className="tk-hint">{SEX[p.sex].note}</div>
      </div>

      <div className="tk-field">
        <span className="tk-lbl">Стаж силових тренувань</span>
        <OptRow options={[['beg', 'До 6 місяців'], ['int', '6–24 місяці'], ['adv', 'Понад 2 роки']]} value={p.level} onChange={(v) => set({ level: v })} />
        <div className="tk-hint">{PROGRESSION[p.level]}</div>
      </div>

      <div className="tk-field">
        <span className="tk-lbl">Днів на тиждень</span>
        <OptRow options={[['2', '2'], ['3', '3'], ['4', '4'], ['5', '5'], ['6', '6']]} value={String(p.days)} onChange={(v) => setDays(Number(v))} />
        <div className="tk-hint">{p.mode === 'auto' ? SPLIT_NOTE[p.days] : 'Стільки днів ти й налаштуєш нижче.'}</div>
      </div>

      <div className="tk-field">
        <span className="tk-lbl">Розкладка</span>
        <OptRow options={[['auto', 'Готова під кількість днів'], ['custom', 'Власна']]} value={p.mode} onChange={(v) => set({ mode: v })} />
        <div className="tk-hint">{p.mode === 'auto' ? SPLIT_NOTE[p.days] : 'Обери групи для кожного дня. Слоти всередині дня розподіляються за розміром групи, а порядок вправ і підспецифікації рахує той самий движок, що й у готових шаблонах.'}</div>
      </div>

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
        <span className="tk-lbl">Скільки часу на тренування</span>
        <OptRow options={[['0', 'Без ліміту'], ['45', '45 хв'], ['60', '60 хв'], ['75', '75 хв'], ['90', '90 хв']]}
          value={String(p.timeCap || 0)} onChange={(v) => set({ timeCap: Number(v) || null })} />
        <div className="tk-hint">Якщо сесія не вкладається, конструктор зрізає підходи в ізоляції, потім прибирає ізоляційні вправи. Базові рухи чіпає останніми.</div>
      </div>

      <div className="tk-field">
        <span className="tk-lbl">Де тренуєшся</span>
        <OptRow options={[['gym', 'Зал'], ['db', 'Гантелі вдома'], ['band', 'Резинки'], ['bw', 'Тільки вага тіла']]} value={p.place} onChange={(v) => set({ place: v })} />
        <label className="tk-check" style={{ marginTop: 12, marginBottom: 0 }}>
          <input type="checkbox" checked={p.bar} onChange={(e) => set({ bar: e.target.checked })} />
          <span>Є турнік — додати підтягування і підйоми ніг у висі</span>
        </label>
      </div>

      <div className="tk-field">
        <span className="tk-lbl">Головна ціль</span>
        <OptRow options={[['hyper', 'Гіпертрофія'], ['strength', 'Сила'], ['fatloss', 'Зниження ваги'], ['health', 'Здоров’я']]} value={p.goal} onChange={(v) => set({ goal: v })} />
      </div>

      <div className="tk-field">
        <span className="tk-lbl">Пріоритетні групи <span style={{ fontWeight: 400, color: 'var(--steel)' }}>— не більше двох</span></span>
        <OptRow multi options={Object.entries(MUSCLE)} value={p.priority} onChange={(v) => set({ priority: v.slice(-2) })} />
        <div className="tk-hint">Пріоритетна група отримує додаткову вправу і ставиться на початок дня, поки ти свіжий.</div>
      </div>

      <div className="tk-field">
        <span className="tk-lbl">Що береже</span>
        <OptRow multi options={[['knee', 'Коліна'], ['lowback', 'Поперек'], ['shoulder', 'Плечі']]} value={p.limits} onChange={(v) => set({ limits: v })} />
      </div>

      <label className="tk-check">
        <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} />
        <span>Я почуваюся здоровим для силових навантажень і розумію, що цей план — не медична порада. За наявності болю, хронічних хвороб або перерви після травми спершу консультуюся з лікарем.</span>
      </label>
      <button className="tk-cta" disabled={!ok || !customReady} onClick={() => onBuild()}>
        {customReady ? 'Скласти програму' : 'Заповни всі дні розкладки'}
      </button>
    </div>
  );
}

function ExRow({ item, idx, week, plan, heavy, tech, onSwap, anchors, onAnchor }) {
  const [open, setOpen] = useState(false);
  const [swap, setSwap] = useState(false);
  const [why, setWhy] = useState(false);
  const p = plan.profile;
  const sets = setsFor(item, week, plan, heavy);
  const alts = EX.filter((e) => e.p === item.ex.p && e.id !== item.ex.id && isExerciseAllowed(e, p));
  const tempo = tempoFor(item, week, heavy);

  return (
    <div className="tk-ex">
      <div className="tk-idx">{String(idx + 1).padStart(2, '0')}</div>
      <div className="tk-exbody">
        <div className="tk-exname">
          {item.ex.n}
          {heavy && <span className="tk-badge tk-b-heavy">ВАЖКИЙ БЛОК</span>}
          {item.boost && <span className="tk-badge tk-b-prio">ПРІОРИТЕТ</span>}
        </div>
        <div className="tk-presc">
          {sets} × {repsFor(item, p.goal, week, heavy)}{item.ex.uni ? ' ' + uniLabel(item.ex) : ''} <i>·</i> RIR {rirFor(item, week, plan)} <i>·</i> темп {tempo} <i>·</i> {restFor(item, plan, heavy)}
        </div>
        {isLoadable(item.ex) && (
          <div className="tk-load">
            {loadFor(item, week, heavy, anchors) && <b>{loadFor(item, week, heavy, anchors)} кг</b>}
            <input className="tk-wnum" type="number" step="2.5" min="0" placeholder="робоча вага, кг"
              value={anchors[item.ex.id] || ''} onChange={(e) => onAnchor(item.ex.id, e.target.value)} />
            {loadFor(item, week, heavy, anchors) && <span style={{ fontSize: 11, color: 'var(--steel)' }}>
              {Math.round(week.load * 100)} % від робочої{heavy ? ' × 1.12 на важкий блок' : ''}
            </span>}
          </div>
        )}
        <div className="tk-tags">
          {REGION[item.ex.rg]}{item.ex.s && item.ex.s.length ? ' + ' + item.ex.s.map((x) => MUSCLE[x]).join(', ') : ''} · {item.ex.t === 'comp' ? 'базова' : 'ізоляція'}
          {tech && <span className="tk-badge tk-b-tech">останній підхід: дроп-сет або 3–5 часткових у розтягнутій позиції</span>}
        </div>
        <button className="tk-mini" onClick={() => setOpen(!open)}>{open ? 'Згорнути техніку' : 'Техніка'}</button>
        {alts.length > 0 && <button className="tk-mini" onClick={() => setSwap(!swap)}>Замінити</button>}
        {item.why && item.why.length > 0 && <button className="tk-mini" onClick={() => setWhy(!why)}>{why ? 'Згорнути' : 'Чому саме ця вправа'}</button>}
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
          const [lo, hi] = targetFor(plan.profile.level, k, plan.flags.teen, plan.profile.sex);
          const v = Math.round(byMuscle[k] || 0);
          const fr = freq[k] || 0;
          const cls = v < lo ? 'low' : v > hi ? 'over' : '';
          const parts = (subs[k] || []).filter(([, n]) => n > 0);
          return (
            <div className="tk-volrow" key={k}>
              <span>{MUSCLE[k]}</span>
              <span className="tk-track"><span className={'tk-fill ' + cls} style={{ width: Math.min(100, (v / (hi * 1.25)) * 100) + '%' }} /></span>
              <span className="tk-volnum">{v} <span style={{ opacity: 0.55 }}>/{hi}</span></span>
              {v > 0 && fr < 2 && <span className="tk-split" style={{ color: 'var(--hot)' }}>частота {fr}×/тиж — для росту зазвичай треба двічі</span>}
              {parts.length > 1 && <span className="tk-split">{parts.map(([rg, n]) => REGION[rg].split(' · ')[1] + ' ' + n).join(' · ')}</span>}
            </div>
          );
        })}
      </div>
      <p className="tk-hint" style={{ marginTop: 14 }}>
        Друге число — стеля для рівня «{LEVEL_LABEL[plan.profile.level]}»; вона різна по групах. Другий рядок під групою — розподіл по підспецифікаціях:
        ширина спини і товщина ростуть від різних рухів, литковий вимагає прямих колін, а камбалоподібний — зігнутих на 90°.
        {(SEX[plan.profile.sex] || SEX.x).cap.glutes ? ' Стелю на низ тіла піднято відповідно до обраної статі.' : ''}
      </p>
    </div>
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
  const [loaded, setLoaded] = useState(false);
  const [plan, setPlan] = useState(null);
  const [wk, setWk] = useState(0);
  const [day, setDay] = useState(0);
  const [swaps, setSwaps] = useState({});
  const [buildErr, setBuildErr] = useState(null);
  const set = (patch) => setProfile((s) => ({ ...s, ...patch }));
  const build = (p) => {
    try {
      const prof = p || profile;
      setPlan(buildPlan(prof));
      setWk(0); setDay(0); setSwaps({}); setBuildErr(null);
    } catch (e) { setBuildErr(e.message || String(e)); }
  };
  const variant = () => {
    try {
      const prof = { ...profile, seed: (profile.seed || 0) + 1 };
      setProfile(prof); setPlan(buildPlan(prof)); setSwaps({}); setBuildErr(null);
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
    (async () => {
      try {
        const r = await storage.get('tk-state');
        if (r && r.value) {
          const st = JSON.parse(r.value);
          if (st.profile) {
            const safe = sanitizeProfile(st.profile);
            setProfile(safe);
            if (st.built) setPlan(buildPlan(safe));
          }
          if (st.anchors) setAnchors(st.anchors);
          if (st.swaps) setSwaps(st.swaps);
        }
      } catch (e) { /* перший запуск або сховище недоступне */ }
      setLoaded(true);
    })();
  }, []);
  useEffect(() => {
    if (!loaded) return;
    (async () => {
      try { await storage.set('tk-state', JSON.stringify({ profile, anchors, swaps, built: !!plan })); } catch (e) {}
    })();
  }, [profile, anchors, swaps, plan, loaded]);
  const reset = async () => { try { await storage.delete('tk-state'); } catch (e) {} setAnchors({}); setSwaps({}); setPlan(null); };

  const view = useMemo(() => {
    if (!plan) return null;
    // Ключ overlay — id вправи в ЧИСТОМУ plan (не view), а не позиція.
    // Так заміна лишається прив'язаною до тієї самої вправи навіть якщо порядок
    // усередині дня зміниться; а якщо після оновлення коду вправа зникне зі слоту —
    // заміна просто не застосується, замість тихого накладання на чужу вправу.
    return { ...plan, days: plan.days.map((d, di) => ({ ...d, items: d.items.map((it) => (swaps[di + ':' + it.ex.id] ? { ...it, ex: swaps[di + ':' + it.ex.id] } : it)) })) };
  }, [plan, swaps]);

  const [exporting, setExporting] = useState(false);
  const exportXlsx = async () => {
    setExporting(true);
    try {
      // ExcelJS важить понад 900 КБ у стисненому вигляді — підвантажуємо лише
      // тим, хто реально натиснув «Експорт», а не всім при кожному відкритті сторінки.
      const { default: ExcelJS } = await import('exceljs/dist/exceljs.min.js');
      const wb = new ExcelJS.Workbook();
      const addSheet = (name, rows) => {
        const ws = wb.addWorksheet(name.replace(/[\\/?*\[\]:]/g, '-').slice(0, 31));
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
              const kg = loadFor(it, w, h, anchors);
              return setsFor(it, w, view, h) + '×' + repsFor(it, profile.goal, w, h) + ' RIR' + rirFor(it, w, view) + (kg ? ' · ' + kg + 'кг' : '');
            })]);
        });
        const nm = ((di + 1) + '. ' + (profile.weekdays.length === profile.days ? WEEKDAYS[profile.weekdays[di]] + ' ' : '') + d.name);
        addSheet(nm, rows);
      });

      const vol = [['Група', 'Підходи на піку', 'Стеля', 'Частота/тиж']];
      const peak = weeks.reduce((a, b) => (a.mult > b.mult ? a : b));
      const vv = weeklyVolume(view, peak).byMuscle, fr = frequency(view);
      Object.keys(MUSCLE).forEach((k) => vol.push([MUSCLE[k], Math.round(vv[k] || 0), targetFor(profile.level, k, view.flags.teen, profile.sex)[1], fr[k] || 0]));
      addSheet('Обсяг', vol);

      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'programa-' + weeks.length + 'tyzhniv.xlsx';
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e) { alert('Експорт не вдався: ' + e.message); }
    finally { setExporting(false); }
  };

  if (!plan || !view) {
    return (
      <div className="tk" data-theme={theme}><style>{CSS}</style>
        <Header theme={theme} onToggle={onThemeToggle} />
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
          <Wizard p={profile} set={set} onBuild={build} />
        </div>
      </div>
    );
  }

  const weeks = view.weeks;
  const week = weeks[Math.min(wk, weeks.length - 1)];
  const marks = techMarks(view.days[day], week, view);
  const warm = warmup(view, view.days[day]);
  const alerts = scheduleWarnings(view);
  const mins = sessionMinutes(view.days[day], week, view, day);
  const dayLabelFor = (i) => (profile.weekdays.length === profile.days ? WEEKDAYS[profile.weekdays[i]] + ' · ' : (i + 1) + '. ');

  const copy = async () => {
    const out = [`Макроцикл ${weeks.length} тижнів · ${LEVEL_LABEL[profile.level]} · ${profile.age} р. · ${GOAL_LABEL[profile.goal]} · ${profile.days} дн/тиж`];
    weeks.forEach((w, wi) => {
      out.push('', `ТИЖДЕНЬ ${wi + 1} — ${w.tag} · RIR база ${w.rb} / ізоляція ${w.ri} · темп ${w.tempo}`);
      view.days.forEach((d, di) => {
        out.push(`  ${d.name}`);
        d.items.forEach((it, i) => {
          const h = isHeavy(di, i, w, view);
          out.push(`   ${i + 1}. ${it.ex.n} — ${setsFor(it, w, view, h)} × ${repsFor(it, profile.goal, w, h)}${it.ex.uni ? ' ' + uniLabel(it.ex) : ''} · RIR ${rirFor(it, w, view)}${h ? ' · ВАЖКИЙ БЛОК' : ''}`);
        });
      });
    });
    try { await navigator.clipboard.writeText(out.join('\n')); alert('План скопійовано'); }
    catch { alert('Скопіювати не вдалося — виділи текст вручну'); }
  };

  return (
    <div className="tk" data-theme={theme}>
      <style>{CSS}</style>
      <Header theme={theme} onToggle={onThemeToggle} />
      <div className="tk-main">
        <div className="tk-card">
          <div className="tk-chips">
            <span className="tk-chip">{profile.age} р.</span>
            {profile.sex !== 'x' && <span className="tk-chip">{SEX[profile.sex].label}</span>}
            <span className="tk-chip">{profile.mode === 'custom' ? 'Власна розкладка' : 'Готова розкладка'}</span>
            <span className="tk-chip">{LEVEL_LABEL[profile.level]}</span>
            <span className="tk-chip">{profile.days} дн/тиж</span>
            <span className="tk-chip">{PLACE_LABEL[profile.place]}</span>
            <span className="tk-chip">{GOAL_LABEL[profile.goal]}</span>
            <span className="tk-chip">{weeks.length} тижнів</span>
            {profile.priority.map((m) => <span className="tk-chip" key={m}>↑ {MUSCLE[m]}</span>)}
          </div>
          <button className="tk-mini" style={{ paddingLeft: 0 }} onClick={() => setPlan(null)}>Змінити параметри</button>
          <button className="tk-mini" onClick={copy}>Скопіювати</button>
          <button className="tk-mini" onClick={exportXlsx} disabled={exporting}>{exporting ? 'Готую файл…' : 'Експорт у Excel'}</button>
          <button className="tk-mini" onClick={variant}>Інший варіант</button>
          <button className="tk-mini" onClick={reset}>Скинути все</button>
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

        <div className="tk-card">
          <div className="tk-eyebrow">Макроцикл · висота стовпчика = обсяг тижня</div>
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

        <div className="tk-card">
          <div className="tk-days">
            {view.days.map((d, i) => (
              <button key={i} className="tk-day" aria-pressed={i === day} onClick={() => setDay(i)}>{dayLabelFor(i)}{d.name}</button>
            ))}
          </div>
          <div className="tk-meta">
            ~{mins} хв разом із розминкою · {view.days[day].items.length} вправ
            {view.days[day].trimmed ? ' · сесію скорочено під ліміт ' + profile.timeCap + ' хв' : ''}
            {view.days[day].overCap ? ' · у ліміт не вкладається навіть після скорочення — лишились самі базові рухи' : ''}
          </div>
          {!profile.timeCap && mins > 100 && (
            <div className="tk-alert" style={{ marginTop: -4 }}>
              <b>Довга сесія</b>{mins} хв — це та зона, де якість останніх вправ падає швидше, ніж накопичується стимул. Постав ліміт часу в параметрах або рознеси день на два.
            </div>
          )}
          <div className="tk-warm">
            <strong style={{ fontSize: 13 }}>Розминка</strong>
            <ul>{warm.map((w, i) => <li key={i}>{w}</li>)}</ul>
          </div>
          {view.days[day].items.map((it, i) => (
            <ExRow key={i} item={it} idx={i} week={week} plan={view}
              heavy={isHeavy(day, i, week, view)} tech={marks.has(i)}
              anchors={anchors} onAnchor={(id, v) => setAnchors((a) => ({ ...a, [id]: v ? Number(v) : 0 }))}
              onSwap={(ex) => setSwaps((s) => ({ ...s, [day + ':' + plan.days[day].items[i].ex.id]: ex }))} />
          ))}
        </div>

        {week.test && (
          <div className="tk-card">
            <div className="tk-eyebrow">Протокол тесту</div>
            <p className="tk-p" style={{ marginBottom: 10 }}>Тестуються лише рухи, позначені важким блоком — по одному на день. Решта сесії йде як звичайно, але після тесту.</p>
            <div className="tk-rule"><b>Схема виходу</b>Розминка → 5 повторів на 50 % → 3 на 70 % → 1 на 85 % → цільова спроба на 3–6 повторів. Між підвідними 2 хв, перед цільовою — 4 хв.</div>
            <div className="tk-rule"><b>Критерій успіху</b>Тягові рухи мають перевищити фінал попереднього блоку на 2.5–5 %. Жимові — повернути або перевищити попередній максимум у робочому діапазоні. Якщо не вийшло — це сигнал не про волю, а про те, що обсяг або відновлення були недостатні.</div>
            <div className="tk-rule"><b>Чого не робити</b>Не тестувати всі рухи в один день і не йти в сингли: одне повторення на максимум після трьох тижнів RIR 0–1 дає ризик, непропорційний інформації, яку воно приносить.</div>
          </div>
        )}

        <VolumePanel plan={view} week={week} />

        <div className="tk-card">
          <div className="tk-eyebrow">Правила блоку</div>
          <div className="tk-rule"><b>RIR розділено за SFR</b>Базові рухи — {week.rb}, ізоляція — {week.ri}. Підхід присідів до відмови коштує системної втоми в рази більше за підхід махів, а стимулу додає непропорційно мало. Втома переноситься туди, де вона дешева.</div>
          <div className="tk-rule"><b>Одна змінна за раз</b>У межах тижня росте АБО обсяг, АБО близькість до відмови — ніколи разом. Дві змінні одночасно не дають зрозуміти, що спрацювало, і подвоюють вартість втоми.</div>
          <div className="tk-rule"><b>Темп</b>Опускання-пауза-підйом у секундах. X = вибуховий підйом. На делоаді темп сповільнюється до 3-1-3: те саме навантаження для тканин при меншій вазі.</div>
          <div className="tk-rule"><b>Правило застою</b>Якщо у вправі два тренування поспіль не додав ні повтору, ні ваги — зріж робочу вагу на 10 % і зайди в діапазон заново. Це не крок назад, а перезапуск прогресії.</div>
          <div className="tk-rule"><b>Реалістичний темп прогресу</b>{PROGRESSION[profile.level]}</div>
          <div className="tk-rule"><b>Ліміт інтенсивних технік</b>Дроп-сети й часткові повтори в розтягнутій позиції — максимум 2 підходи на всю сесію, лише в ізоляції, ніколи в базових рухах. На делоад-тижнях прибрати повністю. За межею відмови втома росте швидше за стимул.</div>
          {profile.sex !== 'x' && <div className="tk-rule"><b>Поправка за статтю ({SEX[profile.sex].label})</b>{SEX[profile.sex].note}</div>}
          {profile.sex === 'f' && profile.age >= 45 && <div className="tk-rule"><b>Після 45</b>Силові з великою вагою — один із небагатьох інструментів, що впливають на щільність кісткової тканини. Це аргумент не знижувати ваги з віком, а зберігати важкі базові рухи в програмі, зменшуючи натомість обсяг допоміжної роботи.</div>}
          {(view.flags.midlife || profile.balance !== 'steady') && <div className="tk-rule"><b>Індивідуальний вибір вправ ({profile.age} р.)</b>{ageNote(profile)}</div>}
        </div>

        <p className="tk-foot">Це навчальний прототип, а не медична порада. Різкий біль, оніміння чи запаморочення — привід зупинити тренування й звернутися до лікаря.</p>
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
