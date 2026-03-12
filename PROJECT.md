# AI Daily Report 项目

**创建时间**: 2026-03-12  
**用户**: GCPD123  
**GitHub**: https://github.com/GCPD123/daily-report  
**网站**: https://GCPD123.github.io/daily-report

---

## 📋 项目概述

每天早 8 点自动抓取 AI 领域新闻，生成日报网站并自动发布。

---

## 🏗️ 技术架构

- **信息源**: Tavily API (5 个关键词并发搜索)
- **定时任务**: OpenClaw cron (每天 8:00 Asia/Shanghai)
- **部署**: GitHub Pages 自动部署
- **位置**: `/home/admin/.openclaw/workspace/daily-report`

---

## 🔑 关键配置

### Tavily API Key
```
TAVILY_API_KEY=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
```
保存在 `.env` 文件中。

### 定时任务
```bash
openclaw cron list
# 任务 ID: ddb7f15f-e082-4406-8649-2b02c8bf09f2
# 名称：AI Daily Report
# 时间：每天 8:00
```

### 关注领域 (config.json)
```json
{
  "keywords": [
    "artificial intelligence",
    "machine learning",
    "LLM",
    "AI agents",
    "tech news"
  ]
}
```

---

## 📁 文件结构

```
daily-report/
├── .github/workflows/pages.yml  # GitHub Pages 部署
├── src/
│   ├── fetch-news.mjs           # Tavily 搜索 + 解析
│   ├── generate-report.mjs      # HTML 生成
│   └── template.html            # 网站模板
├── output/
│   ├── news-data.json           # 原始数据 (JSON)
│   └── index.html               # 生成的网站
├── config.json                  # 配置
├── package.json
└── .env                         # 环境变量
```

---

## 🎨 界面特点

- 紫色渐变背景
- 顶部显示日期和统计
- 每个分类最多 8 条新闻
- 第一个分类高亮（粉色背景）
- 非中文内容标"译"字
- 摘要限制 2 行

---

## 🛠️ 常用命令

```bash
# 查看定时任务
openclaw cron list

# 手动运行
cd /home/admin/.openclaw/workspace/daily-report
export TAVILY_API_KEY=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
npm run build

# 查看数据
cat output/news-data.json | jq length

# 推送更新
git add . && git commit -m "更新说明" && git push
```

---

## 📌 用户偏好

- 界面简洁，不要信息过载
- 内容要有重点，突出重要新闻
- 日期必须醒目显示
- 不需要太多内容，每分类 8 条足够

---

## 🔧 待优化项

- [ ] 接入 AI 翻译（目前只标记，未实际翻译）
- [ ] 历史数据归档（按日期保存）
- [ ] 智能分类（目前关键词匹配）
- [ ] 搜索功能

---

## 📞 重要信息

- GitHub SSH Key: `~/.ssh/id_ed25519`
- Git 用户：AI Daily Report Bot <daily-report@openclaw.local>
- 仓库：https://github.com/GCPD123/daily-report
