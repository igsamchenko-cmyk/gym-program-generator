import { healthProgress } from '../healthPlan.ts';

export default function HealthPlanPanel({ profile, log = {}, onChange }) {
  const progress = healthProgress(profile, log);
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
      <div className="tk-eyebrow">Повний план здоров’я · поточний тиждень</div>
      <h2 className="tk-h" id="health-plan-title">Сила, аеробна активність, баланс і рухливість</h2>
      <p className="tk-p">
        Силові дні нижче — лише одна частина плану. Записуй додаткову активність за тиждень;
        хвилина високої інтенсивності рахується приблизно як дві хвилини помірної.
      </p>
      <div className="tk-health-grid">
        <div className="tk-health-item">
          <b>Аеробна активність</b>
          <span>150–300 хв помірної або 75–150 хв високої інтенсивності, чи їх поєднання. Практичний старт: 30 хв × 5 днів.</span>
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
          <span>2 короткі сесії по 10 хв. Це практичне доповнення для комфортного діапазону руху, а не заміна силової чи аеробної роботи.</span>
        </div>
      </div>
      <div className="tk-log tk-health-log">
        {field('moderateMinutes', 'Помірна активність, хв')}
        {field('vigorousMinutes', 'Висока активність, хв')}
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
      <p className="tk-hint">Помірна інтенсивність: можеш говорити, але не співати. Висока: можеш сказати лише кілька слів без паузи на вдих.</p>
    </section>
  );
}
