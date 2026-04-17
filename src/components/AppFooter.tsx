import { LegalSection } from './LegalCenter';

interface AppFooterProps {
  onOpenLegal: (section: LegalSection) => void;
}

export function AppFooter({ onOpenLegal }: AppFooterProps) {
  return (
    <footer className="mx-auto mt-12 max-w-7xl px-4 pb-32 sm:px-6">
      <div className="rounded-[28px] border border-white/10 bg-white/5 px-5 py-6 text-center backdrop-blur-xl sm:px-8">
        <p className="text-base font-semibold text-white">陕西省中医医院脑病科</p>
        <p className="mt-2 text-lg text-sky-100">Somnus CBT-I 睡眠认知行为疗法数字干预系统</p>
        <p className="mt-3 text-sm leading-7 text-white/58">
          用于失眠相关睡眠记录、量表评估、任务管理与康复追踪。本系统用于临床辅助与患者自我管理，不替代医生面对面诊疗。
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={() => onOpenLegal('permissions')}
            className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-white/78 transition hover:bg-white/10"
          >
            使用权限
          </button>
          <button
            onClick={() => onOpenLegal('privacy')}
            className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-white/78 transition hover:bg-white/10"
          >
            隐私声明
          </button>
          <button
            onClick={() => onOpenLegal('anti-theft')}
            className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-white/78 transition hover:bg-white/10"
          >
            禁止盗用声明
          </button>
        </div>
      </div>
    </footer>
  );
}
