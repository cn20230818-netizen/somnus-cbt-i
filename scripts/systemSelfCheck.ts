import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DBASForm } from '../src/components/DBASForm';
import { PSQIForm } from '../src/components/PSQIForm';
import { createDemoUserData, createEmptyUserData, createInitialAppState } from '../src/data/demoData';
import { getAssessmentSummaries, getEmptyStateMessage, getHomeSummary } from '../src/lib/insights';
import { HomePage } from '../src/pages/HomePage';
import { AssessmentsPage } from '../src/pages/AssessmentsPage';
import { SleepRecordsPage } from '../src/pages/SleepRecordsPage';
import { TreatmentPlanPage } from '../src/pages/TreatmentPlanPage';
import { clearStoredUserData, loadUserData, saveUserData } from '../src/lib/storage';
import { analysisService } from '../src/services/analysisEngine';
import { generateTaskPlan } from '../src/services/geminiService';
import { AppState, DBASResult, PSQIResult, SleepLog, UserData } from '../src/types';

type CheckStatus = 'pass' | 'fail';

type CheckItem = {
  area: string;
  name: string;
  status: CheckStatus;
  detail: string;
};

const checks: CheckItem[] = [];

function record(area: string, name: string, passed: boolean, detail: string) {
  checks.push({
    area,
    name,
    status: passed ? 'pass' : 'fail',
    detail,
  });
}

function withCompletedIntake(userData: UserData): UserData {
  return {
    ...userData,
    riskProfile: {
      ...userData.riskProfile,
      insomniaDuration: userData.riskProfile.insomniaDuration || '6 个月',
      onsetTrigger: userData.riskProfile.onsetTrigger || '持续工作压力后起病',
      treatmentPreference: userData.riskProfile.treatmentPreference || '愿意按阶段执行行为调整',
      readinessForBehaviorChange: userData.riskProfile.readinessForBehaviorChange || 'moderate',
    },
  };
}

function buildLog(date: string, efficiency: number, options: Partial<SleepLog> = {}): SleepLog {
  return {
    id: `log_${date}`,
    date,
    bedTime: '23:30',
    fallAsleepTime: '00:00',
    wakeTime: '06:40',
    getUpTime: '07:00',
    wakeCount: 1,
    wakeDuration: 20,
    sleepQuality: 3,
    daytimeSleepiness: 3,
    efficiency,
    ...options,
  };
}

function withAssessmentData(userData: UserData): UserData {
  const dbas: DBASResult = {
    date: '2026-04-21',
    totalScore: 4.2,
    subScores: {
      consequences: 4.8,
      worry: 4.1,
      expectations: 3.8,
      medication: 2.2,
    },
    responses: {},
  };

  const psqi: PSQIResult = {
    date: '2026-04-21',
    totalScore: 11,
    components: {
      quality: 2,
      latency: 2,
      duration: 1,
      efficiency: 2,
      disturbances: 2,
      medication: 0,
      dysfunction: 2,
    },
    responses: {},
  };

  return {
    ...userData,
    dbasResults: [dbas],
    psqiResults: [psqi],
  };
}

function buildWeekScenario(avgEfficiency: number): UserData {
  const base = withAssessmentData(withCompletedIntake(createEmptyUserData(new Date('2026-04-21'))));
  const logs = Array.from({ length: 7 }, (_, index) => {
    const date = `2026-04-${String(15 + index).padStart(2, '0')}`;
    return buildLog(date, avgEfficiency, {
      daytimeSleepiness: avgEfficiency < 85 ? 4 : 2,
      wakeDuration: avgEfficiency < 85 ? 45 : 15,
      bedtimeEmotionArousal: avgEfficiency < 85 ? 4 : 2,
      napDuration: avgEfficiency < 85 ? 40 : 10,
      preSleepThoughts: avgEfficiency < 85 ? ['今晚必须睡着', '明天会撑不住'] : ['按计划继续'],
    });
  });

  return {
    ...base,
    sleepLogs: logs,
  };
}

function installMemoryStorage() {
  const store = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };

  Object.assign(globalThis, {
    window: {
      localStorage,
    },
  });
}

