export type WorkShiftType = 'regular' | 'early' | 'rotating' | 'night' | 'irregular';
export type RiskLevel = 'low' | 'moderate' | 'high';
export type ReadinessLevel = 'low' | 'moderate' | 'high';
export type SeverityLevel = 'minimal' | 'mild' | 'moderate' | 'moderately_severe' | 'severe';
export type DaytimeImpairmentLevel = 'none' | 'mild' | 'moderate' | 'severe';
export type ChronicityLevel = 'acute' | 'subacute' | 'chronic_tendency' | 'chronic';
export type TreatmentModuleId =
  | 'stimulusControl'
  | 'sleepRestriction'
  | 'sleepCompression'
  | 'sleepHygieneEducation'
  | 'cognitiveTherapy'
  | 'relaxationTraining'
  | 'paradoxicalIntention'
  | 'biofeedback'
  | 'sleepReschedulingOrReinforcement'
  | 'relapsePrevention';
export type CBTFormType = 'thoughtRecord' | 'abcRecord' | 'dtrRecord' | 'balancedAlternativeBelief';
export type TreatmentStage =
  | '入组筛查'
  | '失眠临床评估'
  | '风险与禁忌证判断'
  | '个案概念化'
  | '阶段化治疗计划'
  | '逐周复盘与调参'
  | '巩固与复发预防'
  | '暂缓进入标准 CBT-I';

export interface SleepLog {
  id: string;
  date: string;
  bedTime: string;
  fallAsleepTime: string;
  wakeTime: string;
  getUpTime: string;
  wakeCount: number;
  wakeDuration: number;
  sleepQuality: number;
  daytimeSleepiness: number;
  efficiency: number;
  note?: string;
  napStart?: string;
  napEnd?: string;
  napDuration?: number;
  caffeineIntake?: number;
  alcoholIntake?: number;
  nicotineUse?: boolean;
  sleepMedicationUse?: boolean;
  eveningScreenExposure?: number;
  exerciseTiming?: 'morning' | 'afternoon' | 'evening' | 'none';
  lastHourActivities?: string[];
  bedtimeEmotionArousal?: number;
  preSleepThoughts?: string[];
  weekendScheduleDeviation?: number;
  workShiftType?: WorkShiftType;
  jetLagOrTravel?: boolean;
  painOrSomaticSymptoms?: number;
  nocturnalEnvironmentIssues?: string[];
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
    quality: number;
    latency: number;
    duration: number;
    efficiency: number;
    disturbances: number;
    medication: number;
    dysfunction: number;
  };
  responses: {
    bedTime?: string;
    fallAsleepTime?: string;
    wakeTime?: string;
    getUpTime?: string;
    actualSleepHours?: number;
    disturbances?: Record<string, number>;
  };
}

export interface NumericScaleResult {
  date: string;
  score: number;
  severity?: SeverityLevel;
  interpretation?: string;
  responses?: Record<string, number>;
}

export interface OSARiskResult {
  date: string;
  riskLevel: RiskLevel;
  score?: number;
  note?: string;
  responses?: Record<string, number>;
}

export interface BipolarRiskResult {
  date: string;
  riskLevel: RiskLevel;
  score?: number;
  note?: string;
  responses?: Record<string, number>;
}

export interface PhysiologicalData {
  date: string;
  heartRateVariability?: number;
  restingHeartRate?: number;
  sleepStages?: {
    deep: number;
    light: number;
    rem: number;
    awake: number;
  };
  movementCount?: number;
  bloodOxygen?: number;
  respiratoryRate?: number;
  temperature?: number;
}

export interface TreatmentPhase {
  phase: 'assessment' | 'intensive' | 'consolidation' | 'maintenance';
  startDate: string;
  endDate?: string;
  goals: string[];
  currentWeek: number;
}

export interface TaskFeedback {
  rating: number;
  difficulty?: number;
  helpfulness?: number;
  willingness?: 'yes' | 'maybe' | 'no';
  note?: string;
  completedAt?: string;
}

export interface CBTTask {
  id: string;
  type: 'cognitive' | 'behavioral' | 'relaxation' | 'hygiene';
  title: string;
  description: string;
  completed: boolean;
  date: string;
  estimatedMinutes?: number;
  rationale?: string;
  source?: 'ai' | 'rules' | 'manual';
  feedback?: TaskFeedback;
  module?: TreatmentModuleId;
  flowSteps?: string[];
  forms?: CBTFormType[];
  frequency?: string;
  evaluationHint?: string;
}

