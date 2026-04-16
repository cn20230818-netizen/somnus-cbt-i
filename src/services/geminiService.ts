import { format } from 'date-fns';
import { CBTTask, UserData } from '../types';
import { analysisService } from './analysisEngine';

const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim() || '';

type Recommendation = ReturnType<typeof analysisService.generateRecommendations>[number];

export interface TaskGenerationResult {
  tasks: CBTTask[];
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

function enrichTask(task: Partial<CBTTask>, fallback: Recommendation | undefined, index: number): CBTTask {
  const type = (task.type || fallback?.category || 'hygiene') as CBTTask['type'];
  const today = format(new Date(), 'yyyy-MM-dd');

  return {
    id: task.id || `${type}_${Date.now()}_${index}`,
    type,
    title: task.title || fallback?.title || '今日睡眠任务',
    description:
      task.description || fallback?.description || '继续记录睡眠，并完成今晚最重要的一项放松或节律任务。',
    completed: false,
    date: task.date || today,
    estimatedMinutes: task.estimatedMinutes || TASK_DURATIONS[type],
    rationale: task.rationale || fallback?.rationale || '基于当前睡眠记录与测评结果生成。',
    source: task.source || 'rules',
  };
}

function convertRecommendationsToTasks(recommendations: Recommendation[]): CBTTask[] {
  const selected = recommendations.length > 0
    ? recommendations
        .sort((a, b) => {
          const order = { high: 0, medium: 1, low: 2 };
          return order[a.priority] - order[b.priority];
        })
        .slice(0, 3)
    : [];

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

  return selected.map((recommendation, index) =>
    enrichTask(
      {
        id: `rule_${Date.now()}_${index}`,
        type: recommendation.category,
        title: recommendation.title,
        description: recommendation.description,
        estimatedMinutes: TASK_DURATIONS[recommendation.category],
        rationale: recommendation.rationale,
        source: 'rules',
      },
      recommendation,
      index,
    ),
  );
}

async function generateAIEnhancedTasks(
  userData: UserData,
  recommendations: Recommendation[],
  apiKey: string,
): Promise<TaskGenerationResult> {
  const { GoogleGenAI, Type } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey });
  const latestLog = userData.sleepLogs[userData.sleepLogs.length - 1];
  const latestDbas = userData.dbasResults[userData.dbasResults.length - 1];
  const latestPsqi = userData.psqiResults[userData.psqiResults.length - 1];
  const analysis = analysisService.analyzeSleep(userData);
  const cognitiveAnalysis = analysisService.analyzeCognition(userData);

  const prompt = `
你是一名协助 CBT-I 数字干预系统生成患者任务说明的睡眠治疗师。
请根据以下患者信息，生成 3 条今天适合执行的 CBT-I 任务。

要求：
1. 所有内容使用简体中文。
2. 风格温和、专业、可执行，不做诊断表述。
3. 至少包含 1 条行为或节律任务。
4. 如有需要，可包含 1 条认知任务和 1 条放松任务。
5. 每条任务输出：
   - type: cognitive | behavioral | relaxation | hygiene
   - title: 18 字以内
   - description: 40-90 字
   - estimatedMinutes: 5-20 的整数
   - rationale: 18-50 字，说明为什么推荐

患者摘要：
- 最近睡眠效率：${latestLog?.efficiency || '未知'}%
- 最近入睡潜伏期：${analysis?.current?.latency || '未知'} 分钟
- 夜间觉醒次数：${latestLog?.wakeCount || 0}
- 夜间总清醒时间：${latestLog?.wakeDuration || 0} 分钟
- 主观睡眠质量：${latestLog?.sleepQuality || '未知'}/5
- DBAS 总分：${latestDbas?.totalScore?.toFixed(1) || '未测评'}
- DBAS 最高维度：${cognitiveAnalysis?.dbas?.highestDimension || '未知'}
- PSQI 总分：${latestPsqi?.totalScore || '未测评'}
- 当前系统推荐重点：${recommendations.map((item) => `${item.title}（${item.rationale}）`).join('；')}
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
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              estimatedMinutes: { type: Type.INTEGER },
              rationale: { type: Type.STRING },
            },
            required: ['type', 'title', 'description', 'estimatedMinutes', 'rationale'],
          },
        },
      },
    });

    const parsed = JSON.parse(response.text || '[]') as Array<Partial<CBTTask>>;
    const tasks = parsed.slice(0, 3).map((task, index) => {
      const enriched = enrichTask(task, recommendations[index], index);
      return {
        ...enriched,
        source: 'ai' as const,
      };
    });

    return {
      tasks,
      mode: 'ai',
      message: '已结合 AI 生成今日任务说明。',
    };
  } catch (error) {
    console.error('AI task generation failed, falling back to rules:', error);
    return {
      tasks: convertRecommendationsToTasks(recommendations),
      mode: 'rules',
      message: 'AI 任务生成暂时不可用，已切换为本地规则推荐。',
      error: error instanceof Error ? error.message : 'Unknown AI generation error',
    };
  }
}

export async function generateTaskPlan(userData: UserData): Promise<TaskGenerationResult> {
  try {
    const recommendations = analysisService.generateRecommendations(userData);

    if (recommendations.length === 0) {
      return {
        tasks: convertRecommendationsToTasks(recommendations),
        mode: 'rules',
        message: '当前数据仍在积累中，已生成基础任务建议。',
      };
    }

    if (!geminiApiKey) {
      return {
        tasks: convertRecommendationsToTasks(recommendations),
        mode: 'rules',
        message: '当前未配置 AI 服务，已使用本地规则生成任务。',
      };
    }

    return await generateAIEnhancedTasks(userData, recommendations, geminiApiKey);
  } catch (error) {
    console.error('Error generating task plan:', error);
    return {
      tasks: convertRecommendationsToTasks(analysisService.generateRecommendations(userData)),
      mode: 'rules',
      message: '任务生成过程中发生异常，已回退到本地规则推荐。',
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
  analyzeSleep: (userData: UserData) => analysisService.analyzeSleep(userData),
  analyzeCognition: (userData: UserData) => analysisService.analyzeCognition(userData),
};
