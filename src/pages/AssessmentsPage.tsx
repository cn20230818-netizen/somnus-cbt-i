import { Download, FileHeart, FlaskConical, RefreshCcw } from 'lucide-react';
import { DataMode, UserData } from '../types';
import { getAssessmentSummaries, getDataStatusDescription, getLatestDbas, getLatestPsqi } from '../lib/insights';
import { analysisService } from '../services/analysisEngine';

interface AssessmentsPageProps {
  userData: UserData;
  dataMode: Exclude<DataMode, 'unset'>;
  onOpenIntake: () => void;
  onOpenDbas: () => void;
  onOpenPsqi: () => void;
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

export function AssessmentsPage({
  userData,
  dataMode,
  onOpenIntake,
  onOpenDbas,
  onOpenPsqi,
  onExportData,
  onSwitchToRealMode,
  onReloadDemoData,
}: AssessmentsPageProps) {
  const { dbasSummary, psqiSummary } = getAssessmentSummaries(userData);
  const latestDbas = getLatestDbas(userData);
  const latestPsqi = getLatestPsqi(userData);
  const analysis = analysisService.buildAnalysisBundle(userData);
  const intakeComplete = Boolean(
    userData.riskProfile.insomniaDuration?.trim() &&
      userData.riskProfile.treatmentPreference?.trim() &&
      userData.riskProfile.readinessForBehaviorChange,
  );
  const reservedAssessments = [
    {
      label: 'ISI 失眠严重度',
      value: userData.isiResults[0]?.score ?? '未启用',
      description: userData.isiResults[0]?.interpretation || '数据结构已预留，可在下一轮接入正式作答流程。',
    },
    {
      label: 'ESS 日间嗜睡',
      value: userData.essResults[0]?.score ?? '未启用',
      description: userData.essResults[0]?.interpretation || '用于补充判断白天困倦与功能受损程度。',
    },
    {
      label: '焦虑 / 抑郁简表',
      value:
        userData.gad7Results[0]?.score !== undefined || userData.phq9Results[0]?.score !== undefined
          ? `GAD-7 ${userData.gad7Results[0]?.score ?? '-'} / PHQ-9 ${userData.phq9Results[0]?.score ?? '-'}`
          : '未启用',
      description: '用于辅助判断情绪负荷是否正在干扰标准 CBT-I 的推进节奏。',
    },
    {
      label: 'OSA / 双相风险筛查',
      value:
        userData.osaRiskResults[0]?.riskLevel || userData.bipolarRiskResults[0]?.riskLevel
          ? `OSA ${userData.osaRiskResults[0]?.riskLevel || '-'} / 双相 ${userData.bipolarRiskResults[0]?.riskLevel || '-'}`
          : '未启用',
      description: '用于在入组筛查阶段拦截不适合直接进入标准 CBT-I 的情形。',
    },
  ];

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
          <p className="text-sm font-semibold text-sky-100">评估扩展预留</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">后续量表已预留数据结构</h3>
          <p className="mt-3 text-sm leading-7 text-white/68">
            当前正式开放 DBAS 与 PSQI。ISI、ESS、情绪简表、OSA 风险和双相风险已经具备数据层结构，后续可继续接入正式作答流程。
          </p>

          <div className="mt-5 space-y-3">
            {reservedAssessments.map((item) => (
              <div key={item.label} className="rounded-[24px] border border-white/10 bg-white/4 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{item.label}</p>
                  <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-white/60">
                    {typeof item.value === 'number' ? String(item.value) : item.value}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-7 text-white/64">{item.description}</p>
              </div>
            ))}
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
    </div>
  );
}
