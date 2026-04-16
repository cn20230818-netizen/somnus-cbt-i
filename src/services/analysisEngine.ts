import { UserData, SleepLog, DBASResult, PSQIResult, CBTTask } from '../types';
import { format, parseISO, differenceInMinutes, subDays } from 'date-fns';

// 分析引擎核心类
export class SleepAnalysisEngine {
  private userData: UserData;

  constructor(userData: UserData) {
    this.userData = userData;
  }

  // 基础睡眠指标分析
  analyzeSleepMetrics() {
    const logs = this.userData.sleepLogs;
    if (logs.length === 0) return null;

    const latestLog = logs[logs.length - 1];
    const weekLogs = logs.slice(-7); // 最近一周数据

    // 计算关键指标
    const metrics = {
      // 当前指标
      current: {
        efficiency: latestLog.efficiency,
        latency: this.calculateSleepLatency(latestLog),
        totalSleep: this.calculateTotalSleep(latestLog),
        waso: latestLog.wakeDuration, // 觉醒后清醒时间
        awakenings: latestLog.wakeCount,
        subjectiveQuality: latestLog.sleepQuality
      },

      // 趋势指标
      trends: {
        efficiencyTrend: this.calculateTrend(weekLogs.map(l => l.efficiency)),
        latencyTrend: this.calculateTrend(weekLogs.map(l => this.calculateSleepLatency(l))),
        efficiency7dAvg: this.average(weekLogs.map(l => l.efficiency)),
        efficiency7dMin: Math.min(...weekLogs.map(l => l.efficiency)),
        efficiency7dMax: Math.max(...weekLogs.map(l => l.efficiency))
      },

      // 问题识别
      issues: {
        efficiencyLow: latestLog.efficiency < 85,
        latencyHigh: this.calculateSleepLatency(latestLog) > 30,
        frequentAwakenings: latestLog.wakeCount > 2,
        longWASO: latestLog.wakeDuration > 30,
        poorSubjectiveQuality: latestLog.sleepQuality < 3
      }
    };

    return metrics;
  }

  // 认知信念分析
  analyzeCognitivePatterns() {
    const dbasResults = this.userData.dbasResults;
    if (dbasResults.length === 0) return null;

    const latestDBAS = dbasResults[0];
    const psqiResults = this.userData.psqiResults;
    const latestPSQI = psqiResults[0];

    // DBAS维度分析
    const dbasAnalysis = {
      highestDimension: Object.entries(latestDBAS.subScores)
        .reduce((a, b) => a[1] > b[1] ? a : b)[0] as keyof typeof latestDBAS.subScores,
      totalScore: latestDBAS.totalScore,
      subScores: latestDBAS.subScores,
      severity: latestDBAS.totalScore > 4.5 ? 'high' : latestDBAS.totalScore > 3.0 ? 'moderate' : 'low'
    };

    // PSQI分析
    const psqiAnalysis = latestPSQI ? {
      totalScore: latestPSQI.totalScore,
      worstComponent: Object.entries(latestPSQI.components)
        .reduce((a, b) => a[1] > b[1] ? a : b)[0] as keyof typeof latestPSQI.components,
      components: latestPSQI.components,
      severity: latestPSQI.totalScore >= 5 ? 'clinical' : 'normal'
    } : null;

    return {
      dbas: dbasAnalysis,
      psqi: psqiAnalysis,
      combinedInsights: this.generateCognitiveInsights(dbasAnalysis, psqiAnalysis)
    };
  }

