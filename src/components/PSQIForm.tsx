import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock3, MoonStar, Save, X } from 'lucide-react';
import { PSQIResult } from '../types';
import { calculateSleepDurationMinutes, formatHoursFromMinutes } from '../lib/sleep';

interface PSQIFormProps {
  onClose: () => void;
  onSave: (result: PSQIResult) => void;
}

type QuestionId =
  | 'quality'
  | 'latency'
  | 'duration'
  | 'efficiency'
  | 'medication'
  | 'dysfunction';

const QUESTION_OPTIONS: Record<
  QuestionId,
  {
    title: string;
    hint: string;
    options: Array<{ score: number; label: string }>;
  }
> = {
  quality: {
    title: '过去一个月，你如何评价整体睡眠质量？',
    hint: '请回忆过去一个月中更常见的状态，而不是只看某一晚。',
    options: [
      { score: 0, label: '非常好' },
      { score: 1, label: '较好' },
      { score: 2, label: '较差' },
      { score: 3, label: '非常差' },
    ],
  },
  latency: {
    title: '过去一个月，你通常需要多长时间才能入睡？',
    hint: '请按照多数夜晚的典型情况作答。',
    options: [
      { score: 0, label: '15 分钟内' },
      { score: 1, label: '16-30 分钟' },
      { score: 2, label: '31-60 分钟' },
      { score: 3, label: '超过 60 分钟' },
    ],
  },
  duration: {
    title: '过去一个月，你每晚实际睡了多久？',
    hint: '不包括躺在床上但没有睡着的时间。',
    options: [
      { score: 0, label: '7 小时及以上' },
      { score: 1, label: '6-7 小时' },
      { score: 2, label: '5-6 小时' },
      { score: 3, label: '少于 5 小时' },
    ],
  },
  efficiency: {
    title: '过去一个月，你的睡眠效率如何？',
    hint: '睡眠效率指实际睡眠时间占卧床时间的比例。',
    options: [
      { score: 0, label: '85% 及以上' },
      { score: 1, label: '75-84%' },
      { score: 2, label: '65-74%' },
      { score: 3, label: '低于 65%' },
    ],
  },
  medication: {
    title: '过去一个月，你使用药物帮助睡眠的频率如何？',
    hint: '包括处方药与非处方助眠药物。',
    options: [
      { score: 0, label: '没有' },
      { score: 1, label: '每周少于 1 次' },
      { score: 2, label: '每周 1-2 次' },
      { score: 3, label: '每周 3 次及以上' },
    ],
  },
  dysfunction: {
    title: '过去一个月，你在白天感到困倦或精力不足的频率如何？',
    hint: '请结合白天保持清醒、工作和生活状态作答。',
    options: [
      { score: 0, label: '没有' },
      { score: 1, label: '每周少于 1 次' },
      { score: 2, label: '每周 1-2 次' },
      { score: 3, label: '每周 3 次及以上' },
    ],
  },
};

const DISTURBANCES = [
  '夜间醒来或过早醒来',
  '起床上厕所',
  '呼吸不畅',
  '咳嗽或鼾声影响睡眠',
  '觉得太冷',
  '觉得太热',
  '做噩梦',
  '疼痛不适',
  '其他影响睡眠的情况',
];

const DRAFT_KEY = 'somnus_psqi_draft_v2';

function loadDraft() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    return raw
      ? (JSON.parse(raw) as {
          step: number;
          responses: Partial<Record<QuestionId, number>>;
          disturbanceResponses: Record<string, number>;
          bedTime: string;
          fallAsleepTime: string;
          wakeTime: string;
          getUpTime: string;
        })
      : null;
  } catch (error) {
    console.warn('Failed to load PSQI draft.', error);
    return null;
  }
}

function saveDraft(value: object) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(DRAFT_KEY, JSON.stringify(value));
}

function clearDraft() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(DRAFT_KEY);
}

