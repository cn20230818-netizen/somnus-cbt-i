import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';

export interface ToastItem {
  id: number;
  tone: 'success' | 'error' | 'info';
  title: string;
  description?: string;
}

interface ToastViewportProps {
  items: ToastItem[];
  onDismiss: (id: number) => void;
}

export function ToastViewport({ items, onDismiss }: ToastViewportProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[160] flex w-[min(92vw,380px)] flex-col gap-3">
      {items.map((item) => {
        const icon =
          item.tone === 'success' ? (
            <CheckCircle2 size={18} className="text-emerald-300" />
          ) : item.tone === 'error' ? (
            <TriangleAlert size={18} className="text-amber-300" />
          ) : (
            <Info size={18} className="text-sky-300" />
          );

        return (
          <div
            key={item.id}
            className="pointer-events-auto rounded-[24px] border border-white/10 bg-[rgba(8,14,24,0.94)] p-4 shadow-[0_18px_60px_rgba(2,6,23,0.38)]"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-white/6 p-2">{icon}</div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">{item.title}</p>
                {item.description && <p className="mt-1 text-sm leading-6 text-white/64">{item.description}</p>}
              </div>
              <button
                onClick={() => onDismiss(item.id)}
                className="rounded-full p-1 text-white/50 transition hover:bg-white/8 hover:text-white"
                aria-label="关闭消息"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
