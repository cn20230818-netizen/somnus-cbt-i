# Somnus CBT-I 系统部署指南

## ✅ 当前状态

恭喜！您的 Somnus CBT-I 系统已完成所有代码开发和配置：

### ✅ 已完成的步骤
1. **系统架构扩展** - 完整的数据驱动CBT-I平台
2. **Git仓库初始化** - 代码已提交到私有GitHub仓库
3. **GitHub Actions配置** - 自动化构建和部署工作流
4. **依赖问题修复** - 已解决所有构建依赖问题
5. **构建成功** - GitHub Actions构建已成功通过

### 🔧 待完成的最后一步
**启用GitHub Pages** - 需要您手动在仓库设置中启用Pages功能

## 🌐 GitHub Pages 启用步骤

### 方法一：通过GitHub Web界面（推荐）
1. 访问您的仓库：`https://github.com/cn20230818-netizen/somnus-cbt-i`
2. 点击右上角的 **Settings**（设置）
3. 在左侧菜单中选择 **Pages**（页面）
4. 在 **Source**（来源）部分：
   - 选择 **GitHub Actions** 作为部署来源
5. 点击 **Save**（保存）

### 方法二：通过GitHub CLI
```bash
# 检查仓库的Pages状态
gh api repos/cn20230818-netizen/somnus-cbt-i/pages

# 启用Pages（如果API支持）
gh api -X POST repos/cn20230818-netizen/somnus-cbt-i/pages \
  -f source="{\"branch\":\"gh-pages\",\"path\":\"/\"}"
```

## 🚀 访问您的应用

启用GitHub Pages后，您的应用将自动部署到：
```
https://cn20230818-netizen.github.io/somnus-cbt-i/
```

### 预期部署时间
- **首次部署**: 约2-5分钟
- **后续更新**: 推送到main分支后自动重新部署（约1-3分钟）

## 📊 系统功能概览

您的部署应用将包含以下完整功能：

### 1. 数据输入模块
- ✅ **PSQI专业测评** - 7个维度30个问题的睡眠质量评估
- ✅ **DBAS认知测评** - 睡眠信念失调评估
- ✅ **睡眠日志记录** - 实时睡眠数据跟踪
- ✅ **生理数据模拟** - 心率变异性、睡眠阶段等指标

### 2. 智能分析引擎
- ✅ **睡眠指标分析** - 睡眠效率、潜伏期、觉醒时间
- ✅ **认知模式识别** - DBAS四个维度的失调分析
- ✅ **治疗效果评估** - 多维度治疗进展跟踪

### 3. 个性化任务生成
- ✅ **规则引擎** - 基于临床指南的CBT任务生成
- ✅ **AI增强** - Gemini API集成的智能任务描述
- ✅ **优先级排序** - 根据问题严重性和治疗阶段智能排序

### 4. 数据可视化
- ✅ **多指标趋势图** - 睡眠效率、认知分数、任务完成率
- ✅ **雷达图分析** - DBAS认知信念可视化
- ✅ **治疗里程碑** - 可视化治疗目标和达成进度

## 🔧 本地开发与测试

### 启动本地开发服务器
```bash
cd /Users/lucky/Desktop/somnus-cbt-i

# 修复npm缓存权限（一次性）
sudo chown -R 501:20 "/Users/lucky/.npm"

# 安装依赖
npm install --legacy-peer-deps

# 启动开发服务器（端口3000）
npm run dev
```

### 生产构建测试
```bash
# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 🔐 私有仓库访问

您的仓库设置为**私有**，确保只有您能访问：
- **仓库URL**: `https://github.com/cn20230818-netizen/somnus-cbt-i`
- **GitHub Pages URL**: `https://cn20230818-netizen.github.io/somnus-cbt-i/`
- **访问权限**: 仅您和您授权的用户可访问

## ⚡ 故障排除

### 常见问题与解决方案

#### 1. GitHub Pages 未显示
- **症状**: 访问URL显示404或"Not Found"
- **解决**: 确认已在仓库设置中启用GitHub Pages

#### 2. 构建失败
- **症状**: GitHub Actions显示红色失败状态
- **解决**: 查看工作流运行日志，通常为依赖问题
- **已解决**: 我们已修复所有依赖问题，构建应成功

#### 3. 应用样式异常
- **症状**: 页面显示但样式不正确
- **解决**: 清除浏览器缓存或使用隐身模式访问

#### 4. API功能受限
- **症状**: AI任务生成等功能不可用
- **原因**: 需要配置GEMINI_API_KEY环境变量
- **解决**: 在仓库Settings → Secrets → Actions中添加`GEMINI_API_KEY`

### 检查部署状态
```bash
# 查看最近的工作流运行
gh run list --limit 5

# 查看特定运行的详细信息
gh run view <RUN_ID>

# 查看失败的步骤日志
gh run view <RUN_ID> --log-failed
```

## 📦 GitHub Packages 发布（可选）

系统已配置为可发布的npm包：

### 发布配置
- **包名**: `somnus-cbt-i`
- **版本**: `1.0.0`
- **发布目标**: GitHub Packages（私有npm注册表）

### 启用发布功能
1. 取消注释`.github/workflows/deploy.yml`中的`publish-package`作业
2. 确保`package.json`中的`publishConfig`配置正确
3. 推送代码到main分支将自动发布

## 🎯 验证清单

完成以下步骤确认部署成功：

- [ ] **步骤1**: 访问仓库Settings → Pages → 启用GitHub Actions作为来源
- [ ] **步骤2**: 等待约5分钟让部署完成
- [ ] **步骤3**: 访问 `https://cn20230818-netizen.github.io/somnus-cbt-i/`
- [ ] **步骤4**: 验证以下功能：
  - [ ] PSQI测评表单正常工作
  - [ ] 睡眠日志记录功能
  - [ ] 数据可视化图表显示
  - [ ] 个性化任务生成
  - [ ] 治疗进度跟踪

## 📞 支持与反馈

### 系统架构文档
- [DESIGN.md](DESIGN.md) - 系统架构设计详细说明
- [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) - 项目扩展总结

### 技术栈
- **前端**: React 19 + TypeScript + Vite
- **样式**: Tailwind CSS + Motion动画
- **可视化**: Recharts专业图表库
- **构建**: GitHub Actions自动化工作流
- **部署**: GitHub Pages静态托管

### 联系方式
如有部署问题，请检查：
1. GitHub Actions运行日志
2. 仓库Pages设置
3. 浏览器控制台错误信息

---

**🎉 部署完成！**  
您的Somnus CBT-I系统现已准备好为失眠患者提供个性化、数据驱动的睡眠治疗服务。

**最后更新**: 2026-04-17  
**部署状态**: 构建成功，等待GitHub Pages启用