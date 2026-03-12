#!/usr/bin/env node
/**
 * generate-report.mjs
 * YouTube 风格日报生成
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const newsData = JSON.parse(readFileSync(join(rootDir, 'output', 'news-data.json'), 'utf-8'));
const template = readFileSync(join(rootDir, 'src', 'template.html'), 'utf-8');

// 按分类分组
const grouped = {};
newsData.forEach(item => {
  const cat = item.category || '其他';
  if (!grouped[cat]) grouped[cat] = [];
  grouped[cat].push(item);
});

// 分类排序
const categoryOrder = ['AI 技术突破', '产品发布', '行业动态', '研究论文', '其他'];
const sortedCategories = Object.entries(grouped).sort((a, b) => {
  const idxA = categoryOrder.indexOf(a[0]);
  const idxB = categoryOrder.indexOf(b[0]);
  return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
});

const categoryIcons = {
  'AI 技术突破': '🚀',
  '行业动态': '📈',
  '产品发布': '🎉',
  '研究论文': '📄',
  '其他': '📌'
};

const MAX_PER_CATEGORY = 20; // YouTube 风格：显示更多内容

// 生成缩略图（使用新闻来源的 favicon 或渐变）
function generateThumbnail(item, index) {
  // 使用 determinstic 渐变颜色（基于 URL hash）
  const colors = [
    ['1a1a2e', '16213e'],
    ['2d132c', '801336'],
    ['1b4332', '081c15'],
    ['3d0000', '5c0000'],
    ['0c2461', '0a3d91'],
    ['4a044e', '870a4d'],
  ];
  
  const colorIndex = index % colors.length;
  const [color1, color2] = colors[colorIndex];
  
  const placeholder = `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="320" height="180">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#${color1}"/>
          <stop offset="100%" style="stop-color:#${color2}"/>
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill="url(#g)"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" 
            font-size="48" fill="white" opacity="0.5">📰</text>
    </svg>
  `)}`;
  
  return placeholder;
}

function generateNewsCard(item, index) {
  const title = item.translatedTitle || item.originalTitle || item.title || '无标题';
  const snippet = item.translatedSnippet || item.snippet || '';
  const url = item.url;
  const source = item.source || 'Unknown';
  
  const thumbnail = generateThumbnail(item, index);
  const translateBadge = (item.needsTranslation && item.isTranslated) 
    ? `<span class="translated-badge">译</span>` 
    : '';
  
  // 提取域名
  let domain = '';
  try {
    domain = new URL(url).hostname.replace('www.', '');
  } catch {
    domain = source;
  }
  
  return `
    <article class="news-card">
      <div class="news-thumbnail">
        <img src="${thumbnail}" alt="" loading="lazy" />
      </div>
      <div class="news-content">
        <h3 class="news-title">
          <a href="${url}" target="_blank" rel="noopener">${title}</a>
          ${translateBadge}
        </h3>
        <p class="news-snippet">${snippet.substring(0, 120)}${snippet.length > 120 ? '...' : ''}</p>
        <div class="news-meta">
          <span class="news-source">${source}</span>
          <a class="news-url" href="${url}" target="_blank" rel="noopener">${domain}</a>
        </div>
      </div>
    </article>
  `;
}

function generateCategoryHTML(category, items, isFeatured = false) {
  const icon = categoryIcons[category] || '📌';
  const displayItems = items.slice(0, MAX_PER_CATEGORY);
  const extraCount = items.length - MAX_PER_CATEGORY;
  
  const itemsHTML = displayItems.map((item, idx) => generateNewsCard(item, idx)).join('\n');
  const countDisplay = extraCount > 0 
    ? `${Math.min(items.length, MAX_PER_CATEGORY)}条 +${extraCount}条`
    : `${items.length}条`;

  return `
    <section class="category-section${isFeatured ? ' featured' : ''}">
      <div class="category-header">
        <span class="category-icon">${icon}</span>
        <h2 class="category-title">${category}</h2>
        <span class="category-count">${countDisplay}</span>
      </div>
      <div class="news-grid">
        ${itemsHTML}
      </div>
    </section>
  `;
}

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

let html = template;
html = html.replace(/{{date}}/g, dateStr);
html = html.replace(/{{totalCount}}/g, String(newsData.length));
html = html.replace(/{{categoryCount}}/g, String(Object.keys(grouped).length));
html = html.replace(/{{translatedCount}}/g, String(translatedCount));
html = html.replace(/{{categories}}/g, categoriesHTML);
html = html.replace(/{{year}}/g, String(today.getFullYear()));

writeFileSync(join(rootDir, 'output', 'index.html'), html, 'utf-8');
console.log('✅ 日报生成完成：output/index.html');
console.log(`📊 总计 ${newsData.length} 条资讯，分为 ${Object.keys(grouped).length} 个类别`);
console.log(`🌐 已翻译 ${translatedCount} 条`);
