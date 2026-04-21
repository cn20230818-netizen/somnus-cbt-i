import { format } from 'date-fns';
import { CBTIAnalysisBundle, CBTTask, UserData } from '../types';
import { analysisService } from './analysisEngine';

const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim() || '';

export interface TaskGenerationResult {
  tasks: CBTTask[];
  analysis: CBTIAnalysisBundle;
  mode: 'ai' | 'rules';
  message: string;
  error?: string;
}

const TASK_DURATIONS: Record<CBTTask['type'], number> = {
  cognitive: 15,
  behavioral: 10,
  relaxation: 12,
  hygiene: 8,
};

function enrichTask(task: Partial<CBTTask>, fallback: CBTTask | undefined, index: number): CBTTask {
  const type = (task.type || fallback?.type || 'hygiene') as CBTTask['type'];
  const today = format(new Date(), 'yyyy-MM-dd');

  return {
    id: task.id || `${type}_${Date.now()}_${index}`,
    type,
    title: task.title || fallback?.title || '今日执行任务',
    description:
      task.description || fallback?.description || '继续记录睡眠，并按计划完成今晚最重要的一项练习。',
    completed: false,
    date: task.date || today,
    estimatedMinutes: task.estimatedMinutes || TASK_DURATIONS[type],
    rationale: task.rationale || fallback?.rationale || '基于筛查、睡眠日记、量表结果与本周计划生成。',
    source: task.source || 'rules',
    module: task.module || fallback?.module,
    flowSteps: task.flowSteps || fallback?.flowSteps,
    forms: task.forms || fallback?.forms,
    frequency: task.frequency || fallback?.frequency,
    evaluationHint: task.evaluationHint || fallback?.evaluationHint,
  };
}

function buildStarterTasks(bundle: CBTIAnalysisBundle): CBTTask[] {
  if (bundle.treatmentPlan.dailyTasks.length > 0) {
    return bundle.treatmentPlan.dailyTasks;
  }

  if (!bundle.screening.eligibleForStandardCBTI) {
    return [];
  }

  return [
    {
      id: `starter_record_${Date.now()}`,
      type: 'behavioral',
      title: '先补齐本周记录',
      description: '继续记录连续 3 至 7 晚睡眠，为后续逐周调参提供稳定依据。',
      completed: false,
      date: format(new Date(), 'yyyy-MM-dd'),
      estimatedMinutes: 8,
      rationale: '当前仍处于评估或概念化阶段，先积累连续数据比过早加码任务更重要。',
      source: 'rules',
    },
  ];
}

function convertPlanToTasks(bundle: CBTIAnalysisBundle): CBTTask[] {
  const planTasks = bundle.treatmentPlan.dailyTasks;
  if (planTasks.length === 0) {
    return buildStarterTasks(bundle);
  }

  const selected = planTasks.slice(0, 5);
  if (selected.length === 0) {
    return [
      {
        id: `starter_hygiene_${Date.now()}`,
        type: 'hygiene',
        title: '先完成今晚记录准备',
        description: '睡前先确定记录时间点，明早起床后及时补全睡眠日志。',
        completed: false,
        date: format(new Date(), 'yyyy-MM-dd'),
        estimatedMinutes: 8,
        rationale: '当前数据仍较少，先建立连续记录习惯最重要。',
        source: 'rules',
      },
      {
        id: `starter_relax_${Date.now()}`,
        type: 'relaxation',
        title: '睡前做短时放松',
        description: '睡前 10 分钟做缓慢呼吸或肌肉放松，帮助从白天状态过渡到睡眠状态。',
        completed: false,
        date: format(new Date(), 'yyyy-MM-dd'),
        estimatedMinutes: 10,
        rationale: '在数据不足时，先从最容易执行的基础干预开始。',
        source: 'rules',
      },
    ];
  }

  return selected.map((task, index) =>
    enrichTask(
      {
        ...task,
        id: `rule_${Date.now()}_${index}`,
        estimatedMinutes: task.estimatedMinutes || TASK_DURATIONS[task.type],
        source: 'rules',
      },
      task,
      index,
    ),
  );
}

