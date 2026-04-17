import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Save, X } from 'lucide-react';
import { DBASResult } from '../types';

const QUESTIONS = [
  '我需要睡够 8 小时，第二天才能感到清爽并保持良好的功能。',
  '当自然睡眠不佳时，我需要在第二天小睡或在接着的晚上睡更长时间来补觉。',
  '我担心长期失眠会对身体健康产生严重后果。',
  '我担心自己会完全失去对睡眠能力的控制。',
  '一晚睡不好后，我第二天的日间功能一定会明显下降。',
  '为了白天保持警觉并表现良好，我认为我应该在晚上用药帮助睡眠。',
  '我担心因为晚上睡不好，我会失去正常享受生活的能力和活力。',
  '当我在白天感到疲倦或表现不佳时，通常是因为前一晚没睡好。',
  '我认为失眠本质上是大脑化学物质失衡的结果。',
  '我觉得失眠正在破坏我享受生活的能力，阻止我做想做的事。',
  '我无法处理一晚糟糕睡眠带来的负面后果。',
  '我认为我应该能够自然入睡，不需要任何帮助或药物。',
  '我认为我失眠的原因超出了我的控制范围。',
  '我担心如果我晚上没睡好，第二天会变得易怒且缺乏活力。',
  '我认为如果我真的很累，就应该能在 20 分钟内入睡。',
  '我担心我的失眠最终会导致精神崩溃。',
  '我相信无论我做什么，我的睡眠问题都会持续下去。',
  '我担心如果今晚睡不好，明天就完全无法正常工作。',
  '我认为卧室环境是我睡眠问题的主要原因。',
  '我认为自己应该能够整晚安睡而不从中醒来。',
  '我担心如果睡眠问题持续下去，最终会得大病。',
  '我相信如果我在床上待得更久，最终会睡得更多。',
  '我认为我的睡眠应该每天晚上都保持一致。',
  '我担心失眠让我看起来更老或更没吸引力。',
  '我认为白天的想法和担心是我睡眠问题的主要原因。',
  '我认为我应该能像其他人一样轻松入睡。',
  '我担心家人和朋友会注意到我有多累，并因此看不起我。',
  '我相信如果睡眠不足，我在工作或日常生活中会更容易犯错。',
  '我担心我的失眠永远不会消失。',
  '我认为我的睡眠问题是更严重潜在疾病的征兆。',
];

const DRAFT_KEY = 'somnus_dbas_draft_v2';
const PAGE_SIZE = 5;

interface DBASFormProps {
  onClose: () => void;
  onSave: (result: DBASResult) => void;
}

function loadDraft() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as { page: number; responses: Record<number, number> }) : null;
  } catch (error) {
    console.warn('Failed to load DBAS draft.', error);
    return null;
  }
}

function saveDraft(page: number, responses: Record<number, number>) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ page, responses }));
}

function clearDraft() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(DRAFT_KEY);
}

