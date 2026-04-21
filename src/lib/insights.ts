import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { analysisService } from '../services/analysisEngine';
import { CBTTask, DBASResult, PSQIResult, SleepLog, TreatmentPhase, UserData } from '../types';
import {
  averageClockTime,
  calculateSleepDurationMinutes,
  calculateSleepLatencyMinutes,
  calculateTimeInBedMinutes,
  clockTimeToMinutes,
  formatHoursFromMinutes,
  minutesToClockTime,
} from './sleep';

export interface TreatmentPhaseSummary {
  phase: TreatmentPhase['phase'];
  label: string;
  week: number;
  goals: string[];
  summary: string;
}

export interface HomeSummary {
  totalSleepMinutes: number;
  efficiency: number;
  statusTitle: string;
  statusBody: string;
  tonightWindow: {
    bedTime: string;
    wakeTime: string;
    durationMinutes: number;
  } | null;
  basis: string;
}

export interface WeeklyTrendSummary {
  chartData: Array<{ date: string; efficiency: number }>;
  averageLatency: number | null;
  averageWakeAfterSleepOnset: number | null;
  averageDaytimeSleepiness: number | null;
  explanation: string;
}

export interface AssessmentCardSummary {
  title: string;
  value: string;
  emphasis: string;
  description: string;
}

export interface RecoverySummary {
  averageEfficiency: number | null;
  completionRate: number | null;
  latestDbasChange: number | null;
  latestPsqiChange: number | null;
  currentPhase: string;
  explanation: string;
}

export interface MilestoneItem {
  id: string;
  title: string;
  status: 'done' | 'active' | 'next';
  description: string;
}

export interface SleepHygieneAction {
  id: string;
  category: string;
  title: string;
  description: string;
  reason: string;
}

const PHASE_LABELS: Record<TreatmentPhase['phase'], string> = {
  assessment: '评估与建档期',
  intensive: '核心干预期',
  consolidation: '巩固调整期',
  maintenance: '维持随访期',
};

const DBAS_DIMENSION_LABELS: Record<keyof DBASResult['subScores'], string> = {
  consequences: '睡眠后果担忧',
  worry: '入睡相关担忧',
  expectations: '睡眠预期',
  medication: '药物依赖倾向',
};

const PSQI_COMPONENT_LABELS: Record<keyof PSQIResult['components'], string> = {
  quality: '主观睡眠质量',
  latency: '入睡潜伏期',
  duration: '睡眠时长',
  efficiency: '睡眠效率',
  disturbances: '夜间睡眠干扰',
  medication: '睡眠药物使用',
  dysfunction: '日间功能受损',
};

function round(value: number, digits = 0) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function sortSleepLogs(logs: SleepLog[]) {
  return [...logs].sort((a, b) => a.date.localeCompare(b.date));
}

export function getRecentSleepLogs(userData: UserData, count = 7) {
  return sortSleepLogs(userData.sleepLogs).slice(-count);
}

export function getLatestSleepLog(userData: UserData) {
  const logs = sortSleepLogs(userData.sleepLogs);
  return logs.length > 0 ? logs[logs.length - 1] : null;
}

export function getLatestDbas(userData: UserData) {
  return [...userData.dbasResults].sort((a, b) => b.date.localeCompare(a.date))[0] || null;
}

export function getLatestPsqi(userData: UserData) {
  return [...userData.psqiResults].sort((a, b) => b.date.localeCompare(a.date))[0] || null;
}

export function hasSufficientSleepData(userData: UserData, threshold = 3) {
  return userData.sleepLogs.length >= threshold;
}

export function hasAssessmentData(userData: UserData) {
  return Boolean(getLatestDbas(userData) && getLatestPsqi(userData));
}

export function getDataStatusLabel(mode: 'demo' | 'real') {
  return mode === 'demo' ? '示例数据模式' : '真实记录模式';
}