function renderMarkup(node: ReturnType<typeof createElement>) {
  const originalError = console.error;
  const originalWarn = console.warn;
  console.error = (...args: unknown[]) => {
    const message = String(args[0] || '');
    if (message.includes('The width(-1) and height(-1) of chart should be greater than 0')) {
      return;
    }
    originalError(...args);
  };
  console.warn = (...args: unknown[]) => {
    const message = String(args[0] || '');
    if (message.includes('The width(-1) and height(-1) of chart should be greater than 0')) {
      return;
    }
    originalWarn(...args);
  };

  try {
    return renderToStaticMarkup(node);
  } finally {
    console.error = originalError;
    console.warn = originalWarn;
  }
}

function seedDbasLastPageDraft() {
  const responses = Object.fromEntries(Array.from({ length: 30 }, (_, index) => [index, 5]));
  window.localStorage.setItem('somnus_dbas_draft_v2', JSON.stringify({ page: 5, responses }));
}

function seedPsqiLastStepDraft() {
  window.localStorage.setItem(
    'somnus_psqi_draft_v2',
    JSON.stringify({
      step: 7,
      responses: {
        quality: 2,
        latency: 2,
        duration: 1,
        efficiency: 2,
        medication: 0,
        dysfunction: 2,
      },
      disturbanceResponses: {
        夜间醒来或过早醒来: 2,
        起床上厕所: 1,
        呼吸不畅: 0,
        咳嗽或鼾声影响睡眠: 0,
        觉得太冷: 0,
        觉得太热: 1,
        做噩梦: 1,
        疼痛不适: 1,
        其他影响睡眠的情况: 0,
      },
      bedTime: '23:00',
      fallAsleepTime: '23:30',
      wakeTime: '06:40',
      getUpTime: '07:00',
    }),
  );
}

