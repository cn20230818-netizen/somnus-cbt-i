import { UserData, CBTTask, SleepLog } from '../types';
import { analysisService } from './analysisEngine';

export class DynamicAdjustmentEngine {
  private userData: UserData;

  constructor(userData: UserData) {
    this.userData = userData;
  }

  // 分析任务执行情况
  analyzeTaskPerformance() {
    const tasks = this.userData.tasks;
    if (tasks.length === 0) return null;

    const completedTasks = tasks.filter(t => t.completed);
    const recentTasks = tasks.slice(-10); // 最近10个任务

    // 计算完成率
    const overallCompletionRate = tasks.length > 0
      ? (completedTasks.length / tasks.length) * 100
      : 0;

    const recentCompletionRate = recentTasks.length > 0
      ? (recentTasks.filter(t => t.completed).length / recentTasks.length) * 100
      : 0;

    // 分析任务类型分布
    const typeDistribution = this.calculateTypeDistribution(tasks);
    const completedTypeDistribution = this.calculateTypeDistribution(completedTasks);

    // 分析反馈质量
    const feedbackAnalysis = this.analyzeFeedback(completedTasks);

    return {
      overallCompletionRate,
      recentCompletionRate,
      typeDistribution,
      completedTypeDistribution,
      feedbackAnalysis,
      adherenceLevel: this.calculateAdherenceLevel(recentCompletionRate, feedbackAnalysis.averageRating),
      difficultyAdjustment: this.calculateDifficultyAdjustment(feedbackAnalysis)
    };
  }

  // 调整治疗策略
  adjustTreatmentStrategy() {
    const taskPerformance = this.analyzeTaskPerformance();
    const sleepProgress = analysisService.calculateProgress(this.userData);
    const currentPhase = this.userData.treatmentPhase?.phase || 'assessment';

    if (!taskPerformance || !sleepProgress) return null;

    const adjustments: {
      phaseTransition?: boolean;
      newPhase?: string;
      taskDifficulty?: 'easier' | 'same' | 'harder';
      focusAreas?: string[];
      recommendations?: string[];
    } = {};

    // 依从性分析
    if (taskPerformance.adherenceLevel === 'low') {
      adjustments.recommendations = [
        '任务完成率较低，建议降低任务难度或缩短任务时长',
        '增加任务提醒频率，设置更明确的执行时间',
        '提供更多任务完成激励和反馈'
      ];
      adjustments.taskDifficulty = 'easier';
    } else if (taskPerformance.adherenceLevel === 'high') {
      if (sleepProgress.overallProgress > 0.3) {
        adjustments.taskDifficulty = 'harder';
        adjustments.recommendations = ['依从性良好且治疗有效，可适当增加任务挑战性'];
      }
    }

    // 治疗效果分析
    if (sleepProgress.efficiencyImprovement > 10) {
      adjustments.recommendations = [
        ...(adjustments.recommendations || []),
        '睡眠效率显著改善，考虑进入巩固期'
      ];
      if (currentPhase === 'intensive') {
        adjustments.phaseTransition = true;
        adjustments.newPhase = 'consolidation';
      }
    } else if (sleepProgress.efficiencyImprovement < 0) {
      adjustments.recommendations = [
        ...(adjustments.recommendations || []),
        '睡眠效率未改善，需要重新评估干预策略'
      ];
      adjustments.focusAreas = ['重新评估认知信念', '加强行为干预'];
    }

    // 认知改善分析
    if (sleepProgress.dbasImprovement > 0.5) {
      adjustments.recommendations = [
        ...(adjustments.recommendations || []),
        '认知信念显著改善，可减少认知重建任务频率'
      ];
    }

    // 任务类型偏好分析
    const preferredTypes = this.identifyPreferredTaskTypes();
    if (preferredTypes.length > 0) {
      adjustments.recommendations = [
        ...(adjustments.recommendations || []),
        `用户对${preferredTypes.map(t => this.getTypeName(t)).join('、')}类任务完成度较高，可适当增加此类任务`
      ];
    }

    return adjustments;
  }

  // 生成个性化治疗路径
  generatePersonalizedPathway() {
    const currentPhase = this.userData.treatmentPhase?.phase || 'assessment';
    const currentWeek = this.userData.treatmentPhase?.currentWeek || 1;
    const adjustments = this.adjustTreatmentStrategy();
    const performance = this.analyzeTaskPerformance();

    const pathway = {
      currentPhase,
      currentWeek,
      nextWeekPlan: this.generateWeeklyPlan(currentPhase, currentWeek + 1, adjustments),
      milestones: this.calculateMilestones(currentPhase, currentWeek),
      adjustmentsNeeded: adjustments?.recommendations || [],
      predictedOutcome: this.predictTreatmentOutcome()
    };

    return pathway;
  }