export function getDataStatusDescription(mode: 'demo' | 'real') {
  return mode === 'demo'
    ? '当前正在展示示例患者数据，可随时切换为真实记录。'
    : '当前展示你的真实记录数据，所有结论均来自已保存内容。';
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getHighestDbasDimension(result: DBASResult | null) {
  if (!result) {
    return null;
  }

  const entry = Object.entries(result.subScores).reduce((highest, current) =>
    current[1] > highest[1] ? current : highest,
  );
  return {
    key: entry[0] as keyof DBASResult['subScores'],
    label: DBAS_DIMENSION_LABELS[entry[0] as keyof DBASResult['subScores']],
    score: entry[1],
  };
}

function getWorstPsqiComponents(result: PSQIResult | null, count = 2) {
  if (!result) {
    return [];
  }

  return Object.entries(result.components)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([key, score]) => ({
      key: key as keyof PSQIResult['components'],
      label: PSQI_COMPONENT_LABELS[key as keyof PSQIResult['components']],
      score,
    }));
}

function buildIssueList(userData: UserData) {
  const recentLogs = getRecentSleepLogs(userData);
  const latestDbas = getLatestDbas(userData);
  const latestPsqi = getLatestPsqi(userData);
  const averageEfficiency = average(recentLogs.map((log) => log.efficiency));
  const averageLatency = average(recentLogs.map((log) => calculateSleepLatencyMinutes(log)));
  const averageWaso = average(recentLogs.map((log) => log.wakeDuration));
  const averageSleepiness = average(recentLogs.map((log) => log.daytimeSleepiness));
  const highestDbas = getHighestDbasDimension(latestDbas);
  const worstPsqi = getWorstPsqiComponents(latestPsqi, 1)[0];

  return [
    averageEfficiency !== null && averageEfficiency < 85
      ? `近 7 天睡眠效率约为 ${round(averageEfficiency)}%，仍低于 85% 目标。`
      : null,
    averageLatency !== null && averageLatency > 30
      ? `近 7 天平均入睡潜伏期约 ${round(averageLatency)} 分钟，入睡仍偏慢。`
      : null,
    averageWaso !== null && averageWaso > 30
      ? `夜间清醒时间平均约 ${round(averageWaso)} 分钟，夜间觉醒仍需关注。`
      : null,
    averageSleepiness !== null && averageSleepiness >= 3
      ? `白天困倦评分平均 ${round(averageSleepiness, 1)} / 5，提示日间恢复仍不足。`
      : null,
    highestDbas && highestDbas.score >= 4
      ? `${highestDbas.label}仍偏高，说明睡前担忧或预期仍在影响睡眠。`
      : null,
    worstPsqi && worstPsqi.score >= 2
      ? `PSQI 中最受影响的维度是${worstPsqi.label}。`
      : null,
  ].filter(Boolean) as string[];
}

export function resolveTreatmentPhase(userData: UserData): TreatmentPhaseSummary {
  const logs = sortSleepLogs(userData.sleepLogs);
  const bundle = analysisService.buildAnalysisBundle(userData);
  const today = new Date();
  const anchorDate = logs[0]?.date || userData.treatmentPhase.startDate || format(today, 'yyyy-MM-dd');
  const week = Math.max(1, Math.floor(differenceInCalendarDays(today, parseISO(anchorDate)) / 7) + 1);
  const stage = bundle.treatmentPlan.stage;
  const phaseMap: Record<string, TreatmentPhase['phase']> = {
    '失眠临床评估': 'assessment',
    '个案概念化': 'assessment',
    '阶段化治疗计划': 'intensive',
    '逐周复盘与调参': 'consolidation',
    '巩固与复发预防': 'maintenance',
    '暂缓进入标准 CBT-I': 'assessment',
  };
  const phase = phaseMap[stage] || 'assessment';
  const goals =
    bundle.treatmentPlan.goals.length > 0
      ? bundle.treatmentPlan.goals
      : bundle.screening.redirectRecommendation
        ? [bundle.screening.redirectRecommendation]
        : ['继续记录睡眠与评估结果，等待更多数据后再细化治疗方案'];

  const summary = !bundle.screening.eligibleForStandardCBTI
    ? bundle.screening.redirectRecommendation || '当前以进一步评估和风险筛查为主。'
    : `${bundle.weeklyReview.weekSummary} ${bundle.caseConceptualization.summaryText}`;

  return {
    phase,
    label: stage,
    week,
    goals: goals.slice(0, 3),
    summary,
  };
}

