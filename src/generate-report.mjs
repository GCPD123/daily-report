#!/usr/bin/env node
/**
 * generate-report.mjs
 * 根据抓取的数据生成 HTML 日报 - 响应式 + 翻译版本
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

// 每个分类最多显示 10 条（桌面端 2 列，移动端 1 列）
const MAX_PER_CATEGORY = 10;

// 生成新闻卡片 HTML
function generateNewsCard(item) {
  // 使用翻译后的内容（如果有）
  const title = item.translatedTitle || item.originalTitle || item.title;
  const snippet = item.translatedSnippet || item.snippet;
  const url = item.url;
  const source = item.source || 'Unknown';
  const hasImage = item.image && item.image.url;
  
  // 图片区域
  const imageHTML = hasImage 
    ? `<img class="news-image" src="${item.image.url}" alt="${title}" onerror="this.parentElement.innerHTML='<div class=\\'news-image-placeholder\\'>📰</div>'" />`
    : `<div class="news-image-placeholder">📰</div>`;
  
  // 翻译标记
  const translateBadge = (item.needsTranslation && item.isTranslated) 
    ? `<span class="translated-badge">译</span>` 
    : '';
  
  return `
    <div class="news-card">
      ${imageHTML}
      <div class="news-content">
        <div class="news-title">
          <a href="${url}" target="_blank" rel="noopener">${title}</a>
          ${translateBadge}
        </div>
        <div class="news-snippet">${snippet}</div>
        <div class="news-meta">
          <span class="news-source">${source}</span>
        </div>
      </div>
    </div>
  `;
}

// 生成分类 HTML
function generateCategoryHTML(category, items, isTop = false) {
  const icon = categoryIcons[category] || '📌';
  const displayItems = items.slice(0, MAX_PER_CATEGORY);
  const extraCount = items.length - MAX_PER_CATEGORY;
  
  const itemsHTML = displayItems.map(item => generateNewsCard(item)).join('\n');
  
  const countDisplay = extraCount > 0 
    ? `${Math.min(items.length, MAX_PER_CATEGORY)}条 +${extraCount}条`
    : `${items.length}条`;

  return `
    <div class="category${isTop ? ' top-news' : ''}">
      <div class="category-header">
        <span class="category-icon">${icon}</span>
        <h2 class="category-title">${category}</h2>
        <span class="category-count">${countDisplay}</span>
      </div>
      <div class="news-grid">
        ${itemsHTML}
      </div>
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

const translatedCount = newsData.filter(i => i.isTranslated || !i.needsTranslation).length;

const html = template
  .replace('{{date}}', dateStr)
  .replace('{{totalCount}}', newsData.length)
  .replace('{{categoryCount}}', Object.keys(grouped).length)
  .replace('{{translatedCount}}', translatedCount)
  .replace('{{categories}}', categoriesHTML)
  .replace('{{year}}', today.getFullYear());

// 输出
writeFileSync(join(rootDir, 'output', 'index.html'), html, 'utf-8');
console.log('✅ 日报生成完成：output/index.html');
console.log(`📊 总计 ${newsData.length} 条资讯，分为 ${Object.keys(grouped).length} 个类别`);
console.log(`🌐 已翻译 ${translatedCount} 条`);
