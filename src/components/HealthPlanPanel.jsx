import { healthProgress } from '../healthPlan.ts';

export default function HealthPlanPanel({ profile, weekIndex = 0, log = {}, onChange, showJournal = false }) {
  const progress = healthProgress(profile, log, weekIndex);
  const { targets } = progress;
  const field = (name, label, max = 1000) => (
    <label className="tk-logfield">{label}
      <input
        type="number"
        min="0"
        max={max}
        step="1"
        value={log[name] ?? ''}
        onChange={(event) => onChange(name, event.target.value)}
      />
    </label>
  );

  return (
    <section className="tk-card tk-card-dense" aria-labelledby="health-plan-title">
      <div className="tk-eyebrow">Повний план здоров’я · тиждень {weekIndex + 1}</div>
      <h2 className="tk-h" id="health-plan-title">Сила, аеробна активність, баланс і рухливість</h2>
      <p className="tk-p">
        Силові дні нижче — одна частина плану. Аеробні сесії мають конкретну тривалість та інтенсивність;
        фактичні хвилини можна записувати в журналі за бажанням.
      </p>
      <div className="tk-health-grid">
        <div className="tk-health-item">
          <b>Аеробна активність</b>
          <span>150–300 хв помірної або 75–150 хв високої інтенсивності на тиждень; план підводить до цієї цілі поступово.</span>
        </div>
        <div className="tk-health-item">
          <b>Силова робота</b>
          <span>{profile.days} заплановані дні на тиждень. Залишай щонайменше один день відновлення між навантаженнями на ті самі групи.</span>
        </div>
        <div className="tk-health-item">
          <b>Баланс</b>
          <span>{targets.balanceSessions} короткі сесії по 10–15 хв на тиждень{targets.needsBalancePriority ? ' — це пріоритет через вік або потребу в опорі' : ''}. Виконуй біля стійкої опори.</span>
        </div>
        <div className="tk-health-item">
          <b>Рухливість</b>
          <span>2 короткі сесії по 10 хв. Це доповнення для комфортного діапазону руху, а не заміна силової чи аеробної роботи.</span>
        </div>
      </div>
      <h3 className="tk-subhead">Аеробний розклад</h3>
      <div className="tk-aerobic-grid">
        {progress.sessions.map((session, index) => (
          <div className="tk-health-item" key={session.id}>
            <b>Сесія {index + 1} · {session.activity}</b>
            <span>{session.minutes} хв · помірна інтенсивність. {session.cue}</span>
            {showJournal && field(session.id, 'Фактично, хв', 300)}
          </div>
        ))}
      </div>
      <p className="tk-hint">
        Критерій переходу: якщо виконав щонайменше 80% плану без погіршення самопочуття, переходь до наступного тижня.
        Якщо ні — повтори поточну тривалість. Високоінтенсивні інтервали не додаються автоматично.
      </p>
      {showJournal && (
        <>
          <div className="tk-log tk-health-log">
            {field('moderateMinutes', 'Помірна активність, хв')}
            {field('vigorousMinutes', 'Інша висока активність, хв')}
            {field('balanceSessions', 'Сесії балансу', 14)}
            {field('mobilitySessions', 'Сесії рухливості', 14)}
          </div>
          <div className="tk-progress-list">
            <div>
              <span>Аеробна ціль: {progress.aerobic}/{targets.aerobicMinimum} еквівалентних хвилин</span>
              <progress max="100" value={progress.aerobicPercent}>{progress.aerobicPercent}%</progress>
            </div>
            <div>
              <span>Баланс: {progress.balance}/{targets.balanceSessions} сесій</span>
              <progress max="100" value={progress.balancePercent}>{progress.balancePercent}%</progress>
            </div>
            <div>
              <span>Рухливість: {progress.mobility}/{targets.mobilitySessions} сесій</span>
              <progress max="100" value={progress.mobilityPercent}>{progress.mobilityPercent}%</progress>
            </div>
          </div>
        </>
      )}
      <p className="tk-hint">Висока інтенсивність рахується приблизно ×2. Зупинись при болю у грудях, непритомності, незвичній задишці чи запамороченні.</p>
    </section>
  );
}