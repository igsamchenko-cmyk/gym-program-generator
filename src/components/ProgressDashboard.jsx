import { historySummary } from '../journalAnalytics.ts';

const formatDate = (value) => {
  try { return new Intl.DateTimeFormat('uk-UA', { day: '2-digit', month: '2-digit' }).format(new Date(value)); }
  catch { return '—'; }
};

export default function ProgressDashboard({ history = [] }) {
  const summary = historySummary(history);
  if (!summary.sessions) {
    return (
      <section className="tk-card" aria-labelledby="progress-title">
        <div className="tk-eyebrow">Історія та тренди</div>
        <h2 className="tk-h" id="progress-title">Прогрес з’явиться після завершення сесії</h2>
        <p className="tk-p" style={{ marginBottom: 0 }}>
          Заповни фактичні підходи й натисни «Завершити та зберегти сесію». Історія не стирається при створенні іншого варіанта програми.
        </p>
      </section>
    );
  }

  return (
    <section className="tk-card" aria-labelledby="progress-title">
      <div className="tk-eyebrow">Історія та тренди · останні 12 сесій</div>
      <h2 className="tk-h" id="progress-title">{summary.sessions} завершених тренувань</h2>
      <div className="tk-stat-grid">
        <div><b>{summary.averageRpe ?? '—'}</b><span>середній session-RPE</span></div>
        <div><b>{summary.averageReadiness ?? '—'}</b><span>середня готовність</span></div>
        <div><b>{summary.totalSets}</b><span>виконаних підходів</span></div>
      </div>
      <div className="tk-trend" role="img" aria-label="Тренувальний обсяг останніх сесій">
        {summary.recent.map((session) => {
          const height = session.volume > 0 ? Math.max(8, Math.round(session.volume / summary.maxVolume * 100)) : 5;
          return (
            <div className="tk-trend-col" key={session.id} title={session.dayName + ': ' + session.volume + ' кг·повт'}>
              <span className="tk-trend-value">{session.volume || '•'}</span>
              <i style={{ height: height + '%' }} />
              <small>{formatDate(session.completedAt)}</small>
            </div>
          );
        })}
      </div>
      <p className="tk-hint" style={{ marginBottom: 0 }}>
        Стовпчики показують тоннаж лише для підходів із заповненими вагою та повторами. Для вправ із вагою тіла орієнтуйся також на кількість підходів, RIR і session-RPE.
      </p>
    </section>
  );
}
