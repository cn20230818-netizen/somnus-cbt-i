import { ReactNode, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  ClipboardList,
  ShieldCheck,
  Sparkles,
  Target,
  TimerReset,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { analysisService } from '../services/analysisEngine';
import { CBTTask, ModuleSelection, UserData } from '../types';
import { formatHoursFromMinutes } from '../lib/sleep';

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
    ? '认知练习'
    : type === 'behavioral'
      ? '行为练习'
      : type === 'relaxation'
        ? '放松练习'
        : '辅助建议';
}

function typeStyles(type: CBTTask['type']) {
  return type === 'cognitive'
    ? 'border-violet-300/20 bg-violet-300/12 text-violet-100'
    : type === 'behavioral'
      ? 'border-sky-300/20 bg-sky-300/12 text-sky-100'
      : type === 'relaxation'
        ? 'border-emerald-300/20 bg-emerald-300/12 text-emerald-100'
        : 'border-amber-300/20 bg-amber-300/12 text-amber-100';
}

function severityLabel(level: string) {
  if (level === 'severe') {
    return '较重';
  }
  if (level === 'moderate') {
    return '中度';
  }
  if (level === 'mild') {
    return '轻度';
  }
  return '轻微或待观察';
}

function impairmentLabel(level: string) {
  if (level === 'severe') {
    return '白天受损较明显';
  }
  if (level === 'moderate') {
    return '白天受损中等';
  }
  if (level === 'mild') {
    return '白天受损轻度';
  }
  return '白天受损不明显';
}

function chronicityLabel(level: string) {
  if (level === 'chronic') {
    return '慢性倾向明确';
  }
  if (level === 'chronic_tendency') {
    return '已接近慢性化';
  }
  if (level === 'subacute') {
    return '亚急性阶段';
  }
  return '近期起病或资料有限';
}

function MetricCard({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
      <p className="text-sm text-white/46">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
      {helper && <p className="mt-2 text-sm leading-6 text-white/60">{helper}</p>}
    </div>
  );
}

