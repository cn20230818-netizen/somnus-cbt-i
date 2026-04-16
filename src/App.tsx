import React, { lazy, Suspense, useEffect, useState } from 'react';
import { 
  Moon, 
  Sun, 
  Calendar, 
  ClipboardCheck, 
  BarChart3, 
  Plus, 
  CheckCircle2, 
  Circle,
  Clock,
  Brain,
  Wind,
  ShieldCheck,
  Sparkles,
  TrendingUp
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import {
  calculateSleepDurationMinutes,
  calculateSleepEfficiency,
  formatHoursFromMinutes,
} from './lib/sleep';
import { UserData, SleepLog, CBTTask, DBASResult, PSQIResult } from './types';

const SleepHygienePanel = lazy(() =>
  import('./components/SleepHygiene').then((module) => ({ default: module.SleepHygiene })),
);
const ProgressTrackingPanel = lazy(() =>
  import('./components/ProgressTracking').then((module) => ({ default: module.ProgressTracking })),
);
const DBASFormModal = lazy(() =>
  import('./components/DBASForm').then((module) => ({ default: module.DBASForm })),
);
const PSQIFormModal = lazy(() =>
  import('./components/PSQIForm').then((module) => ({ default: module.PSQIForm })),
);

// Mock Initial Data
const INITIAL_DATA: UserData = {
  sleepLogs: [
    { id: '1', date: '2024-04-10', bedTime: '23:00', fallAsleepTime: '23:30', wakeTime: '06:30', getUpTime: '07:00', wakeCount: 1, wakeDuration: 15, sleepQuality: 3, daytimeSleepiness: 4, efficiency: 81 },
    { id: '2', date: '2024-04-11', bedTime: '23:15', fallAsleepTime: '23:45', wakeTime: '06:45', getUpTime: '07:15', wakeCount: 2, wakeDuration: 20, sleepQuality: 2, daytimeSleepiness: 5, efficiency: 78 },
    { id: '3', date: '2024-04-12', bedTime: '22:45', fallAsleepTime: '23:15', wakeTime: '07:00', getUpTime: '07:30', wakeCount: 0, wakeDuration: 0, sleepQuality: 4, daytimeSleepiness: 2, efficiency: 88 },
  ],
  dbasResults: [
    {
      date: '2024-04-09',
      totalScore: 4.2,
      subScores: { consequences: 4.5, worry: 5.0, expectations: 3.8, medication: 3.5 },
      responses: {}
    }
  ],
  psqiResults: [
    {
      date: '2024-04-01',
      totalScore: 9,
      components: {
        quality: 2,
        latency: 1,
        duration: 1,
        efficiency: 2,
        disturbances: 2,
        medication: 0,
        dysfunction: 1
      },
      responses: {
        bedTime: '23:00',
        fallAsleepTime: '23:45',
        wakeTime: '06:30',
        getUpTime: '07:00',
        actualSleepHours: 6.5
      }
    }
  ],
  physiologicalData: [
    {
      date: '2024-04-12',
      heartRateVariability: 42,
      restingHeartRate: 68,
      sleepStages: {
        deep: 120,
        light: 240,
        rem: 90,
        awake: 30
      },
      movementCount: 18,
      bloodOxygen: 96,
      respiratoryRate: 14,
      temperature: 36.2
    }
  ],
  tasks: [
    { id: 't1', type: 'behavioral', title: '睡眠限制', description: '今晚23:30前不要上床，即使感到困倦。', completed: false, date: '2024-04-15' },
    { id: 't2', type: 'cognitive', title: '挑战信念', description: '写下"如果今晚睡不好，明天就完了"的替代想法。', completed: true, date: '2024-04-15' },
  ],
  treatmentPhase: {
    phase: 'intensive',
    startDate: '2024-04-01',
    currentWeek: 3,
    goals: [
      '将睡眠效率提升至85%以上',
      '减少入睡潜伏期至30分钟内',
      '降低DBAS总分至3.5以下'
    ]
  },
  preferences: {
    reminders: true,
    notificationTime: '21:00',
    language: 'zh',
    dataSharing: false
  }
};

function getInitialUserData(): UserData {
  if (typeof window === 'undefined') {
    return INITIAL_DATA;
  }

  try {
    const saved = window.localStorage.getItem('somnus_data');
    if (!saved) {
      return INITIAL_DATA;
    }

    const parsed = JSON.parse(saved) as Partial<UserData>;

    return {
      ...INITIAL_DATA,
      ...parsed,
      sleepLogs: Array.isArray(parsed.sleepLogs) ? parsed.sleepLogs : INITIAL_DATA.sleepLogs,
      dbasResults: Array.isArray(parsed.dbasResults) ? parsed.dbasResults : INITIAL_DATA.dbasResults,
      psqiResults: Array.isArray(parsed.psqiResults) ? parsed.psqiResults : INITIAL_DATA.psqiResults,
      physiologicalData: Array.isArray(parsed.physiologicalData)
        ? parsed.physiologicalData
        : INITIAL_DATA.physiologicalData,
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : INITIAL_DATA.tasks,
      treatmentPhase: {
        ...INITIAL_DATA.treatmentPhase,
        ...parsed.treatmentPhase,
      },
      preferences: {
        ...INITIAL_DATA.preferences,
        ...parsed.preferences,
      },
    };
  } catch (error) {
    console.warn('Failed to restore saved Somnus data, falling back to defaults.', error);
    return INITIAL_DATA;
  }
}

function PanelLoadingState({ label }: { label: string }) {
  return (
    <div className="glass-card p-8 text-sm text-white/60">
      {label}
    </div>
  );
}

function ModalLoadingState({ label }: { label: string }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110] flex items-center justify-center p-6">
      <div className="bg-[#151921] border border-white/10 w-full max-w-md rounded-[32px] p-8 text-sm text-white/60 shadow-2xl">
        {label}
      </div>
    </div>
  );
}

