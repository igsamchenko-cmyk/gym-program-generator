export type Adaptation = {
  level: 'normal' | 'reduce' | 'recover';
  setFactor: number;
  loadFactor: number;
  message: string;
};

type Session = {
  readiness?: number;
  sessionRpe?: number;
  exercises?: Array<{ pain?: number }>;
};

const hasPain = (session: Session) => (session.exercises || []).some((exercise) => Number(exercise.pain) >= 4);

export function trainingAdaptation(history: Session[] = []): Adaptation {
  const recent = history.slice(-2);
  if (!recent.length) return { level: 'normal', setFactor: 1, loadFactor: 1, message: 'Недостатньо завершених сесій для автоматичної корекції.' };
  const redFlags = recent.filter((session) => Number(session.readiness) <= 2 || Number(session.sessionRpe) >= 9 || hasPain(session)).length;
  if (redFlags >= 2) {
    return {
      level: 'recover', setFactor: 0.65, loadFactor: 0.85,
      message: 'Дві сесії поспіль мають низьку готовність, дуже високий RPE або біль ≥4/10. Наступну сесію автоматично полегшено; біль потребує окремої оцінки.',
    };
  }
  if (redFlags === 1) {
    return {
      level: 'reduce', setFactor: 0.8, loadFactor: 0.9,
      message: 'Остання сесія вказує на підвищену втому або біль. Наступне тренування отримало консервативне зменшення обсягу й ваги.',
    };
  }
  return { level: 'normal', setFactor: 1, loadFactor: 1, message: 'Останні записи не потребують автоматичного зменшення навантаження.' };
}
