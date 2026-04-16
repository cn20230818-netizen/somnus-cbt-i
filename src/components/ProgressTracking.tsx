import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { UserData } from '../types';
import { TrendingUp, Target, Award, Activity, ShieldCheck, Brain, Zap, RefreshCw, BarChart } from 'lucide-react';
import { cn } from '../lib/utils';
import { analysisService } from '../services/analysisEngine';
import { dynamicAdjustmentService } from '../services/dynamicAdjustmentService';

export function ProgressTracking({ userData }: { userData: UserData }) {
  // 处理用于多指标可视化的数据
  const combinedData = userData.sleepLogs.map(log => {
    const dateStr = format(parseISO(log.date), 'MM/dd');
    
    // 查找该日期最接近的 DBAS 分数
    const closestDBAS = userData.dbasResults
      .filter(r => r.date <= log.date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    // 计算该日期前的任务完成率
    const dailyTasks = userData.tasks.filter(t => t.date === log.date);
    const completionRate = dailyTasks.length > 0 
      ? (dailyTasks.filter(t => t.completed).length / dailyTasks.length) * 100 
      : null;

    return {
      date: dateStr,
      efficiency: log.efficiency,
      dbas: closestDBAS ? (closestDBAS.totalScore * 10) : null, // 缩放以适应图表显示
      tasks: completionRate
    };
  });

  const avgEfficiency = Math.round(userData.sleepLogs.reduce((acc, curr) => acc + curr.efficiency, 0) / userData.sleepLogs.length);
  const taskCount = userData.tasks.length;
  const completedTaskCount = userData.tasks.filter(t => t.completed).length;
  const completionRate = taskCount > 0 ? Math.round((completedTaskCount / taskCount) * 100) : 0;

  // 动态调整分析
  const [adjustmentInfo, setAdjustmentInfo] = useState<any>(null);
  const [pathwayInfo, setPathwayInfo] = useState<any>(null);

  useEffect(() => {
    const performance = dynamicAdjustmentService.analyzePerformance(userData);
    const pathway = dynamicAdjustmentService.generatePathway(userData);
    setAdjustmentInfo(performance);
    setPathwayInfo(pathway);
  }, [userData]);

  // 认知分析数据（雷达图）
  const cognitiveData = userData.dbasResults[0] ? [
    { subject: '睡眠后果', value: userData.dbasResults[0].subScores.consequences * 10, fullMark: 100 },
    { subject: '睡眠焦虑', value: userData.dbasResults[0].subScores.worry * 10, fullMark: 100 },
    { subject: '睡眠预期', value: userData.dbasResults[0].subScores.expectations * 10, fullMark: 100 },
    { subject: '药物依赖', value: userData.dbasResults[0].subScores.medication * 10, fullMark: 100 },
  ] : [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-white">智能康复追踪系统</h2>
        <div className="flex gap-2">
          <span className="bg-accent-blue/10 text-accent-blue text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">AI驱动</span>
          <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">动态调整</span>
        </div>
      </div>

      {/* 实时指标卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ProgressMiniCard
          title="治疗依从性"
          value={adjustmentInfo ? `${Math.round(adjustmentInfo.recentCompletionRate)}%` : '--'}
          subtitle="最近任务完成率"
          icon={<Target className="text-accent-blue" size={16} />}
        />
        <ProgressMiniCard
          title="认知改善"
          value={userData.dbasResults[0] ? `${userData.dbasResults[0].totalScore.toFixed(1)}分` : '--'}
          subtitle="DBAS总分"
          icon={<Brain className="text-soft-purple" size={16} />}
        />
        <ProgressMiniCard
          title="睡眠效率"
          value={`${avgEfficiency}%`}
          subtitle="7天平均"
          icon={<TrendingUp className="text-emerald-400" size={16} />}
        />
        <ProgressMiniCard
          title="治疗阶段"
          value={userData.treatmentPhase?.phase === 'assessment' ? '评估期' :
                 userData.treatmentPhase?.phase === 'intensive' ? '强化期' :
                 userData.treatmentPhase?.phase === 'consolidation' ? '巩固期' : '维持期'}
          subtitle={`第${userData.treatmentPhase?.currentWeek || 1}周`}
          icon={<RefreshCw className="text-amber-400" size={16} />}
        />
      </div>

      {/* 双图表布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 多指标趋势图 */}
        <div className="glass-card p-6">
          <div className="card-indicator text-sm font-semibold mb-6">核心指标趋势</div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={combinedData}>
                <defs>
                  <linearGradient id="colorEffProgress" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4D7BFF" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4D7BFF" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: 'rgba(255,255,255,0.4)'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: 'rgba(255,255,255,0.4)'}} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#151921', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)' }}
                  itemStyle={{ fontSize: '11px', color: '#fff' }}
                />
                <Area type="monotone" dataKey="efficiency" name="睡眠效率 (%)" stroke="#4D7BFF" strokeWidth={2} fill="url(#colorEffProgress)" />
                <Line type="monotone" dataKey="dbas" name="认知分数" stroke="#9D7CFF" strokeWidth={2} dot={{ r: 4, fill: '#9D7CFF' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 认知信念雷达图 */}
        {cognitiveData.length > 0 && (
          <div className="glass-card p-6">
            <div className="card-indicator text-sm font-semibold mb-6">认知信念分析</div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={cognitiveData}>
                  <PolarGrid stroke="rgba(255,255,255,0.1)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                  <Radar name="DBAS得分" dataKey="value" stroke="#4D7BFF" fill="#4D7BFF" fillOpacity={0.3} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#151921', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 text-center">
              <p className="text-[10px] text-white/40 uppercase tracking-widest">
                得分越高表示不合理信念越强
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 动态调整建议 */}
      {pathwayInfo && (
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <Zap className="text-accent-blue" size={20} />
            <div className="card-indicator text-sm font-semibold">个性化治疗建议</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <RefreshCw size={16} />
                治疗路径调整
              </h4>
              <div className="space-y-2">
                <p className="text-xs text-white/60">
                  <span className="text-white/80">当前阶段:</span> {pathwayInfo.currentPhase === 'assessment' ? '评估期' :
                    pathwayInfo.currentPhase === 'intensive' ? '强化期' :
                    pathwayInfo.currentPhase === 'consolidation' ? '巩固期' : '维持期'} (第{pathwayInfo.currentWeek}周)
                </p>
                <p className="text-xs text-white/60">
                  <span className="text-white/80">预测结果:</span> {pathwayInfo.predictedOutcome}
                </p>
              </div>

              <div className="space-y-2">
                <h5 className="text-xs font-bold text-white/40 uppercase tracking-widest">下周重点</h5>
                <ul className="space-y-1">
                  {pathwayInfo.nextWeekPlan.map((item: string, idx: number) => (
                    <li key={idx} className="text-xs text-white/60 flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent-blue mt-1 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <BarChart size={16} />
                系统建议
              </h4>
              {pathwayInfo.adjustmentsNeeded.length > 0 ? (
                <ul className="space-y-2">
                  {pathwayInfo.adjustmentsNeeded.map((advice: string, idx: number) => (
                    <li key={idx} className="text-xs text-white/60 bg-white/5 p-3 rounded-lg">
                      {advice}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-white/40 italic">当前治疗策略有效，建议继续保持现有方案。</p>
              )}

              {adjustmentInfo && adjustmentInfo.adherenceLevel === 'high' && (
                <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <p className="text-xs text-emerald-300 font-medium">✓ 任务依从性良好</p>
                  <p className="text-[10px] text-emerald-300/60 mt-1">您的高完成率有助于治疗效果的提升</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 里程碑追踪 */}
      {pathwayInfo && pathwayInfo.milestones.length > 0 && (
        <div className="glass-card p-6">
          <div className="card-indicator text-sm font-semibold mb-6">治疗里程碑</div>
          <div className="space-y-4">
            {pathwayInfo.milestones.map((milestone: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    milestone.achieved ? 'bg-emerald-500/20' : 'bg-white/5'
                  }`}>
                    {milestone.achieved ? (
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    ) : (
                      <div className="w-3 h-3 rounded-full border border-white/20" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-white">{milestone.goal}</p>
                    <p className="text-[10px] text-white/40">第{milestone.week}周目标</p>
                  </div>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                  milestone.achieved
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-white/5 text-white/40'
                }`}>
                  {milestone.achieved ? '已完成' : '进行中'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProgressMiniCard({ title, value, subtitle, icon }: { title: string, value: string, subtitle: string, icon: React.ReactNode }) {
  return (
    <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
      <div className="flex justify-between items-start mb-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">{title}</span>
        {icon}
      </div>
      <div className="text-2xl font-semibold text-white mb-1">{value}</div>
      <p className="text-[10px] text-white/30 uppercase tracking-tighter leading-none">{subtitle}</p>
    </div>
  );
}
