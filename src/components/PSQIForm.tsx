import React, { useState } from 'react';
import { X, Moon, Clock, Brain, Activity, Thermometer } from 'lucide-react';
import { PSQIResult } from '../types';
import { cn } from '../lib/utils';
import { calculateSleepDurationMinutes } from '../lib/sleep';

interface PSQIFormProps {
  onClose: () => void;
  onSave: (result: PSQIResult) => void;
}

// PSQI问题结构 - 匹兹堡睡眠质量指数
const PSQI_QUESTIONS = [
  {
    id: 'quality',
    question: "过去一个月，您如何评估您的睡眠质量？",
    options: [
      { score: 0, label: "非常好" },
      { score: 1, label: "较好" },
      { score: 2, label: "较差" },
      { score: 3, label: "非常差" }
    ]
  },
  {
    id: 'latency',
    question: "过去一个月，您通常需要多长时间才能入睡？",
    options: [
      { score: 0, label: "≤15分钟" },
      { score: 1, label: "16-30分钟" },
      { score: 2, label: "31-60分钟" },
      { score: 3, label: "≥60分钟" }
    ]
  },
  {
    id: 'duration',
    question: "过去一个月，您每晚实际睡眠多长时间（不包括躺在床上醒着的时间）？",
    options: [
      { score: 0, label: "≥7小时" },
      { score: 1, label: "6-7小时（不含7小时）" },
      { score: 2, label: "5-6小时（不含6小时）" },
      { score: 3, label: "<5小时" }
    ]
  },
  {
    id: 'efficiency',
    question: "过去一个月，您的睡眠效率如何（实际睡眠时间/卧床时间）？",
    note: "例如：卧床8小时，实际睡眠6小时，效率为75%",
    options: [
      { score: 0, label: "≥85%" },
      { score: 1, label: "75-84%" },
      { score: 2, label: "65-74%" },
      { score: 3, label: "<65%" }
    ]
  },
  {
    id: 'disturbances',
    question: "过去一个月，您是否因以下原因睡眠不好：",
    subQuestions: [
      "a. 夜间醒来或早醒",
      "b. 起床上厕所",
      "c. 呼吸不畅",
      "d. 咳嗽或打鼾声大",
      "e. 感到太冷",
      "f. 感到太热",
      "g. 做恶梦",
      "h. 疼痛",
      "i. 其他原因"
    ],
    options: [
      { score: 0, label: "过去一个月没有" },
      { score: 1, label: "每周少于1次" },
      { score: 2, label: "每周1-2次" },
      { score: 3, label: "每周≥3次" }
    ]
  },
  {
    id: 'medication',
    question: "过去一个月，您是否使用药物帮助睡眠（处方药或非处方药）？",
    options: [
      { score: 0, label: "过去一个月没有" },
      { score: 1, label: "每周少于1次" },
      { score: 2, label: "每周1-2次" },
      { score: 3, label: "每周≥3次" }
    ]
  },
  {
    id: 'dysfunction',
    question: "过去一个月，您是否在白天感到困倦或精力不足，难以保持清醒？",
    options: [
      { score: 0, label: "过去一个月没有" },
      { score: 1, label: "每周少于1次" },
      { score: 2, label: "每周1-2次" },
      { score: 3, label: "每周≥3次" }
    ]
  }
];

