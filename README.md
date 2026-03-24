# Daily Beauty Report ✨

自动生成每日美女图片画廊，支持智能分类和精美展示。

## 功能

- 🔍 **Tavily 搜索** - AI 优化的图片搜索
- 🎨 **智能分类** - 按风格自动归类（丝袜/优雅/街拍/写真/穿搭）
- 🖼️ **精美画廊** - 响应式图片网格布局
- 🚀 **自动部署** - GitHub Pages 自动上线

## 快速开始

### 1. 配置 Tavily API Key

```bash
export TAVILY_API_KEY=your_api_key_here
```

获取 key: https://tavily.com

### 2. 配置搜索关键词

编辑 `config.json`，修改 `keywords` 数组：

```json
{
  "keywords": [
    "fashion photography",
    "street style fashion",
    "elegant women portrait",
    "professional model photoshoot",
    "casual fashion style"
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
    "name": "daily-beauty-report",
    "schedule": { "kind": "cron", "expr": "0 8 * * *", "tz": "Asia/Shanghai" },
    "payload": {
      "kind": "agentTurn",
      "message": "执行 daily-beauty-report 构建流程"
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
│   ├── fetch-news.mjs            # 搜索图片 + 分类
│   ├── generate-report.mjs       # 生成 HTML
│   └── template.html             # 网站模板
├── output/                       # 生成的画廊
├── config.json                   # 配置
└── package.json
```

## Token 优化

- 快速搜索模式，降低 token 消耗
- 每分类限制 8 张图片，总计约 30-40 张
- 不生成摘要，仅展示图片 + 标题
- 预估每次运行消耗 500-800 tokens

## License

MIT