export interface RiskAndBackgroundProfile {
  insomniaDuration?: string;
  onsetTrigger?: string;
  psychiatricHistory?: string[];
  substanceHistory?: string[];
  chronicPain?: boolean;
  respiratoryRisk?: RiskLevel;
  parasomniaRisk?: RiskLevel;
  seizureRisk?: RiskLevel;
  unstableMedicalCondition?: boolean;
  unstablePsychCondition?: boolean;
  selfHarmRisk?: RiskLevel;
  pregnancyOrSpecialPopulation?: boolean;
  priorCBTIExperience?: string;
  treatmentPreference?: string;
  readinessForBehaviorChange?: ReadinessLevel;
}

export interface AdherenceProfile {
  taskDifficulty?: number;
  perceivedHelpfulness?: number;
  willingnessToContinue?: 'yes' | 'maybe' | 'no';
  adherenceBarriers?: string[];
  homeworkCompletionRateByModule?: Partial<Record<TreatmentModuleId, number>>;
  dropoutRisk?: RiskLevel;
}

export interface ModuleSelection {
  id: TreatmentModuleId;
  title: string;
  rationale: string;
  focus: string[];
  dailyActions: string[];
  weeklyAdjustmentRules: string[];
  frequency?: string;
  duration?: string;
  evaluationHint?: string;
  flowSteps?: string[];
  forms?: CBTFormType[];
}

export interface ScreeningOutcome {
  eligibleForStandardCBTI: boolean;
  cautionFlags: string[];
  redirectRecommendation: string | null;
  chronicInsomniaPattern: boolean;
  chronicInsomniaReasons: string[];
}

export interface ClinicalAssessment {
  insomniaPhenotype: string[];
  severityLevel: SeverityLevel;
  daytimeImpairmentLevel: DaytimeImpairmentLevel;
  chronicityLevel: ChronicityLevel;
  latestNightMetrics: {
    sleepLatency: number | null;
    totalSleepTime: number | null;
    timeInBed: number | null;
    sleepEfficiency: number | null;
    WASO: number | null;
    awakenings: number | null;
    subjectiveQuality: number | null;
  };
  weeklyAverages: {
    avgSleepLatency7d: number | null;
    avgTST7d: number | null;
    avgTIB7d: number | null;
    avgSE7d: number | null;
    avgWASO7d: number | null;
    avgAwakenings7d: number | null;
  };
  scheduleStability: {
    bedtimeVariability: number | null;
    waketimeVariability: number | null;
    weekendCatchupSleep: number | null;
    napBurden: number | null;
  };
  cognitionMoodMetrics: {
    dbasTotal: number | null;
    highestDBASDimension: string | null;
    psqiTotal: number | null;
    worstPSQIComponent: string | null;
    anxietyBurden: number | null;
    depressionBurden: number | null;
  };
  keyMetrics: string[];
}

export interface CaseConceptualization {
  predispose: string[];
  precipitate: string[];
  perpetuate: string[];
  currentPriorityTargets: string[];
  summaryText: string;
}

export interface StructuredTreatmentPlan {
  stage: TreatmentStage;
  goals: string[];
  primaryModules: ModuleSelection[];
  secondaryModules: ModuleSelection[];
  deferredModules: ModuleSelection[];
  rationaleByModule: Record<string, string>;
  dailyTasks: CBTTask[];
  weeklyAdjustmentRules: string[];
  safetyNotes: string[];
}

export interface WeeklyReview {
  weekSummary: string;
  moduleResponse: Array<{
    module: string;
    response: string;
    indicators: string[];
  }>;
  adherenceSummary: string;
  adjustmentDecision: string;
  nextWeekPlan: string[];
  relapseRisk: string;
}

export interface CBTIAnalysisBundle {
  screening: ScreeningOutcome;
  assessment: ClinicalAssessment;
  caseConceptualization: CaseConceptualization;
  treatmentPlan: StructuredTreatmentPlan;
  weeklyReview: WeeklyReview;
}

export interface UserData {
  sleepLogs: SleepLog[];
  dbasResults: DBASResult[];
  psqiResults: PSQIResult[];
  isiResults: NumericScaleResult[];
  essResults: NumericScaleResult[];
  gad7Results: NumericScaleResult[];
  phq9Results: NumericScaleResult[];
  osaRiskResults: OSARiskResult[];
  bipolarRiskResults: BipolarRiskResult[];
  physiologicalData: PhysiologicalData[];
  tasks: CBTTask[];
  treatmentPhase: TreatmentPhase;
  riskProfile: RiskAndBackgroundProfile;
  adherenceProfile: AdherenceProfile;
  preferences: {
    reminders: boolean;
    notificationTime: string;
    language: 'zh' | 'en';
    dataSharing: boolean;
  };
}

export type DataMode = 'unset' | 'demo' | 'real';

export interface AppState {
  setupComplete: boolean;
  dataMode: DataMode;
}
