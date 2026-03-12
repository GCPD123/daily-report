#!/usr/bin/env node
/**
 * fetch-news.mjs
 * 使用 Tavily 搜索新闻，翻译非中文内容，按主题分类
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
 * 解析 Tavily 的 markdown 输出
 */
function parseTavilyOutput(markdown) {
  const sources = [];
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
      
      // 再下一行是摘要（以 _ 开头）
      const snippetLine = lines[i + 2] || '';
      const snippetMatch = snippetLine.match(/^_(.+?)_/);
      const snippet = snippetMatch ? snippetMatch[1].trim() : snippetLine.trim();
      
      if (url && url.startsWith('http')) {
        sources.push({
          title,
          relevance,
          url,
          snippet: snippet.substring(0, 300)
        });
      }
      
      i += 3;
    } else {
      i++;
    }
  }
  
  return sources;
}

/**
 * 使用 Tavily 搜索新闻
 */
async function searchWithTavily(query) {
  try {
    const cmd = `node ${rootDir}/../skills/tavily-search/scripts/search.mjs "${query}" --topic news -n ${config.maxResults}`;
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
 * 检测是否为中文
 */
function isChinese(text) {
  const chineseRegex = /[\u4e00-\u9fa5]/;
  return chineseRegex.test(text);
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
  console.log('🔍 开始搜索新闻...');
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

  // 3. 标记需要翻译的内容，提取来源
  allItems = allItems.map(item => {
    // 从标题提取来源（最后一个 - 后面的部分）
    const parts = item.title.split(' - ');
    const source = parts.length > 1 ? parts[parts.length - 1] : 'Unknown';
    const cleanTitle = parts.length > 1 ? parts.slice(0, -1).join(' - ') : item.title;
    
    return {
      ...item,
      title: cleanTitle,
      source,
      needsTranslation: !isChinese(cleanTitle)
    };
  });

  // 4. 简单分类（基于标题关键词）
  const categoryKeywords = {
    'AI 技术突破': ['breakthrough', 'new model', 'architecture', 'algorithm', 'advancement', '技术突破', '新模型'],
    '行业动态': ['industry', 'market', 'company', 'funding', 'investment', '行业', '市场', '融资'],
    '产品发布': ['launch', 'release', 'product', 'update', '发布', '新产品'],
    '研究论文': ['paper', 'research', 'study', 'arxiv', '论文', '研究'],
  };

  allItems = allItems.map(item => {
    const text = (item.title + ' ' + item.snippet).toLowerCase();
    
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(kw => text.includes(kw.toLowerCase()))) {
        return { ...item, category };
      }
    }
    
    return { ...item, category: '其他' };
  });

  // 5. 保存结果
  const outputPath = join(rootDir, 'output', 'news-data.json');
  writeFileSync(outputPath, JSON.stringify(allItems, null, 2), 'utf-8');
  console.log(`💾 结果保存到 ${outputPath}`);

  // 6. 输出分类统计
  const categoryStats = {};
  allItems.forEach(item => {
    categoryStats[item.category] = (categoryStats[item.category] || 0) + 1;
  });
  console.log('📊 分类统计:', categoryStats);

  return allItems;
}

main().catch(console.error);
