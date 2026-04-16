import { Download, FileHeart, FlaskConical, RefreshCcw } from 'lucide-react';
import { DataMode, UserData } from '../types';
import { getAssessmentSummaries, getDataStatusDescription, getLatestDbas, getLatestPsqi } from '../lib/insights';

interface AssessmentsPageProps {
  userData: UserData;
  dataMode: Exclude<DataMode, 'unset'>;
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
  onOpenDbas,
  onOpenPsqi,
  onExportData,
  onSwitchToRealMode,
  onReloadDemoData,
}: AssessmentsPageProps) {
  const { dbasSummary, psqiSummary } = getAssessmentSummaries(userData);
  const latestDbas = getLatestDbas(userData);
  const latestPsqi = getLatestPsqi(userData);

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 pt-8 sm:px-6">
      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl sm:p-8">
          <div className="flex items-center gap-3">
            <FileHeart className="text-sky-200" size={18} />
            <div>
              <p className="text-sm font-medium text-sky-100">评估中心</p>
              <h2 className="mt-1 text-3xl font-semibold text-white">量表帮助你更清楚地理解当前问题重点</h2>
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