export function PSQIForm({ onClose, onSave }: PSQIFormProps) {
  const draft = loadDraft();
  const [step, setStep] = useState(draft?.step || 0);
  const [responses, setResponses] = useState<Partial<Record<QuestionId, number>>>(draft?.responses || {});
  const [disturbanceResponses, setDisturbanceResponses] = useState<Record<string, number>>(
    draft?.disturbanceResponses || {},
  );
  const [bedTime, setBedTime] = useState(draft?.bedTime || '23:00');
  const [fallAsleepTime, setFallAsleepTime] = useState(draft?.fallAsleepTime || '23:30');
  const [wakeTime, setWakeTime] = useState(draft?.wakeTime || '06:40');
  const [getUpTime, setGetUpTime] = useState(draft?.getUpTime || '07:00');
  const [submittedResult, setSubmittedResult] = useState<PSQIResult | null>(null);
  const [draftRestored] = useState(Boolean(draft));
  const bodyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    saveDraft({
      step,
      responses,
      disturbanceResponses,
      bedTime,
      fallAsleepTime,
      wakeTime,
      getUpTime,
    });
  }, [step, responses, disturbanceResponses, bedTime, fallAsleepTime, wakeTime, getUpTime]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step, submittedResult]);

  const steps = useMemo(
    () => [
      {
        title: '回忆过去一个月的典型作息',
        description: '先记录典型的上床、入睡、醒来和起床时间，帮助系统理解你的基线。',
      },
      {
        title: QUESTION_OPTIONS.quality.title,
        description: QUESTION_OPTIONS.quality.hint,
        questionId: 'quality' as const,
      },
      {
        title: QUESTION_OPTIONS.latency.title,
        description: QUESTION_OPTIONS.latency.hint,
        questionId: 'latency' as const,
      },
      {
        title: QUESTION_OPTIONS.duration.title,
        description: QUESTION_OPTIONS.duration.hint,
        questionId: 'duration' as const,
      },
      {
        title: QUESTION_OPTIONS.efficiency.title,
        description: QUESTION_OPTIONS.efficiency.hint,
        questionId: 'efficiency' as const,
      },
      {
        title: '过去一个月，以下因素出现的频率如何？',
        description: '请按照多数夜晚的情况，分别判断这些情况对睡眠的影响频率。',
      },
      {
        title: QUESTION_OPTIONS.medication.title,
        description: QUESTION_OPTIONS.medication.hint,
        questionId: 'medication' as const,
      },
      {
        title: QUESTION_OPTIONS.dysfunction.title,
        description: QUESTION_OPTIONS.dysfunction.hint,
        questionId: 'dysfunction' as const,
      },
    ],
    [],
  );

  const currentStep = steps[step];
  const actualSleepHours = formatHoursFromMinutes(
    calculateSleepDurationMinutes({
      date: new Date().toISOString().split('T')[0],
      fallAsleepTime,
      wakeTime,
      wakeDuration: 0,
    }),
  );
  const progress = Math.round(((step + 1) / steps.length) * 100);

  const canContinue =
    step === 0
      ? Boolean(bedTime && fallAsleepTime && wakeTime && getUpTime)
      : step === 5
        ? DISTURBANCES.every((item) => disturbanceResponses[item] !== undefined)
        : Boolean(currentStep.questionId && responses[currentStep.questionId] !== undefined);

  const continueHint =
    step === 0
      ? '请先填写完整的典型作息时间。'
      : step === 5
        ? '请完成本页全部睡眠干扰条目后继续。'
        : '请先选择一个最符合过去一个月情况的选项。';

  const severityLabel = (score: number) => {
    if (score < 5) {
      return '整体睡眠质量较好';
    }
    if (score < 10) {
      return '提示存在轻度睡眠受损';
    }
    if (score < 15) {
      return '提示存在中度睡眠受损';
    }
    return '提示存在较明显的睡眠受损';
  };

  const handleSubmit = () => {
    const disturbanceValues = Object.values(disturbanceResponses) as number[];
    const disturbances =
      disturbanceValues.length > 0
        ? Math.min(3, Math.round(disturbanceValues.reduce((sum, value) => sum + value, 0) / disturbanceValues.length))
        : 0;

    const result: PSQIResult = {
      date: new Date().toISOString().split('T')[0],
      totalScore:
        (responses.quality || 0) +
        (responses.latency || 0) +
        (responses.duration || 0) +
        (responses.efficiency || 0) +
        disturbances +
        (responses.medication || 0) +
        (responses.dysfunction || 0),
      components: {
        quality: responses.quality || 0,
        latency: responses.latency || 0,
        duration: responses.duration || 0,
        efficiency: responses.efficiency || 0,
        disturbances,
        medication: responses.medication || 0,
        dysfunction: responses.dysfunction || 0,
      },
      responses: {
        bedTime,
        fallAsleepTime,
        wakeTime,
        getUpTime,
        actualSleepHours: Number(actualSleepHours),
        disturbances: disturbanceResponses,
      },
    };

    clearDraft();
    onSave(result);
    setSubmittedResult(result);
  };

  const topComponents = submittedResult
    ? (Object.entries(submittedResult.components) as Array<[keyof PSQIResult['components'], number]>)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
    : [];

  const componentLabel = (key: string) =>
    key === 'quality'
      ? '主观睡眠质量'
      : key === 'latency'
        ? '入睡潜伏期'
        : key === 'duration'
          ? '睡眠时长'
          : key === 'efficiency'
            ? '睡眠效率'
            : key === 'disturbances'
              ? '夜间睡眠干扰'
              : key === 'medication'
                ? '睡眠药物使用'
                : '日间功能受损';

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-xl p-4 sm:p-6">
      <div className="mx-auto flex h-full max-w-4xl flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[rgba(11,18,31,0.92)] shadow-[0_24px_80px_rgba(3,8,18,0.45)]">
        <div className="flex items-start justify-between gap-4 border-b border-white/8 px-5 py-5 sm:px-8">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-sky-200">陕西省中医医院脑病科｜PSQI 睡眠质量评估</p>
            <h2 className="text-2xl font-semibold text-white">用于评估过去一个月的整体睡眠质量与主要受损维度。</h2>
            <p className="text-sm text-white/60">请尽量回忆过去一个月里更典型、更常见的睡眠情况，而不是只参考某一晚。</p>
            {draftRestored && !submittedResult && (
              <p className="inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-1 text-xs text-white/70">
                <Save size={12} />
                已恢复上次未完成的评估进度
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-white/12 bg-white/6 p-3 text-white/70 transition hover:bg-white/10 hover:text-white"
            aria-label="关闭 PSQI 评估"
          >
            <X size={18} />
          </button>
        </div>

        {submittedResult ? (
          <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-8">
            <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-[28px] border border-sky-300/20 bg-gradient-to-br from-sky-500/18 via-slate-900/80 to-violet-400/10 p-6">
                <p className="text-sm text-sky-100/90">评估已完成</p>
                <h3 className="mt-2 text-4xl font-semibold text-white">{submittedResult.totalScore}</h3>
                <p className="mt-2 text-sm leading-7 text-white/72">{severityLabel(submittedResult.totalScore)}</p>
                <p className="mt-3 text-sm leading-7 text-white/72">
                  这是一项用于辅助理解整体睡眠质量的量表结果，主要帮助你和医生一起确认当前最需要优先改善的睡眠环节。
                </p>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/6 p-6">
                <p className="text-sm font-semibold text-white">最需要优先改善的维度</p>
                <div className="mt-4 space-y-3">
                  {topComponents.map(([key, value]) => (
                    <div key={key} className="rounded-2xl bg-white/6 p-4">
                      <div className="flex items-center justify-between text-sm text-white/86">
                        <span>{componentLabel(key)}</span>
                        <span>{value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-[28px] border border-white/10 bg-white/6 p-6">
              <p className="text-sm font-semibold text-white">下一步建议</p>
              <p className="mt-3 text-sm leading-7 text-white/72">
                如果入睡潜伏期、睡眠效率或夜间睡眠干扰得分更高，通常意味着下一步需要更重视睡前节律、在床清醒时间管理以及夜间觉醒后的应对方式。
                系统会在治疗计划中优先显示与这些问题最相关的任务。
              </p>
            </div>
          </div>
        ) : (
          <div ref={bodyRef} className="flex-1 overflow-y-auto px-5 py-6 sm:px-8">
            <div className="mb-6 space-y-3">
              <div className="flex items-center justify-between text-sm text-white/68">
                <span>进度 {progress}%</span>
                <span>
                  第 {step + 1} / {steps.length} 步
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/8">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-sky-400 to-violet-300 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {steps.map((item, index) => (
                  <button
                    key={`${item.title}-${index}`}
                    type="button"
                    onClick={() => {
                      if (index <= step) {
                        setStep(index);
                      }
                    }}
                    className={`rounded-full px-3 py-1.5 text-xs transition ${
                      index === step
                        ? 'bg-sky-300 text-slate-950'
                        : index < step
                          ? 'bg-white/8 text-white/74 hover:bg-white/12'
                          : 'bg-white/4 text-white/36'
                    }`}
                    disabled={index > step}
                  >
                    第 {index + 1} 步
                  </button>
                ))}
              </div>
              {!canContinue && <p className="text-sm leading-7 text-amber-100/72">{continueHint}</p>}
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/6 p-5">
              <div className="flex items-center gap-3">
                <MoonStar className="text-sky-200" size={20} />
                <div>
                  <h3 className="text-xl font-semibold text-white">{currentStep.title}</h3>
                  <p className="mt-1 text-sm text-white/60">{currentStep.description}</p>
                </div>
              </div>

              {step === 0 && (
                <div className="mt-6 space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    {[
                      { label: '通常上床时间', value: bedTime, setter: setBedTime },
                      { label: '通常入睡时间', value: fallAsleepTime, setter: setFallAsleepTime },
                      { label: '通常醒来时间', value: wakeTime, setter: setWakeTime },
                      { label: '通常起床时间', value: getUpTime, setter: setGetUpTime },
                    ].map((item) => (
                      <label key={item.label} className="space-y-2 text-sm text-white/78">
                        <span>{item.label}</span>
                        <input
                          type="time"
                          value={item.value}
                          onChange={(event) => item.setter(event.target.value)}
                          className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-4 text-base text-white outline-none transition focus:border-sky-300/60"
                        />
                      </label>
                    ))}
                  </div>
                  <div className="rounded-2xl border border-sky-300/16 bg-sky-400/8 p-4 text-sm text-white/72">
                    按当前时间推算，典型夜晚的实际睡眠时长约为 {actualSleepHours} 小时。后续系统会结合睡眠日志进一步校正。
                  </div>
                </div>
              )}

              {currentStep.questionId && (
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {QUESTION_OPTIONS[currentStep.questionId].options.map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() =>
                        setResponses((current) => ({
                          ...current,
                          [currentStep.questionId]: option.score,
                        }))
                      }
                      className={`rounded-[24px] border p-4 text-left transition ${
                        responses[currentStep.questionId] === option.score
                          ? 'border-sky-300/60 bg-sky-300/14 text-white'
                          : 'border-white/10 bg-white/4 text-white/74 hover:bg-white/8'
                      }`}
                    >
                      <span className="block text-base font-medium">{option.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {step === 5 && (
                <div className="mt-6 space-y-4">
                  {DISTURBANCES.map((item) => (
                    <div key={item} className="rounded-[24px] border border-white/10 bg-white/4 p-4">
                      <p className="text-sm text-white/86">{item}</p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        {[
                          { score: 0, label: '没有' },
                          { score: 1, label: '每周少于 1 次' },
                          { score: 2, label: '每周 1-2 次' },
                          { score: 3, label: '每周 3 次及以上' },
                        ].map((option) => (
                          <button
                            key={option.label}
                            type="button"
                            onClick={() =>
                              setDisturbanceResponses((current) => ({
                                ...current,
                                [item]: option.score,
                              }))
                            }
                            className={`rounded-2xl border px-3 py-3 text-sm transition ${
                              disturbanceResponses[item] === option.score
                                ? 'border-sky-300/60 bg-sky-300/14 text-white'
                                : 'border-white/10 bg-white/4 text-white/74 hover:bg-white/8'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="border-t border-white/8 px-5 py-4 sm:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-white/54">
              <Clock3 size={16} />
              {submittedResult
                ? '评估结果已保存，可回到“评估与我的”查看摘要。'
                : canContinue
                  ? '本步已完成，可继续下一步。系统会自动保存当前进度。'
                  : continueHint}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              {submittedResult ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full bg-sky-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-200"
                >
                  完成并返回
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setStep((current) => Math.max(0, current - 1))}
                    disabled={step === 0}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 px-4 py-3 text-sm text-white/76 transition disabled:opacity-35"
                  >
                    <ChevronLeft size={16} />
                    上一步
                  </button>
                  {step === steps.length - 1 ? (
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={!canContinue}
                      className="rounded-full bg-sky-300 px-5 py-3 text-sm font-semibold text-slate-950 transition disabled:opacity-40"
                    >
                      提交评估
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setStep((current) => Math.min(steps.length - 1, current + 1))}
                      disabled={!canContinue}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-sky-300 px-5 py-3 text-sm font-semibold text-slate-950 transition disabled:opacity-40"
                    >
                      下一步
                      <ChevronRight size={16} />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
