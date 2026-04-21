import {
  BipolarRiskResult,
  NumericScaleResult,
  OSARiskResult,
  RiskLevel,
  SeverityLevel,
} from '../types';

export type StructuredAssessmentKey = 'isi' | 'ess' | 'gad7' | 'phq9' | 'osa' | 'bipolar';
export type StructuredAssessmentResult = NumericScaleResult | OSARiskResult | BipolarRiskResult;

export interface StructuredAssessmentOption {
  score: number;
  label: string;
  description?: string;
}

export interface StructuredAssessmentQuestion {
  id: string;
  title: string;
  hint: string;
  options: StructuredAssessmentOption[];
}

export interface StructuredAssessmentSummary {
  value: string;
  emphasis: string;
  description: string;
  helper?: string;
}

export interface StructuredAssessmentDefinition {
  key: StructuredAssessmentKey;
  title: string;
  subtitle: string;
  description: string;
  intro: string;
  responseWindow: string;
  draftKey: string;
  pageSize: number;
  questions: StructuredAssessmentQuestion[];
  submitLabel: string;
  resultTitle: string;
  buildResult: (responses: Record<string, number>) => StructuredAssessmentResult;
  summarizeResult: (result: StructuredAssessmentResult) => StructuredAssessmentSummary;
}

const FREQUENCY_OPTIONS = [
  { score: 0, label: '完全没有', description: '最近两周几乎没有出现。' },
  { score: 1, label: '几天', description: '最近两周偶尔会出现。' },
  { score: 2, label: '一半以上天数', description: '最近两周出现得比较频繁。' },
  { score: 3, label: '几乎每天', description: '最近两周多数时候都会出现。' },
];

const FOUR_POINT_IMPACT_OPTIONS = [
  { score: 0, label: '没有问题', description: '目前几乎不受影响。' },
  { score: 1, label: '轻度', description: '有些影响，但仍可应对。' },
  { score: 2, label: '中度', description: '已经明显影响日常状态。' },
  { score: 3, label: '较重', description: '影响比较持续，需要重点关注。' },
  { score: 4, label: '非常严重', description: '影响很明显，当前负担较高。' },
];

const YES_NO_OPTIONS = [
  { score: 0, label: '否', description: '当前没有或基本没有。' },
  { score: 1, label: '是', description: '当前有或经常有。' },
];

function todayDate() {
  return new Date().toISOString().split('T')[0];
}

export function getSeverityLabel(level?: SeverityLevel) {
  switch (level) {
    case 'severe':
      return '较重';
    case 'moderately_severe':
      return '中重度';
    case 'moderate':
      return '中度';
    case 'mild':
      return '轻度';
    default:
      return '轻微或待观察';
  }
}

export function getRiskLevelLabel(level?: RiskLevel) {
  switch (level) {
    case 'high':
      return '高风险提示';
    case 'moderate':
      return '中等风险提示';
    default:
      return '低风险提示';
  }
}

function buildNumericResult(
  score: number,
  severity: SeverityLevel,
  interpretation: string,
  responses: Record<string, number>,
): NumericScaleResult {
  return {
    date: todayDate(),
    score,
    severity,
    interpretation,
    responses,
  };
}

function buildRiskResult(
  riskLevel: RiskLevel,
  score: number,
  note: string,
  responses: Record<string, number>,
): OSARiskResult | BipolarRiskResult {
  return {
    date: todayDate(),
    riskLevel,
    score,
    note,
    responses,
  };
}

function sumResponses(responses: Record<string, number>) {
  return Object.values(responses).reduce((total, value) => total + value, 0);
}