export function getTonightWindow(userData: UserData) {
  const recentLogs = getRecentSleepLogs(userData, 7);
  if (recentLogs.length < 3) {
    return null;
  }

  const wakeTime = averageClockTime(recentLogs.map((log) => log.getUpTime), 'day');
  const averageSleepMinutes = average(recentLogs.map((log) => calculateSleepDurationMinutes(log)));

  if (!wakeTime || !averageSleepMinutes) {
    return null;
  }

  const targetWindow = Math.min(8 * 60, Math.max(5 * 60, averageSleepMinutes + 30));
  const wakeMinutes = clockTimeToMinutes(wakeTime);

  return {
    wakeTime,
    bedTime: minutesToClockTime(wakeMinutes - targetWindow),
    durationMinutes: round(targetWindow),
  };
}

export function getHomeSummary(userData: UserData): HomeSummary | null {
  const latestLog = getLatestSleepLog(userData);
  if (!latestLog) {
    return null;
  }

  const bundle = analysisService.buildAnalysisBundle(userData);
  const totalSleepMinutes = calculateSleepDurationMinutes(latestLog);
  const tonightWindow = getTonightWindow(userData);

  let statusTitle = '本周仍在调整中';
  let statusBody = bundle.weeklyReview.weekSummary;

  if (!bundle.screening.eligibleForStandardCBTI) {
    statusTitle = '先完成进一步评估';
    statusBody =
      bundle.screening.redirectRecommendation || '当前先不要直接进入标准 CBT-I，请继续补充评估信息。';
  } else if ((bundle.assessment.weeklyAverages.avgSE7d || 0) >= 85 && latestLog.sleepQuality >= 4) {
    statusTitle = '恢复正在趋稳';
    statusBody = '近 7 天睡眠效率已接近目标，本周重点转为巩固节律与复发预防。';
  } else if ((bundle.assessment.weeklyAverages.avgWASO7d || 0) > 30) {
    statusTitle = '夜间清醒仍偏长';
    statusBody = '本周更适合把注意力放在刺激控制和固定起床时间上，先减少在床清醒。';
  } else if ((bundle.assessment.weeklyAverages.avgSleepLatency7d || 0) > 30) {
    statusTitle = '入睡阶段仍较吃力';
    statusBody = '本周重点不是逼自己快睡着，而是降低睡前高唤醒并减少努力性入睡。';
  }

  return {
    totalSleepMinutes,
    efficiency: latestLog.efficiency,
    statusTitle,
    statusBody,
    tonightWindow,
    basis: hasAssessmentData(userData)
      ? '基于近 7 天睡眠记录、最新量表与本周治疗计划生成'
      : '基于当前睡眠记录生成，补齐量表后可获得更完整解释',
  };
}

function describeTrend(values: number[]) {
  if (values.length < 4) {
    return 'stable';
  }

  const midpoint = Math.floor(values.length / 2);
  const first = average(values.slice(0, midpoint)) || 0;
  const second = average(values.slice(midpoint)) || 0;
  const change = second - first;

  if (change > 2) {
    return 'up';
  }
  if (change < -2) {
    return 'down';
  }
  return 'stable';
}

export function getWeeklyTrendSummary(userData: UserData): WeeklyTrendSummary {
  const recentLogs = getRecentSleepLogs(userData, 7);
  const bundle = analysisService.buildAnalysisBundle(userData);
  if (recentLogs.length === 0) {
    return {
      chartData: [],
      averageLatency: null,
      averageWakeAfterSleepOnset: null,
      averageDaytimeSleepiness: null,
      explanation: '连续记录至少 3 晚睡眠后，这里会开始展示趋势与解释。',
    };
  }

  const averageLatency = average(recentLogs.map((log) => calculateSleepLatencyMinutes(log)));
  const averageWakeAfterSleepOnset = average(recentLogs.map((log) => log.wakeDuration));
  const averageDaytimeSleepiness = average(recentLogs.map((log) => log.daytimeSleepiness));
  const trend = describeTrend(recentLogs.map((log) => log.efficiency));
  const averageEfficiency = average(recentLogs.map((log) => log.efficiency)) || 0;

  let explanation =
    trend === 'up'
      ? '最近的睡眠效率正在回升，说明你的睡眠节律正在逐步稳定。'
      : trend === 'down'
        ? '最近的睡眠效率波动偏大，建议优先守住固定起床时间和任务执行节律。'
        : '最近一周的睡眠效率整体较平稳，接下来重点观察入睡和夜间清醒环节。';

  if (!bundle.screening.eligibleForStandardCBTI) {
    explanation = bundle.screening.redirectRecommendation || '当前先补齐评估，再决定是否进入标准 CBT-I。';
  } else if ((averageWakeAfterSleepOnset || 0) > 30) {
    explanation += ' 目前夜间清醒时间仍偏长，是下一步最值得优先处理的部分。';
  } else if ((averageLatency || 0) > 30) {
    explanation += ' 目前主要压力仍在入睡阶段，可继续减少睡前担忧和在床清醒时间。';
  } else if (averageEfficiency >= 85) {
    explanation += ' 你最近的睡眠效率已经接近目标，适合继续巩固当前做法。';
  }

  return {
    chartData: recentLogs.map((log) => ({
      date: format(parseISO(log.date), 'MM/dd'),
      efficiency: log.efficiency,
    })),
    averageLatency: averageLatency ? round(averageLatency) : null,
    averageWakeAfterSleepOnset: averageWakeAfterSleepOnset
      ? round(averageWakeAfterSleepOnset)
      : null,
    averageDaytimeSleepiness: averageDaytimeSleepiness ? round(averageDaytimeSleepiness, 1) : null,
    explanation,
  };
}

