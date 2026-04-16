import { PhysiologicalData } from '../types';

// 模拟生理数据生成器
export class PhysiologicalDataGenerator {
  private static baseHRV = 35; // 基础心率变异性
  private static baseRHR = 70; // 基础静息心率

  /**
   * 生成模拟生理数据
   * @param date 日期
   * @param sleepQuality 前一晚睡眠质量(1-5)
   * @param totalSleep 总睡眠时长(分钟)
   * @param stressLevel 压力水平(1-10)
   */
  static generateMockData(
    date: string,
    sleepQuality: number = 3,
    totalSleep: number = 420,
    stressLevel: number = 5
  ): PhysiologicalData {
    // 基于睡眠质量和压力调整生理指标
    const sleepQualityFactor = (6 - sleepQuality) / 5; // 1-5反向缩放
    const stressFactor = stressLevel / 10;

    // 心率变异性：睡眠质量好则高，压力大则低
    const hrv = Math.round(
      this.baseHRV * (1 + (sleepQualityFactor * 0.3 - stressFactor * 0.2))
    );

    // 静息心率：睡眠质量差则高，压力大则高
    const rhr = Math.round(
      this.baseRHR * (1 + (sleepQualityFactor * 0.15 + stressFactor * 0.1))
    );

    // 睡眠阶段分布（基于总睡眠时长）
    const totalSleepMin = totalSleep;
    const deepSleep = Math.round(totalSleepMin * 0.2 * (sleepQualityFactor + 0.5)); // 深睡20%左右
    const remSleep = Math.round(totalSleepMin * 0.25 * (sleepQualityFactor + 0.3)); // REM睡眠25%左右
    const lightSleep = Math.round(totalSleepMin * 0.5 * (sleepQualityFactor + 0.2)); // 浅睡50%左右
    const awake = Math.max(0, totalSleepMin - deepSleep - remSleep - lightSleep);

    // 体动次数：睡眠质量差则多
    const movementCount = Math.round(15 * (1 + sleepQualityFactor * 0.5));

    // 血氧饱和度：一般在95-100%之间
    const bloodOxygen = 95 + Math.round(Math.random() * 4) + (sleepQualityFactor > 0.7 ? 1 : 0);

    // 呼吸频率：正常12-20次/分钟
    const respiratoryRate = 14 + Math.round(stressFactor * 4);

    // 皮肤温度：正常35.5-36.5°C
    const temperature = 36.0 + (Math.random() * 0.6 - 0.3);

    return {
      date,
      heartRateVariability: hrv,
      restingHeartRate: rhr,
      sleepStages: {
        deep: deepSleep,
        light: lightSleep,
        rem: remSleep,
        awake: awake
      },
      movementCount,
      bloodOxygen,
      respiratoryRate,
      temperature
    };
  }

  /**
   * 生成连续多天的生理数据
   */
  static generateHistoricalData(days: number = 7): PhysiologicalData[] {
    const data: PhysiologicalData[] = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      // 模拟睡眠质量波动
      const sleepQuality = 3 + Math.sin(i * 0.5) * 0.8 + Math.random() * 0.4;
      const totalSleep = 420 + Math.sin(i * 0.3) * 30 + (Math.random() * 40 - 20);
      const stressLevel = 5 + Math.cos(i * 0.7) * 2 + Math.random() * 1;

      data.push(
        this.generateMockData(
          dateStr,
          Math.max(1, Math.min(5, sleepQuality)),
          Math.max(240, Math.min(540, totalSleep)),
          Math.max(1, Math.min(10, stressLevel))
        )
      );
    }

    return data;
  }

  /**
   * 分析生理数据趋势
   */
  static analyzeTrends(data: PhysiologicalData[]) {
    if (data.length < 2) return null;

    const latest = data[data.length - 1];
    const previous = data[data.length - 2];

    const trends = {
      hrv: latest.heartRateVariability! - previous.heartRateVariability!,
      rhr: latest.restingHeartRate! - previous.restingHeartRate!,
      deepSleep: latest.sleepStages!.deep - previous.sleepStages!.deep,
      sleepEfficiency: 0 // 需要额外计算
    };

    const insights: string[] = [];

    // HRV趋势分析
    if (trends.hrv > 5) insights.push('心率变异性显著改善，表明压力水平降低');
    else if (trends.hrv < -5) insights.push('心率变异性下降，可能压力增加或恢复不足');

    // 静息心率趋势
    if (trends.rhr < -3) insights.push('静息心率下降，表明心血管健康改善');
    else if (trends.rhr > 3) insights.push('静息心率上升，可能需要关注恢复状态');

    // 深睡趋势
    if (trends.deepSleep > 20) insights.push('深睡时间增加，睡眠质量可能改善');
    else if (trends.deepSleep < -20) insights.push('深睡时间减少，可能影响日间功能');

    return {
      trends,
      insights,
      overallTrend: trends.hrv > 0 && trends.rhr < 0 && trends.deepSleep > 0 ? 'positive' : 'neutral'
    };
  }

  /**
   * 获取生理数据建议
   */
  static getRecommendations(data: PhysiologicalData) {
    const recommendations: string[] = [];

    // HRV建议
    if (data.heartRateVariability && data.heartRateVariability < 30) {
      recommendations.push('心率变异性较低，建议增加放松训练如深呼吸或冥想');
    } else if (data.heartRateVariability && data.heartRateVariability > 60) {
      recommendations.push('心率变异性良好，继续保持当前作息');
    }

    // 静息心率建议
    if (data.restingHeartRate && data.restingHeartRate > 75) {
      recommendations.push('静息心率偏高，建议适度有氧运动改善心血管健康');
    }

    // 深睡建议
    if (data.sleepStages && data.sleepStages.deep < 60) {
      recommendations.push('深睡时间不足，确保睡眠环境黑暗、安静，避免睡前使用电子设备');
    }

    // 血氧建议
    if (data.bloodOxygen && data.bloodOxygen < 94) {
      recommendations.push('血氧饱和度偏低，如有不适请咨询医生');
    }

    return recommendations;
  }
}

// Apple Health模拟集成
export class AppleHealthSimulator {
  static async connect() {
    // 模拟连接过程
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          connected: true,
          permissions: ['heartRate', 'sleepAnalysis', 'oxygenSaturation'],
          device: 'iPhone模拟器'
        });
      }, 1000);
    });
  }

  static async fetchSleepData(startDate: Date, endDate: Date) {
    // 模拟获取睡眠数据
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(this.generateMockSleepData(startDate, endDate));
      }, 800);
    });
  }

  private static generateMockSleepData(startDate: Date, endDate: Date) {
    const data = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];
      data.push({
        date: dateStr,
        inBedStart: `${Math.floor(Math.random() * 2) + 22}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
        inBedEnd: `${Math.floor(Math.random() * 2) + 6}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
        asleepStart: `${Math.floor(Math.random() * 2) + 23}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
        asleepEnd: `${Math.floor(Math.random() * 2) + 6}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
        heartRateSamples: Array.from({ length: 10 }, () => 60 + Math.floor(Math.random() * 20))
      });
      current.setDate(current.getDate() + 1);
    }

    return data;
  }
}

// 导出工具函数
export const physiologicalService = {
  generateMockData: PhysiologicalDataGenerator.generateMockData,
  generateHistoricalData: PhysiologicalDataGenerator.generateHistoricalData,
  analyzeTrends: PhysiologicalDataGenerator.analyzeTrends,
  getRecommendations: PhysiologicalDataGenerator.getRecommendations,
  connectToHealthKit: AppleHealthSimulator.connect,
  fetchHealthData: AppleHealthSimulator.fetchSleepData
};