function buildIsiResult(responses: Record<string, number>) {
  const score = sumResponses(responses);
  if (score >= 22) {
    return buildNumericResult(score, 'severe', '提示失眠困扰较重，建议尽快结合医生指导推进分层干预。', responses);
  }
  if (score >= 15) {
    return buildNumericResult(score, 'moderate', '提示存在中度失眠困扰，适合把核心 CBT-I 模块作为本周重点。', responses);
  }
  if (score >= 8) {
    return buildNumericResult(score, 'mild', '提示存在一定失眠困扰，可继续结合睡眠日志和治疗计划推进干预。', responses);
  }
  return buildNumericResult(score, 'minimal', '当前失眠困扰程度相对较轻，建议继续记录并观察变化。', responses);
}

function summarizeIsiResult(result: StructuredAssessmentResult): StructuredAssessmentSummary {
  const numeric = result as NumericScaleResult;
  return {
    value: `${numeric.score} / 28`,
    emphasis: `严重度：${getSeverityLabel(numeric.severity)}`,
    description:
      numeric.interpretation ||
      '用于辅助理解近期失眠困扰程度，不替代面对面诊断与治疗决策。',
    helper: 'ISI 更适合帮助理解失眠整体困扰强度，以及是否需要尽快进入更系统的 CBT-I 干预。',
  };
}

function buildEssResult(responses: Record<string, number>) {
  const score = sumResponses(responses);
  if (score >= 16) {
    return buildNumericResult(score, 'severe', '提示明显日间嗜睡，应继续排查其他睡眠障碍或治疗不耐受。', responses);
  }
  if (score >= 10) {
    return buildNumericResult(score, 'moderate', '提示日间困倦已经比较明显，需要结合夜间记录和风险筛查继续判断。', responses);
  }
  if (score >= 8) {
    return buildNumericResult(score, 'mild', '提示存在轻度日间嗜睡，可继续观察睡眠恢复质量与作息稳定性。', responses);
  }
  return buildNumericResult(score, 'minimal', '当前日间嗜睡负担不突出，可继续结合夜间记录观察。', responses);
}

function summarizeEssResult(result: StructuredAssessmentResult): StructuredAssessmentSummary {
  const numeric = result as NumericScaleResult;
  return {
    value: `${numeric.score} / 24`,
    emphasis: `日间负担：${getSeverityLabel(numeric.severity)}`,
    description:
      numeric.interpretation ||
      '用于辅助理解白天困倦和清醒维持负担，不替代正式睡眠医学评估。',
    helper: '如果 ESS 持续偏高，即使夜间睡眠稍有改善，也要继续考虑其他睡眠障碍或日间安全风险。',
  };
}

function buildGad7Result(responses: Record<string, number>) {
  const score = sumResponses(responses);
  if (score >= 15) {
    return buildNumericResult(score, 'severe', '提示焦虑负荷较高，建议把情绪稳定和睡前高唤醒管理同步纳入计划。', responses);
  }
  if (score >= 10) {
    return buildNumericResult(score, 'moderate', '提示中度焦虑负荷，可能正在强化入睡前担忧和过度监测。', responses);
  }
  if (score >= 5) {
    return buildNumericResult(score, 'mild', '提示存在一定焦虑负荷，可继续结合认知记录和放松训练管理。', responses);
  }
  return buildNumericResult(score, 'minimal', '当前焦虑负荷相对较轻，可继续观察。', responses);
}

function summarizeGad7Result(result: StructuredAssessmentResult): StructuredAssessmentSummary {
  const numeric = result as NumericScaleResult;
  return {
    value: `${numeric.score} / 21`,
    emphasis: `焦虑负荷：${getSeverityLabel(numeric.severity)}`,
    description:
      numeric.interpretation ||
      '用于辅助理解最近两周的焦虑负荷，不替代情绪障碍正式诊断。',
    helper: 'GAD-7 偏高时，治疗计划里通常更需要关注睡前高唤醒、灾难化想法和放松训练。',
  };
}