export function getTaskCompletionRate(userData: UserData) {
  if (userData.tasks.length === 0) {
    return null;
  }

  const completed = userData.tasks.filter((task) => task.completed).length;
  return round((completed / userData.tasks.length) * 100);
}

export function getPlanExplanation(userData: UserData) {
  const bundle = analysisService.buildAnalysisBundle(userData);

  if (!bundle.screening.eligibleForStandardCBTI) {
    return bundle.screening.redirectRecommendation || '当前先补齐评估与风险筛查，再决定是否进入标准 CBT-I。';
  }

  const primary = bundle.treatmentPlan.primaryModules.map((item) => item.title).join(' + ');
  const firstTarget = bundle.caseConceptualization.currentPriorityTargets[0];

  if (primary && firstTarget) {
    return `本周先用 ${primary} 处理“${firstTarget}”，因为它仍是当前最主要的维持因素。`;
  }

  if (primary) {
    return `本周先把 ${primary} 执行稳定，再根据近 7 天平均睡眠效率决定下周是否调参。`;
  }

  return bundle.caseConceptualization.summaryText;
}

export function getAssessmentSummaries(userData: UserData) {
  const latestDbas = getLatestDbas(userData);
  const latestPsqi = getLatestPsqi(userData);
  const highestDbas = getHighestDbasDimension(latestDbas);
  const worstPsqi = getWorstPsqiComponents(latestPsqi, 2);

  const dbasSummary: AssessmentCardSummary = latestDbas
    ? {
        title: 'DBAS 睡眠信念评估',
        value: latestDbas.totalScore.toFixed(1),
        emphasis: highestDbas ? `当前最高维度：${highestDbas.label}` : '已完成评估',
        description: highestDbas
          ? `最近一次评估提示 ${highestDbas.label} 仍偏高，可作为认知重建的重点。`
          : '已完成评估，可结合任务计划持续观察变化。',
      }
    : {
        title: 'DBAS 睡眠信念评估',
        value: '未完成',
        emphasis: '建议尽快完成首次评估',
        description: '用于了解患者对睡眠的担忧模式，为认知重建提供参考。',
      };

  const psqiSummary: AssessmentCardSummary = latestPsqi
    ? {
        title: 'PSQI 睡眠质量评估',
        value: String(latestPsqi.totalScore),
        emphasis:
          worstPsqi.length > 0
            ? `优先关注：${worstPsqi.map((item) => item.label).join('、')}`
            : '已完成评估',
        description:
          worstPsqi.length > 0
            ? `最近一次评估中，${worstPsqi.map((item) => item.label).join('、')}受影响更明显。`
            : '已完成评估，可继续结合睡眠记录观察变化。',
      }
    : {
        title: 'PSQI 睡眠质量评估',
        value: '未完成',
        emphasis: '建议尽快完成首次评估',
        description: '用于评估过去一个月的整体睡眠质量与主要受损维度。',
      };

  return { dbasSummary, psqiSummary };
}

