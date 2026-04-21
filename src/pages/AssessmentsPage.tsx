import { Download, FileHeart, FlaskConical, RefreshCcw } from 'lucide-react';
import {
  getRiskLevelLabel,
  getSeverityLabel,
  getStructuredAssessmentDefinition,
  StructuredAssessmentKey,
} from '../lib/assessmentCatalog';
import { DataMode, UserData } from '../types';
import { getAssessmentSummaries, getDataStatusDescription, getLatestDbas, getLatestPsqi } from '../lib/insights';
import { analysisService } from '../services/analysisEngine';

interface AssessmentsPageProps {
  userData: UserData;
  dataMode: Exclude<DataMode, 'unset'>;
  onOpenIntake: () => void;
  onOpenDbas: () => void;
  onOpenPsqi: () => void;
  onOpenScale: (key: StructuredAssessmentKey) => void;
  onExportData: () => void;
  onSwitchToRealMode: () => void;
  onReloadDemoData: () => void;
}

function severityCopy(score: number) {
  if (score < 5) {
    return '当前结果提示整体睡眠质量相对稳定。';
  }
  if (score < 10) {
    return '当前结果提示存在一定程度的睡眠受损，可结合日志继续观察。';
  }
  if (score < 15) {
    return '当前结果提示睡眠质量受损较明显，建议结合治疗计划重点执行任务。';
  }
  return '当前结果提示睡眠受损程度较高，建议尽快结合医生指导持续干预。';
}

function latestByDate<T extends { date: string }>(items: T[]) {
  return [...items].sort((a, b) => b.date.localeCompare(a.date))[0] || null;
}

function ScaleCard({
  eyebrow,
  title,
  value,
  emphasis,
  description,
  actionLabel,
  onClick,
}: {
  eyebrow: string;
  title: string;
  value: string;
  emphasis: string;
  description: string;
  actionLabel: string;
  onClick: () => void;
}) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-sky-100">{eyebrow}</p>
          <h4 className="mt-2 text-xl font-semibold text-white">{title}</h4>
        </div>
        <span className="rounded-full border border-emerald-300/24 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-100">
          已启用
        </span>
      </div>
      <div className="mt-4 rounded-[22px] border border-white/10 bg-white/4 p-4">
        <p className="text-sm text-white/46">当前状态</p>
        <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
        <p className="mt-2 text-sm font-semibold text-white/84">{emphasis}</p>
        <p className="mt-3 text-sm leading-7 text-white/66">{description}</p>
      </div>
      <button
        onClick={onClick}
        className="mt-5 rounded-full bg-sky-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-200"
      >
        {actionLabel}
      </button>
    </div>
  );
}

function QuickScaleButton({
  label,
  status,
  onClick,
}: {
  label: string;
  status: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex min-h-20 items-center justify-between gap-4 rounded-[22px] border border-white/10 bg-white/4 px-4 py-4 text-left transition hover:bg-white/8"
    >
      <div>
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="mt-2 text-xs leading-6 text-white/56">{status}</p>
      </div>
      <span className="rounded-full border border-sky-300/22 bg-sky-300/10 px-3 py-1 text-xs font-semibold text-sky-100">
        开始
      </span>
    </button>
  );
}

