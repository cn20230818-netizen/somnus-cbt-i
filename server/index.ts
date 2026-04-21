import express from 'express';
import cors from 'cors';
import { createEmptyUserData } from '../src/data/demoData';
import { UserData, SleepLog, DBASResult, PSQIResult, CBTTask } from '../src/types';

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());

// 内存存储（生产环境应使用数据库）
let userStore: Record<string, UserData> = {};

// API路由
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 用户数据API
app.get('/api/user/:userId/data', (req, res) => {
  const { userId } = req.params;
  const userData = userStore[userId] || createDefaultUserData(userId);
  res.json(userData);
});

app.post('/api/user/:userId/data', (req, res) => {
  const { userId } = req.params;
  const userData = req.body as UserData;

  // 验证数据
  if (!validateUserData(userData)) {
    return res.status(400).json({ error: 'Invalid user data format' });
  }

  userStore[userId] = userData;
  res.json({ success: true, message: 'User data saved' });
});

// 睡眠日志API
app.post('/api/user/:userId/sleep-logs', (req, res) => {
  const { userId } = req.params;
  const log = req.body as SleepLog;

  if (!userStore[userId]) {
    userStore[userId] = createDefaultUserData(userId);
  }

  userStore[userId].sleepLogs.push(log);
  res.json({ success: true, message: 'Sleep log saved' });
});

// 测评结果API
app.post('/api/user/:userId/assessments/dbas', (req, res) => {
  const { userId } = req.params;
  const result = req.body as DBASResult;

  if (!userStore[userId]) {
    userStore[userId] = createDefaultUserData(userId);
  }

  userStore[userId].dbasResults.unshift(result);
  res.json({ success: true, message: 'DBAS result saved' });
});

app.post('/api/user/:userId/assessments/psqi', (req, res) => {
  const { userId } = req.params;
  const result = req.body as PSQIResult;

  if (!userStore[userId]) {
    userStore[userId] = createDefaultUserData(userId);
  }

  userStore[userId].psqiResults.unshift(result);
  res.json({ success: true, message: 'PSQI result saved' });
});

// 任务API
app.get('/api/user/:userId/tasks/recommendations', (req, res) => {
  const { userId } = req.params;
  const userData = userStore[userId];

  if (!userData) {
    return res.status(404).json({ error: 'User not found' });
  }

  // 这里可以集成分析引擎生成推荐任务
  const recommendations = [
    {
      id: 'rec_1',
      type: 'behavioral' as const,
      title: '睡眠限制',
      description: '今晚在建议的时间窗内上床休息',
      priority: 'high'
    }
  ];

  res.json(recommendations);
});

app.post('/api/user/:userId/tasks/:taskId/complete', (req, res) => {
  const { userId, taskId } = req.params;
  const { rating, note } = req.body;

  if (!userStore[userId]) {
    return res.status(404).json({ error: 'User not found' });
  }

  const task = userStore[userId].tasks.find(t => t.id === taskId);
  if (task) {
    task.completed = true;
    if (rating) {
      task.feedback = { rating, note };
    }
  }

  res.json({ success: true, message: 'Task marked as completed' });
});

// 分析API
app.get('/api/user/:userId/analysis', (req, res) => {
  const { userId } = req.params;
  const userData = userStore[userId];

  if (!userData) {
    return res.status(404).json({ error: 'User not found' });
  }

  // 模拟分析结果
  const analysis = {
    sleepEfficiency: {
      current: 82,
      trend: 'improving',
      weeklyAvg: 78,
      goal: 85
    },
    cognitivePatterns: {
      dbasScore: userData.dbasResults[0]?.totalScore || 0,
      highestDimension: 'consequences',
      recommendations: ['认知重建练习', '挑战不合理信念']
    },
    treatmentProgress: {
      phase: userData.treatmentPhase?.phase || 'assessment',
      week: userData.treatmentPhase?.currentWeek || 1,
      overallScore: 65 // 0-100
    }
  };

  res.json(analysis);
});

// 辅助函数
function createDefaultUserData(userId: string): UserData {
  const base = createEmptyUserData();
  return {
    ...base,
    treatmentPhase: {
      ...base.treatmentPhase,
      goals: ['建立基线数据', '完成初始测评'],
    },
  };
}

function validateUserData(data: any): data is UserData {
  // 简化验证
  return data &&
    Array.isArray(data.sleepLogs) &&
    Array.isArray(data.dbasResults) &&
    Array.isArray(data.tasks);
}

// 启动服务器
app.listen(PORT, () => {
  console.log(`Somnus CBT-I API server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

export default app;
