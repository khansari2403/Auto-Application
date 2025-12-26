export interface MonitoringConfig {
  userId: number;
  checkIntervalMinutes: number;
  isActive: boolean;
}

let monitoringIntervals: Map<number, NodeJS.Timeout> = new Map();

export function startEmailMonitoring(config: MonitoringConfig, accessToken: string): void {
  if (monitoringIntervals.has(config.userId)) {
    console.log('Email monitoring already active');
    return;
  }
  console.log('Starting email monitoring');
  const interval = setInterval(() => {
    console.log('Checking emails');
  }, config.checkIntervalMinutes * 60 * 1000);
  monitoringIntervals.set(config.userId, interval);
}

export function stopEmailMonitoring(userId: number): void {
  const interval = monitoringIntervals.get(userId);
  if (interval) {
    clearInterval(interval);
    monitoringIntervals.delete(userId);
    console.log('Stopped email monitoring');
  }
}

export function getMonitoringStatus(userId: number): boolean {
  return monitoringIntervals.has(userId);
}

export function stopAllMonitoring(): void {
  monitoringIntervals.forEach((interval) => clearInterval(interval));
  monitoringIntervals.clear();
}