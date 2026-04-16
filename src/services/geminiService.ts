import { GoogleGenAI, Type } from "@google/genai";
import { UserData, CBTTask } from "../types";
import { analysisService } from "./analysisEngine";
import { physiologicalService } from "./physiologicalService";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateCBTTasks(userData: UserData): Promise<CBTTask[]> {
  try {
    // 使用分析引擎生成推荐
    const recommendations = analysisService.generateRecommendations(userData);

    // 如果有推荐且Gemini API可用，使用AI增强
    if (recommendations.length > 0 && process.env.GEMINI_API_KEY) {
      return await generateAIEnhancedTasks(userData, recommendations);
    }

    // 否则使用基于规则的任务生成
    return generateRuleBasedTasks(recommendations);
  } catch (error) {
    console.error("Error generating tasks:", error);
    // 回退到基于规则的任务
    const recommendations = analysisService.generateRecommendations(userData);
    return generateRuleBasedTasks(recommendations);
  }
}

// AI增强的任务生成
async function generateAIEnhancedTasks(userData: UserData, recommendations: any[]): Promise<CBTTask[]> {
  const latestLog = userData.sleepLogs[userData.sleepLogs.length - 1];
  const latestDBAS = userData.dbasResults[userData.dbasResults.length - 1];
  const latestPSQI = userData.psqiResults[userData.psqiResults.length - 1];

  // 生成分析摘要
  const analysis = analysisService.analyzeSleep(userData);
  const cognitiveAnalysis = analysisService.analyzeCognition(userData);

  const prompt = `
    作为专业的睡眠治疗师，请根据以下患者数据生成3个个性化的CBT-I（失眠认知行为疗法）任务。

    # 患者数据摘要

    ## 睡眠指标
    - 最近睡眠效率: ${latestLog?.efficiency || '未知'}% (目标: 85%)
    - 入睡潜伏期: ${analysis?.current?.latency || '未知'}分钟
    - 夜间觉醒: ${latestLog?.wakeCount || 0}次，总清醒时间: ${latestLog?.wakeDuration || 0}分钟
    - 主观睡眠质量: ${latestLog?.sleepQuality || '未知'}/5分

    ## 认知评估
    - DBAS总分: ${latestDBAS?.totalScore?.toFixed(1) || '未测评'} (0-10分，>4.5表示显著认知失调)
    - 最高维度: ${cognitiveAnalysis?.dbas?.highestDimension || '未知'}
    - PSQI总分: ${latestPSQI?.totalScore || '未测评'} (0-21分，≥5表示临床睡眠障碍)

    ## 治疗阶段: ${userData.treatmentPhase?.phase || 'intensive'} 第${userData.treatmentPhase?.currentWeek || 1}周

    # 生成要求
    1. 生成3个任务，涵盖不同干预类型：认知、行为、放松、卫生
    2. 至少包含1个放松训练任务
    3. 任务需具体、可操作、个性化
    4. 所有内容使用简体中文
    5. 参考以下推荐但可调整：${recommendations.map(r => `${r.category}: ${r.title}`).join(', ')}

    # 输出格式
    返回JSON数组，每个任务包含：
    - type: "cognitive", "behavioral", "relaxation", 或 "hygiene"
    - title: 简短标题（20字内）
    - description: 详细操作说明（50-100字）

    # 示例
    [
      {
        "type": "cognitive",
        "title": "挑战睡眠后果信念",
        "description": "针对'如果今晚睡不好，明天工作就完了'的想法，写出3个更合理的替代想法，例如：'即使睡不好，我也有能力应对白天的工作。'"
      }
    ]
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING, enum: ['cognitive', 'behavioral', 'relaxation', 'hygiene'] },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
            },
            required: ['type', 'title', 'description']
          }
        }
      }
    });

    const tasks = JSON.parse(response.text || "[]");
    return tasks.map((t: any) => ({
      ...t,
      id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      completed: false,
      date: new Date().toISOString().split('T')[0]
    }));
  } catch (error) {
    console.error("AI task generation failed, falling back to rules:", error);
    return generateRuleBasedTasks(recommendations);
  }
}

// 基于规则的任务生成（无AI回退）
function generateRuleBasedTasks(recommendations: any[]): CBTTask[] {
  if (recommendations.length === 0) {
    // 默认任务
    return [
      {
        id: `rule_${Date.now()}_1`,
        type: 'hygiene' as const,
        title: '记录睡眠日志',
        description: '今晚记录上床时间、入睡时间、醒来时间、起床时间，以及夜间觉醒情况。',
        completed: false,
        date: new Date().toISOString().split('T')[0]
      },
      {
        id: `rule_${Date.now()}_2`,
        type: 'relaxation' as const,
        title: '睡前深呼吸练习',
        description: '睡前进行5分钟4-7-8呼吸法：吸气4秒，屏气7秒，呼气8秒，重复5次。',
        completed: false,
        date: new Date().toISOString().split('T')[0]
      }
    ];
  }

  // 将高优先级推荐转换为任务
  return recommendations
    .filter(rec => rec.priority === 'high')
    .slice(0, 3)
    .map((rec, index) => ({
      id: `rule_${Date.now()}_${index}`,
      type: rec.category,
      title: rec.title,
      description: rec.description,
      completed: false,
      date: new Date().toISOString().split('T')[0]
    }));
}

// 导出增强的服务
export const enhancedTaskService = {
  generateTasks: generateCBTTasks,
  getRecommendations: (userData: UserData) => analysisService.generateRecommendations(userData),
  analyzeSleep: (userData: UserData) => analysisService.analyzeSleep(userData),
  analyzeCognition: (userData: UserData) => analysisService.analyzeCognition(userData)
};
