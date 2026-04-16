import { format, subDays } from 'date-fns';
import { AppState, CBTTask, DBASResult, PSQIResult, SleepLog, UserData } from '../types';
import { calculateSleepEfficiency } from '../lib/sleep';

function buildSleepLog(
  date: string,
  bedTime: string,
  fallAsleepTime: string,
  wakeTime: string,
  getUpTime: string,
  wakeCount: number,
  wakeDuration: number,
  sleepQuality: number,
  daytimeSleepiness: number,
  note?: string,
): SleepLog {
  return {
    id: `log_${date}`,
    date,
    bedTime,
    fallAsleepTime,
    wakeTime,
    getUpTime,
    wakeCount,
    wakeDuration,
    sleepQuality,
    daytimeSleepiness,
    efficiency: calculateSleepEfficiency({
      date,
      bedTime,
      fallAsleepTime,
      wakeTime,
      getUpTime,
      wakeDuration,
    }),
    note,
  };
}

function buildTask(
  id: string,
  date: string,
  type: CBTTask['type'],
  title: string,
  description: string,
  estimatedMinutes: number,
  rationale: string,
  completed = false,
  source: CBTTask['source'] = 'rules',
): CBTTask {
  return {
    id,
    date,
    type,
    title,
    description,
    estimatedMinutes,
    rationale,
    completed,
    source,
    feedback: completed
      ? {
          rating: 4,
          difficulty: 3,
          helpfulness: 4,
          willingness: 'yes',
          completedAt: `${date}T20:30:00`,
        }
      : undefined,
  };
}

export function createEmptyUserData(today = new Date()): UserData {
  return {
    sleepLogs: [],
    dbasResults: [],
    psqiResults: [],
    physiologicalData: [],
    tasks: [],
    treatmentPhase: {
      phase: 'assessment',
      startDate: format(today, 'yyyy-MM-dd'),
      currentWeek: 1,
      goals: ['连续记录 3 至 7 晚睡眠', '完成 PSQI 与 DBAS 评估', '建立固定起床时间'],
    },
    preferences: {
      reminders: true,
      notificationTime: '21:00',
      language: 'zh',
      dataSharing: false,
    },
  };
}

export function createDemoUserData(referenceDate = new Date()): UserData {
  const dates = Array.from({ length: 9 }, (_, index) =>
    format(subDays(referenceDate, 8 - index), 'yyyy-MM-dd'),
  );

  const sleepLogs = [
    buildSleepLog(dates[0], '23:40', '00:20', '06:45', '07:10', 2, 35, 2, 4, '睡前仍反复想第二天状态。'),
    buildSleepLog(dates[1], '23:35', '00:10', '06:40', '07:05', 2, 30, 3, 4),
    buildSleepLog(dates[2], '23:25', '23:55', '06:50', '07:05', 1, 20, 3, 3),
    buildSleepLog(dates[3], '23:20', '23:45', '06:55', '07:10', 1, 15, 3, 3),
    buildSleepLog(dates[4], '23:15', '23:40', '06:55', '07:05', 1, 15, 4, 3),
    buildSleepLog(dates[5], '23:10', '23:35', '07:00', '07:10', 1, 10, 4, 2),
    buildSleepLog(dates[6], '23:05', '23:30', '07:00', '07:08', 1, 10, 4, 2),
    buildSleepLog(dates[7], '23:00', '23:25', '07:02', '07:10', 1, 8, 4, 2),
    buildSleepLog(dates[8], '23:00', '23:20', '07:05', '07:12', 0, 0, 4, 2, '昨晚入睡更顺，白天状态平稳。'),
  ];

  const dbasResults: DBASResult[] = [
    {
      date: dates[8],
      totalScore: 4.1,
      subScores: {
        consequences: 4.8,
        worry: 4.4,
        expectations: 3.9,
        medication: 2.4,
      },
      responses: {},
    },
    {
      date: dates[1],
      totalScore: 4.6,
      subScores: {
        consequences: 5.2,
        worry: 4.8,
        expectations: 4.1,
        medication: 2.7,
      },
      responses: {},
    },
  ];

  const psqiResults: PSQIResult[] = [
    {
      date: dates[8],
      totalScore: 8,
      components: {
        quality: 1,
        latency: 2,
        duration: 1,
        efficiency: 2,
        disturbances: 1,
        medication: 0,
        dysfunction: 1,
      },
      responses: {
        bedTime: '23:10',
        fallAsleepTime: '23:45',
        wakeTime: '06:55',
        getUpTime: '07:10',
        actualSleepHours: 6.8,
      },
    },
    {
      date: dates[0],
      totalScore: 10,
      components: {
        quality: 2,
        latency: 2,
        duration: 1,
        efficiency: 2,
        disturbances: 2,
        medication: 0,
        dysfunction: 1,
      },
      responses: {
        bedTime: '23:40',
        fallAsleepTime: '00:20',
        wakeTime: '06:45',
        getUpTime: '07:10',
        actualSleepHours: 6,
      },
    },
  ];

  const tasks: CBTTask[] = [
    buildTask(
      `task_${dates[8]}_1`,
      dates[8],
      'behavioral',
      '固定起床时间',
      '明早按照固定时间起床，不因昨晚睡得较少而赖床补觉。',
      10,
      '近 7 天睡眠效率仍处于恢复阶段，先稳定起床时间有助于提升睡眠驱动力。',
      false,
    ),
    buildTask(
      `task_${dates[8]}_2`,
      dates[8],
      'cognitive',
      '记录替代想法',
      '把“今晚睡不好明天就撑不住”的想法，改写成 2 条更平衡的说法。',
      15,
      '最近 DBAS 中“睡眠后果担忧”仍是最高维度，今天优先做认知重建。',
      false,
    ),
    buildTask(
      `task_${dates[8]}_3`,
      dates[8],
      'relaxation',
      '睡前呼吸放松',
      '睡前 30 分钟做 6 轮缓慢呼吸练习，呼气时间略长于吸气。',
      12,
      '目前入睡速度仍未完全稳定，继续降低睡前唤醒水平会更有帮助。',
      true,
    ),
  ];

  return {
    sleepLogs,
    dbasResults,
    psqiResults,
    physiologicalData: [],
    tasks,
    treatmentPhase: {
      phase: 'intensive',
      startDate: dates[0],
      currentWeek: 2,
      goals: ['将近 7 天睡眠效率提升至 85% 以上', '降低入睡相关担忧', '维持固定起床时间'],
    },
    preferences: {
      reminders: true,
      notificationTime: '21:00',
      language: 'zh',
      dataSharing: false,
    },
  };
}

export function createInitialAppState(): AppState {
  return {
    setupComplete: false,
    dataMode: 'unset',
  };
}