async function main() {
  installMemoryStorage();

  const baseState: AppState = createInitialAppState();
  record('代码级', '初始 AppState 创建', baseState.dataMode === 'unset' && !baseState.setupComplete, 'createInitialAppState 可正常返回默认状态。');

  const realUser = createEmptyUserData(new Date('2026-04-21'));
  const emptyMessage = getEmptyStateMessage(realUser);
  record('功能级 路径A', '首次进入空状态引导', emptyMessage.title.includes('基础建档'), `空状态标题为“${emptyMessage.title}”。`);

  const userWithIntake = withCompletedIntake(realUser);
  const userWithFirstLog: UserData = {
    ...userWithIntake,
    sleepLogs: [
      buildLog('2026-04-21', 81, {
        wakeDuration: 35,
        bedtimeEmotionArousal: 4,
        preSleepThoughts: ['今晚又怕睡不好'],
        weekendScheduleDeviation: 60,
      }),
    ],
  };
  const homeSummary = getHomeSummary(userWithFirstLog);
  record('功能级 路径A', '录入首晚睡眠后首页更新', Boolean(homeSummary?.efficiency === 81), `首页摘要${homeSummary ? '已生成' : '未生成'}。`);

  const userWithScales = withAssessmentData(userWithFirstLog);
  const summaries = getAssessmentSummaries(userWithScales);
  record(
    '功能级 路径B',
    '完成 DBAS / PSQI 后生成摘要',
    summaries.dbasSummary.value !== '未完成' && summaries.psqiSummary.value !== '未完成',
    `DBAS=${summaries.dbasSummary.value}，PSQI=${summaries.psqiSummary.value}。`,
  );

  const demoUser = createDemoUserData(new Date('2026-04-21'));
  const demoPlan = analysisService.buildAnalysisBundle(demoUser);

  const homeMarkup = renderMarkup(
    createElement(HomePage, {
      userData: demoUser,
      onOpenSleepRecords: () => undefined,
      onOpenPlan: () => undefined,
      onOpenAccount: () => undefined,
    }),
  );
  record(
    '代码级',
    '首页可渲染且机构品牌突出',
    homeMarkup.includes('陕西省中医医院脑病科') && homeMarkup.includes('今日睡眠概况'),
    '首页品牌区与首屏状态卡可正常输出。',
  );

  const recordsMarkup = renderMarkup(
    createElement(SleepRecordsPage, {
      userData: demoUser,
      composerOpen: true,
      onComposerOpenChange: () => undefined,
      onSaveLog: () => undefined,
    }),
  );
  record(
    '代码级',
    '睡眠日志页可渲染三步表单',
    recordsMarkup.includes('记录一晚睡眠，也理解一晚睡眠') &&
      recordsMarkup.includes('下一步') &&
      recordsMarkup.includes('保存前自动计算'),
    '睡眠日志页与录入弹层可正常渲染。',
  );

  const planMarkup = renderMarkup(
    createElement(TreatmentPlanPage, {
      userData: demoUser,
      taskGenerationMessage: null,
      onGenerateTasks: () => undefined,
      onCompleteTask: () => undefined,
      onAddHygieneTask: () => undefined,
    }),
  );
  record(
    '代码级',
    '治疗计划页可渲染结构化计划单',
    planMarkup.includes('当前评估结论') && planMarkup.includes('主方案与辅方案') && planMarkup.includes('下周调整依据'),
    '治疗计划单的核心板块可正常输出。',
  );

  const assessmentMarkup = renderMarkup(
    createElement(AssessmentsPage, {
      userData: demoUser,
      dataMode: 'demo',
      onOpenIntake: () => undefined,
      onOpenDbas: () => undefined,
      onOpenPsqi: () => undefined,
      onExportData: () => undefined,
      onSwitchToRealMode: () => undefined,
      onReloadDemoData: () => undefined,
    }),
  );
  record(
    '代码级',
    '评估页可渲染建档与量表入口',
    assessmentMarkup.includes('入组筛查与基础建档') && assessmentMarkup.includes('DBAS 睡眠信念评估'),
    '评估页的建档区和量表入口可正常输出。',
  );

  record(
    '功能级 路径C',
    '治疗计划生成主方案与辅方案',
    demoPlan.treatmentPlan.primaryModules.length > 0 && demoPlan.treatmentPlan.secondaryModules.length > 0,
    `主方案 ${demoPlan.treatmentPlan.primaryModules.map((item) => item.title).join('、')}；辅方案 ${demoPlan.treatmentPlan.secondaryModules.map((item) => item.title).join('、')}。`,
  );

  const taskPlan = await generateTaskPlan(demoUser);
  record(
    '功能级 路径C',
    '任务计划由结构化方案派生',
    taskPlan.tasks.length > 0 && Boolean(taskPlan.analysis.treatmentPlan.stage),
    `生成 ${taskPlan.tasks.length} 个任务，模式=${taskPlan.mode}。`,
  );

  const highEfficiencyReview = analysisService.buildAnalysisBundle(buildWeekScenario(92)).weeklyReview;
  const midEfficiencyReview = analysisService.buildAnalysisBundle(buildWeekScenario(87)).weeklyReview;
  const lowEfficiencyReview = analysisService.buildAnalysisBundle(buildWeekScenario(80)).weeklyReview;
  record(
    '功能级 路径D',
    '高睡眠效率场景增加在床时间',
    highEfficiencyReview.adjustmentDecision.includes('增加在床时间'),
    highEfficiencyReview.adjustmentDecision,
  );
  record(
    '功能级 路径D',
    '中等睡眠效率场景保持不变',
    midEfficiencyReview.adjustmentDecision.includes('保持当前在床时间不变'),
    midEfficiencyReview.adjustmentDecision,
  );
  record(
    '功能级 路径D',
    '低睡眠效率场景减少在床时间',
    lowEfficiencyReview.adjustmentDecision.includes('减少在床时间'),
    lowEfficiencyReview.adjustmentDecision,
  );

  const switchedDemo = createDemoUserData(new Date('2026-04-21'));
  const clearedReal = createEmptyUserData(new Date('2026-04-21'));
  record(
    '功能级 路径E',
    '示例数据与真实数据切换',
    switchedDemo.sleepLogs.length > 0 && clearedReal.sleepLogs.length === 0,
    `示例数据 ${switchedDemo.sleepLogs.length} 晚，清空后 ${clearedReal.sleepLogs.length} 晚。`,
  );

  seedDbasLastPageDraft();
  const dbasMobileMarkup = renderMarkup(
    createElement(DBASForm, {
      onClose: () => undefined,
      onSave: () => undefined,
    }),
  );
  record(
    '功能级 路径F',
    'DBAS 最后一页可显示提交按钮',
    dbasMobileMarkup.includes('最后一页，提交整份评估') && dbasMobileMarkup.includes('提交评估'),
    'DBAS 末页主操作按钮可正常渲染。',
  );

  seedPsqiLastStepDraft();
  const psqiMobileMarkup = renderMarkup(
    createElement(PSQIForm, {
      onClose: () => undefined,
      onSave: () => undefined,
    }),
  );
  record(
    '功能级 路径F',
    'PSQI 最后一步可显示提交按钮',
    psqiMobileMarkup.includes('最后一步，提交整份评估') && psqiMobileMarkup.includes('提交评估'),
    'PSQI 末步主操作按钮可正常渲染。',
  );

  const unsuitableUser = {
    ...withAssessmentData(withCompletedIntake(createDemoUserData(new Date('2026-04-21')))),
    riskProfile: {
      ...withCompletedIntake(createDemoUserData(new Date('2026-04-21'))).riskProfile,
      respiratoryRisk: 'high' as const,
    },
  };
  const unsuitableBundle = analysisService.buildAnalysisBundle(unsuitableUser);
  record(
    '算法级',
    'OSA 高风险可被拦截',
    !unsuitableBundle.screening.eligibleForStandardCBTI && Boolean(unsuitableBundle.screening.redirectRecommendation?.includes('呼吸')),
    unsuitableBundle.screening.redirectRecommendation || '未返回拦截说明',
  );

  record(
    '算法级',
    '可输出 3P 个案概念化',
    demoPlan.caseConceptualization.perpetuate.length > 0 && demoPlan.caseConceptualization.summaryText.length > 0,
    demoPlan.caseConceptualization.summaryText,
  );

  record(
    '算法级',
    '睡眠卫生不作为默认主方案',
    demoPlan.treatmentPlan.primaryModules.every((item) => item.id !== 'sleepHygieneEducation'),
    `主方案为 ${demoPlan.treatmentPlan.primaryModules.map((item) => item.id).join('、')}。`,
  );

  const cognitiveModule = demoPlan.treatmentPlan.secondaryModules.find((item) => item.id === 'cognitiveTherapy');
  record(
    '算法级',
    '认知疗法流程化输出',
    Boolean(cognitiveModule?.flowSteps?.length === 7 && cognitiveModule.forms?.length),
    cognitiveModule ? `步骤数 ${cognitiveModule.flowSteps?.length || 0}，表单 ${cognitiveModule.forms?.join('、')}` : '当前场景未触发认知疗法',
  );

  const relaxationModule = [...demoPlan.treatmentPlan.primaryModules, ...demoPlan.treatmentPlan.secondaryModules].find(
    (item) => item.id === 'relaxationTraining',
  );
  record(
    '算法级',
    '放松训练支持分型与执行说明',
    Boolean(relaxationModule?.duration && relaxationModule.frequency && relaxationModule.evaluationHint),
    relaxationModule
      ? `${relaxationModule.title}｜${relaxationModule.frequency}｜${relaxationModule.duration}`
      : '当前场景未触发放松训练',
  );

  const oldStylePayload = {
    sleepLogs: [],
    dbasResults: [],
    psqiResults: [],
    physiologicalData: [],
    tasks: [],
    treatmentPhase: {
      phase: 'assessment',
      startDate: '2026-04-21',
      currentWeek: 1,
      goals: ['建立基线数据'],
    },
    preferences: {
      reminders: true,
      notificationTime: '21:00',
      language: 'zh',
      dataSharing: false,
    },
  };
  saveUserData(oldStylePayload as unknown as UserData);
  const loadedUser = loadUserData({ setupComplete: true, dataMode: 'real' });
  record(
    '代码级',
    '旧数据结构兼容加载',
    Array.isArray(loadedUser.isiResults) && Array.isArray(loadedUser.osaRiskResults) && Boolean(loadedUser.riskProfile),
    '缺失的新字段已由 mergeUserData 自动补齐。',
  );
  clearStoredUserData();
  record('代码级', '本地存储清理', loadUserData({ setupComplete: true, dataMode: 'real' }).sleepLogs.length === 0, 'clearStoredUserData 后可恢复为空数据。');

  const failed = checks.filter((item) => item.status === 'fail');
  const grouped = checks.reduce<Record<string, CheckItem[]>>((accumulator, item) => {
    accumulator[item.area] ||= [];
    accumulator[item.area].push(item);
    return accumulator;
  }, {});

  console.log(JSON.stringify({
    summary: {
      total: checks.length,
      passed: checks.length - failed.length,
      failed: failed.length,
    },
    checks: grouped,
  }, null, 2));

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
