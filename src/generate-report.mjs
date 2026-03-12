#!/usr/bin/env node
/**
 * generate-report.mjs
 * 根据抓取的数据生成 HTML 日报 - YouTube 风格
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

// 每个分类最多显示 12 条
const MAX_PER_CATEGORY = 12;

// 生成分类标签
function generateCategoryTabs() {
  return sortedCategories.map(([cat, items], idx) => {
    const icon = categoryIcons[cat] || '📌';
    return `<div class="category-tab${idx === 0 ? ' active' : ''}" data-category="${cat}">${icon} ${cat} (${items.length})</div>`;
  }).join('\n');
}

// 生成视频卡片
function generateVideoCard(item, index) {
  const title = item.translatedTitle || item.originalTitle || item.title;
  const snippet = item.translatedSnippet || item.snippet || '';
  const url = item.url;
  const source = item.source || 'Unknown';
  const hasImage = item.image && item.image.url;
  const isTranslated = item.needsTranslation && item.isTranslated;
  
  // 生成占位图颜色（基于 URL 哈希）
  const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7'];
  const colorIndex = item.url.length % colors.length;
  const bgColor = colors[colorIndex];
  
  // 来源图标（首字母）
  const sourceIcon = source.charAt(0).toUpperCase();
  
  return `
    <div class="video-card" onclick="window.open('${url}', '_blank')">
      <div class="thumbnail" style="background: linear-gradient(135deg, ${bgColor}22 0%, ${bgColor}44 100%);">
        ${hasImage ? `<img src="${item.image.url}" alt="${title}" onerror="this.style.display='none';this.parentElement.innerHTML='<span class=\\\\'thumbnail-placeholder\\\\'>📰</span>'" />` : '<span class="thumbnail-placeholder">📰</span>'}
        ${isTranslated ? '<span class="translated-badge">译</span>' : ''}
        <span class="duration-badge">${Math.ceil(snippet.length / 50)} 分钟</span>
      </div>
      <div class="video-info">
        <div class="channel-icon">${sourceIcon}</div>
        <div class="video-details">
          <div class="video-title">
            <a href="${url}" target="_blank" rel="noopener">${title}</a>
          </div>
          <div class="channel-name">${source}</div>
          <div class="video-meta">
            ${snippet.substring(0, 80)}${snippet.length > 80 ? '...' : ''}
          </div>
        </div>
      </div>
    </div>
  `;
}

// 生成分类 HTML
function generateCategoryHTML(category, items, isFirst = false) {
  const icon = categoryIcons[category] || '📌';
  const displayItems = items.slice(0, MAX_PER_CATEGORY);
  const extraCount = items.length - MAX_PER_CATEGORY;
  
  const cardsHTML = displayItems.map((item, idx) => generateVideoCard(item, idx)).join('\n');
  
  const countDisplay = extraCount > 0 
    ? `${Math.min(items.length, MAX_PER_CATEGORY)}+${extraCount}`
    : `${items.length}`;

  return `
    <div class="category-section" id="category-${category}" ${!isFirst ? 'style="display:none;"' : ''}>
      <div class="category-header">
        <span class="category-icon">${icon}</span>
        <h2 class="category-title">${category}</h2>
        <span class="category-count">${countDisplay}条</span>
      </div>
      <div class="video-grid">
        ${cardsHTML}
      </div>
    </div>
  `;
}

// 生成所有分类
const categoriesHTML = sortedCategories
  .map(([cat, items], idx) => generateCategoryHTML(cat, items, idx === 0))
  .join('');

// 生成分类标签
const categoryTabsHTML = generateCategoryTabs();

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
  .replace('{{categoryTabs}}', categoryTabsHTML)
  .replace('{{categories}}', categoriesHTML)
  .replace('{{year}}', today.getFullYear());

// 添加分类切换脚本
const script = `
<script>
  // 分类标签切换
  document.querySelectorAll('.category-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const category = tab.getAttribute('data-category');
      
      // 更新标签状态
      document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // 显示对应分类
      document.querySelectorAll('.category-section').forEach(section => {
        section.style.display = section.id === 'category-' + category ? 'block' : 'none';
      });
    });
  });
</script>
`;

// 输出
writeFileSync(join(rootDir, 'output', 'index.html'), html.replace('</body>', script + '</body>'), 'utf-8');
console.log('✅ 日报生成完成：output/index.html');
console.log(`📊 总计 ${newsData.length} 条资讯，分为 ${Object.keys(grouped).length} 个类别`);
console.log(`🌐 已翻译 ${translatedCount} 条`);