export default function App() {
  const [userData, setUserData] = useState<UserData>(() => getInitialUserData());
  const [activeTab, setActiveTab] = useState<'dashboard' | 'logs' | 'assess' | 'tasks' | 'hygiene' | 'progress'>('dashboard');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem('somnus_data', JSON.stringify(userData));
    } catch (error) {
      console.warn('Failed to persist Somnus data locally.', error);
    }
  }, [userData]);

  const handleAddTask = async () => {
    setIsGenerating(true);
    try {
      const { generateCBTTasks } = await import('./services/geminiService');
      const newTasks = await generateCBTTasks(userData);

      if (newTasks.length > 0) {
        setUserData(prev => ({
          ...prev,
          tasks: [...prev.tasks, ...newTasks]
        }));
      }
    } catch (error) {
      console.error('Failed to generate CBT tasks:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleTask = (id: string, feedback?: { rating: number, note?: string }) => {
    setUserData(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === id ? { 
        ...t, 
        completed: !t.completed,
        feedback: feedback || t.feedback 
      } : t)
    }));
  };

  return (
    <div className="min-h-screen pb-20 relative overflow-hidden">
      <div className="ambient-glow" />
      {/* Header */}
      <header className="p-6 md:p-10 max-w-7xl mx-auto">
        <div className="flex justify-between items-end">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight bg-gradient-to-r from-white to-soft-purple bg-clip-text text-transparent">Somnus AI</h1>
              <span className="text-white/40 text-xs font-medium border-l border-white/20 pl-3 mt-1">陕西省中医医院脑病科</span>
            </div>
            <p className="text-white/60 mt-2 font-medium uppercase tracking-widest text-[10px]">数据驱动的 CBT-I 系统</p>
          </div>
          <div className="hidden md:block text-right">
            <p className="text-white text-xl font-light">{format(new Date(), 'yyyy.MM.dd')}</p>
            <p className="text-white/40 text-[10px] uppercase tracking-widest mt-1">疗程阶段：第 1 周</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6">
        {activeTab === 'dashboard' && <Dashboard userData={userData} />}
        {activeTab === 'logs' && <SleepLogs userData={userData} setUserData={setUserData} />}
        {activeTab === 'assess' && <Assessments userData={userData} setUserData={setUserData} />}
        {activeTab === 'tasks' && (
          <Tasks 
            tasks={userData.tasks} 
            onToggle={toggleTask} 
            onGenerate={handleAddTask} 
            isGenerating={isGenerating} 
          />
        )}
        {activeTab === 'hygiene' && (
          <Suspense fallback={<PanelLoadingState label="正在加载睡眠卫生指南..." />}>
            <SleepHygienePanel />
          </Suspense>
        )}
        {activeTab === 'progress' && (
          <Suspense fallback={<PanelLoadingState label="正在加载康复追踪模块..." />}>
            <ProgressTrackingPanel userData={userData} />
          </Suspense>
        )}
      </main>

      {/* Navigation Rail */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/5 backdrop-blur-xl border-t border-white/10 px-6 py-3 z-50">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<BarChart3 size={20} />} label="概览" />
          <NavButton active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} icon={<Moon size={20} />} label="日志" />
          <NavButton active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} icon={<ClipboardCheck size={20} />} label="任务" />
          <NavButton active={activeTab === 'progress'} onClick={() => setActiveTab('progress')} icon={<TrendingUp size={20} />} label="进度" />
          <NavButton active={activeTab === 'hygiene'} onClick={() => setActiveTab('hygiene')} icon={<Sparkles size={20} />} label="卫生" />
          <NavButton active={activeTab === 'assess'} onClick={() => setActiveTab('assess')} icon={<Brain size={20} />} label="测评" />
        </div>
      </nav>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 transition-all duration-300",
        active ? "text-accent-blue scale-110" : "text-white/40 hover:text-white/60"
      )}
    >
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-tighter">{label}</span>
    </button>
  );
}

