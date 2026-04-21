import { useMemo, useState } from 'react';
import { AlertTriangle, ChevronLeft, Save, ShieldCheck, UserRound, X } from 'lucide-react';
import { ReadinessLevel, RiskAndBackgroundProfile, RiskLevel } from '../types';

interface ClinicalIntakeFormProps {
  initialValue: RiskAndBackgroundProfile;
  onClose: () => void;
  onSave: (value: RiskAndBackgroundProfile) => void;
}

interface DraftState {
  insomniaDuration: string;
  onsetTrigger: string;
  psychiatricHistory: string;
  substanceHistory: string;
  chronicPain: boolean;
  respiratoryRisk: RiskLevel;
  parasomniaRisk: RiskLevel;
  seizureRisk: RiskLevel;
  unstableMedicalCondition: boolean;
  unstablePsychCondition: boolean;
  selfHarmRisk: RiskLevel;
  pregnancyOrSpecialPopulation: boolean;
  priorCBTIExperience: string;
  treatmentPreference: string;
  readinessForBehaviorChange: ReadinessLevel;
}

function normalizeList(value: string) {
  return value
    .split(/[\n,，、]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toDraft(initialValue: RiskAndBackgroundProfile): DraftState {
  return {
    insomniaDuration: initialValue.insomniaDuration || '',
    onsetTrigger: initialValue.onsetTrigger || '',
    psychiatricHistory: (initialValue.psychiatricHistory || []).join('，'),
    substanceHistory: (initialValue.substanceHistory || []).join('，'),
    chronicPain: Boolean(initialValue.chronicPain),
    respiratoryRisk: initialValue.respiratoryRisk || 'low',
    parasomniaRisk: initialValue.parasomniaRisk || 'low',
    seizureRisk: initialValue.seizureRisk || 'low',
    unstableMedicalCondition: Boolean(initialValue.unstableMedicalCondition),
    unstablePsychCondition: Boolean(initialValue.unstablePsychCondition),
    selfHarmRisk: initialValue.selfHarmRisk || 'low',
    pregnancyOrSpecialPopulation: Boolean(initialValue.pregnancyOrSpecialPopulation),
    priorCBTIExperience: initialValue.priorCBTIExperience || '',
    treatmentPreference: initialValue.treatmentPreference || '',
    readinessForBehaviorChange: initialValue.readinessForBehaviorChange || 'moderate',
  };
}

function riskLabel(level: RiskLevel) {
  return level === 'high' ? '高风险' : level === 'moderate' ? '中等风险' : '低风险';
}

export function ClinicalIntakeForm({ initialValue, onClose, onSave }: ClinicalIntakeFormProps) {
  const [draft, setDraft] = useState<DraftState>(() => toDraft(initialValue));
  const [step, setStep] = useState(0);

  const completion = useMemo(() => {
    let score = 0;
    if (draft.insomniaDuration.trim()) score += 1;
    if (draft.onsetTrigger.trim()) score += 1;
    if (draft.treatmentPreference.trim()) score += 1;
    if (draft.readinessForBehaviorChange) score += 1;
    return Math.round((score / 4) * 100);
  }, [draft]);

  const canContinue =
    step === 0
      ? Boolean(draft.insomniaDuration.trim())
      : step === 1
        ? Boolean(draft.treatmentPreference.trim())
        : true;

  const save = () => {
    onSave({
      insomniaDuration: draft.insomniaDuration.trim(),
      onsetTrigger: draft.onsetTrigger.trim(),
      psychiatricHistory: normalizeList(draft.psychiatricHistory),
      substanceHistory: normalizeList(draft.substanceHistory),
      chronicPain: draft.chronicPain,
      respiratoryRisk: draft.respiratoryRisk,
      parasomniaRisk: draft.parasomniaRisk,
      seizureRisk: draft.seizureRisk,
      unstableMedicalCondition: draft.unstableMedicalCondition,
      unstablePsychCondition: draft.unstablePsychCondition,
      selfHarmRisk: draft.selfHarmRisk,
      pregnancyOrSpecialPopulation: draft.pregnancyOrSpecialPopulation,
      priorCBTIExperience: draft.priorCBTIExperience.trim(),
      treatmentPreference: draft.treatmentPreference.trim(),
      readinessForBehaviorChange: draft.readinessForBehaviorChange,
    });
  };

  const steps = [
    {
      eyebrow: 'Step 1',
      title: '病程与起病背景',
      description: '先补齐失眠病程和诱发背景，这会直接影响系统能否判断是否适合进入标准 CBT-I。',
    },
    {
      eyebrow: 'Step 2',
      title: '治疗偏好与执行准备度',
      description: '这一部分帮助系统决定更适合先用严格限制、温和压缩，还是先从节律与依从性稳定开始。',
    },
    {
      eyebrow: 'Step 3',
      title: '风险与谨慎处理项',
      description: '这些信息用于判断是否需要先进一步评估，避免系统在不适合的情况下直接生成标准 CBT-I 方案。',
    },
  ];

  return (
    <div className="fixed inset-0 z-[130] bg-slate-950/80 p-0 backdrop-blur-xl sm:p-6">
      <div className="mx-auto flex h-full max-w-5xl flex-col overflow-hidden rounded-none border-0 bg-[rgba(11,18,31,0.98)] shadow-[0_24px_80px_rgba(3,8,18,0.45)] sm:rounded-[32px] sm:border sm:border-white/10 sm:bg-[rgba(11,18,31,0.94)]">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-white/8 bg-[rgba(11,18,31,0.98)] px-4 py-4 sm:px-8 sm:py-5">
          <div className="min-w-0 space-y-2">
            <p className="text-xs font-semibold text-sky-200 sm:text-sm">陕西省中医医院脑病科｜入组筛查与基础建档</p>
            <h2 className="text-lg font-semibold leading-8 text-white sm:text-2xl">
              完成这份基础建档后，系统才能更可靠地判断是否适合进入标准 CBT-I
            </h2>
            <p className="text-xs text-white/60 sm:text-sm">
              这不是自动诊断表，而是用于治疗适合性判断、个案概念化和阶段化计划生成的基础资料。
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-full border border-white/12 bg-white/6 p-2.5 text-white/70 transition hover:bg-white/10 hover:text-white sm:p-3"
            aria-label="关闭基础建档"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5 pb-36 sm:px-8 sm:py-6 sm:pb-6">
          <div className="mb-6 space-y-3">
            <div className="flex items-center justify-between text-sm text-white/68">
              <span>基础建档完成度 {completion}%</span>
              <span>
                第 {step + 1} / {steps.length} 步
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/8">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-sky-400 to-violet-300 transition-all"
                style={{ width: `${((step + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
            <div className="space-y-5">
              <div className="rounded-[28px] border border-white/10 bg-white/6 p-5">
                <p className="text-sm font-semibold text-sky-100">{steps[step].eyebrow}</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">{steps[step].title}</h3>
                <p className="mt-3 text-sm leading-7 text-white/68">{steps[step].description}</p>
              </div>

              {step === 0 && (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2 text-sm text-white/76">
                      <span>失眠病程</span>
                      <input
                        type="text"
                        value={draft.insomniaDuration}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            insomniaDuration: event.target.value,
                          }))
                        }
                        placeholder="例如：6 个月、18 个月、2 年"
                        className="w-full rounded-[24px] border border-white/10 bg-slate-950/54 px-4 py-4 text-base text-white outline-none transition focus:border-sky-300/60"
                      />
                    </label>
                    <label className="space-y-2 text-sm text-white/76">
                      <span>起病或加重诱因</span>
                      <input
                        type="text"
                        value={draft.onsetTrigger}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            onsetTrigger: event.target.value,
                          }))
                        }
                        placeholder="例如：工作压力、家人住院、疼痛、节律变化"
                        className="w-full rounded-[24px] border border-white/10 bg-slate-950/54 px-4 py-4 text-base text-white outline-none transition focus:border-sky-300/60"
                      />
                    </label>
                  </div>

                  <label className="space-y-2 text-sm text-white/76">
                    <span>精神心理背景（可选）</span>
                    <textarea
                      value={draft.psychiatricHistory}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          psychiatricHistory: event.target.value,
                        }))
                      }
                      rows={3}
                      placeholder="例如：既往焦虑、抑郁、长期高压；用逗号或换行分隔"
                      className="w-full rounded-[24px] border border-white/10 bg-slate-950/54 px-4 py-4 text-base text-white outline-none transition focus:border-sky-300/60"
                    />
                  </label>

                  <label className="space-y-2 text-sm text-white/76">
                    <span>物质或行为因素（可选）</span>
                    <textarea
                      value={draft.substanceHistory}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          substanceHistory: event.target.value,
                        }))
                      }
                      rows={3}
                      placeholder="例如：长期咖啡因依赖、饮酒助眠、尼古丁使用；用逗号或换行分隔"
                      className="w-full rounded-[24px] border border-white/10 bg-slate-950/54 px-4 py-4 text-base text-white outline-none transition focus:border-sky-300/60"
                    />
                  </label>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2 text-sm text-white/76">
                      <span>治疗偏好</span>
                      <textarea
                        value={draft.treatmentPreference}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            treatmentPreference: event.target.value,
                          }))
                        }
                        rows={3}
                        placeholder="例如：希望先从温和方案开始、担心限制过快、愿意固定起床时间"
                        className="w-full rounded-[24px] border border-white/10 bg-slate-950/54 px-4 py-4 text-base text-white outline-none transition focus:border-sky-300/60"
                      />
                    </label>
                    <label className="space-y-2 text-sm text-white/76">
                      <span>既往 CBT-I 经验</span>
                      <textarea
                        value={draft.priorCBTIExperience}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            priorCBTIExperience: event.target.value,
                          }))
                        }
                        rows={3}
                        placeholder="例如：没有做过、曾做过睡眠限制但坚持困难"
                        className="w-full rounded-[24px] border border-white/10 bg-slate-950/54 px-4 py-4 text-base text-white outline-none transition focus:border-sky-300/60"
                      />
                    </label>
                  </div>

                  <div className="rounded-[28px] border border-white/10 bg-white/4 p-5">
                    <p className="text-sm font-semibold text-white">行为改变准备度</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      {[
                        {
                          value: 'low',
                          label: '较低',
                          description: '当前更适合先做解释、减压和执行障碍分析。',
                        },
                        {
                          value: 'moderate',
                          label: '中等',
                          description: '可以进入温和压缩或节律重建，再逐步推进。',
                        },
                        {
                          value: 'high',
                          label: '较高',
                          description: '可以更稳定地执行固定起床时间和在床时间管理。',
                        },
                      ].map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() =>
                            setDraft((current) => ({
                              ...current,
                              readinessForBehaviorChange: item.value as ReadinessLevel,
                            }))
                          }
                          className={`rounded-[24px] border p-4 text-left transition ${
                            draft.readinessForBehaviorChange === item.value
                              ? 'border-sky-300/30 bg-sky-300/12'
                              : 'border-white/10 bg-white/5 hover:bg-white/8'
                          }`}
                        >
                          <p className="text-sm font-semibold text-white">{item.label}</p>
                          <p className="mt-2 text-sm leading-7 text-white/66">{item.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {[
                      {
                        key: 'respiratoryRisk',
                        label: 'OSA / 呼吸相关风险',
                      },
                      {
                        key: 'parasomniaRisk',
                        label: '异态睡眠风险',
                      },
                      {
                        key: 'seizureRisk',
                        label: '癫痫风险',
                      },
                      {
                        key: 'selfHarmRisk',
                        label: '自伤风险',
                      },
                    ].map((field) => (
                      <label key={field.key} className="space-y-2 text-sm text-white/76">
                        <span>{field.label}</span>
                        <select
                          value={draft[field.key as keyof DraftState] as RiskLevel}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              [field.key]: event.target.value as RiskLevel,
                            }))
                          }
                          className="w-full rounded-[24px] border border-white/10 bg-slate-950/54 px-4 py-4 text-base text-white outline-none transition focus:border-sky-300/60"
                        >
                          <option value="low">低风险</option>
                          <option value="moderate">中等风险</option>
                          <option value="high">高风险</option>
                        </select>
                      </label>
                    ))}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {[
                      {
                        key: 'chronicPain',
                        label: '存在慢性疼痛或持续躯体不适',
                      },
                      {
                        key: 'unstableMedicalCondition',
                        label: '当前有未稳定的躯体疾病',
                      },
                      {
                        key: 'unstablePsychCondition',
                        label: '当前有未稳定的精神症状',
                      },
                      {
                        key: 'pregnancyOrSpecialPopulation',
                        label: '属于妊娠期或其他特殊人群',
                      },
                    ].map((field) => (
                      <label key={field.key} className="flex items-center gap-3 rounded-[22px] border border-white/10 bg-white/5 px-4 py-4 text-sm text-white/76">
                        <input
                          type="checkbox"
                          checked={Boolean(draft[field.key as keyof DraftState])}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              [field.key]: event.target.checked,
                            }))
                          }
                          className="h-4 w-4 accent-sky-300"
                        />
                        {field.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <aside className="space-y-4">
              <div className="rounded-[28px] border border-white/10 bg-white/6 p-5">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="text-sky-200" size={18} />
                  <p className="text-lg font-semibold text-white">建档摘要</p>
                </div>
                <div className="mt-5 space-y-4">
                  <div className="rounded-[22px] border border-white/8 bg-white/5 p-4">
                    <p className="text-sm text-white/46">失眠病程</p>
                    <p className="mt-2 text-base font-semibold text-white">{draft.insomniaDuration || '尚未填写'}</p>
                  </div>
                  <div className="rounded-[22px] border border-white/8 bg-white/5 p-4">
                    <p className="text-sm text-white/46">行为改变准备度</p>
                    <p className="mt-2 text-base font-semibold text-white">
                      {draft.readinessForBehaviorChange === 'high'
                        ? '较高'
                        : draft.readinessForBehaviorChange === 'moderate'
                          ? '中等'
                          : '较低'}
                    </p>
                  </div>
                  <div className="rounded-[22px] border border-white/8 bg-white/5 p-4">
                    <p className="text-sm text-white/46">当前高风险项</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {[draft.respiratoryRisk, draft.parasomniaRisk, draft.seizureRisk, draft.selfHarmRisk]
                        .filter((item) => item !== 'low')
                        .map((item, index) => (
                          <span key={`${item}-${index}`} className="rounded-full bg-amber-300/14 px-3 py-1 text-xs text-amber-100">
                            {riskLabel(item)}
                          </span>
                        ))}
                      {[
                        draft.unstableMedicalCondition,
                        draft.unstablePsychCondition,
                        draft.pregnancyOrSpecialPopulation,
                      ].every((item) => !item) &&
                        [draft.respiratoryRisk, draft.parasomniaRisk, draft.seizureRisk, draft.selfHarmRisk].every(
                          (item) => item === 'low',
                        ) && <span className="rounded-full bg-emerald-300/14 px-3 py-1 text-xs text-emerald-100">当前未见高危项</span>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-amber-300/16 bg-amber-300/10 p-5">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="text-amber-100" size={18} />
                  <p className="text-lg font-semibold text-white">填写说明</p>
                </div>
                <div className="mt-4 space-y-3 text-sm leading-7 text-white/72">
                  <p>1. 这份建档主要用于治疗适合性判断，不替代医生面对面问诊。</p>
                  <p>2. 如果风险项偏高，系统会优先提示进一步评估，而不是直接进入标准 CBT-I。</p>
                  <p>3. 即使暂时不满足标准进入条件，你仍然可以继续记录睡眠并完成基础评估。</p>
                </div>
              </div>
            </aside>
          </div>
        </div>

        <div className="sticky bottom-0 z-10 border-t border-white/8 bg-[rgba(11,18,31,0.98)] px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.85rem)] sm:px-8 sm:py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-6 text-white/54 sm:text-sm">
              完成基础建档后，系统会用这些资料更新适合性判断、个案概念化和本周计划解释。
            </p>
            <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-row">
              <button
                type="button"
                onClick={() => (step === 0 ? onClose() : setStep((current) => Math.max(0, current - 1)))}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/12 px-4 py-3 text-sm text-white/76 transition"
              >
                <ChevronLeft size={16} />
                {step === 0 ? '取消' : '上一步'}
              </button>
              {step === steps.length - 1 ? (
                <button
                  type="button"
                  onClick={save}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-sky-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-200"
                >
                  <Save size={16} />
                  保存基础建档
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setStep((current) => Math.min(steps.length - 1, current + 1))}
                  disabled={!canContinue}
                  className="min-h-12 rounded-full bg-sky-300 px-5 py-3 text-sm font-semibold text-slate-950 transition disabled:opacity-40"
                >
                  下一步
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
