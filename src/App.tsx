import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { AppFooter } from './components/AppFooter';
import { AppHeader } from './components/AppHeader';
import { BottomNav, PrimaryTab } from './components/BottomNav';
import { DBASForm } from './components/DBASForm';
import { LegalCenter, LegalSection } from './components/LegalCenter';
import { OnboardingFlow } from './components/OnboardingFlow';
import { PSQIForm } from './components/PSQIForm';
import { ToastItem, ToastViewport } from './components/ToastViewport';
import { createDemoUserData, createEmptyUserData } from './data/demoData';
import {
  getDataStatusDescription,
  resolveTreatmentPhase,
  sortSleepLogs,
} from './lib/insights';
import { clearStoredUserData, loadAppState, loadUserData, saveAppState, saveUserData } from './lib/storage';
import { AssessmentsPage } from './pages/AssessmentsPage';
import { HomePage } from './pages/HomePage';
import { SleepRecordsPage } from './pages/SleepRecordsPage';
import { TreatmentPlanPage } from './pages/TreatmentPlanPage';
import { generateTaskPlan } from './services/geminiService';
import { AppState, CBTTask, DBASResult, PSQIResult, SleepLog, UserData } from './types';

function syncTreatmentPhase(userData: UserData): UserData {
  const phase = resolveTreatmentPhase(userData);
  const firstLog = sortSleepLogs(userData.sleepLogs)[0]?.date;

  return {
    ...userData,
    treatmentPhase: {
      ...userData.treatmentPhase,
      phase: phase.phase,
      currentWeek: phase.week,
      goals: phase.goals,
      startDate: userData.treatmentPhase.startDate || firstLog || format(new Date(), 'yyyy-MM-dd'),
    },
  };
}