function Dashboard({ userData }: { userData: UserData }) {
  const efficiencyData = userData.sleepLogs.map(log => ({
    date: format(parseISO(log.date), 'MM/dd'),
    efficiency: log.efficiency
  }));

  const latestLog = userData.sleepLogs[userData.sleepLogs.length - 1];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="平均睡眠效率" 
          value={`${Math.round(userData.sleepLogs.reduce((acc, curr) => acc + curr.efficiency, 0) / userData.sleepLogs.length)}%`}
          subtitle="目标值：85%"
          icon={<ShieldCheck className="text-accent-blue" size={18} />}
        />
        <StatCard 
          title="昨晚睡眠时长" 
          value={latestLog ? `${formatHoursFromMinutes(calculateSleepDurationMinutes(latestLog))} 小时` : '--'}
          subtitle="较上周上升 12%"
          icon={<Moon className="text-accent-blue" size={18} />}
        />
        <StatCard 
          title="认知失调程度" 
          value={userData.dbasResults[0]?.totalScore.toFixed(1) || '--'}
          subtitle="需关注'睡眠预期'维度"
          icon={<Brain className="text-accent-blue" size={18} />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Today's Focus - Sleep Restriction Style */}
        <div className="glass-card p-8 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="card-indicator text-sm font-semibold mb-6">睡眠限制：推荐时间窗</div>
            <div className="text-center py-4">
              <p className="text-white/60 text-xs uppercase tracking-widest mb-2">今晚建议入睡 - 起床</p>
              <div className="text-5xl font-light tracking-tighter mb-4">23:30 — 07:00</div>
              <p className="text-sm text-white/80">规定卧床时长：7.5 小时</p>
              
              <div className="mt-8 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-accent-blue to-soft-purple transition-all duration-1000" 
                  style={{ width: `${latestLog?.efficiency || 0}%` }}
                />
              </div>
              <div className="flex justify-between mt-3 text-[10px] uppercase tracking-widest text-white/40">
                <span>当前效率 {latestLog?.efficiency || 0}%</span>
                <span>目标 85%</span>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-white/40 mt-8 leading-relaxed">
            * 只有感到困倦时才上床。如果 20 分钟内无法入睡，请离开卧室。
          </p>
        </div>

        {/* Chart */}
        <div className="glass-card p-8">
          <div className="card-indicator text-sm font-semibold mb-8">睡眠效率趋势</div>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={efficiencyData}>
                <defs>
                  <linearGradient id="colorEff" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4D7BFF" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4D7BFF" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: 'rgba(255,255,255,0.4)'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: 'rgba(255,255,255,0.4)'}} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#151921', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="efficiency" stroke="#4D7BFF" strokeWidth={2} fillOpacity={1} fill="url(#colorEff)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon }: { title: string, value: string, subtitle: string, icon: React.ReactNode }) {
  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl flex flex-col justify-between h-36">
      <div className="flex justify-between items-start">
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">{title}</span>
        <div className="p-2 bg-white/5 rounded-lg">{icon}</div>
      </div>
      <div>
        <div className="text-2xl font-medium text-white">{value}</div>
        <div className="text-[10px] text-emerald-400 uppercase tracking-tighter mt-1">{subtitle}</div>
      </div>
    </div>
  );
}

