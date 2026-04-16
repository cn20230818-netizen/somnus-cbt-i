import { createDemoUserData, createEmptyUserData, createInitialAppState } from '../data/demoData';
import { AppState, UserData } from '../types';

const APP_STATE_KEY = 'somnus_app_state_v2';
const USER_DATA_KEY = 'somnus_user_data_v2';

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
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
  if (!canUseStorage()) {
    return appState.dataMode === 'demo' ? createDemoUserData() : createEmptyUserData();
  }

  try {
    const raw = window.localStorage.getItem(USER_DATA_KEY);
    if (!raw) {
      return appState.dataMode === 'demo' ? createDemoUserData() : createEmptyUserData();
    }

    return JSON.parse(raw) as UserData;
  } catch (error) {
    console.warn('Failed to load Somnus user data.', error);
    return appState.dataMode === 'demo' ? createDemoUserData() : createEmptyUserData();
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
