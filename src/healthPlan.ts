export type HealthProfile = {
  age?: number;
  balance?: 'steady' | 'support' | string;
};

export type HealthWeekLog = {
  moderateMinutes?: number;
  vigorousMinutes?: number;
  balanceSessions?: number;
  mobilitySessions?: number;
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

export function aerobicEquivalent(log: HealthWeekLog = {}): number {
  return Math.round(finiteNonNegative(log.moderateMinutes) + finiteNonNegative(log.vigorousMinutes) * 2);
}

export function healthProgress(profile: HealthProfile = {}, log: HealthWeekLog = {}) {
  const targets = healthTargets(profile);
  const aerobic = aerobicEquivalent(log);
  const balance = finiteNonNegative(log.balanceSessions);
  const mobility = finiteNonNegative(log.mobilitySessions);
  return {
    targets,
    aerobic,
    balance,
    mobility,
    aerobicPercent: Math.min(100, Math.round(aerobic / targets.aerobicMinimum * 100)),
    balancePercent: Math.min(100, Math.round(balance / targets.balanceSessions * 100)),
    mobilityPercent: Math.min(100, Math.round(mobility / targets.mobilitySessions * 100)),
  };
}

export function healthWeekKey(weekIndex: number): string {
  return `health:${Math.max(0, Math.round(finiteNonNegative(weekIndex)))}`;
}
