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
 * 使用 Tavily 搜索新闻
 */
async function searchWithTavily(query) {
  try {
    const cmd = `node ${rootDir}/../skills/tavily-search/scripts/search.mjs "${query}" --topic news -n ${config.maxResults}`;
    const output = execSync(cmd, { encoding: 'utf-8', env: { ...process.env, TAVILY_API_KEY: process.env.TAVILY_API_KEY || '' } });
    return JSON.parse(output);
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
 * 批量翻译内容（调用 LLM）
 */
async function translateContent(items) {
  const nonChineseItems = items.filter(item => !isChinese(item.title) || !isChinese(item.snippet || ''));
  
  if (nonChineseItems.length === 0) {
    return items;
  }

  // 构建翻译请求
  const translatePrompt = `请将以下内容翻译成中文，保持 JSON 格式。只返回翻译后的 JSON 数组，不要其他内容。

需要翻译的内容：
${JSON.stringify(nonChineseItems.map(item => ({
  title: item.title,
  snippet: item.snippet || '',
  url: item.url
})), null, 2)}

返回格式示例：
[
  {"title": "翻译后的标题", "snippet": "翻译后的摘要", "url": "原始 URL"}
]`;

  // 这里调用 LLM API（简化版，实际需要用 sessions_spawn 或直接 API 调用）
  console.log(`需要翻译 ${nonChineseItems.length} 条内容...`);
  
  // 临时方案：标记需要翻译的内容，后续由 AI 处理
  return items.map(item => ({
    ...item,
    needsTranslation: !isChinese(item.title)
  }));
}

/**
 * AI 分类内容
 */
async function categorizeItems(items) {
  // 简单规则分类（后续可用 AI 智能分类）
  const categoryKeywords = {
    'AI 技术突破': ['breakthrough', 'new model', 'architecture', 'algorithm', '技术突破', '新模型'],
    '行业动态': ['industry', 'market', 'company', 'funding', '行业', '市场', '融资'],
    '产品发布': ['launch', 'release', 'product', 'update', '发布', '新产品'],
    '研究论文': ['paper', 'research', 'study', 'arxiv', '论文', '研究'],
  };

  return items.map(item => {
    const text = (item.title + ' ' + (item.snippet || '')).toLowerCase();
    
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(kw => text.includes(kw.toLowerCase()))) {
        return { ...item, category };
      }
    }
    
    return { ...item, category: '其他' };
  });
}

/**
 * 去重（基于 URL 和标题相似度）
 */
function deduplicateItems(items) {
  const seen = new Set();
  return items.filter(item => {
    const key = item.url || item.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * 主函数
 */
async function main() {
  console.log('🔍 开始搜索新闻...');
  console.log('关键词:', config.keywords);

  // 1. 并发搜索所有关键词
  const searchPromises = config.keywords.map(keyword => searchWithTavily(keyword));
  const results = await Promise.all(searchPromises);
  
  // 2. 合并结果
  let allItems = results.flat();
  console.log(`📰 搜索到 ${allItems.length} 条结果`);

  // 3. 去重
  allItems = deduplicateItems(allItems);
  console.log(`✅ 去重后 ${allItems.length} 条`);

  // 4. 翻译非中文内容
  allItems = await translateContent(allItems);

  // 5. 分类
  allItems = await categorizeItems(allItems);

  // 6. 保存结果
  const outputPath = join(rootDir, 'output', 'news-data.json');
  writeFileSync(outputPath, JSON.stringify(allItems, null, 2), 'utf-8');
  console.log(`💾 结果保存到 ${outputPath}`);

  // 7. 输出分类统计
  const categoryStats = {};
  allItems.forEach(item => {
    categoryStats[item.category] = (categoryStats[item.category] || 0) + 1;
  });
  console.log('📊 分类统计:', categoryStats);

  return allItems;
}

main().catch(console.error);
