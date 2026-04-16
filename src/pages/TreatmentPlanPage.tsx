import { useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  CircleDashed,
  Clock3,
  Leaf,
  ListChecks,
  Sparkles,
  X,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { CBTTask, UserData } from '../types';
import {
  createManualTaskFromHygiene,
  getCurrentTasks,
  getHighlightedHygieneActions,
  getMilestones,
  getPlanExplanation,
  getRecoverySummary,
  getWeeklyTrendSummary,
  resolveTreatmentPhase,
} from '../lib/insights';

interface TreatmentPlanPageProps {
  userData: UserData;
  taskGenerationMessage?: { title: string; description?: string; tone: 'success' | 'info' | 'error' } | null;
  onGenerateTasks: () => void;
  onCompleteTask: (
    taskId: string,
    feedback: {
      rating: number;
      difficulty: number;
      helpfulness: number;
      willingness: 'yes' | 'maybe' | 'no';
      note?: string;
    },
  ) => void;
  onAddHygieneTask: (task: CBTTask) => void;
}

function typeLabel(type: CBTTask['type']) {
  return type === 'cognitive'
    ? '认知任务'
    : type === 'behavioral'
      ? '行为任务'
      : type === 'relaxation'
        ? '放松任务'
        : '睡眠卫生任务';
}

function typeStyles(type: CBTTask['type']) {
  return type === 'cognitive'
    ? 'bg-violet-300/14 text-violet-100 border-violet-300/20'
    : type === 'behavioral'
      ? 'bg-sky-300/14 text-sky-100 border-sky-300/20'
      : type === 'relaxation'
        ? 'bg-emerald-300/14 text-emerald-100 border-emerald-300/20'
        : 'bg-amber-300/12 text-amber-100 border-amber-300/20';
}

export function TreatmentPlanPage({
  userData,
  taskGenerationMessage,
  onGenerateTasks,
  onCompleteTask,
  onAddHygieneTask,
}: TreatmentPlanPageProps) {
  const phase = resolveTreatmentPhase(userData);
  const recovery = getRecoverySummary(userData);
  const milestones = getMilestones(userData);
  const planExplanation = getPlanExplanation(userData);
  const weeklyTrend = getWeeklyTrendSummary(userData);
  const hygieneActions = getHighlightedHygieneActions(userData);
  const currentTasks = useMemo(
    () =>
      getCurrentTasks(userData)
        .sort((a, b) => Number(a.completed) - Number(b.completed))
        .slice(0, 6),
    [userData],
  );

  const dbasTrend = [...userData.dbasResults]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((item) => ({
      date: format(parseISO(item.date), 'MM/dd'),
      score: Number(item.totalScore.toFixed(1)),
    }));

  const [selectedTask, setSelectedTask] = useState<CBTTask | null>(null);
  const [feedbackTask, setFeedbackTask] = useState<CBTTask | null>(null);
  const [difficulty, setDifficulty] = useState(3);
  const [helpfulness, setHelpfulness] = useState(3);
  const [willingness, setWillingness] = useState<'yes' | 'maybe' | 'no'>('yes');
  const [note, setNote] = useState('');
  const [tonightTryIds, setTonightTryIds] = useState<string[]>([]);

  const submitFeedback = () => {
    if (!feedbackTask) {
      return;
    }

    onCompleteTask(feedbackTask.id, {
      rating: helpfulness,
      difficulty,
      helpfulness,
      willingness,
      note: note.trim() || undefined,
    });
    setFeedbackTask(null);
    setDifficulty(3);
    setHelpfulness(3);
    setWillingness('yes');
    setNote('');
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 pt-8 sm:px-6">
      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[32px] border border-sky-200/16 bg-gradient-to-br from-sky-400/12 via-slate-900/72 to-violet-300/8 p-6 shadow-[0_24px_80px_rgba(2,6,23,0.24)] backdrop-blur-xl sm:p-8">
          <div className="flex items-center gap-3">
            <ListChecks className="text-sky-200" size={18} />
            <div>
              <p className="text-sm font-medium text-sky-100">治疗计划</p>
              <h2 className="mt-1 text-3xl font-semibold text-white">{phase.label}</h2>
            </div>
          </div>
          <p className="mt-4 text-sm leading-7 text-white/70">{phase.summary}</p>

          <div className="mt-5 space-y-3">
            {phase.goals.map((goal) => (
              <div key={goal} className="rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm leading-7 text-white/74">
                {goal}
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={onGenerateTasks}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-sky-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-200"
            >
              <Sparkles size={16} />
              更新今日任务
            </button>
            <div className="rounded-full border border-white/12 bg-white/6 px-4 py-3 text-sm text-white/72">
              {planExplanation}
            </div>
          </div>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl sm:p-8">
          <div className="flex items-center gap-3">
            <Activity className="text-emerald-200" size={18} />
            <div>
              <p className="text-sm font-medium text-emerald-100">恢复摘要</p>
              <h3 className="mt-1 text-2xl font-semibold text-white">当前恢复情况</h3>
            </div>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {[
              {
                label: '近 7 天睡眠效率',
                value: recovery.averageEfficiency !== null ? `${recovery.averageEfficiency}%` : '暂无足够数据',
              },
              {
                label: '任务完成率',
                value: recovery.completionRate !== null ? `${recovery.completionRate}%` : '暂无足够数据',
              },
              {
                label: '最新 DBAS 变化',
                value:
                  recovery.latestDbasChange !== null
                    ? `${recovery.latestDbasChange > 0 ? '+' : ''}${recovery.latestDbasChange}`
                    : '暂无对比数据',
              },
              {
                label: '最新 PSQI 变化',
                value:
                  recovery.latestPsqiChange !== null
                    ? `${recovery.latestPsqiChange > 0 ? '+' : ''}${recovery.latestPsqiChange}`
                    : '暂无对比数据',
              },
            ].map((item) => (
              <div key={item.label} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-white/46">{item.label}</p>
                <p className="mt-2 text-xl font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-sm leading-7 text-white/70">{recovery.explanation}</p>
        </div>
      </section>

      {taskGenerationMessage && (
        <section
          className={`rounded-[28px] border p-4 text-sm leading-7 backdrop-blur-xl ${
            taskGenerationMessage.tone === 'error'
              ? 'border-amber-300/26 bg-amber-300/10 text-amber-100'
              : taskGenerationMessage.tone === 'success'
                ? 'border-emerald-300/20 bg-emerald-300/10 text-emerald-100'
                : 'border-sky-300/20 bg-sky-300/10 text-sky-100'
          }`}
        >
          <p className="font-semibold">{taskGenerationMessage.title}</p>
          {taskGenerationMessage.description && <p className="mt-1">{taskGenerationMessage.description}</p>}
        </section>
      )}

      <section className="rounded-[32px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl sm:p-8">
        <div className="flex items-center gap-3">
          <ListChecks className="text-sky-200" size={18} />
          <div>
            <h3 className="text-2xl font-semibold text-white">今日任务</h3>
            <p className="mt-1 text-sm text-white/58">点击卡片查看详情；点击按钮完成任务，避免误触。</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {currentTasks.length > 0 ? (
            currentTasks.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => setSelectedTask(task)}
                className={`rounded-[28px] border p-5 text-left transition ${
                  task.completed
                    ? 'border-emerald-300/18 bg-emerald-300/8 opacity-78'
                    : 'border-white/10 bg-white/5 hover:border-sky-300/30 hover:bg-white/7'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-3">
                    <div className={`inline-flex rounded-full border px-3 py-1 text-xs ${typeStyles(task.type)}`}>
                      {typeLabel(task.type)}
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-white">{task.title}</p>
                      <p className="mt-2 text-sm leading-7 text-white/68">{task.description}</p>
                    </div>
                  </div>
                  {task.completed ? (
                    <div className="rounded-full bg-emerald-300/14 p-2 text-emerald-200">
                      <CheckCircle2 size={18} />
                    </div>
                  ) : (
                    <div className="rounded-full bg-white/8 p-2 text-white/56">
                      <ArrowRight size={18} />
                    </div>
                  )}
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-center">
                  <div className="rounded-[22px] border border-white/8 bg-white/5 px-4 py-3 text-sm text-white/70">
                    预计耗时：{task.estimatedMinutes || 10} 分钟
                  </div>
                  <div className="rounded-[22px] border border-white/8 bg-white/5 px-4 py-3 text-sm text-white/70">
                    推荐原因：{task.rationale || '基于当前睡眠记录与测评结果生成。'}
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      if (!task.completed) {
                        setFeedbackTask(task);
                      }
                    }}
                    className={`rounded-full px-4 py-3 text-sm font-semibold transition ${
                      task.completed
                        ? 'border border-white/12 bg-white/6 text-white/58'
                        : 'bg-sky-300 text-slate-950 hover:bg-sky-200'
                    }`}
                  >
                    {task.completed ? '已完成' : '标记完成'}
                  </button>
                </div>
              </button>
            ))
          ) : (
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 text-sm leading-7 text-white/66">
              当前还没有可执行任务。完成更多记录或点击“更新今日任务”后，系统会生成更贴近当前阶段的干预任务。
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl sm:p-8">
          <div className="flex items-center gap-3">
            <BarChart3 className="text-sky-200" size={18} />
            <div>
              <h3 className="text-2xl font-semibold text-white">趋势分析</h3>
              <p className="mt-1 text-sm text-white/58">睡眠效率变化与认知负担变化。</p>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <div className="rounded-[26px] border border-white/10 bg-white/4 p-4">
              <p className="text-sm text-white/58">睡眠效率趋势</p>
              <div className="mt-4 h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyTrend.chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.46)', fontSize: 12 }} />
                    <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.46)', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(11,18,31,0.96)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '18px',
                      }}
                    />
                    <Line type="monotone" dataKey="efficiency" stroke="#8fd0ff" strokeWidth={2.2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-[26px] border border-white/10 bg-white/4 p-4">
              <p className="text-sm text-white/58">认知变化趋势（DBAS）</p>
              <div className="mt-4 h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dbasTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.46)', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.46)', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(11,18,31,0.96)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '18px',
                      }}
                    />
                    <Line type="monotone" dataKey="score" stroke="#c7b7ff" strokeWidth={2.2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl sm:p-8">
          <div className="flex items-center gap-3">
            <BrainCircuit className="text-violet-200" size={18} />
            <div>
              <h3 className="text-2xl font-semibold text-white">系统解释</h3>
              <p className="mt-1 text-sm text-white/58">把当前恢复情况翻译成更容易理解的话。</p>
            </div>
          </div>
          <div className="mt-6 rounded-[28px] border border-white/10 bg-white/4 p-5 text-sm leading-7 text-white/74">
            {recovery.explanation}
          </div>

          <div className="mt-6">
            <p className="text-sm font-semibold text-white">里程碑</p>
            <div className="mt-4 space-y-3">
              {milestones.map((milestone) => (
                <div key={milestone.id} className="rounded-[24px] border border-white/10 bg-white/4 p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {milestone.status === 'done' ? (
                        <CheckCircle2 size={18} className="text-emerald-200" />
                      ) : milestone.status === 'active' ? (
                        <CircleDashed size={18} className="text-sky-200" />
                      ) : (
                        <Clock3 size={18} className="text-white/50" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{milestone.title}</p>
                      <p className="mt-1 text-sm leading-7 text-white/66">{milestone.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl sm:p-8">
        <div className="flex items-center gap-3">
          <Leaf className="text-emerald-200" size={18} />
          <div>
            <h3 className="text-2xl font-semibold text-white">与你相关的睡眠卫生建议</h3>
            <p className="mt-1 text-sm text-white/58">把建议变成今晚就能执行的小动作。</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          {hygieneActions.map((action) => (
            <div key={action.id} className="rounded-[28px] border border-white/10 bg-white/4 p-5">
              <p className="text-xs text-white/46">{action.category}</p>
              <p className="mt-2 text-lg font-semibold text-white">{action.title}</p>
              <p className="mt-3 text-sm leading-7 text-white/68">{action.description}</p>
              <div className="mt-4 rounded-[22px] border border-white/8 bg-white/4 p-4 text-sm leading-7 text-white/70">
                {action.reason}
              </div>
              <div className="mt-5 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setTonightTryIds((current) =>
                      current.includes(action.id) ? current : [...current, action.id],
                    )
                  }
                  className="rounded-full border border-white/12 bg-white/6 px-4 py-3 text-sm font-semibold text-white/84 transition hover:bg-white/10"
                >
                  {tonightTryIds.includes(action.id) ? '已标记今晚尝试' : '今晚尝试'}
                </button>
                <button
                  type="button"
                  onClick={() => onAddHygieneTask(createManualTaskFromHygiene(action))}
                  className="rounded-full bg-sky-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-200"
                >
                  加入今日计划
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {selectedTask && (
        <div className="fixed inset-0 z-[150] bg-slate-950/78 p-4 backdrop-blur-xl sm:p-6">
          <div className="mx-auto max-w-2xl rounded-[32px] border border-white/10 bg-[rgba(10,16,28,0.94)] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.4)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className={`inline-flex rounded-full border px-3 py-1 text-xs ${typeStyles(selectedTask.type)}`}>
                  {typeLabel(selectedTask.type)}
                </div>
                <h4 className="mt-3 text-2xl font-semibold text-white">{selectedTask.title}</h4>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="rounded-full border border-white/12 bg-white/6 p-3 text-white/68 transition hover:bg-white/10 hover:text-white"
                aria-label="关闭任务详情"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 space-y-4 text-sm leading-7 text-white/72">
              <p>{selectedTask.description}</p>
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="font-semibold text-white">推荐原因</p>
                <p className="mt-2">{selectedTask.rationale || '基于当前睡眠记录与测评结果生成。'}</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="font-semibold text-white">预计耗时</p>
                <p className="mt-2">{selectedTask.estimatedMinutes || 10} 分钟</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {feedbackTask && (
        <div className="fixed inset-0 z-[150] bg-slate-950/78 p-4 backdrop-blur-xl sm:p-6">
          <div className="mx-auto max-w-xl rounded-[32px] border border-white/10 bg-[rgba(10,16,28,0.94)] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.4)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-sky-100">任务完成反馈</p>
                <h4 className="mt-2 text-2xl font-semibold text-white">{feedbackTask.title}</h4>
              </div>
              <button
                onClick={() => setFeedbackTask(null)}
                className="rounded-full border border-white/12 bg-white/6 p-3 text-white/68 transition hover:bg-white/10 hover:text-white"
                aria-label="关闭反馈"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 space-y-5">
              {[
                {
                  label: '任务难度',
                  value: difficulty,
                  setter: setDifficulty,
                },
                {
                  label: '帮助程度',
                  value: helpfulness,
                  setter: setHelpfulness,
                },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-sm text-white/74">{item.label}</p>
                  <div className="mt-3 flex gap-2">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => item.setter(value)}
                        className={`rounded-full px-4 py-2 text-sm transition ${
                          item.value === value ? 'bg-sky-300 text-slate-950' : 'bg-white/8 text-white/72'
                        }`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div>
                <p className="text-sm text-white/74">是否愿意继续</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    { value: 'yes', label: '愿意继续' },
                    { value: 'maybe', label: '可以尝试' },
                    { value: 'no', label: '暂时不想继续' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setWillingness(option.value as 'yes' | 'maybe' | 'no')}
                      className={`rounded-full px-4 py-2 text-sm transition ${
                        willingness === option.value ? 'bg-sky-300 text-slate-950' : 'bg-white/8 text-white/72'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block">
                <span className="text-sm text-white/74">备注</span>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={4}
                  className="mt-3 w-full rounded-[24px] border border-white/10 bg-slate-950/54 px-4 py-4 text-sm text-white outline-none transition focus:border-sky-300/60"
                  placeholder="例如：任务不难，但开始前仍有些抵触；完成后睡前更平静。"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setFeedbackTask(null)}
                className="rounded-full border border-white/12 bg-white/6 px-4 py-3 text-sm font-semibold text-white/84 transition hover:bg-white/10"
              >
                稍后再填
              </button>
              <button
                type="button"
                onClick={submitFeedback}
                className="rounded-full bg-sky-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-200"
              >
                提交并完成任务
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
