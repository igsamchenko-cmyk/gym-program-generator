import { useState } from 'react';
import { exerciseRecords } from '../coachTools.ts';
import { historySummary } from '../journalAnalytics.ts';

const formatDate = (value) => {
  try { return new Intl.DateTimeFormat('uk-UA', { day: '2-digit', month: '2-digit' }).format(new Date(value)); }
  catch { return '—'; }
};

export default function ProgressDashboard({ history = [], plannedSets = 0, onDelete = () => {} }) {
  const summary = historySummary(history);
  const [referenceTime] = useState(() => Date.now());
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

  const records = exerciseRecords(history).slice(0, 6);
  const fourWeeksAgo = referenceTime - 28 * 24 * 60 * 60 * 1000;
  const attendance = history.filter((session) => new Date(session.completedAt).getTime() >= fourWeeksAgo).length;
  const latest = summary.recent.at(-1);
  const recentActual = latest?.completedSets || 0;
  const recentPlanned = latest?.plannedSets || plannedSets;

  return (
    <section className="tk-card" aria-labelledby="progress-title">
      <div className="tk-eyebrow">Тренерська аналітика · останні 12 сесій</div>
      <h2 className="tk-h" id="progress-title">{summary.sessions} завершених тренувань</h2>
      <div className="tk-stat-grid">
        <div><b>{summary.averageRpe ?? '—'}</b><span>середній session-RPE</span></div>
        <div><b>{summary.averageReadiness ?? '—'}</b><span>середня готовність</span></div>
        <div><b>{summary.totalSets}</b><span>підходів за 12 сесій</span></div>
        <div><b>{attendance}</b><span>відвідувань за 28 днів</span></div>
      </div>
      {recentPlanned > 0 && (
        <p className="tk-plan-fact"><b>План / факт останньої сесії:</b> {recentPlanned} / {recentActual} підходів</p>
      )}
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
      {records.length > 0 && (
        <>
          <h3 className="tk-subhead">Найкращий орієнтовний 1ПМ за вправами</h3>
          <div className="tk-records">
            {records.map((record) => (
              <div key={record.name}><b>{record.name}</b><span>{record.e1rm} кг · {record.weight} × {record.reps}</span></div>
            ))}
          </div>
        </>
      )}
      <details className="tk-history-list">
        <summary>Керувати завершеними сесіями</summary>
        {summary.recent.slice().reverse().map((session) => (
          <div key={session.id}>
            <span>{formatDate(session.completedAt)} · {session.dayName} · {session.completedSets} підходів</span>
            <button type="button" className="tk-mini" onClick={() => onDelete(session.id)}>Видалити помилковий запис</button>
          </div>
        ))}
      </details>
      <p className="tk-hint" style={{ marginBottom: 0 }}>
        Тоннаж враховує підходи із заповненими вагою та повторами. Орієнтовний 1ПМ — розрахункова метрика для порівняння, не команда тестувати максимум.
      </p>
    </section>
  );
}