import { format } from 'date-fns';
import { DataMode } from '../types';
import { getDataStatusLabel } from '../lib/insights';

interface AppHeaderProps {
  dataMode: Exclude<DataMode, 'unset'>;
  phaseLabel: string;
  phaseWeek: number;
}

export function AppHeader({ dataMode, phaseLabel, phaseWeek }: AppHeaderProps) {
  return (
    <header className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 sm:pt-8">
      <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,20,35,0.88),rgba(10,16,28,0.74))] p-5 shadow-[0_20px_70px_rgba(2,6,23,0.35)] backdrop-blur-xl sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-4xl space-y-4">
            <div className="inline-flex rounded-full border border-sky-200/20 bg-sky-200/8 px-4 py-2 text-sm font-semibold text-sky-100">
              陕西省中医医院脑病科
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-[2.7rem]">
                Somnus CBT-I 睡眠认知行为疗法数字干预系统
              </h1>
              <p className="text-base leading-7 text-white/72">
                基于睡眠日志、PSQI 与 DBAS 评估的失眠辅助管理工具
              </p>
              <p className="text-sm leading-7 text-white/58">
                面向失眠评估、睡眠记录、个体化干预与康复追踪
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:w-[360px] lg:grid-cols-1">
            {[
              { label: '当前日期', value: format(new Date(), 'yyyy 年 MM 月 dd 日') },
              { label: '当前治疗阶段', value: `${phaseLabel} · 第 ${phaseWeek} 周` },
              { label: '数据状态', value: getDataStatusLabel(dataMode) },
            ].map((item) => (
              <div key={item.label} className="rounded-[24px] border border-white/10 bg-white/6 p-4">
                <p className="text-xs text-white/44">{item.label}</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
