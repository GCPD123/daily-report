# AI Daily Report 📰

自动生成每日 AI 领域资讯日报，支持多语言翻译和智能分类。

## 功能

- 🔍 **Tavily 搜索** - AI 优化的新闻搜索
- 🌐 **自动翻译** - 非中文内容自动翻译成中文
- 📊 **智能分类** - 按主题自动归类汇总
- 🚀 **自动部署** - GitHub Pages 自动上线

## 快速开始

### 1. 配置 Tavily API Key

```bash
export TAVILY_API_KEY=your_api_key_here
```

获取 key: https://tavily.com

### 2. 配置关注领域

编辑 `config.json`，修改 `keywords` 数组：

```json
{
  "keywords": [
    "artificial intelligence",
    "machine learning",
    "你的关键词"
  ]
}
```

### 3. 手动测试

```bash
npm run build
```

### 4. 配置定时任务

使用 OpenClaw cron 技能，设置每天 8 点执行：

```javascript
{
  "action": "add",
  "job": {
    "name": "daily-report",
    "schedule": { "kind": "cron", "expr": "0 8 * * *", "tz": "Asia/Shanghai" },
    "payload": {
      "kind": "agentTurn",
      "message": "执行 daily-report 构建流程"
    }
  }
}
```

### 5. 配置 GitHub Pages

1. 在 GitHub 创建新仓库
2. 推送代码到 `main` 分支
3. Settings → Pages → Source 选择 `gh-pages` 分支
4. 访问 `https://yourname.github.io/daily-report`

## 项目结构

```
daily-report/
├── .github/workflows/deploy.yml  # GitHub Pages 部署
├── src/
│   ├── fetch-news.mjs            # 搜索 + 翻译 + 分类
│   ├── generate-report.mjs       # 生成 HTML
│   └── template.html             # 网站模板
├── output/                       # 生成的日报
├── config.json                   # 配置
└── package.json
```

## License

MIT