async function generateAIEnhancedTasks(
  bundle: CBTIAnalysisBundle,
  apiKey: string,
): Promise<TaskGenerationResult> {
  const { GoogleGenAI, Type } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey });
  const baseTasks = convertPlanToTasks(bundle);

  const prompt = `
你是一名协助 CBT-I 数字干预系统润色患者任务说明的睡眠治疗师。
注意：底层治疗决策已经完成，你不能改变治疗模块、任务数量、任务类型和医学判断，只能把现有任务写得更容易执行、更温和、更清晰。

要求：
1. 所有内容使用简体中文。
2. 风格温和、专业、可执行，不做诊断表述，不夸大疗效。
3. 保留原有任务的 type、module、estimatedMinutes、frequency、forms、flowSteps、evaluationHint。
4. 每条任务只重写：
   - title
   - description
   - rationale
5. 输出数组长度必须与输入任务完全一致。
6. 每条任务输出：
   - type: cognitive | behavioral | relaxation | hygiene
   - module: 原样保留
   - title: 12-20 字
   - description: 40-120 字
   - estimatedMinutes: 5-20 的整数
   - rationale: 18-60 字，说明为什么本周优先这样做
   - frequency: 原样保留
   - evaluationHint: 原样保留
   - flowSteps: 原样保留
   - forms: 原样保留

结构化评估摘要：
- 适合标准 CBT-I：${bundle.screening.eligibleForStandardCBTI ? '是' : '否'}
- 当前阶段：${bundle.treatmentPlan.stage}
- 失眠表型：${bundle.assessment.insomniaPhenotype.join('、')}
- 个案概念化：${bundle.caseConceptualization.summaryText}
- 主方案：${bundle.treatmentPlan.primaryModules.map((item) => item.title).join('、') || '暂无'}
- 辅方案：${bundle.treatmentPlan.secondaryModules.map((item) => item.title).join('、') || '暂无'}
- 下周调参依据：${bundle.weeklyReview.adjustmentDecision}

待润色任务：
${JSON.stringify(baseTasks, null, 2)}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING, enum: ['cognitive', 'behavioral', 'relaxation', 'hygiene'] },
              module: { type: Type.STRING },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              estimatedMinutes: { type: Type.INTEGER },
              rationale: { type: Type.STRING },
              frequency: { type: Type.STRING },
              evaluationHint: { type: Type.STRING },
              flowSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
              forms: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['type', 'module', 'title', 'description', 'estimatedMinutes', 'rationale'],
          },
        },
      },
    });

    const parsed = JSON.parse(response.text || '[]') as Array<Partial<CBTTask>>;
    const tasks = parsed.slice(0, baseTasks.length).map((task, index) => {
      const enriched = enrichTask(task, baseTasks[index], index);
      return {
        ...enriched,
        source: 'ai' as const,
      };
    });

    return {
      tasks,
      analysis: bundle,
      mode: 'ai',
      message: '已在本地治疗计划基础上优化本周任务说明。',
    };
  } catch (error) {
    console.error('AI task generation failed, falling back to rules:', error);
    return {
      tasks: convertPlanToTasks(bundle),
      analysis: bundle,
      mode: 'rules',
      message: 'AI 说明优化暂时不可用，已切换为本地规则治疗计划。',
      error: error instanceof Error ? error.message : 'Unknown AI generation error',
    };
  }
}

export async function generateTaskPlan(userData: UserData): Promise<TaskGenerationResult> {
  try {
    const analysis = analysisService.buildAnalysisBundle(userData);

    if (!analysis.screening.eligibleForStandardCBTI) {
      return {
        tasks: [],
        analysis,
        mode: 'rules',
        message:
          analysis.screening.redirectRecommendation ||
          '当前不建议直接进入标准 CBT-I，请先进一步评估或稳定基础问题。',
      };
    }

    if (!geminiApiKey) {
      return {
        tasks: convertPlanToTasks(analysis),
        analysis,
        mode: 'rules',
        message: '当前未配置 AI 服务，已按本地规则生成结构化治疗计划。',
      };
    }

    return await generateAIEnhancedTasks(analysis, geminiApiKey);
  } catch (error) {
    console.error('Error generating task plan:', error);
    const analysis = analysisService.buildAnalysisBundle(userData);
    return {
      tasks: convertPlanToTasks(analysis),
      analysis,
      mode: 'rules',
      message: '任务生成过程中发生异常，已回退到本地规则治疗计划。',
      error: error instanceof Error ? error.message : 'Unknown task generation error',
    };
  }
}

export async function generateCBTTasks(userData: UserData): Promise<CBTTask[]> {
  const result = await generateTaskPlan(userData);
  return result.tasks;
}

export const enhancedTaskService = {
  generateTasks: generateCBTTasks,
  generateTaskPlan,
  getRecommendations: (userData: UserData) => analysisService.generateRecommendations(userData),
  buildAnalysisBundle: (userData: UserData) => analysisService.buildAnalysisBundle(userData),
  analyzeSleep: (userData: UserData) => analysisService.analyzeSleep(userData),
  analyzeCognition: (userData: UserData) => analysisService.analyzeCognition(userData),
};
