#!/usr/bin/env node
/**
 * translate.mjs - 简化版
 * 使用当前会话的模型直接翻译
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

/**
 * 使用 sessions_spawn 调用 LLM 翻译
 */
async function translateBatch(texts) {
  const prompt = `请将以下新闻标题和摘要翻译成中文。返回 JSON 数组格式：
[{"title":"翻译后的标题","snippet":"翻译后的摘要"},...]

需要翻译的内容：
${JSON.stringify(texts.slice(0, 3))}`; // 每次只翻译 3 条，避免超时

  try {
    // 使用当前会话的模型
    const result = execSync(`openclaw ask "${prompt.replace(/"/g, '\\"')}" 2>&1`, {
      encoding: 'utf-8',
      timeout: 120000,
      maxBuffer: 50 * 1024 * 1024
    });
    
    // 尝试从输出中提取 JSON
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return [];
  } catch (error) {
    console.error('翻译失败:', error.message);
    return [];
  }
}

/**
 * 主函数
 */
async function main() {
  const inputPath = join(rootDir, 'output', 'news-data.json');
  const outputPath = join(rootDir, 'output', 'news-data.json');
  
  console.log('📖 读取新闻数据...');
  let newsData = JSON.parse(readFileSync(inputPath, 'utf-8'));
  
  const needsTranslation = newsData.filter(item => item.needsTranslation);
  console.log(`🌐 需要翻译 ${needsTranslation.length} 条`);
  
  if (needsTranslation.length === 0) {
    console.log('✅ 无需翻译');
    return;
  }
  
  // 分批翻译（每批 3 条）
  const batchSize = 3;
  for (let i = 0; i < needsTranslation.length; i += batchSize) {
    const batch = needsTranslation.slice(i, i + batchSize);
    console.log(`  翻译 ${i + 1}-${Math.min(i + batchSize, needsTranslation.length)} / ${needsTranslation.length}...`);
    
    const texts = batch.map(item => ({
      title: item.originalTitle,
      snippet: item.originalSnippet.substring(0, 150)
    }));
    
    const translated = await translateBatch(texts);
    
    batch.forEach((item, idx) => {
      if (translated[idx]) {
        item.translatedTitle = translated[idx].title || item.originalTitle;
        item.translatedSnippet = translated[idx].snippet || item.originalSnippet;
        item.isTranslated = true;
      } else {
        item.translatedTitle = item.originalTitle;
        item.translatedSnippet = item.originalSnippet;
        item.isTranslated = false;
      }
    });
    
    // 每批保存一次，避免丢失进度
    writeFileSync(outputPath, JSON.stringify(newsData, null, 2), 'utf-8');
    
    // 避免请求过快
    if (i + batchSize < needsTranslation.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  const translatedCount = newsData.filter(i => i.isTranslated).length;
  console.log(`✅ 翻译完成：${translatedCount}/${newsData.length} 条`);
}

main().catch(console.error);
