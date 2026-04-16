import React, { useState } from 'react';
import { X } from 'lucide-react';
import { DBASResult } from '../types';

const QUESTIONS = [
  "我需要睡够8小时，第二天才能感到清爽并保持良好的功能。",
  "当自然睡眠不佳时，我需在第二天小睡或在接着的晚上睡更长时间来补觉。",
  "我担心长期的失眠会对我的身体健康产生严重的后果。",
  "我担心我会完全失去对睡眠能力的控制。",
  "经过一晚糟糕的睡眠，我知道第二天我的日间功能将会下降。",
  "为了在白天保持警觉并表现良好，我认为我应该在晚上使用药物帮助睡眠。",
  "我担心因为晚上睡不好，我会失去正常享受生活的能力和活力。",
  "当我在白天感到疲倦或表现不佳时，通常是因为前一天晚上没睡好。",
  "我认为失眠本质上是大脑化学物质失衡的结果。",
  "我觉得失眠正在破坏我享受生活的能力，阻止我做想做的事。",
  "我无法处理由于一晚糟糕睡眠带来的负面后果。",
  "我认为我应该能够自然入睡，不需要任何帮助或药物。",
  "我认为我失眠的原因超出了我的控制范围。",
  "我担心如果我晚上没睡好，第二天我会变得易怒且缺乏活力。",
  "我认为如果我真的很累，我应该能在20分钟内入睡。",
  "我担心我的失眠最终会导致精神崩溃。",
  "我相信无论我做什么，我的睡眠问题都会持续下去。",
  "我担心如果今今晚睡不好，明天我就完全无法正常工作。",
  "我认为我的卧室环境是我睡眠问题的主要原因。",
  "我认为我应该能够整晚安睡而不从中醒来。",
  "我担心如果我的睡眠问题持续下去，我最终会得大病。",
  "我相信如果我在床上待的时间更长，我最终会睡得更多。",
  "我认为我的睡眠应该每天晚上都保持一致。",
  "我担心我的失眠让我看起来更老或更没吸引力。",
  "我认为白天的想法和担心是我睡眠问题的主要原因。",
  "我认为我应该能像其他人一样轻松入睡。",
  "我担心我的家人和朋友会注意到我有多累，并因此看不起我。",
  "我相信如果我睡眠不足，我在工作或日常生活中会更容易犯错。",
  "我担心我的失眠永远不会消失。",
  "我认为我的睡眠问题是更严重的潜在疾病的征兆。"
];

interface DBASFormProps {
  onClose: () => void;
  onSave: (result: DBASResult) => void;
}

export function DBASForm({ onClose, onSave }: DBASFormProps) {
  const [responses, setResponses] = useState<Record<number, number>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const answeredCount = Object.keys(responses).length;
    if (answeredCount < QUESTIONS.length) {
      alert(`请回答所有问题 (已完成 ${answeredCount}/${QUESTIONS.length})`);
      return;
    }

    const values = Object.values(responses) as number[];
    const total = values.reduce((a, b) => a + b, 0);
    const avg = total / QUESTIONS.length;

    // Subscale mapping for DBAS-30 (Approximate mapping to the 4 core dimensions defined in types.ts)
    const expectationsIdx = [0, 1, 14, 19, 21, 22, 25];
    const worryIdx = [2, 3, 6, 8, 9, 12, 15, 16, 20, 23, 24, 26, 28, 29];
    const consequencesIdx = [4, 7, 10, 13, 17, 27];
    const medicationIdx = [5, 11, 18];

    const getSubAvg = (indices: number[]) => {
      const scores = indices.map(i => responses[i] || 0) as number[];
      return scores.reduce((a, b) => a + b, 0) / indices.length;
    };

    onSave({
      date: new Date().toISOString().split('T')[0],
      totalScore: avg,
      subScores: {
        expectations: getSubAvg(expectationsIdx),
        worry: getSubAvg(worryIdx),
        consequences: getSubAvg(consequencesIdx),
        medication: getSubAvg(medicationIdx)
      },
      responses
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110] flex items-center justify-center p-6">
      <div className="bg-[#151921] border border-white/10 w-full max-w-2xl rounded-[32px] p-8 space-y-6 max-h-[95vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center sticky top-0 bg-[#151921] pb-4 z-10 border-b border-white/5">
          <div className="card-indicator text-2xl font-semibold text-white">DBAS-30 睡眠信念测评</div>
          <button onClick={onClose} className="text-white/40 hover:text-white/60 transition-colors"><X /></button>
        </div>
        
        <p className="text-white/40 text-sm italic">请根据您对以下陈述的认同程度打分（1-10分，1为完全不认同，10为完全认同）</p>

        <form onSubmit={handleSubmit} className="space-y-8">
          {QUESTIONS.map((q, i) => (
            <div key={i} className="space-y-3">
              <p className="text-white/80 font-medium text-sm">{i + 1}. {q}</p>
              <div className="flex justify-between gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setResponses(prev => ({ ...prev, [i]: val }))}
                    className={`flex-1 h-10 rounded-lg text-xs font-bold transition-all ${
                      responses[i] === val 
                        ? "bg-accent-blue text-white shadow-[0_0_15px_rgba(77,123,255,0.4)]" 
                        : "bg-white/5 text-white/40 hover:bg-white/10"
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <button 
            type="submit" 
            className="w-full p-4 rounded-2xl bg-accent-blue text-white font-bold uppercase tracking-widest shadow-lg hover:shadow-accent-blue/20 transition-all"
          >
            提交测评
          </button>
        </form>
      </div>
    </div>
  );
}
