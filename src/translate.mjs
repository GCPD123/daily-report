#!/usr/bin/env node
/**
 * translate.mjs
 * 使用 DashScope API 批量翻译新闻内容
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// 从环境变量获取 API Key（与当前会话使用的模型相同）
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || process.env.DASHSCOPE_API_KEY_US;

/**
 * 调用 DashScope API 翻译
 */
function callDashScope(prompt) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      model: 'qwen-turbo',
      input: {
        messages: [
          {
            role: 'system',
            content: '你是一个专业的翻译助手，擅长将英文新闻翻译成流畅的中文。只返回翻译结果，不要解释。'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      }
    });

    const options = {
      hostname: 'dashscope.aliyuncs.com',
      port: 443,
      path: '/compatible-mode/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result.choices?.[0]?.message?.content || '');
        } catch {
          resolve('');
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * 批量翻译（分批处理）
 */
async function batchTranslate(items, batchSize = 5) {
  const needsTranslation = items.filter(item => item.needsTranslation);
  const alreadyTranslated = items.filter(item => !item.needsTranslation);
  
  console.log(`🌐 需要翻译 ${needsTranslation.length} 条内容...`);
  
  // 分批翻译
  const batches = [];
  for (let i = 0; i < needsTranslation.length; i += batchSize) {
    batches.push(needsTranslation.slice(i, i + batchSize));
  }
  
  let allTranslated = [];
  for (let i = 0; i < batches.length; i++) {
    console.log(`  翻译批次 ${i + 1}/${batches.length}...`);
    const batch = batches[i];
    
    // 构建翻译请求
    const textsToTranslate = batch.map((item, idx) => 
      `${idx + 1}. 标题：${item.originalTitle}\n   摘要：${item.originalSnippet.substring(0, 150)}`
    ).join('\n\n');
    
    const prompt = `请将以下新闻翻译成中文，保持编号格式：

${textsToTranslate}

返回格式：
1. 标题：[中文标题]
   摘要：[中文摘要]
2. ...`;

    try {
      const result = await callDashScope(prompt);
      
      // 解析结果
      const lines = result.split('\n');
      let currentIdx = -1;
      
      lines.forEach(line => {
        const idxMatch = line.match(/^(\d+)\./);
        if (idxMatch) {
          currentIdx = parseInt(idxMatch[1]) - 1;
        } else if (currentIdx >= 0 && currentIdx < batch.length) {
          const titleMatch = line.match(/标题：(.+)/);
          const snippetMatch = line.match(/摘要：(.+)/);
          
          if (titleMatch) {
            batch[currentIdx].translatedTitle = titleMatch[1].trim();
          }
          if (snippetMatch) {
            batch[currentIdx].translatedSnippet = snippetMatch[1].trim();
          }
        }
      });
      
      // 确保每条都有翻译
      batch.forEach(item => {
        item.translatedTitle = item.translatedTitle || item.originalTitle;
        item.translatedSnippet = item.translatedSnippet || item.originalSnippet;
        item.isTranslated = true;
        allTranslated.push(item);
      });
      
    } catch (error) {
      console.error(`批次 ${i + 1} 翻译失败:`, error.message);
      // 失败时使用原文
      batch.forEach(item => {
        item.translatedTitle = item.originalTitle;
        item.translatedSnippet = item.originalSnippet;
        item.isTranslated = false;
        allTranslated.push(item);
      });
    }
    
    // 避免请求过快
    if (i < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }
  
  // 合并已翻译和不需要翻译的
  return [...alreadyTranslated, ...allTranslated];
}

/**
 * 主函数
 */
async function main() {
  if (!DASHSCOPE_API_KEY) {
    console.error('❌ 缺少 DASHSCOPE_API_KEY 环境变量');
    process.exit(1);
  }
  
  const inputPath = join(rootDir, 'output', 'news-data.json');
  const outputPath = join(rootDir, 'output', 'news-data.json');
  
  console.log('📖 读取新闻数据...');
  const newsData = JSON.parse(readFileSync(inputPath, 'utf-8'));
  
  console.log('🔄 开始翻译...');
  const translatedData = await batchTranslate(newsData);
  
  console.log('💾 保存翻译结果...');
  writeFileSync(outputPath, JSON.stringify(translatedData, null, 2), 'utf-8');
  
  const translatedCount = translatedData.filter(i => i.isTranslated).length;
  console.log(`✅ 翻译完成：${translatedCount}/${translatedData.length} 条`);
  
  return translatedData;
}

main().catch(console.error);
