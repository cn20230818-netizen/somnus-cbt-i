import { ReactNode } from 'react';
import { ClipboardList, LayoutGrid, ListChecks, UserRound } from 'lucide-react';

export type PrimaryTab = 'home' | 'sleep' | 'plan' | 'account';

interface BottomNavProps {
  activeTab: PrimaryTab;
  onChange: (tab: PrimaryTab) => void;
}

export function BottomNav({ activeTab, onChange }: BottomNavProps) {
  const items: Array<{ id: PrimaryTab; label: string; icon: ReactNode }> = [
    { id: 'home', label: '首页', icon: <LayoutGrid size={18} /> },
    { id: 'sleep', label: '睡眠记录', icon: <ClipboardList size={18} /> },
    { id: 'plan', label: '治疗计划', icon: <ListChecks size={18} /> },
    { id: 'account', label: '评估与我的', icon: <UserRound size={18} /> },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-[140] border-t border-white/10 bg-[rgba(8,14,24,0.9)] px-3 pb-[calc(env(safe-area-inset-bottom)+0.6rem)] pt-3 backdrop-blur-xl">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 rounded-full border border-white/8 bg-white/4 p-2">
        {items.map((item) => {
          const active = item.id === activeTab;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`flex flex-1 flex-col items-center gap-1 rounded-full px-3 py-2 text-xs transition ${
                active ? 'bg-sky-300 text-slate-950 shadow-[0_10px_30px_rgba(125,211,252,0.18)]' : 'text-white/58'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
