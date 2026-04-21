import { format, subDays } from 'date-fns';
import { AppState, CBTTask, DBASResult, NumericScaleResult, PSQIResult, SleepLog, UserData } from '../types';
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
  extras: Partial<SleepLog> = {},
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
    ...extras,
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
    isiResults: [],
    essResults: [],
    gad7Results: [],
    phq9Results: [],
    osaRiskResults: [],
    bipolarRiskResults: [],
    physiologicalData: [],
    tasks: [],
    treatmentPhase: {
      phase: 'assessment',
      startDate: format(today, 'yyyy-MM-dd'),
      currentWeek: 1,
      goals: ['连续记录 3 至 7 晚睡眠', '完成 PSQI 与 DBAS 评估', '建立固定起床时间'],
    },
    riskProfile: {
      insomniaDuration: '',
      onsetTrigger: '',
      psychiatricHistory: [],
      substanceHistory: [],
      chronicPain: false,
      respiratoryRisk: 'low',
      parasomniaRisk: 'low',
      seizureRisk: 'low',
      unstableMedicalCondition: false,
      unstablePsychCondition: false,
      selfHarmRisk: 'low',
      pregnancyOrSpecialPopulation: false,
      priorCBTIExperience: '',
      treatmentPreference: '',
      readinessForBehaviorChange: 'moderate',
    },
    adherenceProfile: {
      adherenceBarriers: [],
      homeworkCompletionRateByModule: {},
      dropoutRisk: 'low',
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
    buildSleepLog(dates[0], '23:40', '00:20', '06:45', '07:10', 2, 35, 2, 4, '睡前仍反复想第二天状态。', {
      napDuration: 45,
      caffeineIntake: 3,
      alcoholIntake: 0,
      nicotineUse: false,
      sleepMedicationUse: false,
      eveningScreenExposure: 85,
      exerciseTiming: 'evening',
      lastHourActivities: ['刷手机', '回复工作消息'],
      bedtimeEmotionArousal: 4,
      preSleepThoughts: ['如果今晚再睡不好，明天门诊状态会崩掉', '必须快点睡着'],
      weekendScheduleDeviation: 90,
      workShiftType: 'regular',
      jetLagOrTravel: false,
      painOrSomaticSymptoms: 2,
      nocturnalEnvironmentIssues: ['卧室偶有噪音'],
    }),
    buildSleepLog(dates[1], '23:35', '00:10', '06:40', '07:05', 2, 30, 3, 4, undefined, {
      napDuration: 30,
      caffeineIntake: 2,
      alcoholIntake: 0,
      eveningScreenExposure: 70,
      exerciseTiming: 'afternoon',
      lastHourActivities: ['刷短视频', '担心第二天状态'],
      bedtimeEmotionArousal: 4,
      preSleepThoughts: ['今晚一定要睡好'],
      weekendScheduleDeviation: 75,
      workShiftType: 'regular',
      painOrSomaticSymptoms: 1,
    }),
    buildSleepLog(dates[2], '23:25', '23:55', '06:50', '07:05', 1, 20, 3, 3, undefined, {
      napDuration: 20,
      caffeineIntake: 2,
      alcoholIntake: 0,
      eveningScreenExposure: 55,
      exerciseTiming: 'afternoon',
      lastHourActivities: ['看手机', '回想工作'],
      bedtimeEmotionArousal: 3,
      preSleepThoughts: ['别又拖太久'],
      weekendScheduleDeviation: 60,
      workShiftType: 'regular',
      painOrSomaticSymptoms: 1,
    }),
    buildSleepLog(dates[3], '23:20', '23:45', '06:55', '07:10', 1, 15, 3, 3, undefined, {
      napDuration: 20,
      caffeineIntake: 2,
      alcoholIntake: 0,
      eveningScreenExposure: 50,
      exerciseTiming: 'afternoon',
      lastHourActivities: ['阅读', '简单放松'],
      bedtimeEmotionArousal: 3,
      preSleepThoughts: ['希望今晚别想太多'],
      weekendScheduleDeviation: 45,
      workShiftType: 'regular',
    }),
    buildSleepLog(dates[4], '23:15', '23:40', '06:55', '07:05', 1, 15, 4, 3, undefined, {
      napDuration: 15,
      caffeineIntake: 1,
      eveningScreenExposure: 40,
      exerciseTiming: 'morning',
      lastHourActivities: ['拉伸', '听放松音频'],
      bedtimeEmotionArousal: 3,
      preSleepThoughts: ['就按计划做'],
      weekendScheduleDeviation: 35,
      workShiftType: 'regular',
    }),
    buildSleepLog(dates[5], '23:10', '23:35', '07:00', '07:10', 1, 10, 4, 2, undefined, {
      napDuration: 10,
      caffeineIntake: 1,
      eveningScreenExposure: 35,
      exerciseTiming: 'morning',
      lastHourActivities: ['呼吸练习', '热水洗漱'],
      bedtimeEmotionArousal: 2,
      preSleepThoughts: ['就算睡得一般，明天也还能工作'],
      weekendScheduleDeviation: 30,
      workShiftType: 'regular',
    }),
    buildSleepLog(dates[6], '23:05', '23:30', '07:00', '07:08', 1, 10, 4, 2, undefined, {
      napDuration: 0,
      caffeineIntake: 1,
      eveningScreenExposure: 25,
      exerciseTiming: 'morning',
      lastHourActivities: ['放松呼吸', '写下替代想法'],
      bedtimeEmotionArousal: 2,
      preSleepThoughts: ['睡意不够就先不急'],
      weekendScheduleDeviation: 20,
      workShiftType: 'regular',
    }),
    buildSleepLog(dates[7], '23:00', '23:25', '07:02', '07:10', 1, 8, 4, 2, undefined, {
      napDuration: 0,
      caffeineIntake: 1,
      eveningScreenExposure: 20,
      exerciseTiming: 'morning',
      lastHourActivities: ['拉伸', '简单记录'],
      bedtimeEmotionArousal: 2,
      preSleepThoughts: ['睡不着就离床'],
      weekendScheduleDeviation: 15,
      workShiftType: 'regular',
    }),
    buildSleepLog(dates[8], '23:00', '23:20', '07:05', '07:12', 0, 0, 4, 2, '昨晚入睡更顺，白天状态平稳。', {
      napDuration: 0,
      caffeineIntake: 1,
      eveningScreenExposure: 20,
      exerciseTiming: 'morning',
      lastHourActivities: ['放松呼吸', '阅读纸质书'],
      bedtimeEmotionArousal: 2,
      preSleepThoughts: ['就算今天睡得一般，也不用拼命逼自己'],
      weekendScheduleDeviation: 10,
      workShiftType: 'regular',
    }),
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

  const isiResults: NumericScaleResult[] = [
    {
      date: dates[8],
      score: 16,
      severity: 'moderate',
      interpretation: '提示存在中度失眠困扰，适合进入规范化 CBT-I 干预流程。',
    },
  ];

  const essResults: NumericScaleResult[] = [
    {
      date: dates[8],
      score: 8,
      severity: 'mild',
      interpretation: '白天嗜睡负担轻到中等，当前仍以失眠维持因素管理为主。',
    },
  ];

  const gad7Results: NumericScaleResult[] = [
    {
      date: dates[8],
      score: 8,
      severity: 'mild',
      interpretation: '存在轻中度焦虑负荷，需在计划中同步关注睡前高唤醒。',
    },
  ];

  const phq9Results: NumericScaleResult[] = [
    {
      date: dates[8],
      score: 6,
      severity: 'mild',
      interpretation: '抑郁负荷轻度，目前未见阻断标准 CBT-I 的明显信号。',
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
      'rules',
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
      'rules',
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
    isiResults,
    essResults,
    gad7Results,
    phq9Results,
    osaRiskResults: [
      {
        date: dates[8],
        riskLevel: 'low',
        score: 1,
        note: '当前未见明显阻塞性睡眠呼吸暂停高风险信号。',
      },
    ],
    bipolarRiskResults: [
      {
        date: dates[8],
        riskLevel: 'low',
        score: 0,
        note: '当前未见明显躁期风险信号。',
      },
    ],
    physiologicalData: [],
    tasks,
    treatmentPhase: {
      phase: 'intensive',
      startDate: dates[0],
      currentWeek: 2,
      goals: ['将近 7 天睡眠效率提升至 85% 以上', '降低入睡相关担忧', '维持固定起床时间'],
    },
    riskProfile: {
      insomniaDuration: '8 个月',
      onsetTrigger: '持续工作压力与家人住院事件后开始反复失眠',
      psychiatricHistory: ['既往焦虑倾向，无明确双相病史'],
      substanceHistory: ['偶尔依赖咖啡提神，无酒精依赖'],
      chronicPain: false,
      respiratoryRisk: 'low',
      parasomniaRisk: 'low',
      seizureRisk: 'low',
      unstableMedicalCondition: false,
      unstablePsychCondition: false,
      selfHarmRisk: 'low',
      pregnancyOrSpecialPopulation: false,
      priorCBTIExperience: '未接受系统 CBT-I',
      treatmentPreference: '愿意尝试行为调整，也希望理解为什么自己总在床上越来越清醒',
      readinessForBehaviorChange: 'high',
    },
    adherenceProfile: {
      taskDifficulty: 3,
      perceivedHelpfulness: 4,
      willingnessToContinue: 'yes',
      adherenceBarriers: ['忙碌时会拖到很晚才开始睡前准备'],
      homeworkCompletionRateByModule: {
        stimulusControl: 70,
        sleepRestriction: 60,
        cognitiveTherapy: 65,
        relaxationTraining: 80,
      },
      dropoutRisk: 'low',
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