function buildPhq9Result(responses: Record<string, number>) {
  const score = sumResponses(responses);
  if (score >= 20) {
    return buildNumericResult(score, 'severe', '提示情绪低落负荷较高，建议尽快结合医生进一步评估。', responses);
  }
  if (score >= 15) {
    return buildNumericResult(score, 'moderately_severe', '提示中重度情绪低落负荷，标准 CBT-I 需结合情绪稳定策略同步推进。', responses);
  }
  if (score >= 10) {
    return buildNumericResult(score, 'moderate', '提示中度情绪低落负荷，可能会影响执行稳定性和日间恢复。', responses);
  }
  if (score >= 5) {
    return buildNumericResult(score, 'mild', '提示存在轻度情绪低落负荷，可继续观察并在计划中关注动力与执行障碍。', responses);
  }
  return buildNumericResult(score, 'minimal', '当前情绪低落负荷相对较轻，可继续观察。', responses);
}

function summarizePhq9Result(result: StructuredAssessmentResult): StructuredAssessmentSummary {
  const numeric = result as NumericScaleResult;
  return {
    value: `${numeric.score} / 27`,
    emphasis: `情绪负荷：${getSeverityLabel(numeric.severity)}`,
    description:
      numeric.interpretation ||
      '用于辅助理解最近两周的情绪低落负荷，不替代正式精神科评估。',
    helper: 'PHQ-9 偏高时，治疗计划需要更关注执行难度、日间动力不足和风险监测。',
  };
}

function buildOsaResult(responses: Record<string, number>) {
  const score = sumResponses(responses);
  const riskLevel = score >= 4 ? 'high' : score >= 2 ? 'moderate' : 'low';
  const note =
    riskLevel === 'high'
      ? '存在较高 OSA 风险提示，不建议仅依赖标准 CBT-I 自动方案，应先进一步评估呼吸相关睡眠障碍。'
      : riskLevel === 'moderate'
        ? '存在一定 OSA 风险提示，建议与医生讨论是否需要进一步筛查。'
        : '当前未见明显 OSA 高风险信号，仍需结合临床症状综合判断。';
  return buildRiskResult(riskLevel, score, note, responses) as OSARiskResult;
}

function summarizeOsaResult(result: StructuredAssessmentResult): StructuredAssessmentSummary {
  const osa = result as OSARiskResult;
  return {
    value: getRiskLevelLabel(osa.riskLevel),
    emphasis: `风险分：${osa.score ?? 0}`,
    description:
      osa.note ||
      '用于辅助识别呼吸相关睡眠风险，不作为诊断结论。',
    helper: '如果 OSA 风险为中高水平，系统会优先提醒进一步评估，而不是直接推进标准睡眠限制类策略。',
  };
}

function buildBipolarResult(responses: Record<string, number>) {
  const score = sumResponses(responses);
  const riskLevel = score >= 4 ? 'high' : score >= 2 ? 'moderate' : 'low';
  const note =
    riskLevel === 'high'
      ? '存在较高躁期风险提示，标准 CBT-I 应在进一步评估情绪稳定性后再决定。'
      : riskLevel === 'moderate'
        ? '存在一定躁性特征线索，建议先进一步评估情绪稳定性。'
        : '当前未见明显躁期风险信号。';
  return buildRiskResult(riskLevel, score, note, responses) as BipolarRiskResult;
}

function summarizeBipolarResult(result: StructuredAssessmentResult): StructuredAssessmentSummary {
  const bipolar = result as BipolarRiskResult;
  return {
    value: getRiskLevelLabel(bipolar.riskLevel),
    emphasis: `风险分：${bipolar.score ?? 0}`,
    description:
      bipolar.note ||
      '用于辅助识别躁期风险线索，不作为双相障碍诊断结论。',
    helper: '如果双相/躁期风险提示升高，系统会先建议进一步评估，而不是直接继续自动调参。',
  };
}