export function getRecoverySummary(userData: UserData): RecoverySummary {
  const recentLogs = getRecentSleepLogs(userData, 7);
  const latestDbas = getLatestDbas(userData);
  const latestPsqi = getLatestPsqi(userData);
  const oldestDbas = userData.dbasResults[userData.dbasResults.length - 1];
  const oldestPsqi = userData.psqiResults[userData.psqiResults.length - 1];
  const phase = resolveTreatmentPhase(userData);
  const averageEfficiency = average(recentLogs.map((log) => log.efficiency));
  const completionRate = getTaskCompletionRate(userData);
  const latestDbasChange =
    latestDbas && oldestDbas && latestDbas.date !== oldestDbas.date
      ? round(latestDbas.totalScore - oldestDbas.totalScore, 1)
      : null;
  const latestPsqiChange =
    latestPsqi && oldestPsqi && latestPsqi.date !== oldestPsqi.date
      ? latestPsqi.totalScore - oldestPsqi.totalScore
      : null;

  let explanation = '继续累积记录后，这里会更完整地解释恢复趋势。';
  if (averageEfficiency !== null && completionRate !== null) {
    if (averageEfficiency >= 85 && completionRate >= 60) {
      explanation = '近 7 天睡眠效率与任务执行都较稳定，当前更适合做巩固与复发预防。';
    } else if (averageEfficiency < 85 && completionRate >= 60) {
      explanation = '任务执行相对稳定，但睡眠效率仍未达目标，建议继续强化核心干预。';
    } else if (completionRate < 60) {
      explanation = '当前最需要先提高任务执行稳定性，系统建议先从更容易完成的任务开始。';
    }
  }

  return {
    averageEfficiency: averageEfficiency ? round(averageEfficiency) : null,
    completionRate,
    latestDbasChange,
    latestPsqiChange,
    currentPhase: phase.label,
    explanation,
  };
}

export function getMilestones(userData: UserData): MilestoneItem[] {
  const recovery = getRecoverySummary(userData);
  const latestDbas = getLatestDbas(userData);
  const latestPsqi = getLatestPsqi(userData);

  return [
    {
      id: 'baseline',
      title: '完成基础建档',
      status: hasSufficientSleepData(userData, 3) && hasAssessmentData(userData) ? 'done' : 'active',
      description: '完成睡眠记录与两项基础测评，明确干预重点。',
    },
    {
      id: 'efficiency',
      title: '睡眠效率接近目标',
      status: (recovery.averageEfficiency || 0) >= 85 ? 'done' : hasSufficientSleepData(userData, 3) ? 'active' : 'next',
      description: '目标为近 7 天平均睡眠效率达到 85% 以上。',
    },
    {
      id: 'cognition',
      title: '降低睡前担忧',
      status:
        latestDbas && latestDbas.totalScore < 3.5
          ? 'done'
          : latestDbas
            ? 'active'
            : 'next',
      description: '通过认知重建减少“睡不好就会失控”这类高压想法。',
    },
    {
      id: 'quality',
      title: '改善整体睡眠质量',
      status:
        latestPsqi && latestPsqi.totalScore < 5
          ? 'done'
          : latestPsqi
            ? 'active'
            : 'next',
      description: '结合日志、任务与量表，逐步降低 PSQI 总分。',
    },
  ];
}

const HYGIENE_LIBRARY: SleepHygieneAction[] = [
  {
    id: 'env_dark',
    category: '睡眠环境',
    title: '降低卧室光线与噪音',
    description: '睡前一小时尽量关闭强光屏幕，必要时使用遮光和白噪音辅助。',
    reason: '夜间刺激越少，越有助于降低在床清醒时间。',
  },
  {
    id: 'schedule_wake',
    category: '作息规律',
    title: '优先固定起床时间',
    description: '即使前一晚睡得不理想，也尽量按同一时间起床，不额外赖床补觉。',
    reason: '固定起床时间是稳定节律、提高睡眠驱动力的基础。',
  },
  {
    id: 'schedule_nap',
    category: '作息规律',
    title: '控制白天补觉',
    description: '如果非常需要午睡，尽量控制在 20 分钟内，并避免傍晚后补觉。',
    reason: '白天长时间补觉会削弱夜间睡意，延长入睡潜伏期。',
  },
  {
    id: 'diet_caffeine',
    category: '饮食与刺激物',
    title: '下午后减少咖啡因',
    description: '咖啡、浓茶和功能饮料尽量安排在中午前，晚上避免再次摄入。',
    reason: '刺激物会延长入睡时间，也可能增加夜间觉醒。',
  },
  {
    id: 'wind_down',
    category: '睡眠环境',
    title: '建立睡前缓冲段',
    description: '睡前 30 至 60 分钟尽量减少工作和信息输入，给大脑一个减速过渡。',
    reason: '如果最近担忧偏高，先把大脑从白天任务中抽离会更有帮助。',
  },
];