  // 智能任务推荐
  recommendNextTasks() {
    const performance = this.analyzeTaskPerformance();
    const adjustments = this.adjustTreatmentStrategy();
    const recentTasks = this.userData.tasks.slice(-5);

    // 避免重复推荐
    const recentTaskTypes = recentTasks.map(t => t.type);
    const preferredTypes = this.identifyPreferredTaskTypes();

    // 推荐策略
    const recommendations: Array<{
      type: CBTTask['type'];
      priority: number;
      reason: string;
    }> = [];

    // 根据依从性调整
    if (performance?.adherenceLevel === 'low') {
      recommendations.push(
        { type: 'hygiene', priority: 1, reason: '基础睡眠卫生任务，易于执行' },
        { type: 'relaxation', priority: 2, reason: '放松训练有助于改善睡眠体验' }
      );
    } else {
      // 根据治疗效果推荐
      const sleepProgress = analysisService.calculateProgress(this.userData);
      if (sleepProgress?.efficiencyImprovement < 5) {
        recommendations.push(
          { type: 'behavioral', priority: 1, reason: '睡眠效率提升不足，加强行为干预' }
        );
      }

      if (sleepProgress?.dbasImprovement < 0.3) {
        recommendations.push(
          { type: 'cognitive', priority: 1, reason: '认知信念改善有限，加强认知重建' }
        );
      }
    }

    // 平衡任务类型
    const typeBalance = this.calculateTypeBalance(recentTaskTypes);
    typeBalance.forEach(balance => {
      if (balance.percentage < 20) {
        recommendations.push({
          type: balance.type,
          priority: 3,
          reason: `确保${this.getTypeName(balance.type)}类任务的覆盖`
        });
      }
    });

    // 优先推荐用户偏好的类型
    recommendations.forEach(rec => {
      if (preferredTypes.includes(rec.type)) {
        rec.priority = Math.max(1, rec.priority - 1);
      }
    });

    // 按优先级排序并去重
    const uniqueTypes = new Set();
    return recommendations
      .sort((a, b) => a.priority - b.priority)
      .filter(rec => {
        if (uniqueTypes.has(rec.type)) return false;
        uniqueTypes.add(rec.type);
        return true;
      })
      .slice(0, 3); // 返回前3个推荐
  }

  // 私有辅助方法
  private calculateTypeDistribution(tasks: CBTTask[]) {
    const distribution: Record<string, number> = {};
    const total = tasks.length;

    tasks.forEach(task => {
      distribution[task.type] = (distribution[task.type] || 0) + 1;
    });

    // 转换为百分比
    Object.keys(distribution).forEach(type => {
      distribution[type] = (distribution[type] / total) * 100;
    });

    return distribution;
  }

  private analyzeFeedback(tasks: CBTTask[]) {
    const tasksWithFeedback = tasks.filter(t => t.feedback);
    if (tasksWithFeedback.length === 0) {
      return {
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        feedbackNotes: [],
        hasFeedback: false
      };
    }

    const ratings = tasksWithFeedback.map(t => t.feedback!.rating);
    const averageRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;

    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings.forEach(rating => {
      ratingDistribution[rating] = (ratingDistribution[rating] || 0) + 1;
    });

    const feedbackNotes = tasksWithFeedback
      .filter(t => t.feedback?.note)
      .map(t => t.feedback!.note!);

    return {
      averageRating,
      ratingDistribution,
      feedbackNotes,
      hasFeedback: true
    };
  }

  private calculateAdherenceLevel(completionRate: number, averageRating: number) {
    if (completionRate >= 80 && averageRating >= 4) return 'high';
    if (completionRate >= 60 || averageRating >= 3) return 'medium';
    return 'low';
  }

  private calculateDifficultyAdjustment(feedbackAnalysis: any) {
    if (!feedbackAnalysis.hasFeedback) return 'maintain';

    const { averageRating, ratingDistribution } = feedbackAnalysis;

    if (averageRating < 2.5 || ratingDistribution[1] + ratingDistribution[2] > ratingDistribution[4] + ratingDistribution[5]) {
      return 'easier';
    } else if (averageRating > 4 && ratingDistribution[5] > ratingDistribution[1] + ratingDistribution[2]) {
      return 'harder';
    }

    return 'maintain';
  }

