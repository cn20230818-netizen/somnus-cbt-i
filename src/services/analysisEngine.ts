import {
  CBTIAnalysisBundle,
  CBTTask,
  CaseConceptualization,
  ClinicalAssessment,
  DaytimeImpairmentLevel,
  ModuleSelection,
  NumericScaleResult,
  OSARiskResult,
  PSQIResult,
  RiskLevel,
  ScreeningOutcome,
  SeverityLevel,
  StructuredTreatmentPlan,
  TreatmentModuleId,
  TreatmentStage,
  UserData,
  WeeklyReview,
} from '../types';
import {
  averageClockTime,
  calculateSleepDurationMinutes,
  calculateSleepLatencyMinutes,
  calculateTimeInBedMinutes,
  clockTimeToMinutes,
  formatHoursFromMinutes,
} from '../lib/sleep';

type LegacyRecommendation = {
  category: CBTTask['type'];
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  rationale: string;
};

const DBAS_DIMENSION_LABELS = {
  consequences: '睡眠后果担忧',
  worry: '入睡相关担忧',
  expectations: '睡眠预期偏高',
  medication: '药物依赖倾向',
} as const;

const PSQI_COMPONENT_LABELS = {
  quality: '主观睡眠质量',
  latency: '入睡潜伏期',
  duration: '睡眠时长',
  efficiency: '睡眠效率',
  disturbances: '夜间睡眠干扰',
  medication: '睡眠药物使用',
  dysfunction: '日间功能受损',
} as const;

const MODULE_TITLES: Record<TreatmentModuleId, string> = {
  stimulusControl: '刺激控制',
  sleepRestriction: '睡眠限制',
  sleepCompression: '睡眠压缩',
  sleepHygieneEducation: '睡眠卫生教育',
  cognitiveTherapy: '认知疗法',
  relaxationTraining: '放松训练',
  paradoxicalIntention: '反常意向',
  biofeedback: '生物反馈',
  sleepReschedulingOrReinforcement: '睡眠节律重建',
  relapsePrevention: '复发预防',
};

