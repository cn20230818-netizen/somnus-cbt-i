import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, MoonStar, Plus, Save } from 'lucide-react';
import { UserData, SleepLog } from '../types';
import {
  getAverageSleepDurationHours,
  getEmptyStateMessage,
  getSleepRecordSnapshot,
  getWeeklyTrendSummary,
  resolveTreatmentPhase,
  sortSleepLogs,
} from '../lib/insights';
import {
  calculateSleepEfficiency,
  formatHoursFromMinutes,
} from '../lib/sleep';

interface SleepRecordsPageProps {
  userData: UserData;
  composerOpen: boolean;
  onComposerOpenChange: (open: boolean) => void;
  onSaveLog: (log: SleepLog) => void;
}

interface DraftLogState {
  date: string;
  bedTime: string;
  fallAsleepTime: string;
  wakeTime: string;
  getUpTime: string;
  wakeCount: number;
  wakeDuration: number;
  sleepQuality: number;
  daytimeSleepiness: number;
  note: string;
}

function createDraftLog(): DraftLogState {
  return {
    date: new Date().toISOString().split('T')[0],
    bedTime: '23:00',
    fallAsleepTime: '23:30',
    wakeTime: '06:40',
    getUpTime: '07:00',
    wakeCount: 0,
    wakeDuration: 0,
    sleepQuality: 3,
    daytimeSleepiness: 3,
    note: '',
  };
}

