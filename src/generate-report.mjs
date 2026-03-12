#!/usr/bin/env node
/**
 * generate-report.mjs
 * 根据抓取的数据生成 HTML 日报 - 精简优化版
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

// 分类排序（重要的在前）
const categoryOrder = ['AI 技术突破', '产品发布', '行业动态', '研究论文', '其他'];
const sortedCategories = Object.entries(grouped).sort((a, b) => {
  const idxA = categoryOrder.indexOf(a[0]);
  const idxB = categoryOrder.indexOf(b[0]);
  return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
});

// 分类图标映射
const categoryIcons = {
  'AI 技术突破': '🚀',
  '行业动态': '📈',
  '产品发布': '🎉',
  '研究论文': '📄',
  '其他': '📌'
};

// 每个分类最多显示 8 条
const MAX_PER_CATEGORY = 8;

// 生成分类 HTML
function generateCategoryHTML(category, items, isTop = false) {
  const icon = categoryIcons[category] || '📌';
  const displayItems = items.slice(0, MAX_PER_CATEGORY);
  const extraCount = items.length - MAX_PER_CATEGORY;
  
  const itemsHTML = displayItems.map(item => `
    <div class="news-item">
      <div class="news-title">
        <a href="${item.url}" target="_blank" rel="noopener">${item.title}</a>
        ${item.needsTranslation ? '<span class="translated-badge">译</span>' : ''}
      </div>
      <div class="news-snippet">${item.snippet || '暂无摘要'}</div>
      <div class="news-meta">
        <span class="news-source">${item.source}</span>
      </div>
    </div>
  `).join('');

  const extraText = extraCount > 0 ? ` +${extraCount}条` : '';
  const countDisplay = `${Math.min(items.length, MAX_PER_CATEGORY)}条${extraText}`;

  return `
    <div class="category${isTop ? ' top-news' : ''}">
      <div class="category-header">
        <span class="category-icon">${icon}</span>
        <h2 class="category-title">${category}</h2>
        <span class="category-count">${countDisplay}</span>
      </div>
      ${itemsHTML}
    </div>
  `;
}

// 生成所有分类
const categoriesHTML = sortedCategories
  .map(([cat, items], idx) => generateCategoryHTML(cat, items, idx === 0))
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
  .replace('{{categoryCount}}', Object.keys(grouped).length)
  .replace('{{categories}}', categoriesHTML)
  .replace('{{year}}', today.getFullYear());

// 输出
writeFileSync(join(rootDir, 'output', 'index.html'), html, 'utf-8');
console.log('✅ 日报生成完成：output/index.html');
console.log(`📊 总计 ${newsData.length} 条资讯，分为 ${Object.keys(grouped).length} 个类别`);