export function getHighlightedHygieneActions(userData: UserData) {
  const recentLogs = getRecentSleepLogs(userData);
  const averageLatency = average(recentLogs.map((log) => calculateSleepLatencyMinutes(log))) || 0;
  const averageWaso = average(recentLogs.map((log) => log.wakeDuration)) || 0;
  const averageSleepiness = average(recentLogs.map((log) => log.daytimeSleepiness)) || 0;
  const highestDbas = getHighestDbasDimension(getLatestDbas(userData));

  const ids = new Set<string>();
  if (averageLatency > 30) {
    ids.add('wind_down');
    ids.add('diet_caffeine');
  }
  if (averageWaso > 30) {
    ids.add('env_dark');
  }
  if (averageSleepiness >= 3) {
    ids.add('schedule_nap');
  }
  if (highestDbas && highestDbas.score >= 4) {
    ids.add('schedule_wake');
    ids.add('wind_down');
  }

  if (ids.size === 0) {
    ids.add('schedule_wake');
    ids.add('env_dark');
  }

  return HYGIENE_LIBRARY.filter((item) => ids.has(item.id)).slice(0, 3);
}

export function createManualTaskFromHygiene(action: SleepHygieneAction): CBTTask {
  const today = format(new Date(), 'yyyy-MM-dd');
  return {
    id: `manual_${action.id}_${Date.now()}`,
    date: today,
    type: action.category === '饮食与刺激物' ? 'hygiene' : 'hygiene',
    title: action.title,
    description: action.description,
    estimatedMinutes: 10,
    rationale: action.reason,
    completed: false,
    source: 'manual',
  };
}

export function getCurrentTasks(userData: UserData) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const todaysTasks = userData.tasks.filter((task) => task.date === today);
  if (todaysTasks.length > 0) {
    return todaysTasks;
  }

  const generatedTasks = analysisService.generateTasks(userData);
  if (generatedTasks.length > 0) {
    return generatedTasks;
  }

  return [...userData.tasks]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6);
}

export function getEmptyStateMessage(userData: UserData) {
  if (!hasSufficientSleepData(userData, 1)) {
    return {
      title: '先记录第一晚睡眠',
      description: '完成一晚记录后，系统会开始计算睡眠时长、效率和基础趋势，并逐步生成更适合你的任务建议。',
      nextStep: '先从昨晚的上床时间、入睡时间和起床时间开始。',
    };
  }

  if (!hasAssessmentData(userData)) {
    return {
      title: '继续补齐测评信息',
      description: '现在已经有了基础睡眠记录，完成 PSQI 与 DBAS 后，系统会更准确地解释当前问题重点。',
      nextStep: '下一步建议先完成两项量表中的任意一项。',
    };
  }

  return {
    title: '继续累积本周记录',
    description: '数据越连续，系统越能稳定判断你的恢复趋势与任务重点。',
    nextStep: '保持连续记录 3 至 7 天，会看到更完整的趋势解释。',
  };
}

export function getTodayInsight(userData: UserData) {
  const bundle = analysisService.buildAnalysisBundle(userData);
  if (!bundle.screening.eligibleForStandardCBTI) {
    return bundle.screening.redirectRecommendation || '当前先以补充评估和稳定基础问题为主。';
  }

  return (
    bundle.treatmentPlan.primaryModules[0]?.rationale ||
    '今天先把固定起床时间、连续记录和本周核心任务执行稳定。'
  );
}

export function getAverageSleepDurationHours(userData: UserData) {
  const recentLogs = getRecentSleepLogs(userData, 7);
  const averageMinutes = average(recentLogs.map((log) => calculateSleepDurationMinutes(log)));
  return averageMinutes ? formatHoursFromMinutes(averageMinutes) : null;
}

export function getSleepRecordSnapshot(log: SleepLog) {
  return {
    totalSleepMinutes: calculateSleepDurationMinutes(log),
    latencyMinutes: calculateSleepLatencyMinutes(log),
    timeInBedMinutes: calculateTimeInBedMinutes(log),
  };
}
