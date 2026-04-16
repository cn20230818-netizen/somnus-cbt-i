export interface SleepLog {
  id: string;
  date: string;
  bedTime: string; // HH:mm
  fallAsleepTime: string; // HH:mm
  wakeTime: string; // HH:mm
  getUpTime: string; // HH:mm
  wakeCount: number;
  wakeDuration: number; // minutes
  sleepQuality: number; // 1-5
  daytimeSleepiness: number; // 1-5
  efficiency: number; // percentage
}

export interface DBASResult {
  date: string;
  totalScore: number;
  subScores: {
    consequences: number;
    worry: number;
    expectations: number;
    medication: number;
  };
  responses: Record<number, number>;
}

export interface PSQIResult {
  date: string;
  totalScore: number;
  components: {
    quality: number;        // 主观睡眠质量
    latency: number;        // 入睡潜伏期
    duration: number;       // 睡眠时长
    efficiency: number;     // 睡眠效率
    disturbances: number;   // 睡眠紊乱
    medication: number;     // 睡眠药物使用
    dysfunction: number;    // 日间功能障碍
  };
  responses: {
    bedTime?: string;
    fallAsleepTime?: string;
    wakeTime?: string;
    getUpTime?: string;
    actualSleepHours?: number;
    // 其他PSQI问题响应
  };
}

export interface PhysiologicalData {
  date: string;
  heartRateVariability?: number; // 心率变异性(ms)
  restingHeartRate?: number;     // 静息心率(bpm)
  sleepStages?: {
    deep: number;    // 深睡时长(分钟)
    light: number;   // 浅睡时长
    rem: number;     // REM睡眠时长
    awake: number;   // 清醒时长
  };
  movementCount?: number;        // 体动次数
  bloodOxygen?: number;          // 血氧饱和度(%)
  respiratoryRate?: number;      // 呼吸频率(次/分钟)
  temperature?: number;          // 皮肤温度(℃)
}

export interface TreatmentPhase {
  phase: 'assessment' | 'intensive' | 'consolidation' | 'maintenance';
  startDate: string;
  endDate?: string;
  goals: string[];
  currentWeek: number;
}

export interface CBTTask {
  id: string;
  type: 'cognitive' | 'behavioral' | 'relaxation' | 'hygiene';
  title: string;
  description: string;
  completed: boolean;
  date: string;
  feedback?: {
    rating: number; // 1-5
    note?: string;
  };
}

export interface UserData {
  sleepLogs: SleepLog[];
  dbasResults: DBASResult[];
  psqiResults: PSQIResult[];
  physiologicalData: PhysiologicalData[];
  tasks: CBTTask[];
  treatmentPhase: TreatmentPhase;
  preferences: {
    reminders: boolean;
    notificationTime: string;
    language: 'zh' | 'en';
    dataSharing: boolean;
  };
}