export function SleepRecordsPage({
  userData,
  composerOpen,
  onComposerOpenChange,
  onSaveLog,
}: SleepRecordsPageProps) {
  const [step, setStep] = useState(0);
  const [draftLog, setDraftLog] = useState<DraftLogState>(() => createDraftLog());

  useEffect(() => {
    if (!composerOpen) {
      setStep(0);
      setDraftLog(createDraftLog());
    }
  }, [composerOpen]);

  const sortedLogs = useMemo(() => sortSleepLogs(userData.sleepLogs), [userData.sleepLogs]);
  const latestLogs = [...sortedLogs].reverse();
  const phase = resolveTreatmentPhase(userData);
  const weeklyTrend = getWeeklyTrendSummary(userData);
  const averageSleepDuration = getAverageSleepDurationHours(userData);
  const emptyState = getEmptyStateMessage(userData);

  const computedSnapshot = {
    totalSleepMinutes: calculateSleepEfficiency({
      date: draftLog.date,
      bedTime: draftLog.bedTime,
      fallAsleepTime: draftLog.fallAsleepTime,
      wakeTime: draftLog.wakeTime,
      getUpTime: draftLog.getUpTime,
      wakeDuration: draftLog.wakeDuration,
    }),
    sleepDurationMinutes: getSleepRecordSnapshot({
      id: 'draft',
      date: draftLog.date,
      bedTime: draftLog.bedTime,
      fallAsleepTime: draftLog.fallAsleepTime,
      wakeTime: draftLog.wakeTime,
      getUpTime: draftLog.getUpTime,
      wakeCount: draftLog.wakeCount,
      wakeDuration: draftLog.wakeDuration,
      sleepQuality: draftLog.sleepQuality,
      daytimeSleepiness: draftLog.daytimeSleepiness,
      efficiency: 0,
      note: draftLog.note,
    }),
  };

  const weekGoalComparison =
    weeklyTrend.chartData.length > 0 && computedSnapshot.totalSleepMinutes >= 85
      ? '已达到本周的睡眠效率目标范围。'
      : weeklyTrend.chartData.length > 0
        ? '仍低于本周目标，可继续减少在床清醒时间。'
        : '完成更多记录后，系统会自动与你的本周目标进行对照。';

  const canContinue =
    step === 0
      ? Boolean(draftLog.date && draftLog.bedTime && draftLog.fallAsleepTime && draftLog.wakeTime && draftLog.getUpTime)
      : step === 1
        ? draftLog.wakeCount >= 0 && draftLog.wakeDuration >= 0
        : draftLog.sleepQuality > 0 && draftLog.daytimeSleepiness > 0;

  const handleSave = () => {
    const efficiency = calculateSleepEfficiency({
      date: draftLog.date,
      bedTime: draftLog.bedTime,
      fallAsleepTime: draftLog.fallAsleepTime,
      wakeTime: draftLog.wakeTime,
      getUpTime: draftLog.getUpTime,
      wakeDuration: draftLog.wakeDuration,
    });

    const log: SleepLog = {
      id: `log_${Date.now()}`,
      date: draftLog.date,
      bedTime: draftLog.bedTime,
      fallAsleepTime: draftLog.fallAsleepTime,
      wakeTime: draftLog.wakeTime,
      getUpTime: draftLog.getUpTime,
      wakeCount: draftLog.wakeCount,
      wakeDuration: draftLog.wakeDuration,
      sleepQuality: draftLog.sleepQuality,
      daytimeSleepiness: draftLog.daytimeSleepiness,
      efficiency,
      note: draftLog.note.trim() || undefined,
    };

    onSaveLog(log);
    onComposerOpenChange(false);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 pt-8 sm:px-6">
      <section className="grid gap-4 lg:grid-cols-[1.02fr_0.98fr]">
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-sky-100">睡眠记录</p>
              <h2 className="mt-2 text-3xl font-semibold text-white">记录一晚睡眠，也理解一晚睡眠</h2>
              <p className="mt-3 text-sm leading-7 text-white/66">
                先按真实时间记录，再结合自动计算结果回顾昨晚发生了什么。连续记录后，系统会更新趋势、阶段和任务建议。
              </p>
            </div>
            <button
              onClick={() => onComposerOpenChange(true)}
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-sky-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-200"
            >
              <Plus size={16} />
              新建记录
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-white/48">当前阶段</p>
              <p className="mt-2 text-lg font-semibold text-white">{phase.label}</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-white/48">近 7 天平均睡眠时长</p>
              <p className="mt-2 text-lg font-semibold text-white">{averageSleepDuration ? `${averageSleepDuration} 小时` : '暂无足够数据'}</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-white/48">当前记录状态</p>
              <p className="mt-2 text-lg font-semibold text-white">{sortedLogs.length > 0 ? `已记录 ${sortedLogs.length} 晚` : '尚未开始记录'}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl sm:p-8">
          <p className="text-lg font-semibold text-white">为什么要持续记录</p>
          <p className="mt-3 text-sm leading-7 text-white/66">{emptyState.description}</p>
          <div className="mt-5 space-y-3">
            {[
              '系统会自动计算睡眠时长、入睡潜伏期和睡眠效率。',
              '连续记录后，首页会开始显示本周趋势和关键解释。',
              '完成测评后，任务建议会更贴近当前最需要处理的问题。',
            ].map((item) => (
              <div key={item} className="rounded-[22px] border border-white/8 bg-white/5 p-4 text-sm leading-7 text-white/72">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {composerOpen && (
        <section className="rounded-[32px] border border-sky-200/16 bg-gradient-to-br from-sky-400/12 via-slate-900/72 to-violet-300/8 p-5 shadow-[0_24px_80px_rgba(2,6,23,0.24)] backdrop-blur-xl sm:p-8">
          <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
            <div className="space-y-5">
              <div className="space-y-3">
                <p className="text-sm font-medium text-sky-100">三步记录流程</p>
                <h3 className="text-2xl font-semibold text-white">记录昨晚睡眠</h3>
                <div className="flex gap-2">
                  {['时间记录', '夜间情况', '主观体验'].map((label, index) => (
                    <div
                      key={label}
                      className={`rounded-full px-4 py-2 text-sm ${
                        step === index ? 'bg-sky-300 text-slate-950' : 'bg-white/8 text-white/64'
                      }`}
                    >
                      {label}
                    </div>
                  ))}
                </div>
              </div>

              {step === 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    { key: 'date', label: '日期', type: 'date' },
                    { key: 'bedTime', label: '上床时间', type: 'time' },
                    { key: 'fallAsleepTime', label: '入睡时间', type: 'time' },
                    { key: 'wakeTime', label: '醒来时间', type: 'time' },
                    { key: 'getUpTime', label: '起床时间', type: 'time' },
                  ].map((field) => (
                    <label key={field.key} className={`space-y-2 text-sm text-white/76 ${field.key === 'date' ? 'md:col-span-2' : ''}`}>
                      <span>{field.label}</span>
                      <input
                        type={field.type}
                        value={draftLog[field.key as keyof DraftLogState] as string}
                        onChange={(event) =>
                          setDraftLog((current) => ({
                            ...current,
                            [field.key]: event.target.value,
                          }))
                        }
                        className="w-full rounded-[24px] border border-white/10 bg-slate-950/54 px-4 py-4 text-base text-white outline-none transition focus:border-sky-300/60"
                      />
                    </label>
                  ))}
                </div>
              )}

              {step === 1 && (
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm text-white/76">
                    <span>夜间醒来次数</span>
                    <input
                      type="number"
                      min={0}
                      value={draftLog.wakeCount}
                      onChange={(event) =>
                        setDraftLog((current) => ({
                          ...current,
                          wakeCount: Number(event.target.value),
                        }))
                      }
                      className="w-full rounded-[24px] border border-white/10 bg-slate-950/54 px-4 py-4 text-base text-white outline-none transition focus:border-sky-300/60"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-white/76">
                    <span>夜间总清醒时长（分钟）</span>
                    <input
                      type="number"
                      min={0}
                      value={draftLog.wakeDuration}
                      onChange={(event) =>
                        setDraftLog((current) => ({
                          ...current,
                          wakeDuration: Number(event.target.value),
                        }))
                      }
                      className="w-full rounded-[24px] border border-white/10 bg-slate-950/54 px-4 py-4 text-base text-white outline-none transition focus:border-sky-300/60"
                    />
                  </label>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2 text-sm text-white/76">
                      <span>主观睡眠质量（1-5）</span>
                      <select
                        value={draftLog.sleepQuality}
                        onChange={(event) =>
                          setDraftLog((current) => ({
                            ...current,
                            sleepQuality: Number(event.target.value),
                          }))
                        }
                        className="w-full rounded-[24px] border border-white/10 bg-slate-950/54 px-4 py-4 text-base text-white outline-none transition focus:border-sky-300/60"
                      >
                        {[1, 2, 3, 4, 5].map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-2 text-sm text-white/76">
                      <span>白天困倦（1-5）</span>
                      <select
                        value={draftLog.daytimeSleepiness}
                        onChange={(event) =>
                          setDraftLog((current) => ({
                            ...current,
                            daytimeSleepiness: Number(event.target.value),
                          }))
                        }
                        className="w-full rounded-[24px] border border-white/10 bg-slate-950/54 px-4 py-4 text-base text-white outline-none transition focus:border-sky-300/60"
                      >
                        {[1, 2, 3, 4, 5].map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label className="space-y-2 text-sm text-white/76">
                    <span>备注（可选）</span>
                    <textarea
                      value={draftLog.note}
                      onChange={(event) =>
                        setDraftLog((current) => ({
                          ...current,
                          note: event.target.value,
                        }))
                      }
                      rows={4}
                      className="w-full rounded-[24px] border border-white/10 bg-slate-950/54 px-4 py-4 text-base text-white outline-none transition focus:border-sky-300/60"
                      placeholder="例如：昨晚睡前仍在想工作，凌晨醒来后花了很久才再次入睡。"
                    />
                  </label>
                </div>
              )}

              <div className="sticky bottom-24 rounded-[28px] border border-white/10 bg-[rgba(8,14,24,0.92)] p-4 shadow-[0_20px_60px_rgba(2,6,23,0.25)] backdrop-blur-xl">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-white/60">
                    保存后，系统会同步更新趋势、阶段判断与任务建议。
                  </p>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => (step === 0 ? onComposerOpenChange(false) : setStep((current) => current - 1))}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 px-4 py-3 text-sm text-white/76 transition hover:bg-white/6"
                    >
                      <ChevronLeft size={16} />
                      {step === 0 ? '取消' : '上一步'}
                    </button>
                    {step === 2 ? (
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={!canContinue}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-sky-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:opacity-40"
                      >
                        <Save size={16} />
                        保存睡眠记录
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setStep((current) => Math.min(2, current + 1))}
                        disabled={!canContinue}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-sky-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:opacity-40"
                      >
                        下一步
                        <ChevronRight size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <aside className="space-y-4">
              <div className="rounded-[28px] border border-white/10 bg-white/6 p-5">
                <div className="flex items-center gap-3">
                  <MoonStar className="text-sky-200" size={18} />
                  <p className="text-lg font-semibold text-white">保存前自动计算</p>
                </div>
                <div className="mt-5 space-y-4">
                  <div className="rounded-[22px] border border-white/8 bg-white/5 p-4">
                    <p className="text-sm text-white/46">实际睡眠时长</p>
                    <p className="mt-2 text-xl font-semibold text-white">
                      {formatHoursFromMinutes(computedSnapshot.sleepDurationMinutes.totalSleepMinutes)} 小时
                    </p>
                  </div>
                  <div className="rounded-[22px] border border-white/8 bg-white/5 p-4">
                    <p className="text-sm text-white/46">睡眠效率</p>
                    <p className="mt-2 text-xl font-semibold text-white">{computedSnapshot.totalSleepMinutes}%</p>
                  </div>
                  <div className="rounded-[22px] border border-white/8 bg-white/5 p-4">
                    <p className="text-sm text-white/46">平均入睡潜伏期</p>
                    <p className="mt-2 text-xl font-semibold text-white">{computedSnapshot.sleepDurationMinutes.latencyMinutes} 分钟</p>
                  </div>
                  <div className="rounded-[22px] border border-sky-200/16 bg-sky-300/8 p-4 text-sm leading-7 text-white/76">
                    与本周目标比较：{weekGoalComparison}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>
      )}

      <section className="rounded-[32px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-sky-100">历史回顾</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">最近睡眠记录</h3>
          </div>
          <p className="text-sm text-white/54">
            每条记录都展示睡眠时长、效率、醒来次数、入睡潜伏期和主观睡眠质量。
          </p>
        </div>

        <div className="mt-6 space-y-3">
          {latestLogs.length > 0 ? (
            latestLogs.map((log) => {
              const snapshot = getSleepRecordSnapshot(log);
              return (
                <div key={log.id} className="rounded-[24px] border border-white/10 bg-white/5 p-5">
                  <div className="grid gap-4 lg:grid-cols-[180px_1fr] lg:items-center">
                    <div>
                      <p className="text-sm text-white/44">{log.date}</p>
                      <p className="mt-2 text-xl font-semibold text-white">{formatHoursFromMinutes(snapshot.totalSleepMinutes)} 小时</p>
                      <p className="mt-1 text-sm text-white/56">睡眠效率 {log.efficiency}%</p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-[20px] border border-white/8 bg-white/4 p-4">
                        <p className="text-sm text-white/44">醒来次数</p>
                        <p className="mt-2 text-lg font-semibold text-white">{log.wakeCount} 次</p>
                      </div>
                      <div className="rounded-[20px] border border-white/8 bg-white/4 p-4">
                        <p className="text-sm text-white/44">入睡潜伏期</p>
                        <p className="mt-2 text-lg font-semibold text-white">{snapshot.latencyMinutes} 分钟</p>
                      </div>
                      <div className="rounded-[20px] border border-white/8 bg-white/4 p-4">
                        <p className="text-sm text-white/44">主观睡眠质量</p>
                        <p className="mt-2 text-lg font-semibold text-white">{log.sleepQuality} / 5</p>
                      </div>
                      <div className="rounded-[20px] border border-white/8 bg-white/4 p-4">
                        <p className="text-sm text-white/44">白天困倦</p>
                        <p className="mt-2 text-lg font-semibold text-white">{log.daytimeSleepiness} / 5</p>
                      </div>
                    </div>
                  </div>
                  {log.note && <p className="mt-4 text-sm leading-7 text-white/64">{log.note}</p>}
                </div>
              );
            })
          ) : (
            <div className="rounded-[24px] border border-white/10 bg-white/4 p-6 text-sm leading-7 text-white/66">
              还没有睡眠记录。完成第一晚记录后，这里会开始沉淀你的历史回顾和趋势基础。
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
