import React from 'react';
import { Sparkles, Clock, Coffee, Home, ZapOff, Thermometer, VolumeX, SunDim } from 'lucide-react';
import { cn } from '../lib/utils';

const HYGIENE_TIPS = [
  {
    category: "睡眠环境",
    icon: <Home className="text-accent-blue" />,
    tips: [
      { title: "保持凉爽", description: "理想的卧室温度应在 18-22°C 之间。", icon: <Thermometer size={16} /> },
      { title: "彻底黑暗", description: "使用遮光帘或眼罩，光线会抑制褪黑素分泌。", icon: <SunDim size={16} /> },
      { title: "安静空间", description: "使用耳塞或白噪音机器屏蔽干扰噪音。", icon: <VolumeX size={16} /> },
    ]
  },
  {
    category: "作息规律",
    icon: <Clock className="text-soft-purple" />,
    tips: [
      { title: "固定起床时间", description: "即使周末也要在同一时间起床，以稳定生物钟。", icon: <Clock size={16} /> },
      { title: "日间光照", description: "早晨多晒太阳，帮助身体区分昼夜。", icon: <SunDim size={16} /> },
      { title: "限制午睡", description: "如果必须午睡，请控制在 20 分钟内，且不要晚于下午 3 点。", icon: <ZapOff size={16} /> },
    ]
  },
  {
    category: "饮食与刺激物",
    icon: <Coffee className="text-orange-400" />,
    tips: [
      { title: "避开咖啡因", description: "睡前 6 小时内避免摄入咖啡、茶或可乐。", icon: <Coffee size={16} /> },
      { title: "睡前禁酒", description: "酒精虽能助眠，但会严重破坏睡眠质量。", icon: <ZapOff size={16} /> },
      { title: "晚餐适量", description: "避免过饱或过于辛辣的晚餐，以免引起胃部不适。", icon: <Sparkles size={16} /> },
    ]
  }
];

export function SleepHygiene() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-white">睡眠卫生指南</h2>
        <span className="bg-accent-blue/10 text-accent-blue text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">核心功能</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {HYGIENE_TIPS.map((group, idx) => (
          <div key={idx} className="glass-card p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/5 rounded-lg">{group.icon}</div>
              <h3 className="text-lg font-semibold text-white">{group.category}</h3>
            </div>
            
            <div className="space-y-4">
              {group.tips.map((tip, tIdx) => (
                <div key={tIdx} className="group p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="text-accent-blue opacity-60 group-hover:opacity-100 transition-opacity">
                      {tip.icon}
                    </div>
                    <h4 className="text-sm font-medium text-white/90">{tip.title}</h4>
                  </div>
                  <p className="text-xs text-white/40 leading-relaxed">{tip.description}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-br from-accent-blue/20 to-soft-purple/20 p-8 rounded-[32px] border border-white/10">
        <div className="flex items-center gap-4 mb-4">
          <Sparkles className="text-accent-blue" />
          <h4 className="text-lg font-semibold text-white">黄金法则</h4>
        </div>
        <p className="text-white/70 text-sm leading-relaxed italic">
          “床只用于睡眠和亲密关系。如果您在 20 分钟内无法入睡，请离开卧室，做一些放松的事情，直到感到困倦再回来。”
        </p>
      </div>
    </div>
  );
}