export function DBASForm({ onClose, onSave }: DBASFormProps) {
  const draft = loadDraft();
  const [page, setPage] = useState(draft?.page || 0);
  const [responses, setResponses] = useState<Record<number, number>>(draft?.responses || {});
  const [sliderValues, setSliderValues] = useState<Record<number, number>>(() => {
    const initial: Record<number, number> = {};
    QUESTIONS.forEach((_, index) => {
      initial[index] = draft?.responses?.[index] ?? 5;
    });
    return initial;
  });
  const [draftRestored] = useState(Boolean(draft));
  const [submittedResult, setSubmittedResult] = useState<DBASResult | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    saveDraft(page, responses);
  }, [page, responses]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page, submittedResult]);

  const totalPages = Math.ceil(QUESTIONS.length / PAGE_SIZE);
  const progress = Math.round((Object.keys(responses).length / QUESTIONS.length) * 100);
  const pageIndices = Array.from({ length: totalPages }, (_, index) => index);
  const totalAnswered = Object.keys(responses).length;

  const pageQuestions = useMemo(() => {
    const start = page * PAGE_SIZE;
    return QUESTIONS.slice(start, start + PAGE_SIZE).map((question, offset) => ({
      index: start + offset,
      question,
    }));
  }, [page]);

  const canGoNext = pageQuestions.every(({ index }) => responses[index]);
  const isLastPage = page === totalPages - 1;
  const isPageComplete = (targetPage: number) => {
    const start = targetPage * PAGE_SIZE;
    const end = Math.min(start + PAGE_SIZE, QUESTIONS.length);
    for (let index = start; index < end; index += 1) {
      if (responses[index] === undefined) {
        return false;
      }
    }
    return true;
  };

  const setResponse = (index: number, value: number) => {
    setSliderValues((current) => ({
      ...current,
      [index]: value,
    }));
    setResponses((current) => ({
      ...current,
      [index]: value,
    }));
  };

  const handleSubmit = () => {
    if (Object.keys(responses).length < QUESTIONS.length) {
      return;
    }

    const expectationsIdx = [0, 1, 14, 19, 21, 22, 25];
    const worryIdx = [2, 3, 6, 8, 9, 12, 15, 16, 20, 23, 24, 26, 28, 29];
    const consequencesIdx = [4, 7, 10, 13, 17, 27];
    const medicationIdx = [5, 11, 18];

    const getSubAverage = (indices: number[]) =>
      indices.reduce((sum, index) => sum + (responses[index] || 0), 0) / indices.length;

    const values = Object.values(responses) as number[];
    const result: DBASResult = {
      date: new Date().toISOString().split('T')[0],
      totalScore: values.reduce((sum, value) => sum + value, 0) / QUESTIONS.length,
      subScores: {
        consequences: getSubAverage(consequencesIdx),
        worry: getSubAverage(worryIdx),
        expectations: getSubAverage(expectationsIdx),
        medication: getSubAverage(medicationIdx),
      },
      responses,
    };

    clearDraft();
    onSave(result);
    setSubmittedResult(result);
  };

  const highestDimension = submittedResult
    ? (Object.entries(submittedResult.subScores) as Array<[keyof DBASResult['subScores'], number]>).reduce((highest, current) =>
        current[1] > highest[1] ? current : highest,
      )
    : null;

  const dimensionLabel =
    highestDimension?.[0] === 'consequences'
      ? '睡眠后果担忧'
      : highestDimension?.[0] === 'worry'
        ? '入睡相关担忧'
        : highestDimension?.[0] === 'expectations'
          ? '睡眠预期'
          : '药物依赖倾向';

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-xl p-0 sm:p-6">
      <div className="mx-auto flex h-full max-w-4xl flex-col overflow-hidden rounded-none border-0 bg-[rgba(11,18,31,0.98)] shadow-[0_24px_80px_rgba(3,8,18,0.45)] sm:rounded-[32px] sm:border sm:border-white/10 sm:bg-[rgba(11,18,31,0.92)]">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-white/8 bg-[rgba(11,18,31,0.98)] px-4 py-4 sm:px-8 sm:py-5">
          <div className="min-w-0 space-y-2">
            <p className="text-xs font-semibold text-sky-200 sm:text-sm">陕西省中医医院脑病科｜DBAS 睡眠信念评估</p>
            <h2 className="text-lg font-semibold leading-8 text-white sm:text-2xl">用于了解患者对睡眠的非理性信念与担忧模式，为认知重建提供参考。</h2>
            <p className="text-xs text-white/60 sm:text-sm">
              请根据最近一段时间的真实想法作答。系统会自动保存当前进度。
            </p>
            {draftRestored && !submittedResult && (
              <p className="inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-1 text-xs text-white/70">
                <Save size={12} />
                已恢复上次未完成的评估进度
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-full border border-white/12 bg-white/6 p-2.5 text-white/70 transition hover:bg-white/10 hover:text-white sm:p-3"
            aria-label="关闭 DBAS 评估"
          >
            <X size={16} />
          </button>
        </div>

        {submittedResult ? (
          <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-8 sm:py-6">
            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[28px] border border-sky-300/20 bg-gradient-to-br from-sky-500/18 via-slate-900/80 to-violet-400/10 p-6">
                <p className="text-sm text-sky-100/90">评估已完成</p>
                <h3 className="mt-2 text-4xl font-semibold text-white">{submittedResult.totalScore.toFixed(1)}</h3>
                <p className="mt-2 text-sm leading-7 text-white/72">
                  这是一项用于辅助理解睡眠信念模式的量表结果，并不等同于自动诊断。当前更值得优先关注的是
                  <span className="font-semibold text-white"> {dimensionLabel}</span>。
                </p>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/6 p-6">
                <p className="text-sm font-semibold text-white">四个维度分布</p>
                <div className="mt-5 space-y-4">
                  {(Object.entries(submittedResult.subScores) as Array<[keyof DBASResult['subScores'], number]>).map(([key, value]) => {
                    const label =
                      key === 'consequences'
                        ? '睡眠后果担忧'
                        : key === 'worry'
                          ? '入睡相关担忧'
                          : key === 'expectations'
                            ? '睡眠预期'
                            : '药物依赖倾向';
                    return (
                      <div key={key} className="space-y-2">
                        <div className="flex items-center justify-between text-sm text-white/78">
                          <span>{label}</span>
                          <span>{value.toFixed(1)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/8">
                          <div
                            className="h-2 rounded-full bg-gradient-to-r from-sky-400 to-violet-300"
                            style={{ width: `${Math.min(100, value * 10)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-[28px] border border-white/10 bg-white/6 p-6">
              <p className="text-sm font-semibold text-white">辅助解释</p>
              <p className="mt-3 text-sm leading-7 text-white/72">
                如果某一维度分数更高，往往意味着睡前更容易出现对应的高压想法。例如，当“睡眠后果担忧”偏高时，
                很多人会更容易出现“今晚睡不好，明天就会完全失控”的自动化想法，而这类想法本身会继续增加入睡压力。
              </p>
            </div>
          </div>
        ) : (
          <div ref={bodyRef} className="flex-1 overflow-y-auto px-4 py-5 pb-36 sm:px-8 sm:py-6 sm:pb-6">
            <div className="mb-6 space-y-3">
              <div className="flex items-center justify-between text-sm text-white/68">
                <span>进度 {progress}%</span>
                <span>
                  第 {page + 1} / {totalPages} 页
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/8">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-sky-400 to-violet-300 transition-all"
                  style={{ width: `${((page + 1) / totalPages) * 100}%` }}
                />
              </div>
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {pageIndices.map((pageIndex) => {
                  const completed = isPageComplete(pageIndex);
                  const unlocked = pageIndex <= page || isPageComplete(pageIndex - 1);
                  return (
                    <button
                      key={pageIndex}
                      type="button"
                      onClick={() => {
                        if (unlocked) {
                          setPage(pageIndex);
                        }
                      }}
                      disabled={!unlocked}
                      className={`shrink-0 rounded-full px-3 py-2 text-xs transition ${
                        pageIndex === page
                          ? 'bg-sky-300 text-slate-950'
                          : completed
                            ? 'bg-emerald-300/16 text-emerald-100 hover:bg-emerald-300/24'
                            : unlocked
                              ? 'bg-white/8 text-white/74 hover:bg-white/12'
                              : 'bg-white/4 text-white/34'
                      }`}
                    >
                      第 {pageIndex + 1} 页
                    </button>
                  );
                })}
              </div>
              {!canGoNext && (
                <p className="text-sm leading-7 text-amber-100/72">
                  本页仍有未作答条目。若你的感受接近中间值，也请点击一次“记为 5 分”或拖动滑杆确认。
                </p>
              )}
            </div>

            <div className="space-y-4">
              {pageQuestions.map(({ index, question }) => (
                <div key={index} className="rounded-[24px] border border-white/10 bg-white/6 p-4 sm:rounded-[28px] sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="text-sm leading-7 text-white/90 sm:text-[15px]">
                      {index + 1}. {question}
                    </p>
                    <span
                      className={`rounded-full px-3 py-1 text-xs ${
                        responses[index] !== undefined
                          ? 'bg-emerald-300/16 text-emerald-100'
                          : 'bg-amber-300/12 text-amber-100/82'
                      }`}
                    >
                      {responses[index] !== undefined ? '已作答' : '未作答'}
                    </span>
                  </div>
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between text-xs text-white/48">
                      <span>1 完全不认同</span>
                      <span>10 非常认同</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      step={1}
                      value={sliderValues[index] ?? 5}
                      onChange={(event) => setResponse(index, Number(event.target.value))}
                      onPointerUp={() => setResponse(index, sliderValues[index] ?? 5)}
                      onKeyUp={() => setResponse(index, sliderValues[index] ?? 5)}
                      className="w-full accent-sky-300"
                    />
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {[1, 3, 5, 7, 10].map((value) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setResponse(index, value)}
                            className={`min-h-11 rounded-full px-4 py-2 text-sm transition ${
                              responses[index] === value
                                ? 'bg-sky-300 text-slate-950'
                                : 'bg-white/8 text-white/74 hover:bg-white/12'
                            }`}
                          >
                            {value}
                          </button>
                        ))}
                        {responses[index] === undefined && (
                          <button
                            type="button"
                            onClick={() => setResponse(index, 5)}
                            className="min-h-11 rounded-full border border-white/12 bg-white/4 px-4 py-2 text-sm text-white/78 transition hover:bg-white/8"
                          >
                            记为 5 分
                          </button>
                        )}
                      </div>
                      <span className="inline-flex rounded-full bg-white/8 px-3 py-2 text-sm text-white/82">
                        当前评分 {sliderValues[index] ?? 5}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {isLastPage && (
              <div className="mt-5 rounded-[28px] border border-emerald-300/22 bg-emerald-300/10 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-emerald-100">最后一页</p>
                    <p className="mt-2 text-sm leading-7 text-white/74">
                      你现在已经到 DBAS 量表的最后一页。完成全部 {QUESTIONS.length} 题后，可直接在这里提交整份评估。
                    </p>
                    <p className="mt-2 text-xs text-white/54">当前已完成 {totalAnswered} / {QUESTIONS.length} 题</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={totalAnswered < QUESTIONS.length}
                    className="rounded-full bg-emerald-300 px-5 py-3 text-sm font-semibold text-slate-950 transition disabled:opacity-40"
                  >
                    提交整份 DBAS 评估
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="sticky bottom-0 z-10 border-t border-white/8 bg-[rgba(11,18,31,0.98)] px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.85rem)] sm:px-8 sm:py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-6 text-white/54 sm:text-sm">
              {submittedResult
                ? '本次评估结果已保存，可返回查看对应治疗计划。'
                : canGoNext
                  ? '本页已完成，可继续下一页。系统会自动保存当前进度。'
                  : '请先完成本页全部条目。系统会自动保存当前进度。'}
            </p>
            <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-row">
              {submittedResult ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="col-span-2 rounded-full bg-sky-300 px-5 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 sm:col-auto"
                >
                  完成并返回
                </button>
              ) : (
                <>
                  {isLastPage && (
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={Object.keys(responses).length < QUESTIONS.length}
                      className="col-span-2 rounded-full border border-emerald-300/30 bg-emerald-300/16 px-5 py-3.5 text-sm font-semibold text-emerald-50 transition disabled:opacity-40 sm:col-auto"
                    >
                      最后一页，提交整份评估
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.max(0, current - 1))}
                    disabled={page === 0}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/12 px-4 py-3 text-sm text-white/76 transition disabled:opacity-35"
                  >
                    <ChevronLeft size={16} />
                    上一页
                  </button>
                  {isLastPage ? (
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={totalAnswered < QUESTIONS.length}
                      className="min-h-12 rounded-full bg-sky-300 px-5 py-3 text-sm font-semibold text-slate-950 transition disabled:opacity-40"
                    >
                      提交评估
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
                      disabled={!canGoNext}
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-sky-300 px-5 py-3 text-sm font-semibold text-slate-950 transition disabled:opacity-40"
                    >
                      下一页
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
