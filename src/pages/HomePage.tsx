import { ArrowRight, CalendarClock, ChartNoAxesColumn, MoonStar, NotebookPen } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { UserData } from '../types';
import {
  getCurrentTasks,
  getEmptyStateMessage,
  getHomeSummary,
  getPlanExplanation,
  getTonightWindow,
  getTodayInsight,
  getWeeklyTrendSummary,
  resolveTreatmentPhase,
} from '../lib/insights';
import { formatHoursFromMinutes } from '../lib/sleep';

interface HomePageProps {
  userData: UserData;
  onOpenSleepRecords: () => void;
  onOpenPlan: () => void;
  onOpenAccount: () => void;
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-white/8 bg-white/6 p-4">
      <p className="text-sm text-white/46">{label}</p>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

export function HomePage({ userData, onOpenSleepRecords, onOpenPlan, onOpenAccount }: HomePageProps) {
  const phase = resolveTreatmentPhase(userData);
  const homeSummary = getHomeSummary(userData);
  const trendSummary = getWeeklyTrendSummary(userData);
  const currentTasks = getCurrentTasks(userData).slice(0, 3);
  const planExplanation = getPlanExplanation(userData);
  const todayInsight = getTodayInsight(userData);
  const emptyState = getEmptyStateMessage(userData);
  const tonightWindow = getTonightWindow(userData);

  if (!homeSummary) {
    return (
      <div className="mx-auto max-w-7xl space-y-8 px-4 pt-8 sm:px-6">
        <section className="rounded-[32px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl sm:p-8">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex rounded-full border border-sky-200/20 bg-sky-200/8 px-4 py-2 text-sm font-semibold text-sky-100">
              陕西省中医医院脑病科
            </div>
            <p className="text-sm font-medium text-sky-100">帮助患者更轻松地记录睡眠、理解问题、执行任务，并逐步重建稳定睡眠。</p>
            <h2 className="text-3xl font-semibold text-white">先从一晚真实睡眠记录开始</h2>
            <p className="text-base leading-8 text-white/68">
              {emptyState.description}
            </p>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="rounded-[28px] border border-sky-200/16 bg-gradient-to-br from-sky-400/14 via-slate-900/70 to-violet-300/10 p-6">
              <p className="text-sm text-sky-100/90">今日睡眠概况</p>
              <h3 className="mt-3 text-2xl font-semibold text-white">{emptyState.title}</h3>
              <p className="mt-3 text-sm leading-7 text-white/70">{emptyState.nextStep}</p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={onOpenSleepRecords}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-sky-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-200"
                >
                  <NotebookPen size={16} />
                  记录昨晚睡眠
                </button>
                <button
                  onClick={onOpenAccount}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-white/6 px-5 py-3 text-sm font-semibold text-white/84 transition hover:bg-white/10"
                >
                  <ArrowRight size={16} />
                  完成基础建档
                </button>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/6 p-6">
              <p className="text-sm font-semibold text-white">记录后你会看到</p>
              <div className="mt-4 space-y-3 text-sm leading-7 text-white/68">
                <p>1. 自动计算昨晚的实际睡眠时长与睡眠效率。</p>
                <p>2. 基于近 7 天记录解释当前变化趋势。</p>
                <p>3. 结合 PSQI 与 DBAS，生成更适合当前阶段的 CBT-I 任务。</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 pt-8 sm:px-6">
      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[32px] border border-sky-200/16 bg-gradient-to-br from-sky-400/14 via-slate-900/72 to-violet-300/10 p-6 shadow-[0_24px_80px_rgba(2,6,23,0.25)] backdrop-blur-xl sm:p-8">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex rounded-full border border-sky-200/20 bg-sky-200/8 px-4 py-2 text-sm font-semibold text-sky-100">
              陕西省中医医院脑病科
            </div>
            <p className="text-sm font-medium text-sky-100">帮助患者更轻松地记录睡眠、理解问题、执行任务，并逐步重建稳定睡眠。</p>
            <h2 className="text-3xl font-semibold text-white">今日睡眠概况</h2>
            <p className="text-base leading-8 text-white/68">{homeSummary.statusBody}</p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryMetric label="昨晚总睡眠时长" value={`${formatHoursFromMinutes(homeSummary.totalSleepMinutes)} 小时`} />
            <SummaryMetric label="睡眠效率" value={`${homeSummary.efficiency}%`} />
            <SummaryMetric label="今日状态判断" value={homeSummary.statusTitle} />
            <SummaryMetric
              label="今晚建议时间窗"
              value={
                tonightWindow
                  ? `${tonightWindow.bedTime} - ${tonightWindow.wakeTime}`
                  : '暂无足够数据'
              }
            />
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={onOpenSleepRecords}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-sky-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-200"
            >
              <NotebookPen size={16} />
              记录昨晚睡眠
            </button>
            <button
              onClick={onOpenPlan}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-white/6 px-5 py-3 text-sm font-semibold text-white/84 transition hover:bg-white/10"
            >
              <ArrowRight size={16} />
              查看今日任务
            </button>
          </div>

          <p className="mt-5 text-sm text-white/54">{homeSummary.basis}</p>

          <div className="mt-5 rounded-[24px] border border-sky-200/16 bg-sky-300/8 p-4">
            <p className="text-sm font-semibold text-sky-100">今日建议</p>
            <p className="mt-2 text-sm leading-7 text-white/74">{todayInsight}</p>
          </div>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-white/6 p-6 backdrop-blur-xl sm:p-8">
          <div className="flex items-center gap-3">
            <CalendarClock className="text-sky-200" size={18} />
            <p className="text-lg font-semibold text-white">本周治疗计划</p>
          </div>
          <p className="mt-4 text-sm leading-7 text-white/68">{planExplanation}</p>
          <div className="mt-5 rounded-[24px] border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-white/48">本周阶段</p>
            <p className="mt-2 text-xl font-semibold text-white">{phase.label}</p>
          </div>
          <div className="mt-4 space-y-3">
            {phase.goals.slice(0, 3).map((goal) => (
              <div key={goal} className="rounded-[22px] border border-white/8 bg-white/5 p-4 text-sm leading-7 text-white/74">
                {goal}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl sm:p-8">
        <div className="flex items-center gap-3">
          <ChartNoAxesColumn className="text-sky-200" size={18} />
          <div>
            <h3 className="text-2xl font-semibold text-white">本周趋势</h3>
            <p className="mt-1 text-sm text-white/58">你最近的睡眠效率变化，以及最值得优先关注的睡眠指标。</p>
          </div>
        </div>

        {trendSummary.chartData.length > 0 ? (
          <>
            <div className="mt-6 h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendSummary.chartData}>
                  <defs>
                    <linearGradient id="homeEfficiency" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8fd0ff" stopOpacity={0.32} />
                      <stop offset="95%" stopColor="#8fd0ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.48)', fontSize: 12 }} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'rgba(255,255,255,0.48)', fontSize: 12 }}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(11,18,31,0.96)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '20px',
                    }}
                  />
                  <Area type="monotone" dataKey="efficiency" stroke="#8fd0ff" strokeWidth={2.2} fill="url(#homeEfficiency)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <SummaryMetric
                label="平均入睡潜伏期"
                value={trendSummary.averageLatency !== null ? `${trendSummary.averageLatency} 分钟` : '暂无足够数据'}
              />
              <SummaryMetric
                label="夜间清醒时长"
                value={
                  trendSummary.averageWakeAfterSleepOnset !== null
                    ? `${trendSummary.averageWakeAfterSleepOnset} 分钟`
                    : '暂无足够数据'
                }
              />
              <SummaryMetric
                label="白天困倦评分"
                value={
                  trendSummary.averageDaytimeSleepiness !== null
                    ? `${trendSummary.averageDaytimeSleepiness} / 5`
                    : '暂无足够数据'
                }
              />
            </div>

            <p className="mt-5 text-sm leading-7 text-white/68">{trendSummary.explanation}</p>
          </>
        ) : (
          <div className="mt-6 rounded-[28px] border border-white/10 bg-white/4 p-6 text-sm leading-7 text-white/66">
            连续记录至少 3 晚睡眠后，这里会开始展示睡眠效率趋势、入睡潜伏期、夜间清醒时长和白天困倦评分的解释。
          </div>
        )}
      </section>

      <section className="rounded-[32px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl sm:p-8">
        <div className="flex items-center gap-3">
          <MoonStar className="text-sky-200" size={18} />
          <div>
            <h3 className="text-2xl font-semibold text-white">本周治疗计划</h3>
            <p className="mt-1 text-sm text-white/58">当前阶段目标与今天最值得优先完成的任务。</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[28px] border border-white/10 bg-white/4 p-5">
            <p className="text-sm font-semibold text-white">本周目标</p>
            <div className="mt-4 space-y-3">
              {phase.goals.map((goal) => (
                <div key={goal} className="rounded-[22px] border border-white/8 bg-white/5 p-4 text-sm leading-7 text-white/74">
                  {goal}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/4 p-5">
            <p className="text-sm font-semibold text-white">今日任务</p>
            <div className="mt-4 space-y-3">
              {currentTasks.length > 0 ? (
                currentTasks.map((task) => (
                  <div key={task.id} className="rounded-[22px] border border-white/8 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-white">{task.title}</p>
                      <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-white/62">
                        {task.estimatedMinutes || 10} 分钟
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-7 text-white/68">{task.description}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-[22px] border border-white/8 bg-white/5 p-4 text-sm leading-7 text-white/66">
                  当前还没有生成任务，完成记录和测评后，系统会给出更明确的今日任务建议。
                </div>
              )}
            </div>
            <p className="mt-5 text-sm leading-7 text-white/68">{planExplanation}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
