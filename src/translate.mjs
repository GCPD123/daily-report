#!/usr/bin/env node
/**
 * translate.mjs
 * 批量翻译新闻内容 - DashScope 直连版
 * 使用阿里云 DashScope API + 文件缓存
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// 缓存文件路径
const CACHE_FILE = join(rootDir, 'output', '.translation-cache.json');

// DashScope API Key（从环境变量获取）
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET;

/**
 * 加载翻译缓存
 */
function loadCache() {
  if (existsSync(CACHE_FILE)) {
    try {
      return JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
    } catch {
      return {};
    }
  }
  return {};
}

/**
 * 保存翻译缓存
 */
function saveCache(cache) {
  writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
}

/**
 * 调用 DashScope API 翻译
 */
function callDashScope(messages) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: 'qwen-turbo',
      input: { messages },
      parameters: { result_format: 'message' }
    });

    const options = {
      hostname: 'dashscope.aliyuncs.com',
      port: 443,
      path: '/compatible-mode/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let result = '';
      res.on('data', chunk => result += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(result);
          resolve(parsed.choices?.[0]?.message?.content || '');
        } catch {
          resolve('');
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

/**
 * 批量翻译
 */
async function translateBatch(texts) {
  const prompt = `你是一个专业的新闻翻译助手。请将以下新闻翻译成流畅的中文。

要求：
1. 保持 JSON 格式返回
2. 只返回翻译结果数组，不要其他内容
3. 标题要简洁有力，摘要要通顺自然

需要翻译的内容：
${JSON.stringify(texts, null, 2)}

返回格式示例：
[
  {"title": "翻译后的标题", "snippet": "翻译后的摘要"},
  ...
]`;

  const messages = [
    { role: 'system', content: '你是一个专业的新闻翻译助手，擅长将英文新闻翻译成流畅的中文。' },
    { role: 'user', content: prompt }
  ];

  try {
    const result = await callDashScope(messages);
    
    // 提取 JSON
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return null;
  } catch (error) {
    console.error('API 调用失败:', error.message);
    return null;
  }
}

/**
 * 主函数
 */
async function main() {
  if (!DASHSCOPE_API_KEY) {
    console.error('❌ 缺少 DASHSCOPE_API_KEY 环境变量');
    console.error('请设置：export DASHSCOPE_API_KEY=your_api_key_here');
    console.error('或者在阿里云控制台获取：https://dashscope.console.aliyun.com/');
    process.exit(1);
  }

  const inputPath = join(rootDir, 'output', 'news-data.json');
  const outputPath = join(rootDir, 'output', 'news-data.json');
  
  console.log('📖 读取新闻数据...');
  let newsData = JSON.parse(readFileSync(inputPath, 'utf-8'));
  
  // 加载缓存
  console.log('💾 加载翻译缓存...');
  const cache = loadCache();
  console.log(`   缓存中有 ${Object.keys(cache).length} 条翻译`);
  
  // 找出需要翻译的内容
  const needsTranslation = newsData.filter(item => 
    item.needsTranslation && !item.isTranslated
  );
  
  console.log(`🌐 需要翻译 ${needsTranslation.length} 条内容\n`);
  
  if (needsTranslation.length === 0) {
    console.log('✅ 无需翻译，所有新闻已翻译或为中文');
    return;
  }
  
  // 批量翻译（每批 10 条）
  const batchSize = 10;
  let translatedCount = 0;
  let failedCount = 0;
  
  for (let i = 0; i < needsTranslation.length; i += batchSize) {
    const batch = needsTranslation.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(needsTranslation.length / batchSize);
    
    console.log(`🔄 翻译批次 ${batchNum}/${totalBatches} (${batch.length}条)...`);
    
    // 准备翻译内容
    const textsToTranslate = batch.map(item => ({
      url: item.url,
      title: item.originalTitle || item.title,
      snippet: (item.originalSnippet || item.snippet || '').substring(0, 200)
    }));
    
    // 调用翻译 API
    const translated = await translateBatch(textsToTranslate);
    
    if (translated && Array.isArray(translated)) {
      // 更新翻译结果
      batch.forEach((item, idx) => {
        if (translated[idx]) {
          item.translatedTitle = translated[idx].title || item.originalTitle || item.title;
          item.translatedSnippet = translated[idx].snippet || item.originalSnippet || item.snippet;
          item.isTranslated = true;
          translatedCount++;
          
          // 更新缓存
          cache[item.url] = {
            title: item.translatedTitle,
            snippet: item.translatedSnippet,
            translatedAt: new Date().toISOString()
          };
        } else {
          failedCount++;
        }
      });
      
      console.log(`   ✅ 成功 ${Math.min(batch.length, translated.length)} 条`);
    } else {
      console.log(`   ❌ 批次失败，使用原文`);
      failedCount += batch.length;
    }
    
    // 保存进度
    writeFileSync(outputPath, JSON.stringify(newsData, null, 2), 'utf-8');
    saveCache(cache);
    
    // 间隔 1 秒避免请求过快
    if (i + batchSize < needsTranslation.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ 翻译完成！');
  console.log(`   成功：${translatedCount} 条`);
  console.log(`   失败：${failedCount} 条`);
  console.log(`   缓存：${Object.keys(cache).length} 条`);
  console.log('='.repeat(50));
}

main().catch(console.error);
