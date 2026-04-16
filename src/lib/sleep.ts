import { addDays, differenceInMinutes, parseISO } from 'date-fns';
import { SleepLog } from '../types';

function parseSleepDateTime(date: string, time: string) {
  return parseISO(`${date}T${time}`);
}

export function minutesBetweenClockTimes(date: string, startTime: string, endTime: string): number {
  const start = parseSleepDateTime(date, startTime);
  let end = parseSleepDateTime(date, endTime);

  if (end <= start) {
    end = addDays(end, 1);
  }

  return Math.max(0, differenceInMinutes(end, start));
}

export function calculateSleepLatencyMinutes(
  log: Pick<SleepLog, 'date' | 'bedTime' | 'fallAsleepTime'>,
): number {
  return minutesBetweenClockTimes(log.date, log.bedTime, log.fallAsleepTime);
}

export function calculateSleepDurationMinutes(
  log: Pick<SleepLog, 'date' | 'fallAsleepTime' | 'wakeTime' | 'wakeDuration'>,
): number {
  const totalSleep = minutesBetweenClockTimes(log.date, log.fallAsleepTime, log.wakeTime);
  return Math.max(0, totalSleep - (log.wakeDuration || 0));
}

export function calculateTimeInBedMinutes(
  log: Pick<SleepLog, 'date' | 'bedTime' | 'getUpTime'>,
): number {
  return minutesBetweenClockTimes(log.date, log.bedTime, log.getUpTime);
}

export function calculateSleepEfficiency(
  log: Pick<
    SleepLog,
    'date' | 'bedTime' | 'fallAsleepTime' | 'wakeTime' | 'getUpTime' | 'wakeDuration'
  >,
): number {
  const timeInBed = calculateTimeInBedMinutes(log);
  if (timeInBed <= 0) {
    return 0;
  }

  return Math.round((calculateSleepDurationMinutes(log) / timeInBed) * 100);
}

export function formatHoursFromMinutes(minutes: number): string {
  const hours = Math.round((minutes / 60) * 10) / 10;
  return Number.isInteger(hours) ? hours.toFixed(0) : hours.toFixed(1);
}
