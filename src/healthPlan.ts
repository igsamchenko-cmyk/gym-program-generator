export type HealthProfile = {
  age?: number;
  balance?: 'steady' | 'support' | string;
  level?: 'beg' | 'int' | 'adv' | string;
};

export type HealthWeekLog = {
  moderateMinutes?: number;
  vigorousMinutes?: number;
  balanceSessions?: number;
  mobilitySessions?: number;
  [key: string]: number | undefined;
};

export type AerobicSession = {
  id: string;
  activity: string;
  minutes: number;
  intensity: 'moderate' | 'vigorous';
  cue: string;
};

export type HealthTargets = {
  aerobicMinimum: number;
  aerobicUpper: number;
  vigorousMinimum: number;
  vigorousUpper: number;
  balanceSessions: number;
  mobilitySessions: number;
  needsBalancePriority: boolean;
};

const finiteNonNegative = (value: unknown): number => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
};

export function healthTargets(profile: HealthProfile = {}): HealthTargets {
  const needsBalancePriority = finiteNonNegative(profile.age) >= 65 || profile.balance === 'support';
  return {
    aerobicMinimum: 150,
    aerobicUpper: 300,
    vigorousMinimum: 75,
    vigorousUpper: 150,
    balanceSessions: needsBalancePriority ? 3 : 2,
    mobilitySessions: 2,
    needsBalancePriority,
  };
}

export function aerobicSchedule(profile: HealthProfile = {}, weekIndex = 0): AerobicSession[] {
  const week = Math.max(0, Math.round(finiteNonNegative(weekIndex)));
  const beginner = profile.level === 'beg';
  const base = beginner ? 20 : 25;
  const minutes = Math.min(40, base + Math.min(4, week) * 5);
  const count = beginner && week < 2 ? 4 : 5;
  const options = ['Швидка ходьба', 'Велотренажер або велосипед', 'Плавання чи еліпс', 'Швидка ходьба', 'Будь-яка комфортна циклічна активність'];
  return Array.from({ length: count }, (_, index) => ({
    id: 'aerobicSession' + index,
    activity: options[index],
    minutes,
    intensity: 'moderate',
    cue: 'Темп розмови: можеш говорити реченнями, але не співати. Заверши раніше, якщо з’являються тривожні симптоми.',
  }));
}

export function aerobicEquivalent(log: HealthWeekLog = {}, sessions: AerobicSession[] = []): number {
  const sessionMinutes = sessions.reduce((sum, session) => {
    const minutes = finiteNonNegative(log[session.id]);
    return sum + minutes * (session.intensity === 'vigorous' ? 2 : 1);
  }, 0);
  return Math.round(sessionMinutes + finiteNonNegative(log.moderateMinutes) + finiteNonNegative(log.vigorousMinutes) * 2);
}

export function healthProgress(profile: HealthProfile = {}, log: HealthWeekLog = {}, weekIndex = 0) {
  const targets = healthTargets(profile);
  const sessions = aerobicSchedule(profile, weekIndex);
  const aerobic = aerobicEquivalent(log, sessions);
  const balance = finiteNonNegative(log.balanceSessions);
  const mobility = finiteNonNegative(log.mobilitySessions);
  return {
    targets,
    sessions,
    aerobic,
    balance,
    mobility,
    aerobicPercent: Math.min(100, Math.round(aerobic / targets.aerobicMinimum * 100)),
    balancePercent: Math.min(100, Math.round(balance / targets.balanceSessions * 100)),
    mobilityPercent: Math.min(100, Math.round(mobility / targets.mobilitySessions * 100)),
  };
}

export function healthWeekKey(weekIndex: number): string {
  return 'health:' + Math.max(0, Math.round(finiteNonNegative(weekIndex)));
}