export function PSQIForm({ onClose, onSave }: PSQIFormProps) {
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [disturbanceResponses, setDisturbanceResponses] = useState<Record<string, number>>({});
  const [step, setStep] = useState(0);
  const [bedTime, setBedTime] = useState('22:30');
  const [fallAsleepTime, setFallAsleepTime] = useState('23:00');
  const [wakeTime, setWakeTime] = useState('06:30');
  const [getUpTime, setGetUpTime] = useState('07:00');

  const handleResponse = (questionId: string, score: number) => {
    setResponses(prev => ({ ...prev, [questionId]: score }));
    if (step < PSQI_QUESTIONS.length - 1) {
      setStep(prev => prev + 1);
    }
  };

  const handleDisturbanceResponse = (subQuestionId: string, score: number) => {
    setDisturbanceResponses(prev => ({ ...prev, [subQuestionId]: score }));
  };

  const calculatePSQIScore = () => {
    const disturbanceValues = Object.values(disturbanceResponses) as number[];

    // 计算各组成部分得分
    const componentScores = {
      quality: responses.quality || 0,
      latency: responses.latency || 0,
      duration: responses.duration || 0,
      efficiency: responses.efficiency || 0,
      // 睡眠紊乱得分为各子问题最高分
      disturbances: disturbanceValues.length > 0 ? Math.max(...disturbanceValues) : 0,
      medication: responses.medication || 0,
      dysfunction: responses.dysfunction || 0
    };

    const totalScore = Object.values(componentScores).reduce((sum, score) => sum + score, 0);

    return {
      componentScores,
      totalScore
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const { componentScores, totalScore } = calculatePSQIScore();

    const result: PSQIResult = {
      date: new Date().toISOString().split('T')[0],
      totalScore,
      components: componentScores,
      responses: {
        bedTime,
        fallAsleepTime,
        wakeTime,
        getUpTime,
        actualSleepHours: Math.round((calculateSleepDurationMinutes({
          date: new Date().toISOString().split('T')[0],
          fallAsleepTime,
          wakeTime,
          wakeDuration: 0,
        }) / 60) * 10) / 10
      }
    };

    onSave(result);
  };

  const currentQuestion = PSQI_QUESTIONS[step];
  const isDisturbanceQuestion = currentQuestion.id === 'disturbances';

  // 计算进度
  const progress = ((step + 1) / PSQI_QUESTIONS.length) * 100;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110] flex items-center justify-center p-6">
      <div className="bg-[#151921] border border-white/10 w-full max-w-2xl rounded-[32px] p-8 space-y-6 max-h-[95vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center sticky top-0 bg-[#151921] pb-4 z-10 border-b border-white/5">
          <div>
            <div className="card-indicator text-2xl font-semibold text-white">PSQI 睡眠质量测评</div>
            <p className="text-white/40 text-sm mt-1">匹兹堡睡眠质量指数 - 评估过去一个月睡眠情况</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white/60 transition-colors"><X /></button>
        </div>

        {/* 进度条 */}
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] uppercase tracking-widest text-white/40">
            <span>进度 {Math.round(progress)}%</span>
            <span>问题 {step + 1} / {PSQI_QUESTIONS.length}</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent-blue to-soft-purple transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {step === 0 && (
            <div className="space-y-6 bg-white/5 p-6 rounded-2xl">
              <div className="flex items-center gap-3">
                <Clock className="text-accent-blue" />
                <h3 className="text-lg font-semibold text-white">睡前时间记录</h3>
              </div>
              <p className="text-white/60 text-sm">请回忆过去一个月典型的一天：</p>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-white/40">通常上床时间</label>
                  <input
                    type="time"
                    value={bedTime}
                    onChange={e => setBedTime(e.target.value)}
                    className="w-full p-3 bg-white/5 rounded-xl border border-white/10 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-white/40">通常入睡时间</label>
                  <input
                    type="time"
                    value={fallAsleepTime}
                    onChange={e => setFallAsleepTime(e.target.value)}
                    className="w-full p-3 bg-white/5 rounded-xl border border-white/10 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-white/40">通常醒来时间</label>
                  <input
                    type="time"
                    value={wakeTime}
                    onChange={e => setWakeTime(e.target.value)}
                    className="w-full p-3 bg-white/5 rounded-xl border border-white/10 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-white/40">通常起床时间</label>
                  <input
                    type="time"
                    value={getUpTime}
                    onChange={e => setGetUpTime(e.target.value)}
                    className="w-full p-3 bg-white/5 rounded-xl border border-white/10 text-white"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full p-4 rounded-2xl bg-accent-blue text-white font-bold uppercase tracking-widest shadow-lg hover:shadow-accent-blue/20 transition-all"
              >
                继续答题
              </button>
            </div>
          )}

          {step > 0 && !isDisturbanceQuestion && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center gap-3">
                {currentQuestion.id === 'quality' && <Moon className="text-soft-purple" />}
                {currentQuestion.id === 'latency' && <Clock className="text-accent-blue" />}
                {currentQuestion.id === 'duration' && <Activity className="text-emerald-400" />}
                {currentQuestion.id === 'efficiency' && <Thermometer className="text-amber-400" />}
                {currentQuestion.id === 'medication' && <Brain className="text-rose-400" />}
                {currentQuestion.id === 'dysfunction' && <Activity className="text-cyan-400" />}
                <h3 className="text-lg font-semibold text-white">{currentQuestion.question}</h3>
              </div>

              {currentQuestion.note && (
                <p className="text-white/40 text-sm italic bg-white/5 p-3 rounded-xl">{currentQuestion.note}</p>
              )}

              <div className="grid grid-cols-1 gap-3">
                {currentQuestion.options.map((option, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleResponse(currentQuestion.id, option.score)}
                    className={cn(
                      "p-4 rounded-xl text-left transition-all border",
                      responses[currentQuestion.id] === option.score
                        ? "bg-accent-blue/20 border-accent-blue text-white shadow-[0_0_15px_rgba(77,123,255,0.2)]"
                        : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10 text-white/80"
                    )}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-[10px] px-2 py-1 rounded-md bg-white/10 text-white/40">
                        得分: {option.score}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(prev => prev - 1)}
                  className="px-6 py-3 rounded-xl text-white/60 hover:text-white font-medium"
                >
                  上一题
                </button>
                <div className="text-[10px] text-white/40 uppercase tracking-widest">
                  选择最符合您情况的选项
                </div>
              </div>
            </div>
          )}

          {isDisturbanceQuestion && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Activity className="text-rose-400" />
                <h3 className="text-lg font-semibold text-white">{currentQuestion.question}</h3>
              </div>

              <div className="space-y-4">
                {currentQuestion.subQuestions?.map((subQ, idx) => {
                  const subQuestionId = `disturbance_${idx}`;
                  return (
                    <div key={idx} className="space-y-3 p-4 bg-white/5 rounded-xl">
                      <p className="text-white/80 font-medium">{subQ}</p>
                      <div className="grid grid-cols-4 gap-2">
                        {currentQuestion.options.map((option, optIdx) => (
                          <button
                            key={optIdx}
                            type="button"
                            onClick={() => handleDisturbanceResponse(subQuestionId, option.score)}
                            className={cn(
                              "p-3 rounded-lg text-xs font-medium transition-all",
                              disturbanceResponses[subQuestionId] === option.score
                                ? "bg-accent-blue text-white"
                                : "bg-white/5 text-white/60 hover:bg-white/10"
                            )}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(prev => prev - 1)}
                  className="px-6 py-3 rounded-xl text-white/60 hover:text-white font-medium"
                >
                  上一题
                </button>
                <button
                  type="button"
                  onClick={() => setStep(prev => prev + 1)}
                  disabled={Object.keys(disturbanceResponses).length < (currentQuestion.subQuestions?.length || 0)}
                  className={cn(
                    "px-6 py-3 rounded-xl font-medium",
                    Object.keys(disturbanceResponses).length >= (currentQuestion.subQuestions?.length || 0)
                      ? "bg-accent-blue text-white"
                      : "bg-white/5 text-white/30 cursor-not-allowed"
                  )}
                >
                  继续
                </button>
              </div>
            </div>
          )}

          {step === PSQI_QUESTIONS.length - 1 && !isDisturbanceQuestion && (
            <div className="space-y-6 pt-8 border-t border-white/10">
              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold text-white">测评完成！</h3>
                <p className="text-white/40 text-sm">即将计算您的PSQI总分和各维度得分</p>
              </div>

              <div className="grid grid-cols-2 gap-4 p-6 bg-white/5 rounded-2xl">
                <div className="space-y-2">
                  <p className="text-[10px] uppercase font-bold text-white/40">总分范围</p>
                  <p className="text-2xl font-light text-white">0-21分</p>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] uppercase font-bold text-white/40">临床临界值</p>
                  <p className="text-2xl font-light text-amber-400">≥5分</p>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 p-4 rounded-2xl text-white/40 font-bold uppercase tracking-widest"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 p-4 rounded-2xl bg-accent-blue text-white font-bold uppercase tracking-widest shadow-lg hover:shadow-accent-blue/20 transition-all"
                >
                  提交测评
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