function SectionCard({
  icon,
  eyebrow,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[32px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl sm:p-8">
      <div className="flex items-start gap-3">
        <div className="mt-1 text-sky-200">{icon}</div>
        <div>
          <p className="text-sm font-medium text-sky-100">{eyebrow}</p>
          <h3 className="mt-1 text-2xl font-semibold text-white">{title}</h3>
          {description && <p className="mt-2 text-sm leading-7 text-white/60">{description}</p>}
        </div>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function ModuleCard({ title, modules }: { title: string; modules: ModuleSelection[] }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/4 p-5">
      <p className="text-sm font-semibold text-white">{title}</p>
      <div className="mt-4 space-y-4">
        {modules.length > 0 ? (
          modules.map((module) => (
            <div key={module.id} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-white">{module.title}</p>
                  <p className="mt-2 text-sm leading-7 text-white/68">{module.rationale}</p>
                </div>
                <div className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs text-white/60">
                  {module.frequency || '按计划执行'}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {module.focus.map((item) => (
                  <span key={item} className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-white/68">
                    {item}
                  </span>
                ))}
              </div>
              {module.duration && <p className="mt-4 text-sm text-white/52">建议时长：{module.duration}</p>}
            </div>
          ))
        ) : (
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm leading-7 text-white/64">
            当前暂无这一层级的模块。
          </div>
        )}
      </div>
    </div>
  );
}

export function TreatmentPlanPage({
  userData,
  taskGenerationMessage,
  onGenerateTasks,
  onCompleteTask,
  onAddHygieneTask,
}: TreatmentPlanPageProps) {
  const analysis = useMemo(() => analysisService.buildAnalysisBundle(userData), [userData]);
  const today = format(new Date(), 'yyyy-MM-dd');
  const persistedTodayTasks = useMemo(
    () =>
      userData.tasks
        .filter((task) => task.date === today)
        .sort((a, b) => Number(a.completed) - Number(b.completed)),
    [today, userData.tasks],
  );
  const displayTasks = persistedTodayTasks.length > 0 ? persistedTodayTasks : analysis.treatmentPlan.dailyTasks;
  const previewMode = persistedTodayTasks.length === 0 && displayTasks.length > 0;
  const allModules = [
    ...analysis.treatmentPlan.primaryModules,
    ...analysis.treatmentPlan.secondaryModules,
    ...analysis.treatmentPlan.deferredModules,
  ];
  const moduleMap = new Map(allModules.map((module) => [module.id, module]));

  const [selectedTask, setSelectedTask] = useState<CBTTask | null>(null);
  const [feedbackTask, setFeedbackTask] = useState<CBTTask | null>(null);
  const [difficulty, setDifficulty] = useState(3);
  const [helpfulness, setHelpfulness] = useState(3);
  const [willingness, setWillingness] = useState<'yes' | 'maybe' | 'no'>('yes');
  const [note, setNote] = useState('');

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

  const avgTST = analysis.assessment.weeklyAverages.avgTST7d;
  const avgSE = analysis.assessment.weeklyAverages.avgSE7d;
  const avgLatency = analysis.assessment.weeklyAverages.avgSleepLatency7d;
  const avgWaso = analysis.assessment.weeklyAverages.avgWASO7d;

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 pt-8 sm:px-6">
      <section className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="rounded-[32px] border border-sky-200/16 bg-gradient-to-br from-sky-400/12 via-slate-900/72 to-violet-300/8 p-6 shadow-[0_24px_80px_rgba(2,6,23,0.24)] backdrop-blur-xl sm:p-8">
          <div className="flex items-center gap-3">
            <ClipboardList className="text-sky-200" size={18} />
            <div>
              <p className="text-sm font-medium text-sky-100">治疗计划单</p>
              <h2 className="mt-1 text-3xl font-semibold text-white">{analysis.treatmentPlan.stage}</h2>
            </div>
          </div>
          <p className="mt-4 text-sm leading-7 text-white/70">{analysis.caseConceptualization.summaryText}</p>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="近 7 天平均睡眠时长"
              value={avgTST !== null ? `${formatHoursFromMinutes(avgTST)} 小时` : '暂无足够数据'}
            />
            <MetricCard
              label="近 7 天平均睡眠效率"
              value={avgSE !== null ? `${avgSE}%` : '暂无足够数据'}
            />
            <MetricCard
              label="当前严重度"
              value={severityLabel(analysis.assessment.severityLevel)}
              helper={impairmentLabel(analysis.assessment.daytimeImpairmentLevel)}
            />
            <MetricCard
              label="病程判断"
              value={chronicityLabel(analysis.assessment.chronicityLevel)}
            />
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={onGenerateTasks}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-sky-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-200"
            >
              <Sparkles size={16} />
              {analysis.screening.eligibleForStandardCBTI ? '同步本周执行任务' : '刷新当前计划状态'}
            </button>
            <div className="rounded-full border border-white/12 bg-white/6 px-4 py-3 text-sm text-white/72">
              {analysis.weeklyReview.adjustmentDecision}
            </div>
          </div>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl sm:p-8">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-emerald-200" size={18} />
            <div>
              <p className="text-sm font-medium text-emerald-100">是否适合标准 CBT-I</p>
              <h3 className="mt-1 text-2xl font-semibold text-white">
                {analysis.screening.eligibleForStandardCBTI ? '目前适合进入标准 CBT-I' : '当前不建议直接进入标准 CBT-I'}
              </h3>
            </div>
          </div>

          <div
            className={`mt-5 rounded-[28px] border p-5 ${
              analysis.screening.eligibleForStandardCBTI
                ? 'border-emerald-300/20 bg-emerald-300/10'
                : 'border-amber-300/20 bg-amber-300/10'
            }`}
          >
            <p className="text-sm leading-7 text-white/78">
              {analysis.screening.eligibleForStandardCBTI
                ? '当前睡眠模式、日间受损与病程信息已经支持进入标准 CBT-I，本周可以按主方案和辅方案推进。'
                : analysis.screening.redirectRecommendation || '请先进一步评估或稳定基础问题，再决定是否进入标准 CBT-I。'}
            </p>
          </div>

          <div className="mt-5 space-y-3">
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-semibold text-white">适合性判断依据</p>
              <div className="mt-3 space-y-2">
                {analysis.screening.chronicInsomniaReasons.map((item) => (
                  <p key={item} className="text-sm leading-7 text-white/68">
                    {item}
                  </p>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-semibold text-white">谨慎项 / 风险信号</p>
              <div className="mt-3 space-y-2">
                {analysis.screening.cautionFlags.length > 0 ? (
                  analysis.screening.cautionFlags.map((flag) => (
                    <p key={flag} className="text-sm leading-7 text-white/68">
                      {flag}
                    </p>
                  ))
                ) : (
                  <p className="text-sm leading-7 text-white/64">当前未见需要立即中止标准流程的高危信号，但仍需持续监测。</p>
                )}
              </div>
            </div>
          </div>
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

      <SectionCard
        icon={<BrainCircuit size={18} />}
        eyebrow="当前评估结论"
        title="以结构化评估结果决定本周优先级"
        description="系统先做筛查和临床评估，再结合 3P 个案概念化决定主方案，而不是把单个症状直接映射成单个任务。"
      >
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="失眠表型"
            value={analysis.assessment.insomniaPhenotype.slice(0, 2).join('、') || '资料仍有限'}
          />
          <MetricCard
            label="平均入睡潜伏期"
            value={avgLatency !== null ? `${avgLatency} 分钟` : '暂无足够数据'}
          />
          <MetricCard
            label="平均夜间清醒"
            value={avgWaso !== null ? `${avgWaso} 分钟` : '暂无足够数据'}
          />
          <MetricCard
            label="认知负担重点"
            value={analysis.assessment.cognitionMoodMetrics.highestDBASDimension || '待补充 DBAS'}
          />
        </div>
        <div className="mt-5 rounded-[28px] border border-white/10 bg-white/4 p-5">
          <p className="text-sm font-semibold text-white">本次评估摘要</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {analysis.assessment.keyMetrics.map((item) => (
              <div key={item} className="rounded-[22px] border border-white/8 bg-white/5 p-4 text-sm leading-7 text-white/72">
                {item}
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        icon={<Target size={18} />}
        eyebrow="个案概念化摘要"
        title="先解释为什么失眠被维持，再决定本周先改什么"
        description="以下内容按 3P 模型整理：易感因素、诱发因素和维持因素。系统会据此排序当前优先干预点。"
      >
        <div className="grid gap-4 xl:grid-cols-3">
          {[
            { title: 'Predispose 易感因素', items: analysis.caseConceptualization.predispose },
            { title: 'Precipitate 诱发因素', items: analysis.caseConceptualization.precipitate },
            { title: 'Perpetuate 维持因素', items: analysis.caseConceptualization.perpetuate },
          ].map((group) => (
            <div key={group.title} className="rounded-[28px] border border-white/10 bg-white/4 p-5">
              <p className="text-sm font-semibold text-white">{group.title}</p>
              <div className="mt-4 space-y-3">
                {group.items.length > 0 ? (
                  group.items.map((item) => (
                    <div key={item} className="rounded-[22px] border border-white/8 bg-white/5 p-4 text-sm leading-7 text-white/72">
                      {item}
                    </div>
                  ))
                ) : (
                  <div className="rounded-[22px] border border-white/8 bg-white/5 p-4 text-sm leading-7 text-white/64">
                    当前资料仍不足以稳定识别这一层因素。
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-[28px] border border-sky-300/16 bg-sky-300/8 p-5">
          <p className="text-sm font-semibold text-sky-100">当前优先干预点</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {analysis.caseConceptualization.currentPriorityTargets.map((item) => (
              <span key={item} className="rounded-full border border-sky-300/18 bg-white/6 px-3 py-1 text-sm text-white/78">
                {item}
              </span>
            ))}
          </div>
          <p className="mt-4 text-sm leading-7 text-white/72">{analysis.caseConceptualization.summaryText}</p>
        </div>
      </SectionCard>

      <SectionCard
        icon={<ClipboardList size={18} />}
        eyebrow="本周核心治疗目标"
        title="围绕主维持因素安排本周工作重点"
        description="目标以周为单位闭环，而不是被单夜波动牵着走。"
      >
        <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[28px] border border-white/10 bg-white/4 p-5">
            <p className="text-sm font-semibold text-white">本周目标</p>
            <div className="mt-4 space-y-3">
              {analysis.treatmentPlan.goals.map((goal) => (
                <div key={goal} className="rounded-[22px] border border-white/8 bg-white/5 p-4 text-sm leading-7 text-white/74">
                  {goal}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/4 p-5">
            <p className="text-sm font-semibold text-white">下周是否调整的主依据</p>
            <div className="mt-4 space-y-3">
              {analysis.treatmentPlan.weeklyAdjustmentRules.map((rule) => (
                <div key={rule} className="rounded-[22px] border border-white/8 bg-white/5 p-4 text-sm leading-7 text-white/72">
                  {rule}
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        icon={<Sparkles size={18} />}
        eyebrow="主方案与辅方案"
        title="由概念化结果决定主辅模块，不再让睡眠卫生充当万能主方案"
        description="主方案通常优先处理床与清醒的错误联结、卧床过长和低睡眠效率；辅方案再处理认知负担、高唤醒和执行障碍。"
      >
        <div className="grid gap-4 xl:grid-cols-3">
          <ModuleCard title="主方案" modules={analysis.treatmentPlan.primaryModules} />
          <ModuleCard title="辅方案" modules={analysis.treatmentPlan.secondaryModules} />
          <ModuleCard title="暂不启动模块" modules={analysis.treatmentPlan.deferredModules} />
        </div>
      </SectionCard>

      <SectionCard
        icon={<CheckCircle2 size={18} />}
        eyebrow="每日执行任务"
        title="把结构化治疗计划落到今天能执行的动作"
        description={
          previewMode
            ? '当前显示的是根据本周计划自动派生的执行单。点击“同步本周执行任务”后，可继续标记完成并记录反馈。'
            : '点击卡片查看详情；点击按钮完成任务并填写反馈，系统会把依从性纳入下周调参。'
        }
      >
        {displayTasks.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {displayTasks.map((task) => {
              const relatedModule = task.module ? moduleMap.get(task.module) : null;
              const canComplete = persistedTodayTasks.some((item) => item.id === task.id);
              return (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => setSelectedTask(task)}
                  className={`rounded-[28px] border p-5 text-left transition ${
                    task.completed
                      ? 'border-emerald-300/18 bg-emerald-300/8 opacity-80'
                      : 'border-white/10 bg-white/4 hover:border-sky-300/20 hover:bg-white/6'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs ${typeStyles(task.type)}`}>
                        {typeLabel(task.type)}
                      </span>
                      <h4 className="mt-3 text-xl font-semibold text-white">{task.title}</h4>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-white/60">
                      {task.estimatedMinutes || 10} 分钟
                    </span>
                  </div>

                  <p className="mt-4 text-sm leading-7 text-white/70">{task.description}</p>
                  {task.rationale && <p className="mt-4 text-sm leading-7 text-white/54">推荐原因：{task.rationale}</p>}
                  {task.frequency && <p className="mt-2 text-sm text-white/52">执行频率：{task.frequency}</p>}
                  {relatedModule?.title && <p className="mt-2 text-sm text-white/52">所属模块：{relatedModule.title}</p>}

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        if (!canComplete) {
                          onGenerateTasks();
                          return;
                        }
                        setFeedbackTask(task);
                      }}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        task.completed
                          ? 'bg-emerald-300 text-slate-950'
                          : 'bg-sky-300 text-slate-950 hover:bg-sky-200'
                      }`}
                    >
                      {task.completed ? '已完成' : canComplete ? '标记完成' : '同步后再完成'}
                    </button>

                    {task.type === 'hygiene' && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onAddHygieneTask({
                            ...task,
                            source: 'manual',
                            date: today,
                          });
                        }}
                        className="rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm font-semibold text-white/78 transition hover:bg-white/10"
                      >
                        加入今日计划
                      </button>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[28px] border border-white/10 bg-white/4 p-6 text-sm leading-7 text-white/66">
            当前还没有可以直接执行的任务单。请先补齐睡眠记录、风险筛查和基础测评，系统再生成本周执行任务。
          </div>
        )}
      </SectionCard>

      <SectionCard
        icon={<TimerReset size={18} />}
        eyebrow="下周调整依据"
        title="按周复盘与调参，而不是被单夜好坏牵着走"
        description="睡眠限制 / 压缩优先看近 7 天平均睡眠效率；如果刺激控制执行差，先分析障碍，不盲目加码。"
      >
        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[28px] border border-white/10 bg-white/4 p-5">
            <p className="text-sm font-semibold text-white">本周复盘结论</p>
            <p className="mt-4 text-sm leading-7 text-white/72">{analysis.weeklyReview.weekSummary}</p>
            <div className="mt-4 rounded-[22px] border border-white/8 bg-white/5 p-4 text-sm leading-7 text-white/72">
              {analysis.weeklyReview.adherenceSummary}
            </div>
            <div className="mt-4 rounded-[22px] border border-sky-300/18 bg-sky-300/8 p-4 text-sm leading-7 text-white/78">
              {analysis.weeklyReview.adjustmentDecision}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[28px] border border-white/10 bg-white/4 p-5">
              <p className="text-sm font-semibold text-white">模块复盘</p>
              <div className="mt-4 space-y-3">
                {analysis.weeklyReview.moduleResponse.map((item) => (
                  <div key={item.module} className="rounded-[22px] border border-white/8 bg-white/5 p-4">
                    <p className="text-sm font-semibold text-white">{item.module}</p>
                    <p className="mt-2 text-sm leading-7 text-white/68">{item.response}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/4 p-5">
              <p className="text-sm font-semibold text-white">下周计划</p>
              <div className="mt-4 space-y-3">
                {analysis.weeklyReview.nextWeekPlan.map((item) => (
                  <div key={item} className="rounded-[22px] border border-white/8 bg-white/5 p-4 text-sm leading-7 text-white/72">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        icon={<AlertTriangle size={18} />}
        eyebrow="风险与提醒"
        title="把风险提示放在计划里，而不是静默失败"
        description="系统只做临床辅助管理与患者自我管理，不替代医生面对面评估。出现风险时，会先提示暂停自动调参。"
      >
        <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[28px] border border-white/10 bg-white/4 p-5">
            <p className="text-sm font-semibold text-white">本周安全提示</p>
            <div className="mt-4 space-y-3">
              {analysis.treatmentPlan.safetyNotes.map((item) => (
                <div key={item} className="rounded-[22px] border border-white/8 bg-white/5 p-4 text-sm leading-7 text-white/72">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[28px] border border-white/10 bg-white/4 p-5">
              <p className="text-sm font-semibold text-white">当前复发风险</p>
              <p className="mt-4 text-sm leading-7 text-white/72">{analysis.weeklyReview.relapseRisk}</p>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/4 p-5">
              <p className="text-sm font-semibold text-white">系统边界</p>
              <div className="mt-4 space-y-3 text-sm leading-7 text-white/68">
                <p>1. AI 只负责润色任务说明，不参与底层医学决策主链路。</p>
                <p>2. 主方案和调参规则均由本地结构化规则引擎生成。</p>
                <p>3. 如出现情绪明显恶化、极端日间嗜睡或疑似其他睡眠障碍信号，应暂停自动调参并进一步评估。</p>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      {selectedTask && (
        <div className="fixed inset-0 z-[110] bg-slate-950/72 p-4 backdrop-blur-xl">
          <div className="mx-auto max-w-3xl rounded-[32px] border border-white/10 bg-[rgba(11,18,31,0.94)] p-6 shadow-[0_24px_80px_rgba(3,8,18,0.48)] sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className={`inline-flex rounded-full border px-3 py-1 text-xs ${typeStyles(selectedTask.type)}`}>
                  {typeLabel(selectedTask.type)}
                </span>
                <h4 className="mt-3 text-2xl font-semibold text-white">{selectedTask.title}</h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="rounded-full border border-white/12 bg-white/6 p-3 text-white/72 transition hover:bg-white/10 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
                <p className="text-sm font-semibold text-white">任务说明</p>
                <p className="mt-3 text-sm leading-7 text-white/72">{selectedTask.description}</p>
                {selectedTask.rationale && <p className="mt-3 text-sm leading-7 text-white/58">推荐原因：{selectedTask.rationale}</p>}
              </div>

              {(selectedTask.flowSteps?.length || selectedTask.forms?.length || selectedTask.evaluationHint) && (
                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="rounded-[24px] border border-white/10 bg-white/5 p-5 lg:col-span-2">
                    <p className="text-sm font-semibold text-white">练习链条</p>
                    <div className="mt-4 space-y-3">
                      {selectedTask.flowSteps?.map((step) => (
                        <div key={step} className="rounded-[20px] border border-white/8 bg-white/5 p-3 text-sm leading-7 text-white/72">
                          {step}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {selectedTask.forms?.length ? (
                      <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
                        <p className="text-sm font-semibold text-white">相关表单</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {selectedTask.forms.map((formType) => (
                            <span key={formType} className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-white/68">
                              {formType}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {selectedTask.evaluationHint ? (
                      <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
                        <p className="text-sm font-semibold text-white">如何判断是否有效</p>
                        <p className="mt-3 text-sm leading-7 text-white/68">{selectedTask.evaluationHint}</p>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTask(null);
                    if (persistedTodayTasks.some((task) => task.id === selectedTask.id) && !selectedTask.completed) {
                      setFeedbackTask(selectedTask);
                    } else if (!persistedTodayTasks.some((task) => task.id === selectedTask.id)) {
                      onGenerateTasks();
                    }
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-sky-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-200"
                >
                  <ArrowRight size={16} />
                  {persistedTodayTasks.some((task) => task.id === selectedTask.id) ? '去完成这项任务' : '先同步到今日任务'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  className="rounded-full border border-white/12 bg-white/6 px-5 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10"
                >
                  稍后再做
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {feedbackTask && (
        <div className="fixed inset-0 z-[120] bg-slate-950/72 p-4 backdrop-blur-xl">
          <div className="mx-auto max-w-xl rounded-[32px] border border-white/10 bg-[rgba(11,18,31,0.95)] p-6 shadow-[0_24px_80px_rgba(3,8,18,0.48)] sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-emerald-100">完成反馈</p>
                <h4 className="mt-1 text-2xl font-semibold text-white">{feedbackTask.title}</h4>
              </div>
              <button
                type="button"
                onClick={() => setFeedbackTask(null)}
                className="rounded-full border border-white/12 bg-white/6 p-3 text-white/72 transition hover:bg-white/10 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-6 space-y-5">
              <label className="block space-y-2 text-sm text-white/74">
                <span>任务难度</span>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={difficulty}
                  onChange={(event) => setDifficulty(Number(event.target.value))}
                  className="w-full accent-sky-300"
                />
                <span className="text-xs text-white/56">{difficulty} / 5</span>
              </label>

              <label className="block space-y-2 text-sm text-white/74">
                <span>帮助程度</span>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={helpfulness}
                  onChange={(event) => setHelpfulness(Number(event.target.value))}
                  className="w-full accent-emerald-300"
                />
                <span className="text-xs text-white/56">{helpfulness} / 5</span>
              </label>

              <div className="space-y-2 text-sm text-white/74">
                <span>是否愿意继续</span>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { value: 'yes', label: '愿意继续' },
                    { value: 'maybe', label: '还在尝试' },
                    { value: 'no', label: '暂不想继续' },
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setWillingness(item.value as 'yes' | 'maybe' | 'no')}
                      className={`rounded-[22px] border px-4 py-3 text-sm transition ${
                        willingness === item.value
                          ? 'border-sky-300/30 bg-sky-300 text-slate-950'
                          : 'border-white/10 bg-white/6 text-white/76 hover:bg-white/10'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block space-y-2 text-sm text-white/74">
                <span>备注</span>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="可以简单写下哪里最难、哪里最有帮助。"
                  className="min-h-[108px] w-full rounded-[24px] border border-white/10 bg-slate-950/54 px-4 py-4 text-base text-white outline-none transition focus:border-sky-300/60"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={submitFeedback}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200"
              >
                <CheckCircle2 size={16} />
                提交反馈并完成
              </button>
              <button
                type="button"
                onClick={() => setFeedbackTask(null)}
                className="rounded-full border border-white/12 bg-white/6 px-5 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10"
              >
                稍后再说
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
