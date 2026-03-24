#!/usr/bin/env node
/**
 * generate-report.mjs
 * 根据抓取的数据生成 HTML 图片日报
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// 读取数据
let imageData = JSON.parse(readFileSync(join(rootDir, 'output', 'news-data.json'), 'utf-8'));
const template = readFileSync(join(rootDir, 'src', 'template.html'), 'utf-8');

// 统计有图片的数量
const withImages = imageData.filter(item => item.image && item.image.url && item.image.url.trim() !== '');
const withoutImages = imageData.length - withImages.length;
console.log(` 图片统计：${withImages.length} 条有图片，${withoutImages} 条无图片`);

// 排序：有图片的排前面
imageData.sort((a, b) => {
  const aHasImage = a.image && a.image.url && a.image.url.trim() !== '';
  const bHasImage = b.image && b.image.url && b.image.url.trim() !== '';
  if (aHasImage && !bHasImage) return -1;
  if (!aHasImage && bHasImage) return 1;
  return 0;
});

// 按分类分组
const grouped = {};
imageData.forEach(item => {
  const cat = item.category || '☕ 日常穿搭';
  if (!grouped[cat]) grouped[cat] = [];
  grouped[cat].push(item);
});

// 分类排序（丝袜优先）
const categoryOrder = ['🩰 丝袜美腿', '👗 优雅气质', '🏙️ 街拍时尚', '📸 写真摄影', '☕ 日常穿搭'];
let sortedCategories = Object.entries(grouped).sort((a, b) => {
  const idxA = categoryOrder.indexOf(a[0]);
  const idxB = categoryOrder.indexOf(b[0]);
  return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
});

// 过滤掉没有图片的分类
sortedCategories = sortedCategories.filter(([cat, items]) => {
  return items.some(item => item.image && item.image.url && item.image.url.trim() !== '');
});

// 每个分类最多显示 8 张
const MAX_PER_CATEGORY = 8;

// 生成分类标签
function generateCategoryTabs() {
  return sortedCategories.map(([cat, items], idx) => {
    // 只统计有图片的数量
    const withImages = items.filter(item => item.image && item.image.url && item.image.url.trim() !== '');
    const displayCount = Math.min(withImages.length, MAX_PER_CATEGORY);
    return `<div class="category-tab${idx === 0 ? ' active' : ''}" data-category="${cat}">${cat} (${displayCount})</div>`;
  }).join('\n');
}

// 生成图片卡片
function generateImageCard(item, index) {
  const title = item.title || 'Beautiful Photo';
  const url = item.url;
  const hasImage = item.image && item.image.url && item.image.url.trim() !== '';
  
  // 生成占位图颜色（基于 URL 哈希）
  const colors = ['#ff6b6b', '#f06595', '#cc5de8', '#845ef7', '#5c7cfa', '#339af0', '#22b8cf', '#20c997'];
  const colorIndex = item.url.length % colors.length;
  const bgColor = colors[colorIndex];
  
  // 如果没有图片，跳过不展示
  if (!hasImage) {
    return '';
  }
  
  return `
    <div class="image-card" onclick="window.open('${url}', '_blank')">
      <div class="image-wrapper" style="background: linear-gradient(135deg, ${bgColor}22 0%, ${bgColor}44 100%);">
        <img src="${item.image.url}" alt="${title}" loading="lazy" onerror="this.style.display='none';this.parentElement.innerHTML='<span class=\\\\'image-placeholder\\\\'>📷</span>'" />
        <div class="image-overlay">
          <span class="view-icon">🔍</span>
        </div>
      </div>
      <div class="image-info">
        <div class="image-title">${title.substring(0, 60)}${title.length > 60 ? '...' : ''}</div>
        <div class="image-source">${new URL(url).hostname}</div>
      </div>
    </div>
  `;
}

// 生成分类 HTML
function generateCategoryHTML(category, items, isFirst = false) {
  // 只保留有图片的项目
  const itemsWithImages = items.filter(item => item.image && item.image.url && item.image.url.trim() !== '');
  const displayItems = itemsWithImages.slice(0, MAX_PER_CATEGORY);
  const extraCount = itemsWithImages.length - MAX_PER_CATEGORY;
  
  const cardsHTML = displayItems.map((item, idx) => generateImageCard(item, idx)).join('\n');
  
  // 如果这个分类没有图片，返回空字符串
  if (itemsWithImages.length === 0) {
    return '';
  }
  
  const countDisplay = extraCount > 0 
    ? `${Math.min(itemsWithImages.length, MAX_PER_CATEGORY)}+${extraCount}`
    : `${itemsWithImages.length}`;

  return `
    <div class="category-section" id="category-${category.replace(/[^\w\u4e00-\u9fa5]/g, '-')}" ${!isFirst ? 'style="display:none;"' : ''}>
      <div class="category-header">
        <h2 class="category-title">${category}</h2>
        <span class="category-count">${countDisplay}张</span>
      </div>
      <div class="image-grid">
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

// 使用全局替换（防止多个 {{date}} 占位符）
const html = template
  .replaceAll('{{date}}', dateStr)
  .replaceAll('{{totalCount}}', imageData.length)
  .replaceAll('{{categoryCount}}', Object.keys(grouped).length)
  .replaceAll('{{categoryTabs}}', categoryTabsHTML)
  .replaceAll('{{categories}}', categoriesHTML)
  .replaceAll('{{year}}', today.getFullYear().toString());

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
        section.style.display = section.id === 'category-' + category.replace(/[^\w\u4e00-\u9fa5]/g, '-') ? 'block' : 'none';
      });
    });
  });
</script>
`;

// 输出
writeFileSync(join(rootDir, 'output', 'index.html'), html.replace('</body>', script + '</body>'), 'utf-8');
console.log('✅ 图片日报生成完成：output/index.html');
console.log(`📊 总计 ${imageData.length} 张图片，分为 ${Object.keys(grouped).length} 个类别`);
