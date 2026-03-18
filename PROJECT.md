# Daily Beauty Report 项目

**创建时间**: 2026-03-12  
**用户**: GCPD123  
**GitHub**: https://github.com/GCPD123/daily-report  
**网站**: https://GCPD123.github.io/daily-report

---

## 📋 项目概述

每天早 8 点自动搜索美女图片，生成精美画廊网站并自动发布。

---

## 🏗️ 技术架构

- **图片源**: Tavily API (5 个关键词并发搜索)
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
    "fashion photography",
    "street style fashion",
    "elegant women portrait",
    "professional model photoshoot",
    "casual fashion style"
  ],
  "categories": [
    "🩰 丝袜美腿",
    "👗 优雅气质",
    "🏙️ 街拍时尚",
    "📸 写真摄影",
    "☕ 日常穿搭"
  ]
}
```

---

## 📁 文件结构

```
daily-report/
├── .github/workflows/pages.yml  # GitHub Pages 部署
├── src/
│   ├── fetch-news.mjs           # Tavily 搜索图片
│   ├── generate-report.mjs      # HTML 生成
│   └── template.html            # 网站模板
├── output/
│   ├── image-data.json          # 原始数据 (JSON)
│   └── index.html               # 生成的网站
├── config.json                  # 配置
├── package.json
└── .env                         # 环境变量
```

---

## 🎨 界面特点

- 紫色渐变背景，粉紫配色
- 顶部显示日期和统计
- 每个分类最多 8 张图片
- 丝袜分类优先显示
- 卡片悬停动画效果
- 响应式设计

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
cat output/image-data.json | jq length

# 推送更新
git add . && git commit -m "更新说明" && git push
```

---

## 📌 用户偏好

- 丝袜相关内容优先展示
- 界面简洁，不要信息过载
- 每个分类 8 张图片足够
- 图片质量优先，不追求数量

---

## 💰 Token 优化

- **不生成摘要**：直接展示图片 + 标题
- **快速搜索模式**：searchDepth="fast"
- **限制数量**：每分类最多 8 张，总计约 30-40 张
- **预估消耗**：每次运行约 500-800 tokens（仅为原来的 1/5）

---

## 🔧 待优化项

- [ ] 接入图片 CDN 加速
- [ ] 历史数据归档（按日期保存）
- [ ] 智能分类（基于图片内容）
- [ ] 图片质量筛选

---

## 📞 重要信息

- GitHub SSH Key: `~/.ssh/id_ed25519`
- Git 用户：AI Daily Report Bot <daily-report@openclaw.local>
- 仓库：https://github.com/GCPD123/daily-report