export function AssessmentsPage({
  userData,
  dataMode,
  onOpenIntake,
  onOpenDbas,
  onOpenPsqi,
  onOpenScale,
  onExportData,
  onSwitchToRealMode,
  onReloadDemoData,
}: AssessmentsPageProps) {
  const { dbasSummary, psqiSummary } = getAssessmentSummaries(userData);
  const latestDbas = getLatestDbas(userData);
  const latestPsqi = getLatestPsqi(userData);
  const latestIsi = latestByDate(userData.isiResults);
  const latestEss = latestByDate(userData.essResults);
  const latestGad7 = latestByDate(userData.gad7Results);
  const latestPhq9 = latestByDate(userData.phq9Results);
  const latestOsa = latestByDate(userData.osaRiskResults);
  const latestBipolar = latestByDate(userData.bipolarRiskResults);
  const analysis = analysisService.buildAnalysisBundle(userData);
  const intakeComplete = Boolean(
    userData.riskProfile.insomniaDuration?.trim() &&
      userData.riskProfile.treatmentPreference?.trim() &&
      userData.riskProfile.readinessForBehaviorChange,
  );
  const isiDefinition = getStructuredAssessmentDefinition('isi');
  const essDefinition = getStructuredAssessmentDefinition('ess');
  const gad7Definition = getStructuredAssessmentDefinition('gad7');
  const phq9Definition = getStructuredAssessmentDefinition('phq9');
  const osaDefinition = getStructuredAssessmentDefinition('osa');
  const bipolarDefinition = getStructuredAssessmentDefinition('bipolar');

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 pt-8 sm:px-6">
      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl sm:p-8">
          <div className="flex items-center gap-3">
            <FileHeart className="text-sky-200" size={18} />
            <div>
              <p className="text-sm font-medium text-sky-100">陕西省中医医院脑病科｜评估中心</p>
              <h2 className="mt-1 text-3xl font-semibold text-white">从基础建档、量表评估到适合性判断，逐步建立规范化 CBT-I 入口</h2>
            </div>
          </div>
          <p className="mt-4 text-sm leading-7 text-white/68">
            测评结果用于辅助理解失眠相关信念、睡眠质量受损环节和后续任务重点，不替代医生面对面诊疗与判断。
          </p>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl sm:p-8">
          <div className="flex items-center gap-3">
            <FlaskConical className="text-violet-200" size={18} />
            <div>
              <p className="text-sm font-medium text-violet-100">我的与数据</p>
              <h3 className="mt-1 text-2xl font-semibold text-white">{dataMode === 'demo' ? '当前正在使用示例数据' : '当前正在使用真实记录'}</h3>
            </div>
          </div>
          <p className="mt-4 text-sm leading-7 text-white/68">{getDataStatusDescription(dataMode)}</p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              onClick={onExportData}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-white/6 px-4 py-3 text-sm font-semibold text-white/84 transition hover:bg-white/10"
            >
              <Download size={16} />
              导出数据
            </button>
            {dataMode === 'demo' ? (
              <button
                onClick={onSwitchToRealMode}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-sky-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-200"
              >
                <RefreshCcw size={16} />
                清空示例数据并开始真实记录
              </button>
            ) : (
              <button
                onClick={onReloadDemoData}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-white/6 px-4 py-3 text-sm font-semibold text-white/84 transition hover:bg-white/10"
              >
                <RefreshCcw size={16} />
                重新载入示例数据
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl sm:p-8">
          <p className="text-sm font-semibold text-sky-100">入组筛查与基础建档</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">
            {analysis.screening.eligibleForStandardCBTI ? '当前已具备进入标准 CBT-I 的基础条件' : '请先完成基础建档，再让系统判断是否适合进入标准 CBT-I'}
          </h3>
          <p className="mt-3 text-sm leading-7 text-white/68">
            这里会汇总失眠病程、起病背景、风险与执行准备度。没有这层信息，治疗计划只能停留在“记录与观察”，无法稳定进入分层干预。
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-[24px] border border-white/10 bg-white/4 p-4">
              <p className="text-sm text-white/46">基础建档状态</p>
              <p className="mt-2 text-lg font-semibold text-white">{intakeComplete ? '已完成' : '待补充'}</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/4 p-4">
              <p className="text-sm text-white/46">失眠病程</p>
              <p className="mt-2 text-lg font-semibold text-white">{userData.riskProfile.insomniaDuration || '尚未填写'}</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/4 p-4">
              <p className="text-sm text-white/46">行为改变准备度</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {userData.riskProfile.readinessForBehaviorChange === 'high'
                  ? '较高'
                  : userData.riskProfile.readinessForBehaviorChange === 'moderate'
                    ? '中等'
                    : userData.riskProfile.readinessForBehaviorChange === 'low'
                      ? '较低'
                      : '尚未填写'}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-[28px] border border-white/10 bg-white/4 p-5">
            <p className="text-sm font-semibold text-white">当前适合性判断</p>
            <p className="mt-3 text-sm leading-7 text-white/72">
              {analysis.screening.eligibleForStandardCBTI
                ? '目前适合进入标准 CBT-I，系统会继续基于睡眠日志、量表和依从性反馈做周级调参。'
                : analysis.screening.redirectRecommendation || '当前资料仍不足，请先完成基础建档或补充评估。'}
            </p>
            <div className="mt-4 space-y-2">
              {analysis.screening.cautionFlags.length > 0 ? (
                analysis.screening.cautionFlags.map((item) => (
                  <p key={item} className="text-sm leading-7 text-white/64">
                    {item}
                  </p>
                ))
              ) : (
                <p className="text-sm leading-7 text-white/64">当前未见需要立即中止标准流程的高危提示。</p>
              )}
            </div>
          </div>

          <button
            onClick={onOpenIntake}
            className="mt-6 rounded-full bg-sky-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-200"
          >
            {intakeComplete ? '更新基础建档' : '开始基础建档'}
          </button>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl sm:p-8">
          <p className="text-sm font-semibold text-sky-100">扩展评估与风险筛查</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">ISI、ESS、情绪负荷与风险筛查现已启用</h3>
          <p className="mt-3 text-sm leading-7 text-white/68">
            这些量表不直接给出诊断结论，而是帮助系统更早发现失眠困扰强度、白天受损、情绪负荷和需要谨慎处理的风险线索。
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[24px] border border-white/10 bg-white/4 p-4">
              <p className="text-sm text-white/46">ISI 失眠困扰</p>
              <p className="mt-2 text-lg font-semibold text-white">{latestIsi ? `${latestIsi.score} / 28` : '可立即开始'}</p>
              <p className="mt-2 text-sm leading-7 text-white/64">
                {latestIsi
                  ? latestIsi.interpretation
                  : '用于辅助理解近两周的失眠困扰强度与治疗必要性。'}
              </p>
              <button
                onClick={() => onOpenScale('isi')}
                className="mt-4 rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm font-semibold text-white/84 transition hover:bg-white/10"
              >
                {latestIsi ? '重新评估' : '开始评估'}
              </button>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/4 p-4">
              <p className="text-sm text-white/46">ESS 白天困倦</p>
              <p className="mt-2 text-lg font-semibold text-white">{latestEss ? `${latestEss.score} / 24` : '可立即开始'}</p>
              <p className="mt-2 text-sm leading-7 text-white/64">
                {latestEss
                  ? latestEss.interpretation
                  : '用于判断白天嗜睡和清醒维持负担，避免只看夜间睡眠。'}
              </p>
              <button
                onClick={() => onOpenScale('ess')}
                className="mt-4 rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm font-semibold text-white/84 transition hover:bg-white/10"
              >
                {latestEss ? '重新评估' : '开始评估'}
              </button>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/4 p-4">
              <p className="text-sm text-white/46">GAD-7 / PHQ-9</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {latestGad7 || latestPhq9
                  ? `GAD-7 ${latestGad7?.score ?? '-'} / PHQ-9 ${latestPhq9?.score ?? '-'}`
                  : '可立即开始'}
              </p>
              <p className="mt-2 text-sm leading-7 text-white/64">
                用于辅助理解焦虑、高唤醒和情绪低落是否正在干扰 CBT-I 推进节奏。
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => onOpenScale('gad7')}
                  className="rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm font-semibold text-white/84 transition hover:bg-white/10"
                >
                  {latestGad7 ? '重做 GAD-7' : '开始 GAD-7'}
                </button>
                <button
                  onClick={() => onOpenScale('phq9')}
                  className="rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm font-semibold text-white/84 transition hover:bg-white/10"
                >
                  {latestPhq9 ? '重做 PHQ-9' : '开始 PHQ-9'}
                </button>
              </div>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/4 p-4">
              <p className="text-sm text-white/46">OSA / 双相风险</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {latestOsa || latestBipolar
                  ? `OSA ${getRiskLevelLabel(latestOsa?.riskLevel)} / 双相 ${getRiskLevelLabel(latestBipolar?.riskLevel)}`
                  : '可立即开始'}
              </p>
              <p className="mt-2 text-sm leading-7 text-white/64">
                用于在入组筛查阶段尽早发现不适合直接进入标准 CBT-I 的风险信号。
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => onOpenScale('osa')}
                  className="rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm font-semibold text-white/84 transition hover:bg-white/10"
                >
                  {latestOsa ? '重做 OSA 筛查' : '开始 OSA 筛查'}
                </button>
                <button
                  onClick={() => onOpenScale('bipolar')}
                  className="rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm font-semibold text-white/84 transition hover:bg-white/10"
                >
                  {latestBipolar ? '重做双相筛查' : '开始双相筛查'}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-[28px] border border-sky-200/16 bg-sky-300/8 p-5">
            <p className="text-sm font-semibold text-sky-100">快速开始扩展评估</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <QuickScaleButton label="ISI 失眠严重度" status={latestIsi ? `最近结果 ${latestIsi.score} / 28` : '当前未完成，可立即开始'} onClick={() => onOpenScale('isi')} />
              <QuickScaleButton label="ESS 日间嗜睡" status={latestEss ? `最近结果 ${latestEss.score} / 24` : '当前未完成，可立即开始'} onClick={() => onOpenScale('ess')} />
              <QuickScaleButton label="GAD-7 焦虑负荷" status={latestGad7 ? `最近结果 ${latestGad7.score} / 21` : '当前未完成，可立即开始'} onClick={() => onOpenScale('gad7')} />
              <QuickScaleButton label="PHQ-9 情绪低落" status={latestPhq9 ? `最近结果 ${latestPhq9.score} / 27` : '当前未完成，可立即开始'} onClick={() => onOpenScale('phq9')} />
              <QuickScaleButton label="OSA 呼吸风险" status={latestOsa ? `当前 ${getRiskLevelLabel(latestOsa.riskLevel)}` : '当前未完成，可立即开始'} onClick={() => onOpenScale('osa')} />
              <QuickScaleButton label="双相 / 躁期风险" status={latestBipolar ? `当前 ${getRiskLevelLabel(latestBipolar.riskLevel)}` : '当前未完成，可立即开始'} onClick={() => onOpenScale('bipolar')} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl sm:p-8">
          <p className="text-sm font-semibold text-sky-100">陕西省中医医院脑病科｜DBAS 睡眠信念评估</p>
          <p className="mt-3 text-sm leading-7 text-white/68">
            用于了解患者对睡眠的非理性信念与担忧模式，为认知重建提供参考。
          </p>

          <div className="mt-5 rounded-[28px] border border-white/10 bg-white/4 p-5">
            <p className="text-sm text-white/46">{dbasSummary.title}</p>
            <p className="mt-3 text-3xl font-semibold text-white">{dbasSummary.value}</p>
            <p className="mt-2 text-sm font-semibold text-white/84">{dbasSummary.emphasis}</p>
            <p className="mt-3 text-sm leading-7 text-white/66">{dbasSummary.description}</p>
          </div>

          {latestDbas && (
            <div className="mt-5 rounded-[28px] border border-white/10 bg-white/4 p-5">
              <p className="text-sm font-semibold text-white">辅助解释</p>
              <p className="mt-3 text-sm leading-7 text-white/68">
                DBAS 总分为 {latestDbas.totalScore.toFixed(1)}。如果某一维度持续偏高，通常意味着睡前更容易出现高压想法，
                例如“如果今晚睡不好，第二天就会完全失控”。这类想法本身会增加入睡压力，因此会在治疗计划中优先安排认知重建任务。
              </p>
            </div>
          )}

          <button
            onClick={onOpenDbas}
            className="mt-6 rounded-full bg-sky-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-200"
          >
            {latestDbas ? '重新评估 DBAS' : '开始 DBAS 评估'}
          </button>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl sm:p-8">
          <p className="text-sm font-semibold text-sky-100">陕西省中医医院脑病科｜PSQI 睡眠质量评估</p>
          <p className="mt-3 text-sm leading-7 text-white/68">
            用于评估过去一个月的整体睡眠质量与主要受损维度。
          </p>

          <div className="mt-5 rounded-[28px] border border-white/10 bg-white/4 p-5">
            <p className="text-sm text-white/46">{psqiSummary.title}</p>
            <p className="mt-3 text-3xl font-semibold text-white">{psqiSummary.value}</p>
            <p className="mt-2 text-sm font-semibold text-white/84">{psqiSummary.emphasis}</p>
            <p className="mt-3 text-sm leading-7 text-white/66">{psqiSummary.description}</p>
          </div>

          {latestPsqi && (
            <div className="mt-5 rounded-[28px] border border-white/10 bg-white/4 p-5">
              <p className="text-sm font-semibold text-white">下一步理解</p>
              <p className="mt-3 text-sm leading-7 text-white/68">
                PSQI 总分为 {latestPsqi.totalScore}。{severityCopy(latestPsqi.totalScore)}
              </p>
            </div>
          )}

          <button
            onClick={onOpenPsqi}
            className="mt-6 rounded-full bg-sky-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-200"
          >
            {latestPsqi ? '重新评估 PSQI' : '开始 PSQI 评估'}
          </button>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <ScaleCard
          eyebrow="失眠严重度"
          title={isiDefinition.title.replace('陕西省中医医院脑病科｜', '')}
          value={latestIsi ? `${latestIsi.score} / 28` : '可立即开始'}
          emphasis={latestIsi ? `当前水平：${getSeverityLabel(latestIsi.severity)}` : '建议尽快完成首次评估'}
          description={latestIsi ? latestIsi.interpretation || isiDefinition.description : isiDefinition.description}
          actionLabel={latestIsi ? '重新评估 ISI' : '开始 ISI 评估'}
          onClick={() => onOpenScale('isi')}
        />

        <ScaleCard
          eyebrow="日间嗜睡"
          title={essDefinition.title.replace('陕西省中医医院脑病科｜', '')}
          value={latestEss ? `${latestEss.score} / 24` : '可立即开始'}
          emphasis={latestEss ? `当前水平：${getSeverityLabel(latestEss.severity)}` : '建议尽快完成首次评估'}
          description={latestEss ? latestEss.interpretation || essDefinition.description : essDefinition.description}
          actionLabel={latestEss ? '重新评估 ESS' : '开始 ESS 评估'}
          onClick={() => onOpenScale('ess')}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <ScaleCard
          eyebrow="焦虑负荷"
          title={gad7Definition.title.replace('陕西省中医医院脑病科｜', '')}
          value={latestGad7 ? `${latestGad7.score} / 21` : '可立即开始'}
          emphasis={latestGad7 ? `当前水平：${getSeverityLabel(latestGad7.severity)}` : '用于辅助理解高唤醒与担忧负荷'}
          description={latestGad7 ? latestGad7.interpretation || gad7Definition.description : gad7Definition.description}
          actionLabel={latestGad7 ? '重新评估 GAD-7' : '开始 GAD-7 评估'}
          onClick={() => onOpenScale('gad7')}
        />

        <ScaleCard
          eyebrow="情绪低落负荷"
          title={phq9Definition.title.replace('陕西省中医医院脑病科｜', '')}
          value={latestPhq9 ? `${latestPhq9.score} / 27` : '可立即开始'}
          emphasis={latestPhq9 ? `当前水平：${getSeverityLabel(latestPhq9.severity)}` : '用于辅助理解动力与情绪负荷'}
          description={latestPhq9 ? latestPhq9.interpretation || phq9Definition.description : phq9Definition.description}
          actionLabel={latestPhq9 ? '重新评估 PHQ-9' : '开始 PHQ-9 评估'}
          onClick={() => onOpenScale('phq9')}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <ScaleCard
          eyebrow="呼吸风险"
          title={osaDefinition.title.replace('陕西省中医医院脑病科｜', '')}
          value={latestOsa ? getRiskLevelLabel(latestOsa.riskLevel) : '可立即开始'}
          emphasis={latestOsa ? `风险分：${latestOsa.score ?? 0}` : '用于筛查不适合直接进入标准 CBT-I 的呼吸风险'}
          description={latestOsa ? latestOsa.note || osaDefinition.description : osaDefinition.description}
          actionLabel={latestOsa ? '重新筛查 OSA 风险' : '开始 OSA 风险筛查'}
          onClick={() => onOpenScale('osa')}
        />

        <ScaleCard
          eyebrow="双相 / 躁期风险"
          title={bipolarDefinition.title.replace('陕西省中医医院脑病科｜', '')}
          value={latestBipolar ? getRiskLevelLabel(latestBipolar.riskLevel) : '可立即开始'}
          emphasis={latestBipolar ? `风险分：${latestBipolar.score ?? 0}` : '用于筛查需要先进一步评估情绪稳定性的情况'}
          description={latestBipolar ? latestBipolar.note || bipolarDefinition.description : bipolarDefinition.description}
          actionLabel={latestBipolar ? '重新筛查双相风险' : '开始双相风险筛查'}
          onClick={() => onOpenScale('bipolar')}
        />
      </section>
    </div>
  );
}