  // 生成治疗建议
  generateTreatmentRecommendations() {
    const sleepMetrics = this.analyzeSleepMetrics();
    const cognitivePatterns = this.analyzeCognitivePatterns();

    if (!sleepMetrics) return [];

    const recommendations: Array<{
      category: 'behavioral' | 'cognitive' | 'relaxation' | 'hygiene';
      priority: 'high' | 'medium' | 'low';
      title: string;
      description: string;
      rationale: string;
    }> = [];

    // 睡眠效率低 → 睡眠限制/刺激控制
    if (sleepMetrics.issues.efficiencyLow) {
      recommendations.push({
        category: 'behavioral',
        priority: 'high',
        title: '睡眠限制疗法',
        description: `将卧床时间限制在${this.calculateSleepWindow()}小时，即使感到困倦也不提前上床。`,
        rationale: `当前睡眠效率${sleepMetrics.current.efficiency}%低于目标值85%，需要减少卧床时间提高睡眠驱动力。`
      });
    }

    // 入睡潜伏期长 → 刺激控制 + 放松训练
    if (sleepMetrics.issues.latencyHigh) {
      recommendations.push({
        category: 'behavioral',
        priority: 'high',
        title: '刺激控制',
        description: '如果20分钟内无法入睡，请离开卧室进行放松活动，直到感到困倦再返回。',
        rationale: `入睡潜伏期${sleepMetrics.current.latency}分钟超过30分钟，表明存在条件性觉醒问题。`
      });

      recommendations.push({
        category: 'relaxation',
        priority: 'medium',
        title: '睡前放松训练',
        description: '睡前1小时进行渐进式肌肉放松或4-7-8呼吸法练习。',
        rationale: '降低生理和认知唤醒水平，缩短入睡时间。'
      });
    }

    // 认知失调高 → 认知重建
    if (cognitivePatterns?.dbas.severity === 'high' || cognitivePatterns?.dbas.severity === 'moderate') {
      const highestDim = cognitivePatterns.dbas.highestDimension;
      const dimensionNames: Record<string, string> = {
        consequences: '睡眠后果',
        worry: '睡眠焦虑',
        expectations: '睡眠预期',
        medication: '药物依赖'
      };

      recommendations.push({
        category: 'cognitive',
        priority: cognitivePatterns.dbas.severity === 'high' ? 'high' : 'medium',
        title: '挑战不合理信念',
        description: `针对"${dimensionNames[highestDim]}"维度的不合理信念，写下3个更平衡的替代想法。`,
        rationale: `DBAS总分${cognitivePatterns.dbas.totalScore.toFixed(1)}分，${dimensionNames[highestDim]}维度得分最高(${cognitivePatterns.dbas.subScores[highestDim].toFixed(1)})。`
      });
    }

    // 夜间频繁觉醒 → 睡眠卫生 + 放松训练
    if (sleepMetrics.issues.frequentAwakenings || sleepMetrics.issues.longWASO) {
      recommendations.push({
        category: 'hygiene',
        priority: 'medium',
        title: '优化睡眠环境',
        description: '确保卧室完全黑暗、安静，温度保持在18-22°C，睡前避免大量饮水。',
        rationale: `夜间觉醒${sleepMetrics.current.awakenings}次，觉醒后清醒时间${sleepMetrics.current.waso}分钟，可能与环境因素有关。`
      });
    }

    // 主观睡眠质量差 → 综合干预
    if (sleepMetrics.issues.poorSubjectiveQuality) {
      recommendations.push({
        category: 'hygiene',
        priority: 'medium',
        title: '睡眠日记反思',
        description: '记录睡前活动和情绪状态，识别影响睡眠质量的因素。',
        rationale: `主观睡眠质量评分${sleepMetrics.current.subjectiveQuality}/5分较低，需要了解具体影响因素。`
      });
    }

    // 按优先级排序
    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  // 生成具体CBT任务
  generateCBTTasks(): CBTTask[] {
    const recommendations = this.generateTreatmentRecommendations();
    const tasks: CBTTask[] = [];

    // 转换为任务格式
    recommendations.forEach((rec, index) => {
      tasks.push({
        id: `task_${Date.now()}_${index}`,
        type: rec.category,
        title: rec.title,
        description: rec.description,
        completed: false,
        date: format(new Date(), 'yyyy-MM-dd')
      });
    });

    // 限制每天任务数量，优先高优先级
    const maxTasksPerDay = 3;
    return tasks.slice(0, maxTasksPerDay);
  }

  // 计算治疗效果评分
  calculateTreatmentProgress() {
    const logs = this.userData.sleepLogs;
    if (logs.length < 7) return null;

    const firstWeek = logs.slice(0, Math.min(7, logs.length));
    const lastWeek = logs.slice(-7);

    const firstWeekAvg = this.average(firstWeek.map(l => l.efficiency));
    const lastWeekAvg = this.average(lastWeek.map(l => l.efficiency));
    const improvement = lastWeekAvg - firstWeekAvg;

    const dbasChange = this.userData.dbasResults.length >= 2
      ? this.userData.dbasResults[0].totalScore - this.userData.dbasResults[this.userData.dbasResults.length - 1].totalScore
      : 0;

    const taskCompletionRate = this.userData.tasks.length > 0
      ? (this.userData.tasks.filter(t => t.completed).length / this.userData.tasks.length) * 100
      : 0;

    return {
      efficiencyImprovement: improvement,
      dbasImprovement: -dbasChange, // 负值表示改善
      taskCompletionRate,
      overallProgress: this.calculateOverallProgress(improvement, -dbasChange, taskCompletionRate)
    };
  }

  // 私有辅助方法
  private calculateSleepLatency(log: SleepLog): number {
    const bedTime = parseISO(`${log.date}T${log.bedTime}`);
    const fallAsleepTime = parseISO(`${log.date}T${log.fallAsleepTime}`);
    return Math.max(0, differenceInMinutes(fallAsleepTime, bedTime));
  }

  private calculateTotalSleep(log: SleepLog): number {
    const fallAsleepTime = parseISO(`${log.date}T${log.fallAsleepTime}`);
    const wakeTime = parseISO(`${log.date}T${log.wakeTime}`);
    const totalAsleep = differenceInMinutes(wakeTime, fallAsleepTime);
    return Math.max(0, totalAsleep - (log.wakeDuration || 0));
  }

  private calculateTrend(values: number[]): 'improving' | 'stable' | 'declining' {
    if (values.length < 3) return 'stable';

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = this.average(firstHalf);
    const secondAvg = this.average(secondHalf);

    const change = secondAvg - firstAvg;
    const threshold = 2; // 2%变化阈值

    if (change > threshold) return 'improving';
    if (change < -threshold) return 'declining';
    return 'stable';
  }

  private calculateSleepWindow(): number {
    const logs = this.userData.sleepLogs;
    if (logs.length === 0) return 7.5;

    const latestLog = logs[logs.length - 1];
    const bedTime = parseISO(`${latestLog.date}T${latestLog.bedTime}`);
    const getUpTime = parseISO(`${latestLog.date}T${latestLog.getUpTime}`);

    const totalInBed = differenceInMinutes(getUpTime, bedTime) / 60;
    const recommendedWindow = Math.max(5, Math.min(totalInBed * 0.9, 8));

    return Math.round(recommendedWindow * 10) / 10;
  }

  private generateCognitiveInsights(dbas: any, psqi: any) {
    const insights: string[] = [];

    if (dbas?.severity === 'high') {
      insights.push('存在显著的睡眠认知失调，认知重建应是治疗重点');
    }

    if (psqi?.severity === 'clinical') {
      insights.push('PSQI评分显示临床显著的睡眠障碍，需要综合干预');
    }

    if (dbas?.highestDimension === 'consequences') {
      insights.push('过度担心睡眠后果可能造成预期性焦虑，加重失眠');
    }

    if (dbas?.highestDimension === 'worry') {
      insights.push('睡眠相关的过度担忧需要认知干预来打破焦虑循环');
    }

    return insights;
  }

  private calculateOverallProgress(efficiencyImp: number, dbasImp: number, completionRate: number): number {
    // 加权计算总体进度
    const weights = {
      efficiency: 0.5,
      dbas: 0.3,
      compliance: 0.2
    };

    // 标准化各项指标
    const normEfficiency = Math.min(Math.max(efficiencyImp / 20, -1), 1); // -20%到+20%映射到-1到1
    const normDBAS = Math.min(Math.max(dbasImp / 2, -1), 1); // -2到+2分映射到-1到1
    const normCompliance = completionRate / 100; // 0-100%映射到0-1

    return (
      normEfficiency * weights.efficiency +
      normDBAS * weights.dbas +
      normCompliance * weights.compliance
    );
  }

  private average(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }
}

// 导出分析引擎实例工厂
export function createAnalysisEngine(userData: UserData) {
  return new SleepAnalysisEngine(userData);
}

// 导出工具函数
export const analysisService = {
  analyzeSleep: (userData: UserData) => new SleepAnalysisEngine(userData).analyzeSleepMetrics(),
  analyzeCognition: (userData: UserData) => new SleepAnalysisEngine(userData).analyzeCognitivePatterns(),
  generateRecommendations: (userData: UserData) => new SleepAnalysisEngine(userData).generateTreatmentRecommendations(),
  generateTasks: (userData: UserData) => new SleepAnalysisEngine(userData).generateCBTTasks(),
  calculateProgress: (userData: UserData) => new SleepAnalysisEngine(userData).calculateTreatmentProgress()
};