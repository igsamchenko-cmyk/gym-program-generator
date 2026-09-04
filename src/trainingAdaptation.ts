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
  const isFlagged = (session: Session) => Number(session.readiness) <= 2 || Number(session.sessionRpe) >= 9 || hasPain(session);
  if (!isFlagged(recent.at(-1)!)) {
    return { level: 'normal', setFactor: 1, loadFactor: 1, message: 'Остання сесія не потребує автоматичного зменшення навантаження.' };
  }
  if (recent.length === 2 && recent.every(isFlagged)) {
    return {
      level: 'recover', setFactor: 0.65, loadFactor: 0.85,
      message: 'Дві сесії поспіль мають низьку готовність, дуже високий RPE або біль ≥4/10. Лише конкретну наступну сесію автоматично полегшено; біль потребує окремої оцінки.',
    };
  }
  return {
    level: 'reduce', setFactor: 0.8, loadFactor: 0.9,
    message: 'Остання сесія вказує на підвищену втому або біль. Лише конкретну наступну сесію буде консервативно полегшено.',
  };
}
