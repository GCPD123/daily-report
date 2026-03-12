#!/usr/bin/env node
/**
 * translate.mjs
 * 批量翻译新闻内容（标题 + 摘要）
 */

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

/**
 * 调用 OpenClaw agent 进行翻译
 */
function translateBatch(texts) {
  const prompt = `你是一个专业的新闻翻译助手。请将以下英文新闻翻译成流畅的中文。

需要翻译的内容（JSON 格式）：
${JSON.stringify(texts, null, 2)}

返回要求：
1. 只返回 JSON 数组，不要其他内容
2. 保持原有顺序
3. 格式：[{"title": "中文标题", "snippet": "中文摘要"}, ...]

开始翻译：`;

  try {
    const result = execSync(`openclaw agent --message "${prompt.replace(/"/g, '\\"')}" 2>/dev/null`, {
      encoding: 'utf-8',
      timeout: 60000,
      maxBuffer: 10 * 1024 * 1024
    });
    
    // 尝试解析 JSON
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        return null;
      }
    }
    return null;
  } catch (error) {
    console.error('翻译调用失败:', error.message);
    return null;
  }
}

/**
 * 批量翻译
 */
async function batchTranslate(items, batchSize = 5) {
  const needsTranslation = items.filter(item => item.needsTranslation);
  const alreadyTranslated = items.filter(item => !item.needsTranslation);
  
  console.log(`🌐 需要翻译 ${needsTranslation.length} 条内容...`);
  
  if (needsTranslation.length === 0) {
    return alreadyTranslated;
  }
  
  // 分批处理
  const batches = [];
  for (let i = 0; i < needsTranslation.length; i += batchSize) {
    batches.push(needsTranslation.slice(i, i + batchSize));
  }
  
  let allTranslated = [];
  
  for (let i = 0; i < batches.length; i++) {
    console.log(`  翻译批次 ${i + 1}/${batches.length} (${batchSize}条)...`);
    const batch = batches[i];
    
    // 准备翻译内容
    const textsToTranslate = batch.map(item => ({
      title: item.originalTitle.substring(0, 100),
      snippet: item.originalSnippet.substring(0, 200)
    }));
    
    const translated = translateBatch(textsToTranslate);
    
    // 合并结果
    batch.forEach((item, idx) => {
      if (translated && translated[idx]) {
        item.translatedTitle = translated[idx].title || item.originalTitle;
        item.translatedSnippet = translated[idx].snippet || item.originalSnippet;
        item.isTranslated = true;
      } else {
        item.translatedTitle = item.originalTitle;
        item.translatedSnippet = item.originalSnippet;
        item.isTranslated = false;
      }
      allTranslated.push(item);
    });
    
    // 避免请求过快
    if (i < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  return [...alreadyTranslated, ...allTranslated];
}

/**
 * 主函数
 */
async function main() {
  const inputPath = join(rootDir, 'output', 'news-data.json');
  const outputPath = join(rootDir, 'output', 'news-data.json');
  
  console.log('📖 读取新闻数据...');
  const newsData = JSON.parse(readFileSync(inputPath, 'utf-8'));
  
  console.log('🔄 开始翻译...');
  const startTime = Date.now();
  const translatedData = await batchTranslate(newsData);
  const duration = Math.round((Date.now() - startTime) / 1000);
  
  console.log('💾 保存翻译结果...');
  writeFileSync(outputPath, JSON.stringify(translatedData, null, 2), 'utf-8');
  
  const translatedCount = translatedData.filter(i => i.isTranslated).length;
  console.log(`✅ 翻译完成：${translatedCount}/${translatedData.length} 条（耗时 ${duration}秒）`);
  
  return translatedData;
}

main().catch(console.error);
