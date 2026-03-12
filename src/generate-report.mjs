#!/usr/bin/env node
/**
 * generate-report.mjs
 * 根据抓取的数据生成 HTML 日报
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// 读取数据
const newsData = JSON.parse(readFileSync(join(rootDir, 'output', 'news-data.json'), 'utf-8'));
const template = readFileSync(join(rootDir, 'src', 'template.html'), 'utf-8');

// 按分类分组
const grouped = {};
newsData.forEach(item => {
  const cat = item.category || '其他';
  if (!grouped[cat]) grouped[cat] = [];
  grouped[cat].push(item);
});

// 分类图标映射
const categoryIcons = {
  'AI 技术突破': '🚀',
  '行业动态': '📈',
  '产品发布': '🎉',
  '研究论文': '📄',
  '其他': '📌'
};

// 生成分类 HTML
function generateCategoryHTML(category, items) {
  const icon = categoryIcons[category] || '📌';
  
  const itemsHTML = items.map(item => `
    <div class="news-item">
      <div class="news-title">
        <a href="${item.url}" target="_blank" rel="noopener">${item.title}</a>
        ${item.needsTranslation ? '<span class="translated-badge">译</span>' : ''}
      </div>
      <div class="news-snippet">${item.snippet || '暂无摘要'}</div>
      <div class="news-meta">
        <span class="news-source">${item.source || '未知来源'}</span>
      </div>
    </div>
  `).join('');

  return `
    <div class="category">
      <div class="category-header">
        <span class="category-icon">${icon}</span>
        <h2 class="category-title">${category}</h2>
        <span class="category-count">${items.length}条</span>
      </div>
      ${itemsHTML}
    </div>
  `;
}

// 生成所有分类
const categoriesHTML = Object.entries(grouped)
  .map(([cat, items]) => generateCategoryHTML(cat, items))
  .join('');

// 替换模板变量
const today = new Date();
const dateStr = today.toLocaleDateString('zh-CN', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'long'
});

const html = template
  .replace('{{date}}', dateStr)
  .replace('{{totalCount}}', newsData.length)
  .replace('{{categories}}', categoriesHTML)
  .replace('{{year}}', today.getFullYear());

// 输出
writeFileSync(join(rootDir, 'output', 'index.html'), html, 'utf-8');
console.log('✅ 日报生成完成：output/index.html');
console.log(`📊 总计 ${newsData.length} 条资讯，分为 ${Object.keys(grouped).length} 个类别`);