  private identifyPreferredTaskTypes() {
    const performance = this.analyzeTaskPerformance();
    if (!performance) return [];

    const preferredTypes: CBTTask['type'][] = [];
    const { completedTypeDistribution } = performance;

    Object.entries(completedTypeDistribution).forEach(([type, percentage]) => {
      if (percentage > 30) { // 完成率超过30%的类型
        preferredTypes.push(type as CBTTask['type']);
      }
    });

    return preferredTypes;
  }

  private getTypeName(type: CBTTask['type']) {
    const names: Record<CBTTask['type'], string> = {
      cognitive: '认知重建',
      behavioral: '行为干预',
      relaxation: '放松训练',
      hygiene: '睡眠卫生'
    };
    return names[type];
  }

  private calculateTypeBalance(recentTaskTypes: string[]) {
    const typeCounts: Record<string, number> = {};
    recentTaskTypes.forEach(type => {
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const total = recentTaskTypes.length;
    return Object.entries(typeCounts).map(([type, count]) => ({
      type: type as CBTTask['type'],
      count,
      percentage: (count / total) * 100
    }));
  }

  private generateWeeklyPlan(phase: string, week: number, adjustments: any) {
    const basePlans: Record<string, Record<number, string[]>> = {
      assessment: {
        1: ['基线数据收集', '睡眠日志培训', '初始测评'],
        2: ['数据分析', '个性化方案制定']
      },
      intensive: {
        1: ['睡眠限制实施', '刺激控制训练', '认知重建入门'],
        2: ['加强行为干预', '放松技能训练', '睡眠卫生优化'],
        3: ['巩固行为改变', '认知挑战练习', '压力管理'],
        4: ['技能整合', '复发预防策略']
      },
      consolidation: {
        1: ['逐步放宽睡眠限制', '技能自主应用'],
        2: ['治疗频率降低', '长期维持策略'],
        3: ['随访评估', '调整计划']
      },
      maintenance: {
        1: ['每月随访', '持续监测'],
        2: ['问题解决', '技能复习']
      }
    };

    const plan = basePlans[phase]?.[week] || ['继续当前治疗计划'];

    // 根据调整建议修改计划
    if (adjustments?.taskDifficulty === 'easier') {
      plan.push('降低任务难度，提高依从性');
    } else if (adjustments?.taskDifficulty === 'harder') {
      plan.push('增加任务挑战性，促进进一步改善');
    }

    return plan;
  }

  private calculateMilestones(phase: string, week: number) {
    const milestones = [
      { week: 2, goal: '睡眠日志记录连续7天', achieved: this.userData.sleepLogs.length >= 7 },
      { week: 4, goal: '睡眠效率达到85%', achieved: false }, // 需要实际计算
      { week: 6, goal: 'DBAS总分降低20%', achieved: false },
      { week: 8, goal: '独立应用CBT-I技能', achieved: week >= 8 }
    ];

    // 根据实际数据更新达成状态
    const progress = analysisService.calculateProgress(this.userData);
    if (progress) {
      milestones[1].achieved = progress.efficiencyImprovement >= 15; // 效率提升15%
      milestones[2].achieved = progress.dbasImprovement >= 0.8; // DBAS改善0.8分
    }

    return milestones.filter(m => m.week >= week - 2 && m.week <= week + 4);
  }

  private predictTreatmentOutcome() {
    const progress = analysisService.calculateProgress(this.userData);
    const performance = this.analyzeTaskPerformance();

    if (!progress || !performance) return '无法预测';

    const factors = {
      efficiencyTrend: progress.efficiencyImprovement > 5 ? 1 : 0,
      adherence: performance.adherenceLevel === 'high' ? 1 : performance.adherenceLevel === 'medium' ? 0.5 : 0,
      treatmentDuration: this.userData.treatmentPhase?.currentWeek || 1 >= 4 ? 1 : 0.5
    };

    const score = (factors.efficiencyTrend + factors.adherence + factors.treatmentDuration) / 3;

    if (score > 0.8) return '预后良好，预期显著改善';
    if (score > 0.6) return '预后中等，预期适度改善';
    if (score > 0.4) return '预后一般，需要加强干预';
    return '预后较差，需要调整治疗方案';
  }
}

// 导出服务
export const dynamicAdjustmentService = {
  analyzePerformance: (userData: UserData) => new DynamicAdjustmentEngine(userData).analyzeTaskPerformance(),
  adjustStrategy: (userData: UserData) => new DynamicAdjustmentEngine(userData).adjustTreatmentStrategy(),
  generatePathway: (userData: UserData) => new DynamicAdjustmentEngine(userData).generatePersonalizedPathway(),
  recommendTasks: (userData: UserData) => new DynamicAdjustmentEngine(userData).recommendNextTasks()
};