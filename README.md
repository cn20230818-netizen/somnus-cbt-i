# Somnus CBT-I

Somnus CBT-I 是一个基于 `React + TypeScript + Vite` 的失眠认知行为疗法（CBT-I）演示应用，包含睡眠日志、PSQI/DBAS 测评、任务推荐与康复进度可视化。

## 本地运行

前提：

- Node.js 20 或更高版本

安装依赖：

```bash
npm install
```

如果本机 `npm` 缓存权限异常，可以改用项目内缓存：

```bash
npm install --cache .npm-cache
```

启动开发环境：

```bash
npm run dev
```

默认访问地址：

- 本地：[http://localhost:3000](http://localhost:3000)
- 局域网：终端输出的 `Network` 地址

## 生产构建

```bash
npm run build
npm run preview
```

## 环境变量

复制 `.env.example` 为 `.env.local`，按需填写：

```bash
cp .env.example .env.local
```

可用变量：

- `VITE_GEMINI_API_KEY`
  用于启用 AI 增强任务推荐。未配置时，系统会自动回退到本地规则引擎，不影响网页正常打开。
- `VITE_BASE_PATH`
  用于部署到子路径，例如 GitHub Pages 的仓库页面。示例：`/somnus-cbt-i/`

## GitHub Pages 部署

项目已经兼容标准 GitHub Pages 部署。

1. 推送代码到 GitHub 仓库。
2. 在仓库 `Settings -> Pages` 中把 `Source` 设置为 `GitHub Actions`。
3. 运行仓库内的 Pages 工作流。

构建时会优先使用：

- `VITE_BASE_PATH`
- 若未配置，则自动根据 `GITHUB_REPOSITORY` 推断 Pages 子路径
- 如果都没有，则回退到根路径 `/`

这意味着仓库改名、fork，或迁移到新仓库时，不会因为写死路径而直接白屏。

## 项目结构

```text
src/
  components/   页面组件与测评弹窗
  services/     任务生成与分析逻辑
  lib/          通用工具与睡眠时间计算
server/         可选的 Express 示例服务
```

## 说明

- 前端数据默认保存在浏览器 `localStorage`。
- 睡眠时间计算已支持跨午夜场景，例如 `23:30 -> 07:00`。
- 页面采用按需加载，首次打开会更快。
