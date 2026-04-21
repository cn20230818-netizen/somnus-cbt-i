import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock3, Save, X } from 'lucide-react';
import {
  getStructuredAssessmentDefinition,
  StructuredAssessmentKey,
  StructuredAssessmentResult,
} from '../lib/assessmentCatalog';

interface StructuredScaleFormProps {
  assessmentKey: StructuredAssessmentKey;
  onClose: () => void;
  onSave: (result: StructuredAssessmentResult) => void;
}

function loadDraft(draftKey: string) {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(draftKey);
    return raw
      ? (JSON.parse(raw) as {
          page: number;
          responses: Record<string, number>;
        })
      : null;
  } catch (error) {
    console.warn(`Failed to load draft for ${draftKey}.`, error);
    return null;
  }
}

function saveDraft(draftKey: string, value: object) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(draftKey, JSON.stringify(value));
}

function clearDraft(draftKey: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(draftKey);
}

export function StructuredScaleForm({
  assessmentKey,
  onClose,
  onSave,
}: StructuredScaleFormProps) {
  const definition = getStructuredAssessmentDefinition(assessmentKey);
  const draft = loadDraft(definition.draftKey);
  const [page, setPage] = useState(draft?.page || 0);
  const [responses, setResponses] = useState<Record<string, number>>(draft?.responses || {});
  const [submittedResult, setSubmittedResult] = useState<StructuredAssessmentResult | null>(null);
  const [draftRestored] = useState(Boolean(draft));
  const bodyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    saveDraft(definition.draftKey, { page, responses });
  }, [definition.draftKey, page, responses]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page, submittedResult]);

  const totalPages = Math.ceil(definition.questions.length / definition.pageSize);
  const pageIndices = Array.from({ length: totalPages }, (_, index) => index);
  const totalAnswered = Object.keys(responses).length;
  const progress = Math.round((totalAnswered / definition.questions.length) * 100);
  const isLastPage = page === totalPages - 1;

  const pageQuestions = useMemo(() => {
    const start = page * definition.pageSize;
    return definition.questions.slice(start, start + definition.pageSize);
  }, [definition.pageSize, definition.questions, page]);

  const canGoNext = pageQuestions.every((question) => responses[question.id] !== undefined);

  const isPageComplete = (targetPage: number) => {
    const start = targetPage * definition.pageSize;
    const end = Math.min(start + definition.pageSize, definition.questions.length);
    for (let index = start; index < end; index += 1) {
      if (responses[definition.questions[index].id] === undefined) {
        return false;
      }
    }
    return true;
  };

  const handleSubmit = () => {
    if (totalAnswered < definition.questions.length) {
      return;
    }

    const result = definition.buildResult(responses);
    setSubmittedResult(result);
    clearDraft(definition.draftKey);
    onSave(result);
  };

  const continueHint = canGoNext
    ? '当前页已完成，可继续下一页。系统会自动保存进度。'
    : '请先完成本页全部条目。系统会自动保存当前进度。';

  const resultSummary = submittedResult ? definition.summarizeResult(submittedResult) : null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/84 px-4 py-4 backdrop-blur-xl sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl rounded-[36px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,38,0.98),rgba(10,16,28,0.98))] shadow-[0_40px_120px_rgba(2,6,23,0.55)]">
        <div className="flex items-start justify-between gap-4 border-b border-white/8 px-4 py-5 sm:px-8">
          <div>
            <p className="text-sm font-medium text-sky-100">陕西省中医医院脑病科</p>
            <h2 className="mt-1 text-2xl font-semibold text-white sm:text-3xl">{definition.title.replace('陕西省中医医院脑病科｜', '')}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-white/66">{definition.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/12 bg-white/6 p-3 text-white/72 transition hover:bg-white/10"
            aria-label="关闭量表"
          >
            <X size={18} />
          </button>
        </div>

        <div ref={bodyRef} className="max-h-[calc(100vh-9rem)] overflow-y-auto px-4 py-5 sm:px-8 sm:py-8">
          {submittedResult && resultSummary ? (
            <div className="space-y-5">
              <div className="rounded-[32px] border border-sky-200/16 bg-gradient-to-br from-sky-300/14 via-slate-900/72 to-violet-300/10 p-6">
                <p className="text-sm font-semibold text-sky-100">{definition.resultTitle}</p>
                <p className="mt-3 text-4xl font-semibold text-white">{resultSummary.value}</p>
                <p className="mt-3 text-base font-semibold text-white/88">{resultSummary.emphasis}</p>
                <p className="mt-3 text-sm leading-7 text-white/72">{resultSummary.description}</p>
                {resultSummary.helper && <p className="mt-3 text-sm leading-7 text-white/58">{resultSummary.helper}</p>}
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
                <p className="text-sm font-semibold text-white">下一步建议</p>
                <p className="mt-3 text-sm leading-7 text-white/68">
                  评估结果已保存到“评估与我的”。系统会把这次结果纳入后续睡眠解释、适合性判断与治疗计划中，但它仍属于辅助理解，不替代面对面诊疗。
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">评估说明</p>
                    <p className="mt-2 text-sm leading-7 text-white/68">{definition.description}</p>
                    <p className="mt-2 text-sm leading-7 text-white/58">{definition.intro}</p>
                  </div>
                  <div className="shrink-0 rounded-[24px] border border-white/10 bg-white/6 px-4 py-3 text-sm text-white/72">
                    作答范围：{definition.responseWindow}
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">作答进度</p>
                    <p className="mt-2 text-sm text-white/60">
                      第 {page + 1} / {totalPages} 页，当前已完成 {totalAnswered} / {definition.questions.length} 题
                    </p>
                    {draftRestored && (
                      <p className="mt-2 text-xs text-emerald-200/80">已恢复上次未完成进度，可继续作答。</p>
                    )}
                  </div>
                  <div className="w-full max-w-sm">
                    <div className="h-2 rounded-full bg-white/8">
                      <div
                        className="h-2 rounded-full bg-sky-300 transition-all"
                        style={{ width: `${Math.max(progress, ((page + 1) / totalPages) * 100)}%` }}
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {pageIndices.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setPage(item)}
                          className={`rounded-full border px-3 py-1 text-xs transition ${
                            item === page
                              ? 'border-sky-300/60 bg-sky-300/14 text-white'
                              : isPageComplete(item)
                                ? 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100'
                                : 'border-white/10 bg-white/4 text-white/60'
                          }`}
                        >
                          第 {item + 1} 页
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {pageQuestions.map((question, index) => (
                  <div key={question.id} className="rounded-[28px] border border-white/10 bg-white/5 p-5">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-300/14 text-sm font-semibold text-sky-100">
                        {page * definition.pageSize + index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-semibold leading-7 text-white">{question.title}</p>
                        <p className="mt-2 text-sm leading-7 text-white/60">{question.hint}</p>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          {question.options.map((option) => {
                            const active = responses[question.id] === option.score;
                            return (
                              <button
                                key={`${question.id}_${option.label}`}
                                type="button"
                                onClick={() =>
                                  setResponses((current) => ({
                                    ...current,
                                    [question.id]: option.score,
                                  }))
                                }
                                className={`min-h-16 rounded-[22px] border px-4 py-4 text-left transition ${
                                  active
                                    ? 'border-sky-300/60 bg-sky-300/14 text-white'
                                    : 'border-white/10 bg-white/4 text-white/78 hover:bg-white/8'
                                }`}
                              >
                                <p className="text-sm font-semibold">{option.label}</p>
                                {option.description && <p className="mt-2 text-xs leading-6 text-white/60">{option.description}</p>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {isLastPage && (
                <div className="rounded-[28px] border border-emerald-300/22 bg-emerald-300/10 p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-emerald-100">最后一页</p>
                      <p className="mt-2 text-sm leading-7 text-white/74">
                        你已经到这份量表的最后一页。完成全部 {definition.questions.length} 题后，可直接提交整份评估。
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={totalAnswered < definition.questions.length}
                      className="rounded-full bg-emerald-300 px-5 py-3 text-sm font-semibold text-slate-950 transition disabled:opacity-40"
                    >
                      {definition.submitLabel}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 z-10 border-t border-white/8 bg-[rgba(11,18,31,0.98)] px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.85rem)] sm:px-8 sm:py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs leading-6 text-white/54 sm:text-sm">
              <Clock3 size={16} />
              {submittedResult
                ? '评估结果已保存，可返回“评估与我的”查看摘要。'
                : continueHint}
            </div>

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
                      disabled={totalAnswered < definition.questions.length}
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
                      disabled={totalAnswered < definition.questions.length}
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-sky-300 px-5 py-3 text-sm font-semibold text-slate-950 transition disabled:opacity-40"
                    >
                      <Save size={16} />
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
