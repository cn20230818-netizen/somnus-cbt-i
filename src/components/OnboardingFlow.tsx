import { LegalSection } from './LegalCenter';
import { ChevronRight, Hospital, MoonStar, Sparkles } from 'lucide-react';

interface OnboardingFlowProps {
  onStartReal: () => void;
  onStartDemo: () => void;
  onOpenLegal: (section: LegalSection) => void;
}

export function OnboardingFlow({ onStartReal, onStartDemo, onOpenLegal }: OnboardingFlowProps) {
  return (
    <div className="min-h-screen px-4 py-6 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col justify-between rounded-[36px] border border-white/10 bg-[linear-gradient(160deg,rgba(10,19,33,0.94),rgba(17,28,48,0.88))] p-6 shadow-[0_30px_120px_rgba(2,6,23,0.45)] sm:p-10">
        <div className="space-y-10">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-white/76">
              <Hospital size={16} className="text-sky-200" />
              陕西省中医医院脑病科
            </div>
            <div className="max-w-4xl space-y-4">
              <h1 className="text-3xl font-semibold leading-tight text-white sm:text-5xl">
                欢迎使用
                <span className="block text-sky-100">Somnus CBT-I 睡眠认知行为疗法数字干预系统</span>
              </h1>
              <p className="max-w-3xl text-base leading-8 text-white/70 sm:text-lg">
                这是一个帮助你完成基础建档、记录睡眠、完成测评、获取阶段化 CBT-I 计划，并逐步重建稳定睡眠的数字工具。
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {[
              {
                icon: <MoonStar className="text-sky-200" size={20} />,
                title: 'Step 1',
                text: '欢迎使用陕西省中医医院脑病科 Somnus CBT-I 系统。',
              },
              {
                icon: <Sparkles className="text-violet-200" size={20} />,
                title: 'Step 2',
                text: '它会帮助你完成基础建档、记录睡眠、完成测评，并在医生指导下理解当前最需要优先处理的问题。',
              },
              {
                icon: <ChevronRight className="text-emerald-200" size={20} />,
                title: 'Step 3',
                text: '每天只需几分钟，就能持续观察睡眠变化并完成当日任务，逐步建立稳定的睡眠节律。',
              },
            ].map((item) => (
              <div key={item.title} className="rounded-[28px] border border-white/10 bg-white/6 p-5">
                <div className="mb-4 inline-flex rounded-2xl bg-white/8 p-3">{item.icon}</div>
                <p className="text-sm font-semibold text-white">{item.title}</p>
                <p className="mt-2 text-sm leading-7 text-white/70">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 grid gap-4 rounded-[32px] border border-white/10 bg-white/5 p-5 sm:grid-cols-[1.1fr_0.9fr] sm:p-6">
          <div className="space-y-2">
            <p className="text-xl font-semibold text-white">先从哪一种方式进入？</p>
            <p className="text-sm leading-7 text-white/65">
              如果你准备开始正式使用，请选择真实记录。如果只是想先浏览界面与流程，可以先查看示例数据。
            </p>
            <p className="text-sm leading-7 text-white/52">
              继续使用即表示你已了解本系统的
              <button onClick={() => onOpenLegal('permissions')} className="mx-1 text-sky-200 transition hover:text-sky-100">
                使用权限
              </button>
              、
              <button onClick={() => onOpenLegal('privacy')} className="mx-1 text-sky-200 transition hover:text-sky-100">
                隐私声明
              </button>
              与
              <button onClick={() => onOpenLegal('anti-theft')} className="ml-1 text-sky-200 transition hover:text-sky-100">
                禁止盗用说明
              </button>
              。
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            <button
              onClick={onStartReal}
              className="w-full rounded-full bg-sky-300 px-5 py-4 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 sm:max-w-xs"
            >
              开始真实记录
            </button>
            <button
              onClick={onStartDemo}
              className="w-full rounded-full border border-white/12 bg-white/6 px-5 py-4 text-sm font-semibold text-white/84 transition hover:bg-white/10 sm:max-w-xs"
            >
              体验示例数据
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