function round(value: number | null, digits = 0) {
  if (value === null || Number.isNaN(value)) {
    return null;
  }

  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sortLogs(userData: UserData) {
  return [...userData.sleepLogs].sort((a, b) => a.date.localeCompare(b.date));
}

function getLatestScale<T extends { date: string }>(items: T[]) {
  return [...items].sort((a, b) => b.date.localeCompare(a.date))[0] || null;
}

function getRecentLogs(userData: UserData, count = 7) {
  return sortLogs(userData).slice(-count);
}

function getHighestDbasDimension(userData: UserData) {
  const latest = getLatestScale(userData.dbasResults);
  if (!latest) {
    return null;
  }

  const highest = Object.entries(latest.subScores).reduce((selected, current) =>
    current[1] > selected[1] ? current : selected,
  );

  return {
    key: highest[0] as keyof typeof latest.subScores,
    label: DBAS_DIMENSION_LABELS[highest[0] as keyof typeof latest.subScores],
    score: highest[1],
  };
}

function getWorstPsqiComponent(userData: UserData) {
  const latest = getLatestScale(userData.psqiResults);
  if (!latest) {
    return null;
  }

  const worst = Object.entries(latest.components).reduce((selected, current) =>
    current[1] > selected[1] ? current : selected,
  );

  return {
    key: worst[0] as keyof PSQIResult['components'],
    label: PSQI_COMPONENT_LABELS[worst[0] as keyof PSQIResult['components']],
    score: worst[1],
  };
}

function parseDurationMonths(duration?: string) {
  if (!duration) {
    return null;
  }

  const normalized = duration.trim();
  const number = Number(normalized.match(/\d+(\.\d+)?/)?.[0] || '');
  if (!Number.isFinite(number)) {
    return null;
  }

  if (normalized.includes('年')) {
    return number * 12;
  }
  if (normalized.includes('周')) {
    return number / 4;
  }

  return number;
}

function sampleStd(values: number[]) {
  if (values.length < 2) {
    return null;
  }

  const avg = average(values);
  if (avg === null) {
    return null;
  }

  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function bedtimeVariability(logs: ReturnType<typeof getRecentLogs>) {
  return sampleStd(
    logs.map((log) => {
      const minutes = clockTimeToMinutes(log.bedTime);
      return minutes < 12 * 60 ? minutes + 24 * 60 : minutes;
    }),
  );
}

function waketimeVariability(logs: ReturnType<typeof getRecentLogs>) {
  return sampleStd(logs.map((log) => clockTimeToMinutes(log.getUpTime)));
}

function weekendCatchupSleep(logs: ReturnType<typeof getRecentLogs>) {
  if (logs.length === 0) {
    return null;
  }

  const weekend = logs.filter((log) => {
    const day = new Date(`${log.date}T12:00:00`).getDay();
    return day === 0 || day === 6;
  });
  const weekday = logs.filter((log) => {
    const day = new Date(`${log.date}T12:00:00`).getDay();
    return day !== 0 && day !== 6;
  });

  const weekendAvg = average(weekend.map((log) => calculateSleepDurationMinutes(log)));
  const weekdayAvg = average(weekday.map((log) => calculateSleepDurationMinutes(log)));

  if (weekendAvg === null || weekdayAvg === null) {
    return null;
  }

  return weekendAvg - weekdayAvg;
}

function napBurden(logs: ReturnType<typeof getRecentLogs>) {
  return average(logs.map((log) => log.napDuration || 0));
}

function scaleSeverityFromScore(score: number | null, mild = 5, moderate = 10, severe = 15): SeverityLevel {
  if (score === null) {
    return 'minimal';
  }
  if (score >= severe) {
    return 'severe';
  }
  if (score >= moderate) {
    return 'moderate';
  }
  if (score >= mild) {
    return 'mild';
  }
  return 'minimal';
}

function toRiskScore(level?: RiskLevel) {
  return level === 'high' ? 2 : level === 'moderate' ? 1 : 0;
}

function mergeRiskLevels(...levels: Array<RiskLevel | undefined>): RiskLevel {
  return levels.reduce<RiskLevel>(
    (selected, current) =>
      toRiskScore(current) > toRiskScore(selected) ? current || selected : selected,
    'low',
  );
}

function buildScreening(userData: UserData): ScreeningOutcome {
  const logs = sortLogs(userData);
  const recent14 = logs.slice(-14);
  const symptomaticNights = recent14.filter((log) => {
    const latency = calculateSleepLatencyMinutes(log);
    const earlyWake = clockTimeToMinutes(log.getUpTime) - clockTimeToMinutes(log.wakeTime) > 45;
    return latency >= 30 || (log.wakeDuration || 0) >= 30 || earlyWake;
  }).length;
  const latestEss = getLatestScale(userData.essResults);
  const latestIsi = getLatestScale(userData.isiResults);
  const latestPsqi = getLatestScale(userData.psqiResults);
  const durationMonths = parseDurationMonths(userData.riskProfile.insomniaDuration);
  const nocturnalSymptomPattern = symptomaticNights >= Math.max(3, Math.ceil(recent14.length / 2));
  const scaleSuggestsInsomnia = (latestIsi?.score || 0) >= 8 || (latestPsqi?.totalScore || 0) >= 8;
  const ongoingStructuredTreatment =
    userData.treatmentPhase.phase !== 'assessment' || userData.treatmentPhase.currentWeek > 1;
  const meetsChronicity = (durationMonths || 0) >= 3;
  const hasDaytimeImpairment =
    (average(recent14.map((log) => log.daytimeSleepiness)) || 0) >= 3 ||
    (latestEss?.score || 0) >= 8 ||
    (latestPsqi?.components.dysfunction || 0) >= 2;

  const chronicInsomniaReasons: string[] = [];
  if (!durationMonths) {
    chronicInsomniaReasons.push('当前尚未补充失眠病程信息，标准 CBT-I 适合性判断仍不完整。');
  }
  if (nocturnalSymptomPattern) {
    chronicInsomniaReasons.push('近两周多数夜晚存在入睡延迟、夜间清醒偏长或明显早醒。');
  }
  if (scaleSuggestsInsomnia) {
    chronicInsomniaReasons.push('最新量表结果仍提示存在临床意义的失眠负担。');
  }
  if (hasDaytimeImpairment) {
    chronicInsomniaReasons.push('同时伴有明确的白天困倦、疲劳或功能受损。');
  }
  if (meetsChronicity) {
    chronicInsomniaReasons.push('病程已达到慢性失眠倾向。');
  }
  if (ongoingStructuredTreatment && logs.length >= 7) {
    chronicInsomniaReasons.push('当前已进入阶段化治疗路径，可结合周级复盘继续调参与巩固。');
  }

  const chronicInsomniaPattern =
    (nocturnalSymptomPattern || scaleSuggestsInsomnia || ongoingStructuredTreatment) &&
    hasDaytimeImpairment &&
    meetsChronicity;

  const cautionFlags: string[] = [];
  const hasShiftRisk =
    logs.some((log) => ['night', 'rotating', 'irregular'].includes(log.workShiftType || '')) ||
    ['night', 'rotating', 'irregular'].includes(logs[logs.length - 1]?.workShiftType || '');
  if (hasShiftRisk) {
    cautionFlags.push('存在倒班或不规律班次，标准固定睡眠窗口策略需谨慎。');
  }
  if (logs.some((log) => log.jetLagOrTravel)) {
    cautionFlags.push('近期有跨时区或旅行节律扰动，需先处理节律错位问题。');
  }
  const latestOsa = getLatestScale(userData.osaRiskResults as OSARiskResult[]);
  const respiratoryRisk = mergeRiskLevels(userData.riskProfile.respiratoryRisk, latestOsa?.riskLevel);
  if (respiratoryRisk === 'high') {
    cautionFlags.push('存在明显 OSA 或呼吸相关风险，需要先进一步评估。');
  }
  if (userData.riskProfile.parasomniaRisk === 'high') {
    cautionFlags.push('存在异态睡眠高风险，需先排除相关睡眠障碍。');
  }
  if (userData.riskProfile.seizureRisk === 'high') {
    cautionFlags.push('存在癫痫风险，自动睡眠限制/压缩不宜直接启动。');
  }
  const latestBipolar = getLatestScale(userData.bipolarRiskResults);
  if ((latestBipolar?.riskLevel || 'low') !== 'low') {
    cautionFlags.push('存在双相或躁期风险，需要先稳定情绪后再决定是否进入标准 CBT-I。');
  }
  if ((userData.riskProfile.selfHarmRisk || 'low') !== 'low') {
    cautionFlags.push('存在自伤风险，当前不应仅依赖数字化 CBT-I 自动方案。');
  }
  if (userData.riskProfile.unstableMedicalCondition) {
    cautionFlags.push('存在未稳定的躯体疾病，需先完成基础疾病管理。');
  }
  if (userData.riskProfile.unstablePsychCondition) {
    cautionFlags.push('存在未稳定的精神症状，需先稳定基础问题。');
  }
  if (userData.riskProfile.pregnancyOrSpecialPopulation) {
    cautionFlags.push('属于特殊人群，睡眠限制类策略需个体化调整。');
  }
  if (!durationMonths) {
    cautionFlags.push('基础建档尚未完成，尤其缺少失眠病程信息。');
  }

  const eligibleForStandardCBTI =
    chronicInsomniaPattern &&
    Boolean(durationMonths) &&
    !hasShiftRisk &&
    !logs.some((log) => log.jetLagOrTravel) &&
    respiratoryRisk !== 'high' &&
    userData.riskProfile.parasomniaRisk !== 'high' &&
    userData.riskProfile.seizureRisk !== 'high' &&
    (latestBipolar?.riskLevel || 'low') === 'low' &&
    (userData.riskProfile.selfHarmRisk || 'low') === 'low' &&
    !userData.riskProfile.unstableMedicalCondition &&
    !userData.riskProfile.unstablePsychCondition;

  let redirectRecommendation: string | null = null;
  if (!eligibleForStandardCBTI) {
    if (!durationMonths) {
      redirectRecommendation = '当前需要先完成基础建档，尤其是失眠病程和起病背景信息，再判断是否适合进入标准 CBT-I。';
    } else if (!chronicInsomniaPattern) {
      redirectRecommendation = '当前资料尚不足以支持慢性失眠型标准 CBT-I，请继续完成睡眠日记与基础评估。';
    } else if (respiratoryRisk === 'high') {
      redirectRecommendation = '当前不建议直接进入标准 CBT-I，请先完成呼吸相关睡眠障碍评估。';
    } else if ((userData.riskProfile.selfHarmRisk || 'low') !== 'low') {
      redirectRecommendation = '当前不建议直接进入标准 CBT-I，请先进行风险评估与面对面干预。';
    } else if ((latestBipolar?.riskLevel || 'low') !== 'low') {
      redirectRecommendation = '当前不建议直接进入标准 CBT-I，请先稳定情绪状态并进一步评估躁期风险。';
    } else if (hasShiftRisk || logs.some((log) => log.jetLagOrTravel)) {
      redirectRecommendation = '当前不建议直接进入标准 CBT-I，请先处理倒班或节律错位问题。';
    } else {
      redirectRecommendation = '当前不建议直接进入标准 CBT-I，请先进一步评估或稳定基础问题后再决定。';
    }
  }

  return {
    eligibleForStandardCBTI,
    cautionFlags,
    redirectRecommendation,
    chronicInsomniaPattern,
    chronicInsomniaReasons: chronicInsomniaReasons.length > 0 ? chronicInsomniaReasons : ['当前仍需继续积累睡眠资料与量表结果。'],
  };
}

function buildAssessment(userData: UserData): ClinicalAssessment {
  const logs = sortLogs(userData);
  const recent7 = logs.slice(-7);
  const latest = logs[logs.length - 1] || null;
  const latestDbas = getLatestScale(userData.dbasResults);
  const latestPsqi = getLatestScale(userData.psqiResults);
  const latestGad7 = getLatestScale(userData.gad7Results);
  const latestPhq9 = getLatestScale(userData.phq9Results);
  const durationMonths = parseDurationMonths(userData.riskProfile.insomniaDuration);
  const highestDbas = getHighestDbasDimension(userData);
  const worstPsqi = getWorstPsqiComponent(userData);

  const latestNightMetrics = {
    sleepLatency: latest ? calculateSleepLatencyMinutes(latest) : null,
    totalSleepTime: latest ? calculateSleepDurationMinutes(latest) : null,
    timeInBed: latest ? calculateTimeInBedMinutes(latest) : null,
    sleepEfficiency: latest?.efficiency ?? null,
    WASO: latest?.wakeDuration ?? null,
    awakenings: latest?.wakeCount ?? null,
    subjectiveQuality: latest?.sleepQuality ?? null,
  };

  const weeklyAverages = {
    avgSleepLatency7d: round(average(recent7.map((log) => calculateSleepLatencyMinutes(log)))),
    avgTST7d: round(average(recent7.map((log) => calculateSleepDurationMinutes(log)))),
    avgTIB7d: round(average(recent7.map((log) => calculateTimeInBedMinutes(log)))),
    avgSE7d: round(average(recent7.map((log) => log.efficiency))),
    avgWASO7d: round(average(recent7.map((log) => log.wakeDuration))),
    avgAwakenings7d: round(average(recent7.map((log) => log.wakeCount)), 1),
  };

  const scheduleStability = {
    bedtimeVariability: round(bedtimeVariability(recent7)),
    waketimeVariability: round(waketimeVariability(recent7)),
    weekendCatchupSleep: round(weekendCatchupSleep(recent7)),
    napBurden: round(napBurden(recent7)),
  };

  const cognitionMoodMetrics = {
    dbasTotal: latestDbas ? round(latestDbas.totalScore, 1) : null,
    highestDBASDimension: highestDbas?.label || null,
    psqiTotal: latestPsqi?.totalScore ?? null,
    worstPSQIComponent: worstPsqi?.label || null,
    anxietyBurden: latestGad7?.score ?? null,
    depressionBurden: latestPhq9?.score ?? null,
  };

  const insomniaPhenotype: string[] = [];
  if ((weeklyAverages.avgSleepLatency7d || 0) > 30) {
    insomniaPhenotype.push('以入睡困难为主');
  }
  if ((weeklyAverages.avgWASO7d || 0) > 30 || (weeklyAverages.avgAwakenings7d || 0) >= 2) {
    insomniaPhenotype.push('以睡眠维持困难为主');
  }
  if ((scheduleStability.bedtimeVariability || 0) > 45 || (scheduleStability.waketimeVariability || 0) > 45) {
    insomniaPhenotype.push('伴作息节律不稳定');
  }
  if ((average(recent7.map((log) => log.bedtimeEmotionArousal || 0)) || 0) >= 3.5) {
    insomniaPhenotype.push('伴睡前高唤醒');
  }
  if ((highestDbas?.score || 0) >= 4) {
    insomniaPhenotype.push('伴灾难化睡眠认知');
  }
  if ((average(recent7.map((log) => log.daytimeSleepiness)) || 0) >= 3) {
    insomniaPhenotype.push('伴日间功能受损');
  }
  if (insomniaPhenotype.length === 0) {
    insomniaPhenotype.push('当前表型尚需更多连续数据支持');
  }

  let severityLevel: SeverityLevel = scaleSeverityFromScore(getLatestScale(userData.isiResults)?.score || latestPsqi?.totalScore || null);
  if ((weeklyAverages.avgSE7d || 0) < 75 || (latestPsqi?.totalScore || 0) >= 15) {
    severityLevel = 'severe';
  } else if ((weeklyAverages.avgSE7d || 0) < 80 || (latestPsqi?.totalScore || 0) >= 10) {
    severityLevel = 'moderate';
  }

  let daytimeImpairmentLevel: DaytimeImpairmentLevel = 'none';
  const daytimeBurden = Math.max(
    average(recent7.map((log) => log.daytimeSleepiness)) || 0,
    (getLatestScale(userData.essResults)?.score || 0) / 4,
    latestPsqi?.components.dysfunction || 0,
  );
  if (daytimeBurden >= 4) {
    daytimeImpairmentLevel = 'severe';
  } else if (daytimeBurden >= 3) {
    daytimeImpairmentLevel = 'moderate';
  } else if (daytimeBurden >= 2) {
    daytimeImpairmentLevel = 'mild';
  }

  let chronicityLevel: ClinicalAssessment['chronicityLevel'] = 'acute';
  if ((durationMonths || 0) >= 3) {
    chronicityLevel = 'chronic';
  } else if ((durationMonths || 0) >= 1) {
    chronicityLevel = 'chronic_tendency';
  } else if ((durationMonths || 0) > 0) {
    chronicityLevel = 'subacute';
  }

  const keyMetrics = [
    latestNightMetrics.sleepLatency !== null ? `最新入睡潜伏期 ${latestNightMetrics.sleepLatency} 分钟` : null,
    latestNightMetrics.totalSleepTime !== null ? `最新总睡眠时长 ${formatHoursFromMinutes(latestNightMetrics.totalSleepTime)} 小时` : null,
    weeklyAverages.avgSE7d !== null ? `近 7 天平均睡眠效率 ${weeklyAverages.avgSE7d}%` : null,
    weeklyAverages.avgWASO7d !== null ? `近 7 天平均夜间清醒 ${weeklyAverages.avgWASO7d} 分钟` : null,
    scheduleStability.bedtimeVariability !== null ? `入睡时间波动约 ${scheduleStability.bedtimeVariability} 分钟` : null,
    cognitionMoodMetrics.highestDBASDimension ? `当前最高认知负担为 ${cognitionMoodMetrics.highestDBASDimension}` : null,
    cognitionMoodMetrics.worstPSQIComponent ? `PSQI 最受影响维度为 ${cognitionMoodMetrics.worstPSQIComponent}` : null,
  ].filter(Boolean) as string[];

  return {
    insomniaPhenotype,
    severityLevel,
    daytimeImpairmentLevel,
    chronicityLevel,
    latestNightMetrics,
    weeklyAverages,
    scheduleStability,
    cognitionMoodMetrics,
    keyMetrics,
  };
}

function includesAny(values: string[], keywords: string[]) {
  const joined = values.join(' ');
  return keywords.some((keyword) => joined.includes(keyword));
}

function buildConceptualization(userData: UserData, assessment: ClinicalAssessment): CaseConceptualization {
  const recent7 = getRecentLogs(userData, 7);
  const highestDbas = getHighestDbasDimension(userData);
  const onsetTrigger = userData.riskProfile.onsetTrigger || '';
  const predispose = new Set<string>();
  const precipitate = new Set<string>();
  const perpetuate = new Set<string>();

  if ((assessment.cognitionMoodMetrics.anxietyBurden || 0) >= 10) {
    predispose.add('焦虑敏感');
  }
  if ((highestDbas?.key === 'expectations') || (highestDbas?.score || 0) >= 4.5) {
    predispose.add('睡眠需求认知偏差');
    predispose.add('对睡眠高度关注');
  }
  if ((assessment.scheduleStability.bedtimeVariability || 0) > 45 || (assessment.scheduleStability.waketimeVariability || 0) > 45) {
    predispose.add('生物节律脆弱性');
  }
  if ((average(recent7.map((log) => log.bedtimeEmotionArousal || 0)) || 0) >= 3.5) {
    predispose.add('高唤醒特质');
  }
  if ((parseDurationMonths(userData.riskProfile.insomniaDuration) || 0) >= 6) {
    predispose.add('既往失眠史');
    predispose.add('长期压力背景');
  }
  if ((highestDbas?.key === 'consequences') || (assessment.cognitionMoodMetrics.dbasTotal || 0) >= 4) {
    predispose.add('完美化睡眠预期');
  }

  if (onsetTrigger) {
    if (includesAny([onsetTrigger], ['工作', '学习', '考试', '绩效'])) {
      precipitate.add('工作或学习压力');
    }
    if (includesAny([onsetTrigger], ['家庭', '婚姻', '照护', '家人'])) {
      precipitate.add('家庭事件');
    }
    if (includesAny([onsetTrigger], ['疾病', '疼痛', '住院', '身体'])) {
      precipitate.add('疾病或疼痛');
    }
    if (includesAny([onsetTrigger], ['药', '停药', '加药'])) {
      precipitate.add('药物变化');
    }
    if (includesAny([onsetTrigger], ['情绪', '焦虑', '惊吓', '压力'])) {
      precipitate.add('情绪事件');
    }
    if (includesAny([onsetTrigger], ['出差', '旅行', '时差', '搬家'])) {
      precipitate.add('节律或环境变化');
    }
  }
  if (precipitate.size === 0 && userData.riskProfile.chronicPain) {
    precipitate.add('疾病或疼痛');
  }
  if (precipitate.size === 0) {
    precipitate.add('持续压力事件后逐步固化');
  }

  if ((assessment.weeklyAverages.avgTIB7d || 0) - (assessment.weeklyAverages.avgTST7d || 0) > 75) {
    perpetuate.add('在床清醒过久');
    perpetuate.add('睡不着时继续躺床努力入睡');
  }
  if ((assessment.scheduleStability.weekendCatchupSleep || 0) > 60) {
    perpetuate.add('周末补觉');
  }
  if ((average(recent7.map((log) => log.weekendScheduleDeviation || 0)) || 0) > 60) {
    perpetuate.add('周末补觉');
    perpetuate.add('不规律起床时间');
  }
  if ((assessment.scheduleStability.napBurden || 0) > 30) {
    perpetuate.add('白天小睡');
  }
  if ((assessment.weeklyAverages.avgTIB7d || 0) > 8.5 * 60) {
    perpetuate.add('提前上床或赖床');
  }
  if ((assessment.scheduleStability.waketimeVariability || 0) > 45) {
    perpetuate.add('不规律起床时间');
  }
  if (recent7.some((log) => includesAny(log.lastHourActivities || [], ['手机', '看剧', '工作', '刷'])) || (average(recent7.map((log) => log.eveningScreenExposure || 0)) || 0) > 60) {
    perpetuate.add('睡前或在床使用手机/工作');
  }
  if ((average(recent7.map((log) => log.caffeineIntake || 0)) || 0) >= 2) {
    perpetuate.add('咖啡因使用不当');
  }
  if (recent7.some((log) => (log.alcoholIntake || 0) > 0)) {
    perpetuate.add('酒精相关睡眠干扰');
  }
  if (recent7.some((log) => log.nicotineUse)) {
    perpetuate.add('尼古丁相关睡眠干扰');
  }
  if (recent7.some((log) => (log.nocturnalEnvironmentIssues || []).length > 0)) {
    perpetuate.add('环境不良或夜间干扰');
  }
  if ((average(recent7.map((log) => log.bedtimeEmotionArousal || 0)) || 0) >= 3.5) {
    perpetuate.add('努力性入睡与睡前高唤醒');
  }
  if ((highestDbas?.key === 'consequences') || (highestDbas?.key === 'worry')) {
    perpetuate.add('灾难化睡眠认知');
    perpetuate.add('对睡眠后果过度放大');
  }
  if (highestDbas?.key === 'medication') {
    perpetuate.add('药物依赖倾向');
  }

  const currentPriorityTargets = [
    ...[
      '在床清醒过久',
      '不规律起床时间',
      '白天小睡',
      '周末补觉',
      '努力性入睡与睡前高唤醒',
      '灾难化睡眠认知',
      '对睡眠后果过度放大',
      '睡前或在床使用手机/工作',
      '咖啡因使用不当',
      '环境不良或夜间干扰',
    ].filter((item) => perpetuate.has(item)),
  ];

  if (currentPriorityTargets.length === 0) {
    currentPriorityTargets.push('先继续补齐连续睡眠资料，再细化维持因素排序');
  }

  const cognitivePriority =
    currentPriorityTargets.find((item) => ['灾难化睡眠认知', '对睡眠后果过度放大'].includes(item)) ||
    (highestDbas ? highestDbas.label : '认知维持因素仍需进一步评估');
  const hygienePriority =
    currentPriorityTargets.find((item) => ['咖啡因使用不当', '环境不良或夜间干扰', '睡前或在床使用手机/工作'].includes(item)) ||
    '睡眠卫生问题作为辅助模块处理';

  const summaryText = `当前失眠之所以持续，主要不是单一症状本身，而是由 ${Array.from(perpetuate).slice(0, 4).join('、')} 等维持因素共同强化。系统当前优先处理 ${currentPriorityTargets[0]}，因为这类行为会持续削弱睡眠驱动力或强化床与清醒的联结；其次处理 ${cognitivePriority}，以减少睡前高压想法；像 ${hygienePriority} 这类卫生或环境因素会保留为辅助模块，而不会取代核心 CBT-I 方案。`;

  return {
    predispose: Array.from(predispose),
    precipitate: Array.from(precipitate),
    perpetuate: Array.from(perpetuate),
    currentPriorityTargets,
    summaryText,
  };
}

function moduleType(moduleId: TreatmentModuleId): CBTTask['type'] {
  if (['cognitiveTherapy'].includes(moduleId)) {
    return 'cognitive';
  }
  if (['relaxationTraining', 'biofeedback'].includes(moduleId)) {
    return 'relaxation';
  }
  if (['sleepHygieneEducation'].includes(moduleId)) {
    return 'hygiene';
  }
  return 'behavioral';
}

function buildCognitiveModule(reason: string): ModuleSelection {
  return {
    id: 'cognitiveTherapy',
    title: MODULE_TITLES.cognitiveTherapy,
    rationale: reason,
    focus: ['识别自动化思维', '拆解事件-想法-情绪-行为链', '形成平衡替代信念'],
    dailyActions: [
      '今天先记录一个最典型的睡前自动化想法。',
      '用 ABC 结构区分事件、想法、情绪、行为和生理反应。',
      '补一条支持证据与一条反对证据，练习生成更平衡的替代性信念。',
      '下一次睡前再次练习新的自动化思维。',
    ],
    weeklyAdjustmentRules: [
      '本周至少完成 3 次自动化思维记录。',
      '下周复盘时检查灾难化强度是否下降、是否出现更自然的替代想法。',
    ],
    frequency: '每周 3-5 次',
    duration: '每次 10-15 分钟',
    evaluationHint: '观察睡前“今晚必须睡着”的想法强度是否下降。',
    flowSteps: [
      '识别自动化思维',
      '区分事件、想法、情绪、行为、生理反应',
      '用 ABC 结构记录',
      '检查支持与反对证据',
      '生成替代性信念',
      '在下一次睡前情境中再次练习',
      '形成新的自动化思维',
    ],
    forms: ['thoughtRecord', 'abcRecord', 'dtrRecord', 'balancedAlternativeBelief'],
  };
}

function buildRelaxationModule(reason: string, profile: string): ModuleSelection {
  const mapping = {
    high_cognitive: {
      title: '呼吸训练 + 身体扫描',
      frequency: '每晚 1 次，必要时白天加练 1 次',
      duration: '8-12 分钟',
      evaluation: '观察是否更容易从反复思考转入放松状态。',
    },
    high_muscle_tension: {
      title: '渐进性肌肉放松',
      frequency: '每晚 1 次',
      duration: '10-15 分钟',
      evaluation: '观察肩颈、胸口、下颌等紧绷感是否下降。',
    },
    pressure_load: {
      title: '腹式呼吸 + 简短冥想',
      frequency: '每晚 1 次，白天压力高时加做 1 次',
      duration: '10 分钟',
      evaluation: '观察睡前情绪负荷和生理警觉是否下降。',
    },
    execution_difficulty: {
      title: '2 分钟起步放松练习',
      frequency: '先连续 3 天每天 1 次，再逐步加量',
      duration: '2-5 分钟起步',
      evaluation: '先追求完成率，再追求时长与熟练度。',
    },
  } as const;

  const selected = mapping[profile as keyof typeof mapping] || mapping.high_cognitive;
  return {
    id: 'relaxationTraining',
    title: `${MODULE_TITLES.relaxationTraining}：${selected.title}`,
    rationale: `${reason} 当前更适合使用 ${selected.title}。`,
    focus: ['降低睡前高生理或高认知唤醒', '建立可重复的睡前降速程序'],
    dailyActions: [
      `今天练习 ${selected.title}。`,
      '结束后记录主观紧张度、困倦感与是否更容易离开高压思维。',
    ],
    weeklyAdjustmentRules: [
      '如果主观帮助度低于 3/5，下周更换放松形式。',
      '如果执行困难，先缩短时长而不是直接中断。',
    ],
    frequency: selected.frequency,
    duration: selected.duration,
    evaluationHint: selected.evaluation,
  };
}

function buildModuleSelection(
  moduleId: TreatmentModuleId,
  rationale: string,
  context: {
    assessment: ClinicalAssessment;
    conceptualization: CaseConceptualization;
    screening: ScreeningOutcome;
    sleepWindowMinutes: number | null;
    fixedWakeTime: string | null;
    relaxationProfile: string;
  },
): ModuleSelection {
  if (moduleId === 'stimulusControl') {
    return {
      id: moduleId,
      title: MODULE_TITLES[moduleId],
      rationale,
      focus: ['重新建立床与睡眠的条件联结', '减少在床清醒和努力性入睡'],
      dailyActions: [
        '固定起床时间，不因昨晚睡差而赖床。',
        '若 15-20 分钟仍明显清醒，先离床到低刺激环境，困倦后再回床。',
        '床只保留给睡眠和亲密活动，不在床上刷手机、工作或反复思考。',
      ],
      weeklyAdjustmentRules: [
        '下周复盘是否仍常在床清醒过久。',
        '如果离床执行率低，先分析障碍，而不是盲目加码任务。',
      ],
      frequency: '每天执行',
      duration: '贯穿整夜',
      evaluationHint: '观察在床清醒时间是否缩短，以及能否更快启动离床策略。',
    };
  }

  if (moduleId === 'sleepRestriction' || moduleId === 'sleepCompression') {
    const isRestriction = moduleId === 'sleepRestriction';
    const wakeTime = context.fixedWakeTime || '07:00';
    const sleepWindowMinutes = context.sleepWindowMinutes || 390;
    const bedTime = averageClockTime([wakeTime], 'day')
      ? clockTimeToMinutes(wakeTime) - sleepWindowMinutes
      : null;

    return {
      id: moduleId,
      title: MODULE_TITLES[moduleId],
      rationale,
      focus: ['用固定起床时间和控制在床时间提升睡眠驱动力', '用周平均睡眠效率而不是单夜好坏来调参'],
      dailyActions: [
        `本周先把起床时间固定在 ${wakeTime}。`,
        bedTime !== null
          ? `建议卧床窗口约为 ${Math.round(sleepWindowMinutes / 60 * 10) / 10} 小时，目标上床时间约 ${String(Math.floor((((bedTime % 1440) + 1440) % 1440) / 60)).padStart(2, '0')}:${String((((bedTime % 1440) + 1440) % 1440) % 60).padStart(2, '0')}。`
          : '根据最近 7 天睡眠时长与效率设置固定卧床窗口。',
        '避免白天补觉和额外赖床，以免削弱夜间睡意。',
      ],
      weeklyAdjustmentRules: [
        isRestriction
          ? '若近 7 天平均睡眠效率 > 90%，下周增加在床时间 15-30 分钟。'
          : '若近 7 天平均睡眠效率 > 90%，下周逐步放宽在床时间 15 分钟。',
        '若近 7 天平均睡眠效率在 85%-90%，下周保持不变。',
        isRestriction
          ? '若近 7 天平均睡眠效率 < 85%，且无明显不耐受或风险信号，下周减少在床时间 15-30 分钟。'
          : '若近 7 天平均睡眠效率 < 85%，优先缩减 15 分钟并复盘依从性障碍。',
        '总在床时间不能低于安全下限，如明显不耐受、日间极端嗜睡或风险升高，暂停自动缩减。',
      ],
      frequency: '每天执行',
      duration: '每周复盘一次',
      evaluationHint: '下周以近 7 天平均睡眠效率作为唯一调参主依据。',
    };
  }

  if (moduleId === 'sleepHygieneEducation') {
    return {
      id: moduleId,
      title: MODULE_TITLES[moduleId],
      rationale,
      focus: ['只处理明确存在的卫生或环境因素，不替代核心 CBT-I 模块'],
      dailyActions: [
        '下午后减少咖啡因，晚上避免酒精助眠。',
        '睡前一小时降低屏幕和工作输入，减少光照刺激。',
        '如有环境问题，先处理卧室噪音、光线和温度。',
      ],
      weeklyAdjustmentRules: ['下周复盘是否仍有明显刺激物、环境或节律问题。'],
      frequency: '按需辅助',
      duration: '5-10 分钟',
      evaluationHint: '仅作为辅助模块，判断标准是是否明显减少可修正的维持因素。',
    };
  }

  if (moduleId === 'cognitiveTherapy') {
    return buildCognitiveModule(rationale);
  }

  if (moduleId === 'relaxationTraining') {
    return buildRelaxationModule(rationale, context.relaxationProfile);
  }

  if (moduleId === 'paradoxicalIntention') {
    return {
      id: moduleId,
      title: MODULE_TITLES[moduleId],
      rationale,
      focus: ['降低“必须马上睡着”的表现焦虑'],
      dailyActions: ['当明显出现努力性入睡时，练习允许自己保持安静清醒，而不再强迫入睡。'],
      weeklyAdjustmentRules: ['如果表现焦虑下降、入睡压力减轻，可减少使用频率。'],
      frequency: '仅在睡前明显用力入睡时使用',
      duration: '5-10 分钟',
      evaluationHint: '观察“必须马上睡着”的紧迫感是否下降。',
    };
  }

  if (moduleId === 'biofeedback') {
    return {
      id: moduleId,
      title: MODULE_TITLES[moduleId],
      rationale,
      focus: ['帮助识别与回落生理唤醒'],
      dailyActions: ['在睡前练习简化的生理反馈或 HRV 观察，配合呼吸训练降低身体警觉。'],
      weeklyAdjustmentRules: ['若无法稳定执行，可先退回基础放松训练。'],
      frequency: '每周 3-5 次',
      duration: '8-10 分钟',
      evaluationHint: '观察心率、呼吸与主观紧张度是否更容易回落。',
    };
  }

  if (moduleId === 'sleepReschedulingOrReinforcement') {
    return {
      id: moduleId,
      title: MODULE_TITLES[moduleId],
      rationale,
      focus: ['稳定起床时间和睡眠窗口', '减少工作日与周末节律偏差'],
      dailyActions: [
        '把起床时间锚定在固定时点，周末也尽量不偏差过大。',
        '若当前作息过于散乱，先从固定起床和白天光照暴露开始。',
      ],
      weeklyAdjustmentRules: ['若节律稳定性改善，再考虑推进更激进的睡眠限制策略。'],
      frequency: '每天执行',
      duration: '持续 1 周以上',
      evaluationHint: '观察入睡和起床时间波动是否缩小。',
    };
  }

  return {
    id: moduleId,
    title: MODULE_TITLES[moduleId],
    rationale,
    focus: ['巩固睡眠恢复后形成的关键行为与认知习惯'],
    dailyActions: [
      '保留固定起床时间、离床规则和认知应对方案。',
      '提前写下复发预警信号和应对步骤。',
    ],
    weeklyAdjustmentRules: ['若连续 2 周睡眠效率稳定，可逐步减少任务密度，保留关键锚点。'],
    frequency: '每周复盘 1 次',
    duration: '巩固阶段持续使用',
    evaluationHint: '观察是否在压力波动时仍能快速回到既定节律。',
  };
}

function buildDailyTasks(plan: StructuredTreatmentPlan): CBTTask[] {
  const today = new Date().toISOString().split('T')[0];
  const modules = [...plan.primaryModules, ...plan.secondaryModules].slice(0, 5);

  return modules.map((module, index) => ({
    id: `${module.id}_${today}_${index}`,
    type: moduleType(module.id),
    title: module.title,
    description: module.dailyActions.join('；'),
    completed: false,
    date: today,
    estimatedMinutes:
      module.id === 'sleepRestriction' || module.id === 'sleepCompression'
        ? 10
        : module.id === 'cognitiveTherapy'
          ? 15
          : module.id === 'relaxationTraining'
            ? 12
            : 8,
    rationale: module.rationale,
    source: 'rules',
    module: module.id,
    flowSteps: module.flowSteps,
    forms: module.forms,
    frequency: module.frequency,
    evaluationHint: module.evaluationHint,
  }));
}

function buildWeeklyReview(
  userData: UserData,
  screening: ScreeningOutcome,
  assessment: ClinicalAssessment,
  plan: StructuredTreatmentPlan,
): WeeklyReview {
  const avgSE = assessment.weeklyAverages.avgSE7d || 0;
  const currentTasks = userData.tasks.slice(-14);
  const completedTasks = currentTasks.filter((task) => task.completed);
  const completionRate = currentTasks.length > 0 ? Math.round((completedTasks.length / currentTasks.length) * 100) : 0;
  const barriers = userData.adherenceProfile.adherenceBarriers || [];

  let adjustmentDecision = '本周先保持当前计划不变，继续观察一周完整数据。';
  if (plan.primaryModules.some((module) => ['sleepRestriction', 'sleepCompression'].includes(module.id))) {
    if (avgSE > 90) {
      adjustmentDecision = '近 7 天平均睡眠效率 > 90%，下周可增加在床时间 15-30 分钟。';
    } else if (avgSE >= 85) {
      adjustmentDecision = '近 7 天平均睡眠效率处于 85%-90%，下周保持当前在床时间不变。';
    } else {
      adjustmentDecision = screening.eligibleForStandardCBTI
        ? '近 7 天平均睡眠效率 < 85%，若无明显不耐受或风险信号，下周减少在床时间 15-30 分钟。'
        : '当前不宜继续自动缩减在床时间，需先处理风险或依从性障碍。';
    }
  }

  const stimulusIndicators = [
    (assessment.weeklyAverages.avgSleepLatency7d || 0) > 30 ? '仍常在床清醒过久' : '在床清醒时间较前稳定',
    (assessment.scheduleStability.waketimeVariability || 0) > 45 ? '固定起床时间执行仍不稳' : '起床时间相对稳定',
  ];

  const cognitiveIndicators = [
    assessment.cognitionMoodMetrics.highestDBASDimension
      ? `当前最高认知负担仍为 ${assessment.cognitionMoodMetrics.highestDBASDimension}`
      : '认知负担资料仍有限',
    (assessment.cognitionMoodMetrics.dbasTotal || 0) >= 4 ? '灾难化信念仍需重点处理' : '认知负担开始趋稳',
  ];

  const relaxationIndicators = [
    (average(getRecentLogs(userData, 7).map((log) => log.bedtimeEmotionArousal || 0)) || 0) >= 3.5
      ? '睡前唤醒仍偏高'
      : '睡前高唤醒有所缓解',
    (userData.adherenceProfile.perceivedHelpfulness || 0) >= 4
      ? '当前放松方式主观帮助度较好'
      : '如帮助度偏低，下周应更换放松形式',
  ];

  const adherenceSummary =
    currentTasks.length === 0
      ? '当前任务执行历史仍少，下周重点先建立每周闭环。'
      : completionRate >= 70
        ? `最近任务完成率约 ${completionRate}%，依从性较好。`
        : `最近任务完成率约 ${completionRate}%，需先分析障碍：${barriers.join('、') || '当前记录提示执行稳定性不足'}。`;

  const nextWeekPlan = [
    adjustmentDecision,
    plan.primaryModules.length > 0 ? `继续围绕主方案 ${plan.primaryModules.map((item) => item.title).join(' + ')} 执行。` : '先完成补充评估再决定主方案。',
    plan.secondaryModules.length > 0 ? `辅方案保留 ${plan.secondaryModules.map((item) => item.title).join('、')}，根据依从性适度推进。` : '暂不额外叠加辅方案。',
  ];

  const relapseRisk =
    completionRate < 50
      ? '近期复发风险偏高，主要来自执行中断与节律波动。'
      : avgSE >= 85 && (assessment.scheduleStability.weekendCatchupSleep || 0) > 60
        ? '当前主要复发风险来自周末补觉和节律回摆。'
        : '当前复发风险总体可控，但仍需守住固定起床时间与应对高压想法。';

  return {
    weekSummary: `本周以 ${assessment.insomniaPhenotype.slice(0, 2).join('、')} 为主，近 7 天平均睡眠效率约 ${avgSE || '暂无足够数据'}%。`,
    moduleResponse: [
      {
        module: '刺激控制执行评估',
        response: stimulusIndicators.join('；'),
        indicators: stimulusIndicators,
      },
      {
        module: '认知疗法复盘',
        response: cognitiveIndicators.join('；'),
        indicators: cognitiveIndicators,
      },
      {
        module: '放松训练复盘',
        response: relaxationIndicators.join('；'),
        indicators: relaxationIndicators,
      },
    ],
    adherenceSummary,
    adjustmentDecision,
    nextWeekPlan,
    relapseRisk,
  };
}

function buildTreatmentPlan(
  userData: UserData,
  screening: ScreeningOutcome,
  assessment: ClinicalAssessment,
  conceptualization: CaseConceptualization,
): StructuredTreatmentPlan {
  if (!screening.eligibleForStandardCBTI) {
    return {
      stage: '暂缓进入标准 CBT-I',
      goals: [
        '先完成进一步评估或稳定基础问题',
        '继续记录睡眠日记以明确真实表型',
      ],
      primaryModules: [],
      secondaryModules: [],
      deferredModules: [],
      rationaleByModule: {},
      dailyTasks: [],
      weeklyAdjustmentRules: ['当前不进入自动化标准 CBT-I 调参流程。'],
      safetyNotes: screening.redirectRecommendation ? [screening.redirectRecommendation, ...screening.cautionFlags] : screening.cautionFlags,
    };
  }

  const recent7 = getRecentLogs(userData, 7);
  const avgSE = assessment.weeklyAverages.avgSE7d || 0;
  const avgLatency = assessment.weeklyAverages.avgSleepLatency7d || 0;
  const avgWASO = assessment.weeklyAverages.avgWASO7d || 0;
  const avgTIB = assessment.weeklyAverages.avgTIB7d || 0;
  const avgTST = assessment.weeklyAverages.avgTST7d || 0;
  const highestDbas = getHighestDbasDimension(userData);
  const bedtimeArousal = average(recent7.map((log) => log.bedtimeEmotionArousal || 0)) || 0;
  const readiness = userData.riskProfile.readinessForBehaviorChange || 'moderate';
  const dropoutRisk = userData.adherenceProfile.dropoutRisk || 'low';

  const stimulusScore = [
    avgLatency > 30,
    avgWASO > 30,
    conceptualization.perpetuate.includes('在床清醒过久'),
    conceptualization.perpetuate.includes('睡不着时继续躺床努力入睡'),
    conceptualization.perpetuate.includes('睡前或在床使用手机/工作'),
  ].filter(Boolean).length;

  const restrictionSafe = screening.cautionFlags.every((flag) => !flag.includes('睡眠限制'));
  const restrictionContinuationCandidate =
    userData.treatmentPhase.phase === 'intensive' &&
    userData.treatmentPhase.currentWeek >= 2 &&
    avgTIB > 0 &&
    avgTST > 0 &&
    avgTIB <= avgTST + 45 &&
    restrictionSafe;
  const restrictionInitiationCandidate = [
    avgSE < 85,
    avgTIB - avgTST > 45 || conceptualization.perpetuate.includes('提前上床或赖床'),
    readiness !== 'low',
    restrictionSafe,
  ].filter(Boolean).length >= 3;
  const restrictionCandidate = restrictionInitiationCandidate || restrictionContinuationCandidate;

  const shouldCompress =
    restrictionCandidate &&
    (dropoutRisk !== 'low' ||
      readiness === 'moderate' ||
      assessment.daytimeImpairmentLevel === 'severe');

  const cognitivePriority = [
    (assessment.cognitionMoodMetrics.dbasTotal || 0) >= 4,
    conceptualization.perpetuate.includes('灾难化睡眠认知'),
    conceptualization.perpetuate.includes('对睡眠后果过度放大'),
    includesAny(recent7.flatMap((log) => log.preSleepThoughts || []), ['必须', '完了', '撑不住']),
  ].filter(Boolean).length >= 2;

  const relaxationPriority = [
    bedtimeArousal >= 3,
    includesAny(recent7.flatMap((log) => log.preSleepThoughts || []), ['停不下来', '脑子', '紧张', '想太多', '反复想']),
    (assessment.cognitionMoodMetrics.anxietyBurden || 0) >= 8,
    conceptualization.perpetuate.includes('努力性入睡与睡前高唤醒'),
  ].filter(Boolean).length >= 2;

  const hygieneAuxiliary = [
    (average(recent7.map((log) => log.caffeineIntake || 0)) || 0) >= 2,
    recent7.some((log) => (log.alcoholIntake || 0) > 0 || log.nicotineUse),
    (average(recent7.map((log) => log.eveningScreenExposure || 0)) || 0) > 60,
    recent7.some((log) => (log.nocturnalEnvironmentIssues || []).length > 0),
  ].filter(Boolean).length >= 1;

  const paradoxicalCandidate = avgLatency > 45 && bedtimeArousal >= 3.5 && includesAny(recent7.flatMap((log) => log.preSleepThoughts || []), ['必须', '赶紧']);
  const biofeedbackCandidate = relaxationPriority && userData.physiologicalData.some((item) => (item.restingHeartRate || 0) > 82 || (item.heartRateVariability || 0) < 25);
  const scheduleModuleCandidate =
    (assessment.scheduleStability.bedtimeVariability || 0) > 45 ||
    (assessment.scheduleStability.waketimeVariability || 0) > 45 ||
    (assessment.scheduleStability.weekendCatchupSleep || 0) > 60 ||
    (average(recent7.map((log) => log.weekendScheduleDeviation || 0)) || 0) > 60;
  const relapseCandidate = avgSE >= 85 && recent7.length >= 7 && userData.treatmentPhase.currentWeek >= 4;

  let stage: TreatmentStage = '阶段化治疗计划';
  if (recent7.length < 7 || !getLatestScale(userData.dbasResults) || !getLatestScale(userData.psqiResults)) {
    stage = '失眠临床评估';
  } else if (userData.treatmentPhase.currentWeek <= 1) {
    stage = '个案概念化';
  } else if (relapseCandidate) {
    stage = '巩固与复发预防';
  } else {
    stage = '逐周复盘与调参';
  }

  const relaxationProfile =
    dropoutRisk !== 'low'
      ? 'execution_difficulty'
      : includesAny(recent7.flatMap((log) => log.preSleepThoughts || []), ['脑子', '停不下来', '反复想'])
        ? 'high_cognitive'
        : recent7.some((log) => (log.painOrSomaticSymptoms || 0) >= 3)
          ? 'high_muscle_tension'
          : 'pressure_load';

  const sleepWindowMinutes =
    avgTST > 0 ? Math.max(5 * 60, Math.min(8 * 60, avgTST + (shouldCompress ? 45 : 30))) : null;
  const fixedWakeTime = averageClockTime(recent7.map((log) => log.getUpTime), 'day');

  const primaryModuleIds: TreatmentModuleId[] = [];
  if (stimulusScore >= 3) {
    primaryModuleIds.push('stimulusControl');
  }
  if (restrictionCandidate) {
    primaryModuleIds.push(shouldCompress ? 'sleepCompression' : 'sleepRestriction');
  }
  if (primaryModuleIds.length === 0) {
    primaryModuleIds.push(scheduleModuleCandidate ? 'sleepReschedulingOrReinforcement' : 'stimulusControl');
  }

  const secondaryModuleIds: TreatmentModuleId[] = [];
  if (cognitivePriority && !primaryModuleIds.includes('cognitiveTherapy')) {
    secondaryModuleIds.push('cognitiveTherapy');
  }
  if (relaxationPriority) {
    secondaryModuleIds.push('relaxationTraining');
  }
  if (scheduleModuleCandidate && !primaryModuleIds.includes('sleepReschedulingOrReinforcement')) {
    secondaryModuleIds.push('sleepReschedulingOrReinforcement');
  }
  if (hygieneAuxiliary) {
    secondaryModuleIds.push('sleepHygieneEducation');
  }
  if (paradoxicalCandidate) {
    secondaryModuleIds.push('paradoxicalIntention');
  }
  if (biofeedbackCandidate) {
    secondaryModuleIds.push('biofeedback');
  }

  const deferredCandidates: TreatmentModuleId[] = [
    'sleepHygieneEducation',
    'paradoxicalIntention',
    'biofeedback',
    'relapsePrevention',
    'cognitiveTherapy',
    'relaxationTraining',
  ];
  const deferredModuleIds = deferredCandidates.filter((moduleId, index, source) => {
    const selected = primaryModuleIds.includes(moduleId) || secondaryModuleIds.includes(moduleId);
    return !selected && source.indexOf(moduleId) === index && (moduleId !== 'relapsePrevention' || !relapseCandidate);
  });

  if (relapseCandidate) {
    secondaryModuleIds.push('relapsePrevention');
  } else {
    deferredModuleIds.push('relapsePrevention');
  }

  const moduleContext = {
    assessment,
    conceptualization,
    screening,
    sleepWindowMinutes,
    fixedWakeTime,
    relaxationProfile,
  };

  const rationaleByModule: Record<string, string> = {
    stimulusControl:
      '当前在床清醒时间长、床与清醒/焦虑绑定明显，因此先用刺激控制重建床与睡眠的条件联结。',
    sleepRestriction:
      '近 7 天平均睡眠效率低于 85%，且存在补偿性拉长卧床时间，因此优先用睡眠限制提升睡眠驱动力。',
    sleepCompression:
      '存在低睡眠效率和补偿性卧床，但考虑依从性或脆弱性，先用更温和的睡眠压缩替代严格睡眠限制。',
    cognitiveTherapy:
      'DBAS 和睡前自动思维提示灾难化认知仍在维持失眠，因此认知疗法作为重点辅方案。',
    relaxationTraining:
      '睡前高唤醒仍明显，需要用分型放松训练先降低生理或认知激活。',
    sleepHygieneEducation:
      '存在明确的刺激物、屏幕或环境问题，但这些问题只作为辅助模块处理，不替代核心 CBT-I。',
    paradoxicalIntention:
      '当“必须马上睡着”的努力性入睡很强时，反常意向可帮助降低表现焦虑。',
    biofeedback:
      '若生理唤醒信号明显且普通放松帮助有限，可加用生物反馈辅助训练。',
    sleepReschedulingOrReinforcement:
      '作息波动和周末补觉会稀释睡眠驱动力，因此需要先稳住起床时间和睡眠窗口。',
    relapsePrevention:
      '当核心指标稳定后，复发预防用于把关键做法从“任务”转成长期策略。',
  };

  const primaryModules = primaryModuleIds.slice(0, 2).map((id) => buildModuleSelection(id, rationaleByModule[id], moduleContext));
  const secondaryModules = secondaryModuleIds
    .filter((id, index, source) => source.indexOf(id) === index)
    .slice(0, 3)
    .map((id) => buildModuleSelection(id, rationaleByModule[id], moduleContext));
  const deferredModules = deferredModuleIds
    .filter((id, index, source) => source.indexOf(id) === index)
    .slice(0, 4)
    .map((id) => buildModuleSelection(id, `${MODULE_TITLES[id]} 当前暂不作为优先模块启动。`, moduleContext));

  const goals = [
    primaryModules.length > 0 ? `先把主方案稳定到位：${primaryModules.map((module) => module.title).join(' + ')}` : null,
    conceptualization.currentPriorityTargets[0]
      ? `优先处理 ${conceptualization.currentPriorityTargets[0]} 这一维持因素`
      : null,
    cognitivePriority ? '开始用结构化认知记录降低灾难化睡眠信念' : null,
    relaxationPriority ? '降低睡前高唤醒，减少“越想睡越清醒”的循环' : null,
  ].filter(Boolean) as string[];

  const plan: StructuredTreatmentPlan = {
    stage,
    goals: goals.slice(0, 4),
    primaryModules,
    secondaryModules,
    deferredModules,
    rationaleByModule,
    dailyTasks: [],
    weeklyAdjustmentRules: [
      'avgSE7d > 90%：下周增加在床时间 15-30 分钟。',
      'avgSE7d 在 85%-90%：保持当前在床时间不变。',
      'avgSE7d < 85%：若无明显不耐受或风险信号，下周减少在床时间 15-30 分钟。',
      '刺激控制执行率差时，先复盘障碍，而不是直接加码睡眠限制。',
      '认知和放松模块以每周完成频率、主观帮助度和高唤醒变化作为调参依据。',
    ],
    safetyNotes: screening.cautionFlags.length > 0 ? screening.cautionFlags : ['如出现情绪明显恶化、极端日间嗜睡或疑似其他睡眠障碍信号，暂停自动调参。'],
  };

  plan.dailyTasks = buildDailyTasks(plan);
  return plan;
}

function buildAnalysisBundle(userData: UserData): CBTIAnalysisBundle {
  const screening = buildScreening(userData);
  const assessment = buildAssessment(userData);
  const caseConceptualization = buildConceptualization(userData, assessment);
  const treatmentPlan = buildTreatmentPlan(userData, screening, assessment, caseConceptualization);
  const weeklyReview = buildWeeklyReview(userData, screening, assessment, treatmentPlan);

  return {
    screening,
    assessment,
    caseConceptualization,
    treatmentPlan,
    weeklyReview,
  };
}

function buildLegacyRecommendations(bundle: CBTIAnalysisBundle): LegacyRecommendation[] {
  const toRecommendation = (module: ModuleSelection, priority: 'high' | 'medium' | 'low'): LegacyRecommendation => ({
    category: moduleType(module.id),
    priority,
    title: module.title,
    description: module.dailyActions[0] || module.rationale,
    rationale: module.rationale,
  });

  return [
    ...bundle.treatmentPlan.primaryModules.map((module) => toRecommendation(module, 'high')),
    ...bundle.treatmentPlan.secondaryModules.map((module) => toRecommendation(module, 'medium')),
    ...bundle.treatmentPlan.deferredModules.slice(0, 1).map((module) => toRecommendation(module, 'low')),
  ];
}

function buildLegacyCognition(bundle: CBTIAnalysisBundle) {
  return {
    dbas: {
      highestDimension: bundle.assessment.cognitionMoodMetrics.highestDBASDimension,
      totalScore: bundle.assessment.cognitionMoodMetrics.dbasTotal,
      severity: bundle.assessment.cognitionMoodMetrics.dbasTotal && bundle.assessment.cognitionMoodMetrics.dbasTotal >= 4.5
        ? 'high'
        : bundle.assessment.cognitionMoodMetrics.dbasTotal && bundle.assessment.cognitionMoodMetrics.dbasTotal >= 3
          ? 'moderate'
          : 'low',
    },
    psqi: {
      totalScore: bundle.assessment.cognitionMoodMetrics.psqiTotal,
      worstComponent: bundle.assessment.cognitionMoodMetrics.worstPSQIComponent,
    },
    combinedInsights: [
      bundle.caseConceptualization.summaryText,
      ...bundle.treatmentPlan.primaryModules.map((module) => module.rationale),
    ].slice(0, 3),
  };
}

function buildLegacyProgress(bundle: CBTIAnalysisBundle) {
  const avgSE = bundle.assessment.weeklyAverages.avgSE7d || 0;
  const dbas = bundle.assessment.cognitionMoodMetrics.dbasTotal || 0;
  const overallProgress = Math.max(0, Math.min(1, (avgSE / 100) * 0.7 + Math.max(0, 1 - dbas / 6) * 0.3));

  return {
    efficiencyImprovement: avgSE,
    dbasImprovement: dbas > 0 ? -dbas : 0,
    taskCompletionRate: null,
    overallProgress,
  };
}

export function createAnalysisEngine(userData: UserData) {
  return {
    buildAnalysisBundle: () => buildAnalysisBundle(userData),
  };
}

export const analysisService = {
  buildAnalysisBundle,
  analyzeSleep: (userData: UserData) => buildAnalysisBundle(userData).assessment,
  analyzeCognition: (userData: UserData) => buildLegacyCognition(buildAnalysisBundle(userData)),
  buildTreatmentPlan: (userData: UserData) => buildAnalysisBundle(userData).treatmentPlan,
  buildWeeklyReview: (userData: UserData) => buildAnalysisBundle(userData).weeklyReview,
  generateRecommendations: (userData: UserData) => buildLegacyRecommendations(buildAnalysisBundle(userData)),
  generateTasks: (userData: UserData) => buildAnalysisBundle(userData).treatmentPlan.dailyTasks,
  calculateProgress: (userData: UserData) => buildLegacyProgress(buildAnalysisBundle(userData)),
};