export const structuredAssessmentDefinitions: Record<StructuredAssessmentKey, StructuredAssessmentDefinition> = {
  isi: {
    key: 'isi',
    title: '陕西省中医医院脑病科｜ISI 失眠严重度评估',
    subtitle: '用于了解近两周的失眠困扰程度与日间影响。',
    description: '帮助系统更准确地判断失眠负担强度，并与睡眠日志一起校准阶段化干预节奏。',
    intro: '请回忆最近两周更常见的状态，而不是只看某一晚。',
    responseWindow: '最近两周',
    draftKey: 'somnus_isi_draft_v1',
    pageSize: 3,
    submitLabel: '提交 ISI 评估',
    resultTitle: 'ISI 结果摘要',
    questions: [
      { id: 'sleep_onset', title: '最近两周，你的入睡困难程度如何？', hint: '重点看多数夜晚的入睡过程。', options: FOUR_POINT_IMPACT_OPTIONS },
      { id: 'sleep_maintenance', title: '最近两周，你夜间维持睡眠的困难程度如何？', hint: '包括夜间反复醒来后难以再次入睡。', options: FOUR_POINT_IMPACT_OPTIONS },
      { id: 'early_awakening', title: '最近两周，你清晨过早醒来的问题如何？', hint: '如果经常比计划更早醒来，可按更高程度作答。', options: FOUR_POINT_IMPACT_OPTIONS },
      { id: 'sleep_satisfaction', title: '你对自己当前的睡眠状态满意吗？', hint: '越不满意，评分越高。', options: [
        { score: 0, label: '非常满意', description: '当前基本满意。' },
        { score: 1, label: '比较满意', description: '偶尔不满意。' },
        { score: 2, label: '一般', description: '满意度一般。' },
        { score: 3, label: '不太满意', description: '经常对睡眠不满意。' },
        { score: 4, label: '非常不满意', description: '目前明显不满意。' },
      ] },
      { id: 'functional_impact', title: '睡眠问题对你白天功能的影响有多大？', hint: '例如工作、学习、注意力、情绪或生活安排。', options: FOUR_POINT_IMPACT_OPTIONS },
      { id: 'noticeability', title: '你觉得别人有多容易注意到你的睡眠问题正在影响你？', hint: '例如疲惫、反应变慢、情绪不稳。', options: FOUR_POINT_IMPACT_OPTIONS },
      { id: 'distress', title: '你对目前睡眠问题的担心或困扰有多强？', hint: '越担心、越困扰，评分越高。', options: FOUR_POINT_IMPACT_OPTIONS },
    ],
    buildResult: buildIsiResult,
    summarizeResult: summarizeIsiResult,
  },
  ess: {
    key: 'ess',
    title: '陕西省中医医院脑病科｜ESS 日间嗜睡评估',
    subtitle: '用于了解白天在不同情境中的困倦倾向。',
    description: '帮助判断白天清醒维持负担，避免只盯夜间睡眠而忽略白天恢复质量。',
    intro: '请按最近两周更常见的情况作答，选择你在该情境下“打瞌睡或睡着”的可能性。',
    responseWindow: '最近两周',
    draftKey: 'somnus_ess_draft_v1',
    pageSize: 4,
    submitLabel: '提交 ESS 评估',
    resultTitle: 'ESS 结果摘要',
    questions: [
      { id: 'reading', title: '坐着阅读时，你打瞌睡或睡着的可能性有多大？', hint: '请按典型状态作答。', options: [
        { score: 0, label: '不会', description: '基本不会打瞌睡。' },
        { score: 1, label: '轻度可能', description: '偶尔会有困意。' },
        { score: 2, label: '中度可能', description: '比较容易困倦。' },
        { score: 3, label: '高度可能', description: '很容易打瞌睡。' },
      ] },
      { id: 'tv', title: '看电视或刷视频时，你打瞌睡或睡着的可能性有多大？', hint: '按平时安静坐着观看时的状态作答。', options: [
        { score: 0, label: '不会', description: '基本不会打瞌睡。' },
        { score: 1, label: '轻度可能', description: '偶尔会有困意。' },
        { score: 2, label: '中度可能', description: '比较容易困倦。' },
        { score: 3, label: '高度可能', description: '很容易打瞌睡。' },
      ] },
      { id: 'public_place', title: '在安静的公共场所坐着时，你打瞌睡的可能性有多大？', hint: '例如会议、候诊或讲座。', options: [
        { score: 0, label: '不会', description: '基本不会打瞌睡。' },
        { score: 1, label: '轻度可能', description: '偶尔会有困意。' },
        { score: 2, label: '中度可能', description: '比较容易困倦。' },
        { score: 3, label: '高度可能', description: '很容易打瞌睡。' },
      ] },
      { id: 'car_passenger', title: '作为乘客连续坐车 1 小时时，你打瞌睡的可能性有多大？', hint: '请按平稳乘车的典型情况作答。', options: [
        { score: 0, label: '不会', description: '基本不会打瞌睡。' },
        { score: 1, label: '轻度可能', description: '偶尔会有困意。' },
        { score: 2, label: '中度可能', description: '比较容易困倦。' },
        { score: 3, label: '高度可能', description: '很容易打瞌睡。' },
      ] },
      { id: 'lying_down', title: '午后有机会躺下休息时，你睡着的可能性有多大？', hint: '按一般休息情境作答。', options: [
        { score: 0, label: '不会', description: '基本不会睡着。' },
        { score: 1, label: '轻度可能', description: '偶尔会睡着。' },
        { score: 2, label: '中度可能', description: '比较容易睡着。' },
        { score: 3, label: '高度可能', description: '很容易睡着。' },
      ] },
      { id: 'talking', title: '与人面对面交谈时，你打瞌睡的可能性有多大？', hint: '如果很少发生，按较低分作答。', options: [
        { score: 0, label: '不会', description: '基本不会。' },
        { score: 1, label: '轻度可能', description: '极少会有。' },
        { score: 2, label: '中度可能', description: '偶尔会出现。' },
        { score: 3, label: '高度可能', description: '比较容易出现。' },
      ] },
      { id: 'after_lunch', title: '午饭后安静坐着时，你打瞌睡的可能性有多大？', hint: '不考虑饮酒后的特殊情况。', options: [
        { score: 0, label: '不会', description: '基本不会。' },
        { score: 1, label: '轻度可能', description: '偶尔会有。' },
        { score: 2, label: '中度可能', description: '比较容易有。' },
        { score: 3, label: '高度可能', description: '很容易出现。' },
      ] },
      { id: 'traffic', title: '开车等红灯或短暂停车时，你打瞌睡的可能性有多大？', hint: '如果你不驾驶，可按类似需要保持清醒的安静等待情境理解。', options: [
        { score: 0, label: '不会', description: '基本不会。' },
        { score: 1, label: '轻度可能', description: '偶尔会有。' },
        { score: 2, label: '中度可能', description: '比较容易有。' },
        { score: 3, label: '高度可能', description: '很容易出现。' },
      ] },
    ],
    buildResult: buildEssResult,
    summarizeResult: summarizeEssResult,
  },
  gad7: {
    key: 'gad7',
    title: '陕西省中医医院脑病科｜GAD-7 焦虑负荷筛查',
    subtitle: '用于了解最近两周的焦虑负荷与高唤醒水平。',
    description: '帮助判断担忧、紧张和高唤醒是否正在维持失眠，也用于评估治疗推进节奏。',
    intro: '请回忆最近两周的典型情况，按出现频率作答。',
    responseWindow: '最近两周',
    draftKey: 'somnus_gad7_draft_v1',
    pageSize: 3,
    submitLabel: '提交 GAD-7 评估',
    resultTitle: 'GAD-7 结果摘要',
    questions: [
      { id: 'nervous', title: '感到紧张、焦虑或坐立不安。', hint: '例如很难真正放松下来。', options: FREQUENCY_OPTIONS },
      { id: 'uncontrollable_worry', title: '无法停止或控制担忧。', hint: '担心会自动冒出来，难以停下。', options: FREQUENCY_OPTIONS },
      { id: 'too_much_worry', title: '对很多事情都担心过多。', hint: '不只是睡眠，也可能包括工作、家庭或身体状态。', options: FREQUENCY_OPTIONS },
      { id: 'trouble_relaxing', title: '很难放松下来。', hint: '即使想休息，身心也难真正放松。', options: FREQUENCY_OPTIONS },
      { id: 'restless', title: '坐立不安，难以安静待着。', hint: '经常觉得身体或脑子停不下来。', options: FREQUENCY_OPTIONS },
      { id: 'irritable', title: '容易烦躁或易怒。', hint: '比平时更容易被小事激惹。', options: FREQUENCY_OPTIONS },
      { id: 'afraid', title: '感到好像会发生什么不好的事情。', hint: '例如总担心后面会失控。', options: FREQUENCY_OPTIONS },
    ],
    buildResult: buildGad7Result,
    summarizeResult: summarizeGad7Result,
  },
  phq9: {
    key: 'phq9',
    title: '陕西省中医医院脑病科｜PHQ-9 情绪低落筛查',
    subtitle: '用于了解最近两周的情绪低落、兴趣下降与日间动力变化。',
    description: '帮助系统判断情绪负荷是否可能影响睡眠恢复、任务执行和日间功能。',
    intro: '请回忆最近两周的典型情况，按出现频率作答。',
    responseWindow: '最近两周',
    draftKey: 'somnus_phq9_draft_v1',
    pageSize: 3,
    submitLabel: '提交 PHQ-9 评估',
    resultTitle: 'PHQ-9 结果摘要',
    questions: [
      { id: 'interest', title: '做事兴趣下降或提不起劲。', hint: '包括原本能带来轻松感的事情。', options: FREQUENCY_OPTIONS },
      { id: 'mood', title: '感到情绪低落、沮丧或没有希望。', hint: '按最近两周的多数情况作答。', options: FREQUENCY_OPTIONS },
      { id: 'sleep', title: '入睡困难、睡不稳，或睡得过多。', hint: '不只是睡不好，也包括过度睡眠。', options: FREQUENCY_OPTIONS },
      { id: 'fatigue', title: '感到疲倦或精力不足。', hint: '白天常觉得没有力气。', options: FREQUENCY_OPTIONS },
      { id: 'appetite', title: '食欲差，或吃得比平时明显更多。', hint: '如果近期变化明显，可按更高频率作答。', options: FREQUENCY_OPTIONS },
      { id: 'self_view', title: '对自己评价很低，觉得自己失败，或让家人失望。', hint: '按最近两周多数情况作答。', options: FREQUENCY_OPTIONS },
      { id: 'concentration', title: '做事时难以集中注意力。', hint: '例如读东西、看屏幕或处理工作时容易走神。', options: FREQUENCY_OPTIONS },
      { id: 'movement', title: '动作或说话明显变慢，或者反而烦躁坐不住。', hint: '如果别人也能注意到，可按更高频率作答。', options: FREQUENCY_OPTIONS },
      { id: 'self_harm_thought', title: '出现“活着没意思”或伤害自己的想法。', hint: '如果出现过，请务必及时与医生面对面沟通。', options: FREQUENCY_OPTIONS },
    ],
    buildResult: buildPhq9Result,
    summarizeResult: summarizePhq9Result,
  },
  osa: {
    key: 'osa',
    title: '陕西省中医医院脑病科｜OSA 呼吸风险筛查',
    subtitle: '用于辅助识别阻塞性睡眠呼吸暂停相关风险线索。',
    description: '这是风险筛查，不是诊断。若结果提示中高风险，应优先进一步评估，再决定是否进入标准 CBT-I 调参流程。',
    intro: '请根据过去一个月更常见的情况作答。如存在不确定项，可按最接近的真实情况选择。',
    responseWindow: '过去一个月',
    draftKey: 'somnus_osa_draft_v1',
    pageSize: 3,
    submitLabel: '提交 OSA 风险筛查',
    resultTitle: 'OSA 风险摘要',
    questions: [
      { id: 'snore', title: '睡觉时经常明显打鼾，或家人提醒你鼾声很大。', hint: '如果几乎每周都会出现，可选“是”。', options: YES_NO_OPTIONS },
      { id: 'day_sleepy', title: '白天经常困倦、打盹，或开会乘车时容易睡着。', hint: '与夜间睡眠不足无关时也请如实选择。', options: YES_NO_OPTIONS },
      { id: 'observed_apnea', title: '有人观察到你睡觉时会憋气、暂停呼吸或突然喘醒。', hint: '这是较重要的风险线索。', options: YES_NO_OPTIONS },
      { id: 'hypertension', title: '有高血压病史，或正在接受高血压相关治疗。', hint: '如有明确病史，请选“是”。', options: YES_NO_OPTIONS },
      { id: 'choking', title: '夜间常因憋醒、口干、晨起头痛或呼吸不畅而醒来。', hint: '如果这类情况较常见，请选“是”。', options: YES_NO_OPTIONS },
      { id: 'body_risk', title: '医生曾提醒你存在肥胖、颈围偏大或呼吸道塌陷相关风险。', hint: '如果有类似提示，请选“是”。', options: YES_NO_OPTIONS },
    ],
    buildResult: buildOsaResult,
    summarizeResult: summarizeOsaResult,
  },
  bipolar: {
    key: 'bipolar',
    title: '陕西省中医医院脑病科｜双相/躁期风险筛查',
    subtitle: '用于辅助识别可能影响标准 CBT-I 推进的躁性特征线索。',
    description: '这是风险筛查，不是双相障碍诊断。若结果提示中高风险，应优先进一步评估情绪稳定性，再决定是否进入标准调参流程。',
    intro: '请根据过去一年或最近最典型的发作样表现作答，如曾被家人或医生提醒，也请纳入考虑。',
    responseWindow: '过去一年或既往明显阶段',
    draftKey: 'somnus_bipolar_draft_v1',
    pageSize: 3,
    submitLabel: '提交双相风险筛查',
    resultTitle: '双相/躁期风险摘要',
    questions: [
      { id: 'less_sleep', title: '曾出现连续几天睡得明显更少，却并不觉得困。', hint: '不是因为加班或值班，而是精神仍很亢奋。', options: YES_NO_OPTIONS },
      { id: 'more_energy', title: '曾出现精力明显升高、停不下来，或比平时更冲动的阶段。', hint: '如果别人也能明显感觉到变化，请选“是”。', options: YES_NO_OPTIONS },
      { id: 'fast_thoughts', title: '曾出现说话变快、想法很多、脑子停不下来的阶段。', hint: '如果这种状态持续明显，请选“是”。', options: YES_NO_OPTIONS },
      { id: 'elevated_irritable', title: '曾出现情绪异常高涨，或明显比平时更易怒、更容易激动的阶段。', hint: '按超出平时基线的情况作答。', options: YES_NO_OPTIONS },
      { id: 'risky_behavior', title: '上述状态曾伴随冲动消费、冒险决策、过度自信或社交行为增多。', hint: '如果对工作、关系或生活造成过影响，请选“是”。', options: YES_NO_OPTIONS },
      { id: 'clinical_history', title: '你本人或医生曾提到双相、躁期、轻躁期，或家族中有相关病史。', hint: '如有明确线索，请选“是”。', options: YES_NO_OPTIONS },
    ],
    buildResult: buildBipolarResult,
    summarizeResult: summarizeBipolarResult,
  },
};

export function getStructuredAssessmentDefinition(key: StructuredAssessmentKey) {
  return structuredAssessmentDefinitions[key];
}
