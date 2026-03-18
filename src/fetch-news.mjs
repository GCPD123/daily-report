#!/usr/bin/env node
/**
 * fetch-news.mjs
 * 搜索美女图片，按风格分类
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// 读取配置
const config = JSON.parse(readFileSync(join(rootDir, 'config.json'), 'utf-8'));

/**
 * 使用 Tavily 搜索图片
 */
async function searchWithTavily(query) {
  try {
    const cmd = `node ${rootDir}/../skills/tavily-search/scripts/search.mjs "${query}" --topic general -n ${config.maxResults}`;
    const output = execSync(cmd, { 
      encoding: 'utf-8', 
      env: { ...process.env, TAVILY_API_KEY: process.env.TAVILY_API_KEY || '' },
      maxBuffer: 10 * 1024 * 1024
    });
    return parseTavilyOutput(output);
  } catch (error) {
    console.error(`搜索失败 "${query}":`, error.message);
    return [];
  }
}

/**
 * 解析 Tavily 的 markdown 输出，提取图片
 */
function parseTavilyOutput(markdown) {
  const items = [];
  const lines = markdown.split('\n');
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    
    // 匹配源行：- **标题** (relevance: XX%)
    const sourceMatch = line.match(/^-\s+\*\*(.+?)\*\*\s+\(relevance:\s+(\d+)%\)/);
    if (sourceMatch) {
      const title = sourceMatch[1].trim();
      const relevance = sourceMatch[2];
      
      // 下一行是 URL
      const url = lines[i + 1]?.trim() || '';
      
      // 再下一行是摘要
      const snippetLine = lines[i + 2] || '';
      const snippetMatch = snippetLine.match(/^_(.+?)_/);
      const snippet = snippetMatch ? snippetMatch[1].trim() : snippetLine.trim();
      
      if (url && url.startsWith('http')) {
        // 尝试从 URL 提取图片
        const image = extractImageFromUrl(url);
        
        items.push({
          title,
          relevance,
          url,
          snippet: snippet.substring(0, 150),
          image
        });
      }
      
      i += 3;
    } else {
      i++;
    }
  }
  
  return items;
}

/**
 * 从 URL 提取可能的封面图
 */
function extractImageFromUrl(url) {
  // 尝试从 URL 推断图片地址
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  
  // 如果 URL 本身包含图片扩展名
  if (imageExtensions.some(ext => url.toLowerCase().includes(ext))) {
    return { url };
  }
  
  // 常见图片网站的 URL 转换
  if (url.includes('unsplash.com/photos/')) {
    const photoId = url.split('/photos/')[1]?.split('?')[0];
    if (photoId) {
      return { url: `https://images.unsplash.com/photo-${photoId}?w=800&h=600&fit=crop` };
    }
  }
  
  if (url.includes('pinterest.com/pin/')) {
    // Pinterest 图片需要后续处理
    return { url: null, needsFetch: true };
  }
  
  // 返回 null 表示需要后续抓取
  return null;
}

/**
 * 去重（基于 URL）
 */
function deduplicateItems(items) {
  const seen = new Set();
  return items.filter(item => {
    if (!item.url) return false;
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

/**
 * 主函数
 */
async function main() {
  console.log('🔍 开始搜索图片...');
  console.log('关键词:', config.keywords);

  // 1. 顺序搜索所有关键词
  let allItems = [];
  for (const keyword of config.keywords) {
    console.log(`  搜索：${keyword}`);
    const results = await searchWithTavily(keyword);
    console.log(`    找到 ${results.length} 条`);
    allItems = allItems.concat(results);
  }
  
  console.log(`📰 搜索到 ${allItems.length} 条结果`);

  // 2. 去重
  allItems = deduplicateItems(allItems);
  console.log(`✅ 去重后 ${allItems.length} 条`);

  // 3. 简单分类（基于标题关键词）
  const categoryKeywords = {
    '🩰 丝袜美腿': ['stockings', 'tights', 'pantyhose', 'legs', '丝袜', '美腿', '黑丝', '白丝'],
    '👗 优雅气质': ['elegant', 'graceful', 'sophisticated', 'classy', '优雅', '气质', '淑女'],
    '🏙️ 街拍时尚': ['street style', 'street fashion', 'urban', 'casual', '街拍', '时尚', '穿搭'],
    '📸 写真摄影': ['portrait', 'photoshoot', 'studio', 'professional', '写真', '摄影', '肖像'],
  };

  allItems = allItems.map(item => {
    const text = (item.title + ' ' + item.snippet).toLowerCase();
    
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(kw => text.includes(kw.toLowerCase()))) {
        return { ...item, category };
      }
    }
    
    // 默认归类到日常穿搭
    return { ...item, category: '☕ 日常穿搭' };
  });

  // 4. 保存结果
  const outputPath = join(rootDir, 'output', 'news-data.json');
  writeFileSync(outputPath, JSON.stringify(allItems, null, 2), 'utf-8');
  console.log(`💾 结果保存到 ${outputPath}`);

  // 5. 输出分类统计
  const categoryStats = {};
  allItems.forEach(item => {
    categoryStats[item.category] = (categoryStats[item.category] || 0) + 1;
  });
  console.log('📊 分类统计:', categoryStats);

  return allItems;
}

main().catch(console.error);
