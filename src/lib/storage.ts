import { createDemoUserData, createEmptyUserData, createInitialAppState } from '../data/demoData';
import { AppState, UserData } from '../types';

const APP_STATE_KEY = 'somnus_app_state_v2';
const USER_DATA_KEY = 'somnus_user_data_v2';

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function mergeUserData(base: UserData, raw: unknown): UserData {
  if (!raw || typeof raw !== 'object') {
    return base;
  }

  const stored = raw as Partial<UserData>;

  return {
    ...base,
    ...stored,
    sleepLogs: Array.isArray(stored.sleepLogs) ? stored.sleepLogs : base.sleepLogs,
    dbasResults: Array.isArray(stored.dbasResults) ? stored.dbasResults : base.dbasResults,
    psqiResults: Array.isArray(stored.psqiResults) ? stored.psqiResults : base.psqiResults,
    isiResults: Array.isArray(stored.isiResults) ? stored.isiResults : base.isiResults,
    essResults: Array.isArray(stored.essResults) ? stored.essResults : base.essResults,
    gad7Results: Array.isArray(stored.gad7Results) ? stored.gad7Results : base.gad7Results,
    phq9Results: Array.isArray(stored.phq9Results) ? stored.phq9Results : base.phq9Results,
    osaRiskResults: Array.isArray(stored.osaRiskResults) ? stored.osaRiskResults : base.osaRiskResults,
    bipolarRiskResults: Array.isArray(stored.bipolarRiskResults) ? stored.bipolarRiskResults : base.bipolarRiskResults,
    physiologicalData: Array.isArray(stored.physiologicalData) ? stored.physiologicalData : base.physiologicalData,
    tasks: Array.isArray(stored.tasks) ? stored.tasks : base.tasks,
    treatmentPhase: {
      ...base.treatmentPhase,
      ...(stored.treatmentPhase || {}),
      goals: Array.isArray(stored.treatmentPhase?.goals)
        ? stored.treatmentPhase.goals
        : base.treatmentPhase.goals,
    },
    riskProfile: {
      ...base.riskProfile,
      ...(stored.riskProfile || {}),
      psychiatricHistory: Array.isArray(stored.riskProfile?.psychiatricHistory)
        ? stored.riskProfile.psychiatricHistory
        : base.riskProfile.psychiatricHistory,
      substanceHistory: Array.isArray(stored.riskProfile?.substanceHistory)
        ? stored.riskProfile.substanceHistory
        : base.riskProfile.substanceHistory,
    },
    adherenceProfile: {
      ...base.adherenceProfile,
      ...(stored.adherenceProfile || {}),
      adherenceBarriers: Array.isArray(stored.adherenceProfile?.adherenceBarriers)
        ? stored.adherenceProfile.adherenceBarriers
        : base.adherenceProfile.adherenceBarriers,
      homeworkCompletionRateByModule:
        stored.adherenceProfile?.homeworkCompletionRateByModule || base.adherenceProfile.homeworkCompletionRateByModule,
    },
    preferences: {
      ...base.preferences,
      ...(stored.preferences || {}),
    },
  };
}

export function loadAppState(): AppState {
  if (!canUseStorage()) {
    return createInitialAppState();
  }

  try {
    const raw = window.localStorage.getItem(APP_STATE_KEY);
    if (!raw) {
      return createInitialAppState();
    }

    return {
      ...createInitialAppState(),
      ...JSON.parse(raw),
    } as AppState;
  } catch (error) {
    console.warn('Failed to load Somnus app state.', error);
    return createInitialAppState();
  }
}

export function saveAppState(appState: AppState) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(APP_STATE_KEY, JSON.stringify(appState));
}

export function loadUserData(appState: AppState): UserData {
  const fallback = appState.dataMode === 'demo' ? createDemoUserData() : createEmptyUserData();

  if (!canUseStorage()) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(USER_DATA_KEY);
    if (!raw) {
      return fallback;
    }

    return mergeUserData(fallback, JSON.parse(raw));
  } catch (error) {
    console.warn('Failed to load Somnus user data.', error);
    return fallback;
  }
}

export function saveUserData(userData: UserData) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
}

export function clearStoredUserData() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(USER_DATA_KEY);
}

export function resetDraft(key: string) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(key);
}