function SleepLogs({ userData, setUserData }: { userData: UserData, setUserData: React.Dispatch<React.SetStateAction<UserData>> }) {
  const [showForm, setShowForm] = useState(false);
  const [newLog, setNewLog] = useState<Partial<SleepLog>>({
    date: format(new Date(), 'yyyy-MM-dd'),
    bedTime: '23:00',
    fallAsleepTime: '23:30',
    wakeTime: '07:00',
    getUpTime: '07:15',
    wakeCount: 0,
    wakeDuration: 0,
    sleepQuality: 3,
    daytimeSleepiness: 3
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const log: SleepLog = {
      ...newLog as SleepLog,
      id: Math.random().toString(36).slice(2, 11),
      efficiency: calculateSleepEfficiency({
        date: newLog.date as string,
        bedTime: newLog.bedTime as string,
        fallAsleepTime: newLog.fallAsleepTime as string,
        wakeTime: newLog.wakeTime as string,
        getUpTime: newLog.getUpTime as string,
        wakeDuration: newLog.wakeDuration || 0,
      }),
    };

    setUserData(prev => ({
      ...prev,
      sleepLogs: [...prev.sleepLogs, log]
    }));
    setShowForm(false);
  };

  const chartData = userData.sleepLogs.map(log => {
    return {
      date: format(parseISO(log.date), 'MM/dd'),
      efficiency: log.efficiency,
      totalSleep: Math.round((calculateSleepDurationMinutes(log) / 60) * 10) / 10,
      wakeDuration: log.wakeDuration
    };
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-white">睡眠日志</h2>
        <button 
          onClick={() => setShowForm(true)}
          className="bg-accent-blue text-white p-3 rounded-full shadow-lg hover:shadow-accent-blue/20 transition-all"
        >
          <Plus size={24} />
        </button>
      </div>

      {/* Sleep Logs Chart */}
      <div className="glass-card p-6">
        <div className="card-indicator text-sm font-semibold mb-6">睡眠指标趋势</div>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorEffLog" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4D7BFF" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#4D7BFF" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorSleepLog" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#9D7CFF" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#9D7CFF" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: 'rgba(255,255,255,0.4)'}} />
              <YAxis yId="left" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: 'rgba(255,255,255,0.4)'}} />
              <YAxis yId="right" orientation="right" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: 'rgba(255,255,255,0.4)'}} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#151921', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)' }}
                itemStyle={{ fontSize: '12px' }}
              />
              <Area yId="left" type="monotone" dataKey="efficiency" name="效率 (%)" stroke="#4D7BFF" strokeWidth={2} fillOpacity={1} fill="url(#colorEffLog)" />
              <Area yId="right" type="monotone" dataKey="totalSleep" name="时长 (小时)" stroke="#9D7CFF" strokeWidth={2} fillOpacity={1} fill="url(#colorSleepLog)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-accent-blue" />
            <span className="text-[10px] text-white/60 uppercase tracking-widest">睡眠效率</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-soft-purple" />
            <span className="text-[10px] text-white/60 uppercase tracking-widest">总睡眠时长</span>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <form onSubmit={handleSubmit} className="bg-[#151921] border border-white/10 w-full max-w-lg rounded-[32px] p-8 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <h3 className="text-2xl font-semibold text-white">记录昨晚睡眠</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-white/40">上床时间</label>
                <input type="time" value={newLog.bedTime} onChange={e => setNewLog({...newLog, bedTime: e.target.value})} className="w-full p-3 bg-white/5 rounded-xl border border-white/10 text-white" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-white/40">入睡时间</label>
                <input type="time" value={newLog.fallAsleepTime} onChange={e => setNewLog({...newLog, fallAsleepTime: e.target.value})} className="w-full p-3 bg-white/5 rounded-xl border border-white/10 text-white" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-white/40">醒来时间</label>
                <input type="time" value={newLog.wakeTime} onChange={e => setNewLog({...newLog, wakeTime: e.target.value})} className="w-full p-3 bg-white/5 rounded-xl border border-white/10 text-white" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-white/40">起床时间</label>
                <input type="time" value={newLog.getUpTime} onChange={e => setNewLog({...newLog, getUpTime: e.target.value})} className="w-full p-3 bg-white/5 rounded-xl border border-white/10 text-white" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-white/40">夜间醒来次数</label>
              <input type="number" value={newLog.wakeCount} onChange={e => setNewLog({...newLog, wakeCount: parseInt(e.target.value)})} className="w-full p-3 bg-white/5 rounded-xl border border-white/10 text-white" />
            </div>
            <div className="flex gap-4">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 p-4 rounded-2xl text-white/60 font-medium">取消</button>
              <button type="submit" className="flex-1 p-4 rounded-2xl bg-accent-blue text-white font-medium">保存日志</button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {[...userData.sleepLogs].reverse().map(log => (
          <div key={log.id} className="glass-card p-6 flex justify-between items-center hover:bg-white/10 transition-colors">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">{log.date}</p>
              <p className="text-lg text-white font-medium">{log.bedTime} - {log.getUpTime}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-light text-accent-blue">{log.efficiency}%</p>
              <p className="text-[10px] uppercase tracking-widest text-white/40">效率</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Tasks({ tasks, onToggle, onGenerate, isGenerating }: { tasks: CBTTask[], onToggle: (id: string, feedback?: { rating: number, note?: string }) => void, onGenerate: () => void, isGenerating: boolean }) {
  const [showSuccess, setShowSuccess] = useState(false);
  const [feedbackTaskId, setFeedbackTaskId] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState('');

  const handleToggle = (id: string, currentlyCompleted: boolean) => {
    if (!currentlyCompleted) {
      setFeedbackTaskId(id);
    } else {
      onToggle(id);
    }
  };

  const submitFeedback = () => {
    if (feedbackTaskId) {
      onToggle(feedbackTaskId, { rating, note });
      setFeedbackTaskId(null);
      setRating(0);
      setNote('');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 relative">
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute -top-12 left-1/2 -translate-x-1/2 bg-accent-blue text-white px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-accent-blue/20 z-10"
          >
            任务已完成！✨
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feedback Modal */}
      <AnimatePresence>
        {feedbackTaskId && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#151921] border border-white/10 w-full max-w-md rounded-[32px] p-8 space-y-6 shadow-2xl"
            >
              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold text-white">任务反馈</h3>
                <p className="text-white/40 text-xs">这项任务对您的睡眠有帮助吗？</p>
              </div>

              <div className="flex justify-center gap-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button 
                    key={star}
                    onClick={() => setRating(star)}
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                      rating >= star ? "bg-accent-blue text-white" : "bg-white/5 text-white/20 hover:bg-white/10"
                    )}
                  >
                    ★
                  </button>
                ))}
              </div>

              <textarea 
                placeholder="添加简短笔记（可选）..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-accent-blue/50 h-24 resize-none"
              />

              <div className="flex gap-4 pt-2">
                <button 
                  onClick={() => setFeedbackTaskId(null)}
                  className="flex-1 p-4 rounded-2xl text-white/40 text-sm font-bold uppercase tracking-widest"
                >
                  跳过
                </button>
                <button 
                  onClick={submitFeedback}
                  disabled={rating === 0}
                  className="flex-1 p-4 rounded-2xl bg-accent-blue text-white text-sm font-bold uppercase tracking-widest disabled:opacity-50"
                >
                  完成
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-white">今日 CBT 任务</h2>
        <button 
          onClick={onGenerate}
          disabled={isGenerating}
          className={cn(
            "bg-accent-blue text-white px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg hover:shadow-accent-blue/20 transition-all",
            isGenerating && "opacity-50 cursor-not-allowed"
          )}
        >
          {isGenerating ? '生成中...' : '生成今日任务'}
        </button>
      </div>

      <div className="space-y-4">
        {tasks.map(task => (
          <motion.div 
            key={task.id} 
            layout
            whileTap={{ scale: 0.98 }}
            onClick={() => handleToggle(task.id, task.completed)}
            className={cn(
              "p-5 rounded-2xl border transition-all cursor-pointer flex gap-4 items-center",
              task.completed 
                ? "bg-white/5 border-white/5 opacity-40" 
                : "bg-white/5 border-white/10 hover:border-accent-blue/30 hover:bg-accent-blue/5"
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0",
              task.completed ? "bg-white/5" : "bg-white/10"
            )}>
              {task.type === 'cognitive' ? '🧠' :
               task.type === 'behavioral' ? '🚶' :
               task.type === 'relaxation' ? '🧘' : '📝'}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className={cn("text-sm font-semibold text-white", task.completed && "line-through")}>{task.title}</h4>
                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/10 text-white/40 font-bold uppercase tracking-widest">
                  {task.type === 'cognitive' ? '认知' :
                   task.type === 'behavioral' ? '行为' :
                   task.type === 'relaxation' ? '放松' : '卫生'}
                </span>
              </div>
              <p className="text-xs text-white/40 mt-0.5">{task.description}</p>
            </div>
            <div className="shrink-0">
              <AnimatePresence mode="wait">
                {task.completed ? (
                  <motion.div
                    key="checked"
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0 }}
                  >
                    <CheckCircle2 size={20} className="text-accent-blue" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="unchecked"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    <Circle size={20} className="text-white/20" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function Assessments({ userData, setUserData }: { userData: UserData, setUserData: React.Dispatch<React.SetStateAction<UserData>> }) {
  const [showDBAS, setShowDBAS] = useState(false);
  const [showPSQI, setShowPSQI] = useState(false);

  const handleSaveDBAS = (result: DBASResult) => {
    setUserData(prev => ({
      ...prev,
      dbasResults: [result, ...prev.dbasResults]
    }));
    setShowDBAS(false);
  };

  const handleSavePSQI = (result: PSQIResult) => {
    setUserData(prev => ({
      ...prev,
      psqiResults: [result, ...prev.psqiResults]
    }));
    setShowPSQI(false);
  };

  // 计算PSQI严重程度
  const getPSQISeverity = (score: number) => {
    if (score < 5) return { label: '睡眠质量好', color: 'text-emerald-400' };
    if (score < 10) return { label: '轻度睡眠障碍', color: 'text-amber-400' };
    if (score < 15) return { label: '中度睡眠障碍', color: 'text-orange-400' };
    return { label: '重度睡眠障碍', color: 'text-rose-400' };
  };

  const latestPSQI = userData.psqiResults[0];
  const psqiSeverity = latestPSQI ? getPSQISeverity(latestPSQI.totalScore) : null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <h2 className="text-2xl font-semibold text-white">心理测评</h2>

      {showDBAS && (
        <Suspense fallback={<ModalLoadingState label="正在加载 DBAS 测评..." />}>
          <DBASFormModal onClose={() => setShowDBAS(false)} onSave={handleSaveDBAS} />
        </Suspense>
      )}
      {showPSQI && (
        <Suspense fallback={<ModalLoadingState label="正在加载 PSQI 测评..." />}>
          <PSQIFormModal onClose={() => setShowPSQI(false)} onSave={handleSavePSQI} />
        </Suspense>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-8 space-y-4">
          <div className="flex justify-between items-start">
            <div className="card-indicator text-lg font-semibold text-white">DBAS-30</div>
            <span className="bg-white/10 text-white/60 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">睡眠信念</span>
          </div>
          <p className="text-white/40 text-sm leading-relaxed">评估您对睡眠的非理性信念和态度。这是认知重建的基础。</p>
          <div className="pt-4 flex justify-between items-end">
            <div>
              <p className="text-[10px] uppercase font-bold text-white/40 tracking-widest">最近得分</p>
              <p className="text-3xl font-light text-accent-blue">{userData.dbasResults[0]?.totalScore.toFixed(1) || '未测评'}</p>
            </div>
            <button onClick={() => setShowDBAS(true)} className="bg-white text-black px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-white/90 transition-colors">开始测评</button>
          </div>
        </div>

        <div className="glass-card p-8 space-y-4">
          <div className="flex justify-between items-start">
            <div className="card-indicator text-lg font-semibold text-white">PSQI</div>
            <span className="bg-white/10 text-white/60 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">睡眠质量</span>
          </div>
          <p className="text-white/40 text-sm leading-relaxed">匹兹堡睡眠质量指数，用于评估过去一个月的睡眠质量。</p>
          <div className="pt-4 flex justify-between items-end">
            <div>
              <p className="text-[10px] uppercase font-bold text-white/40 tracking-widest">最近得分</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-light text-white">{latestPSQI?.totalScore ?? '--'}</p>
                {psqiSeverity && (
                  <span className={`text-xs font-bold ${psqiSeverity.color}`}>
                    {psqiSeverity.label}
                  </span>
                )}
              </div>
            </div>
            <button onClick={() => setShowPSQI(true)} className="bg-white text-black px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-white/90 transition-colors">开始测评</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/5 p-8 rounded-[32px] border border-dashed border-white/10">
          <div className="flex items-center gap-4 mb-4">
            <Brain className="text-accent-blue" />
            <h4 className="text-lg font-semibold text-white">认知分析</h4>
          </div>
          <p className="text-white/60 text-sm leading-relaxed">
            {userData.dbasResults[0] ? (
              `您的 DBAS 总分${userData.dbasResults[0].totalScore.toFixed(1)}分，在"${Object.entries(userData.dbasResults[0].subScores).reduce((a, b) => a[1] > b[1] ? a : b)[0]}"维度得分最高。这意味着您可能过度担心睡眠不足的影响。`
            ) : (
              '完成DBAS测评后，系统将分析您的睡眠认知模式并提供个性化建议。'
            )}
          </p>
        </div>

        <div className="bg-white/5 p-8 rounded-[32px] border border-dashed border-white/10">
          <div className="flex items-center gap-4 mb-4">
            <Moon className="text-soft-purple" />
            <h4 className="text-lg font-semibold text-white">睡眠质量分析</h4>
          </div>
          <p className="text-white/60 text-sm leading-relaxed">
            {latestPSQI ? (
              `您的PSQI总分${latestPSQI.totalScore}分，表示${psqiSeverity?.label.toLowerCase()}。最需要改善的方面是"${Object.entries(latestPSQI.components).reduce((a, b) => a[1] > b[1] ? a : b)[0]}"。`
            ) : (
              '完成PSQI测评后，系统将全面评估您过去一个月的睡眠质量并提供改善建议。'
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