export default function App() {
  const initialAppState = useMemo(() => loadAppState(), []);
  const [appState, setAppState] = useState<AppState>(initialAppState);
  const [userData, setUserData] = useState<UserData>(() => syncTreatmentPhase(loadUserData(initialAppState)));
  const [activeTab, setActiveTab] = useState<PrimaryTab>('home');
  const [composerOpen, setComposerOpen] = useState(false);
  const [showDbas, setShowDbas] = useState(false);
  const [showPsqi, setShowPsqi] = useState(false);
  const [legalOpen, setLegalOpen] = useState(false);
  const [legalSection, setLegalSection] = useState<LegalSection>('permissions');
  const [taskGenerationMessage, setTaskGenerationMessage] = useState<ToastItem | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const phase = resolveTreatmentPhase(userData);

  useEffect(() => {
    saveAppState(appState);
  }, [appState]);

  useEffect(() => {
    if (appState.setupComplete) {
      saveUserData(syncTreatmentPhase(userData));
    }
  }, [appState.setupComplete, userData]);

  const pushToast = (tone: ToastItem['tone'], title: string, description?: string) => {
    const item = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      tone,
      title,
      description,
    };
    setToasts((current) => [...current, item]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== item.id));
    }, 4600);
  };

  const dismissToast = (id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  };

  const updateUserData = (updater: (current: UserData) => UserData) => {
    setUserData((current) => syncTreatmentPhase(updater(current)));
  };

  const handleStartReal = () => {
    const realData = syncTreatmentPhase(createEmptyUserData());
    clearStoredUserData();
    setAppState({ setupComplete: true, dataMode: 'real' });
    setUserData(realData);
    setActiveTab('home');
    setTaskGenerationMessage(null);
    pushToast('success', '已进入真实记录模式', '现在开始，首页和治疗计划会基于你的真实数据逐步生成内容。');
  };

  const handleStartDemo = () => {
    const demoData = syncTreatmentPhase(createDemoUserData());
    setAppState({ setupComplete: true, dataMode: 'demo' });
    setUserData(demoData);
    setActiveTab('home');
    setTaskGenerationMessage({
      id: Date.now(),
      tone: 'info',
      title: '当前为示例数据模式',
      description: '示例数据仅用于浏览流程与界面，可随时切换为真实记录。',
    });
  };

  const handleSaveLog = (log: SleepLog) => {
    updateUserData((current) => {
      const nextLogs = [...current.sleepLogs, log].sort((a, b) => a.date.localeCompare(b.date));
      return {
        ...current,
        sleepLogs: nextLogs,
      };
    });
    pushToast('success', '已保存昨晚睡眠', '系统已更新趋势、阶段判断和任务建议。');
    setActiveTab('home');
  };

  const handleSaveDbas = (result: DBASResult) => {
    updateUserData((current) => ({
      ...current,
      dbasResults: [result, ...current.dbasResults.filter((item) => item.date !== result.date)],
    }));
    pushToast('success', '已保存 DBAS 评估', '治疗计划会结合最新睡眠信念评估结果更新推荐理由。');
  };

  const handleSavePsqi = (result: PSQIResult) => {
    updateUserData((current) => ({
      ...current,
      psqiResults: [result, ...current.psqiResults.filter((item) => item.date !== result.date)],
    }));
    pushToast('success', '已保存 PSQI 评估', '首页和治疗计划会结合最新睡眠质量结果更新解释。');
  };

  const handleGenerateTasks = async () => {
    const result = await generateTaskPlan(syncTreatmentPhase(userData));
    const today = format(new Date(), 'yyyy-MM-dd');

    if (result.tasks.length > 0) {
      updateUserData((current) => ({
        ...current,
        tasks: [
          ...current.tasks.filter((task) => task.date !== today || task.completed),
          ...result.tasks.map((task, index) => ({
            ...task,
            id: `${task.source || result.mode}_${Date.now()}_${index}`,
            date: today,
          })),
        ],
      }));
    }

    const message = {
      id: Date.now(),
      tone: result.error ? 'error' : result.mode === 'ai' ? 'success' : 'info',
      title: result.message,
      description: result.error
        ? `已回退到本地规则推荐。${result.error}`
        : result.mode === 'rules'
          ? '当前任务来自本地规则推荐，你仍然可以正常继续使用。'
          : '任务说明已结合当前记录与评估结果更新。',
    } as ToastItem;

    setTaskGenerationMessage(message);
    pushToast(message.tone, message.title, message.description);
  };

  const handleCompleteTask = (
    taskId: string,
    feedback: {
      rating: number;
      difficulty: number;
      helpfulness: number;
      willingness: 'yes' | 'maybe' | 'no';
      note?: string;
    },
  ) => {
    updateUserData((current) => {
      let matchedModule: CBTTask['module'] | undefined;
      let found = false;

      const nextTasks = current.tasks.map((task) => {
        if (task.id !== taskId) {
          return task;
        }

        found = true;
        matchedModule = task.module;

        return {
          ...task,
          completed: true,
          feedback: {
            rating: feedback.rating,
            difficulty: feedback.difficulty,
            helpfulness: feedback.helpfulness,
            willingness: feedback.willingness,
            note: feedback.note,
            completedAt: new Date().toISOString(),
          },
        };
      });

      if (!found) {
        return current;
      }

      const moduleRates = nextTasks.reduce<Record<string, { total: number; completed: number }>>((accumulator, task) => {
        if (!task.module) {
          return accumulator;
        }

        const currentStat = accumulator[task.module] || { total: 0, completed: 0 };
        currentStat.total += 1;
        currentStat.completed += task.completed ? 1 : 0;
        accumulator[task.module] = currentStat;
        return accumulator;
      }, {});

      const homeworkCompletionRateByModule = Object.fromEntries(
        Object.entries(moduleRates).map(([module, stats]) => [
          module,
          stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
        ]),
      );

      const barriers = new Set(current.adherenceProfile.adherenceBarriers || []);
      if (feedback.difficulty >= 4) {
        barriers.add('任务体感较难');
      }
      if (feedback.helpfulness <= 2) {
        barriers.add('当前任务帮助感偏低');
      }
      if (feedback.willingness === 'no') {
        barriers.add('继续意愿下降');
      }

      const dropoutRisk =
        feedback.willingness === 'no'
          ? 'high'
          : feedback.willingness === 'maybe' || feedback.difficulty >= 4
            ? 'moderate'
            : 'low';

      return {
        ...current,
        tasks: nextTasks,
        adherenceProfile: {
          ...current.adherenceProfile,
          taskDifficulty: feedback.difficulty,
          perceivedHelpfulness: feedback.helpfulness,
          willingnessToContinue: feedback.willingness,
          adherenceBarriers: Array.from(barriers),
          homeworkCompletionRateByModule: {
            ...current.adherenceProfile.homeworkCompletionRateByModule,
            ...homeworkCompletionRateByModule,
            ...(matchedModule && homeworkCompletionRateByModule[matchedModule]
              ? { [matchedModule]: homeworkCompletionRateByModule[matchedModule] }
              : {}),
          },
          dropoutRisk,
        },
      };
    });
    pushToast('success', '任务已完成', '系统已记录你的反馈，会在后续任务推荐中纳入参考。');
  };

  const handleAddHygieneTask = (task: CBTTask) => {
    updateUserData((current) => {
      const exists = current.tasks.some(
        (item) => item.title === task.title && item.date === task.date && !item.completed,
      );
      if (exists) {
        return current;
      }

      return {
        ...current,
        tasks: [task, ...current.tasks],
      };
    });
    pushToast('info', '已加入今日计划', '你可以在治疗计划页继续完成这项睡眠卫生任务。');
  };

  const handleExportData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      dataMode: appState.dataMode,
      note: getDataStatusDescription(appState.dataMode as 'demo' | 'real'),
      userData,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `somnus-cbt-i-${format(new Date(), 'yyyyMMdd-HHmm')}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    pushToast('success', '已导出当前数据', '已生成 JSON 文件，可用于备份或后续整理。');
  };

  const handleSwitchToRealMode = () => {
    if (window.confirm('这会清空当前示例数据，并开始新的真实记录。确定继续吗？')) {
      handleStartReal();
    }
  };

  const handleReloadDemo = () => {
    const demoData = syncTreatmentPhase(createDemoUserData());
    setAppState({ setupComplete: true, dataMode: 'demo' });
    setUserData(demoData);
    pushToast('info', '已重新载入示例数据', '你可以继续浏览示例流程，或随时切换回真实记录。');
  };

  const handleOpenLegal = (section: LegalSection) => {
    setLegalSection(section);
    setLegalOpen(true);
  };

  if (!appState.setupComplete || appState.dataMode === 'unset') {
    return (
      <>
        <OnboardingFlow
          onStartReal={handleStartReal}
          onStartDemo={handleStartDemo}
          onOpenLegal={handleOpenLegal}
        />
        <LegalCenter
          activeSection={legalSection}
          open={legalOpen}
          onClose={() => setLegalOpen(false)}
          onChangeSection={setLegalSection}
        />
        <ToastViewport items={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  return (
    <div className="min-h-screen pb-28">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(128,187,255,0.12),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(193,181,255,0.08),transparent_26%),linear-gradient(180deg,#0a1320_0%,#0d1726_45%,#09121d_100%)]" />
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[320px] bg-[radial-gradient(circle_at_top,rgba(143,208,255,0.12),transparent_60%)]" />

      <AppHeader dataMode={appState.dataMode} phaseLabel={phase.label} phaseWeek={phase.week} />

      <main>
        {activeTab === 'home' && (
          <HomePage
            userData={userData}
            onOpenSleepRecords={() => {
              setActiveTab('sleep');
              setComposerOpen(true);
            }}
            onOpenPlan={() => setActiveTab('plan')}
          />
        )}

        {activeTab === 'sleep' && (
          <SleepRecordsPage
            userData={userData}
            composerOpen={composerOpen}
            onComposerOpenChange={setComposerOpen}
            onSaveLog={handleSaveLog}
          />
        )}

        {activeTab === 'plan' && (
          <TreatmentPlanPage
            userData={userData}
            taskGenerationMessage={taskGenerationMessage}
            onGenerateTasks={handleGenerateTasks}
            onCompleteTask={handleCompleteTask}
            onAddHygieneTask={handleAddHygieneTask}
          />
        )}

        {activeTab === 'account' && (
          <AssessmentsPage
            userData={userData}
            dataMode={appState.dataMode}
            onOpenDbas={() => setShowDbas(true)}
            onOpenPsqi={() => setShowPsqi(true)}
            onExportData={handleExportData}
            onSwitchToRealMode={handleSwitchToRealMode}
            onReloadDemoData={handleReloadDemo}
          />
        )}
      </main>

      <AppFooter onOpenLegal={handleOpenLegal} />
      <BottomNav
        activeTab={activeTab}
        onChange={(tab) => {
          setActiveTab(tab);
          if (tab !== 'sleep') {
            setComposerOpen(false);
          }
        }}
      />

      {showDbas && <DBASForm onClose={() => setShowDbas(false)} onSave={handleSaveDbas} />}
      {showPsqi && <PSQIForm onClose={() => setShowPsqi(false)} onSave={handleSavePsqi} />}
      <LegalCenter
        activeSection={legalSection}
        open={legalOpen}
        onClose={() => setLegalOpen(false)}
        onChangeSection={setLegalSection}
      />
      <ToastViewport items={toasts} onDismiss={dismissToast} />
    </div>
  );
}
