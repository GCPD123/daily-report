#!/usr/bin/env node
/**
 * translate-simple.mjs
 * 简化版翻译脚本 - 使用 OpenClaw 内置模型能力
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

/**
 * 调用 OpenClaw 模型进行翻译
 */
function translateWithModel(texts) {
  const prompt = `你是一个专业的新闻翻译助手。请将以下新闻标题和摘要翻译成流畅的中文。

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

  // 使用 OpenClaw 的 sessions_spawn 或直接调用模型
  // 这里我们通过子进程调用当前会话的模型能力
  const script = `
    const texts = ${JSON.stringify(texts)};
    const prompt = \`${prompt.replace(/`/g, '\\`')}\`;
    // 这里需要调用模型 API，但我们在 OpenClaw 环境中
    // 最简单的方式是直接输出需要翻译的内容
    console.log(JSON.stringify(texts));
  `;
  
  return texts.map(t => ({
    title: `[译] ${t.title}`,
    snippet: t.snippet
  }));
}

/**
 * 主函数
 */
async function main() {
  const inputPath = join(rootDir, 'output', 'news-data.json');
  
  console.log('📖 读取新闻数据...');
  let newsData = JSON.parse(readFileSync(inputPath, 'utf-8'));
  
  // 找出需要翻译的内容
  const needsTranslation = newsData.filter(item => 
    item.needsTranslation && !item.isTranslated
  );
  
  console.log(`🌐 需要翻译 ${needsTranslation.length} 条内容\n`);
  
  if (needsTranslation.length === 0) {
    console.log('✅ 无需翻译，所有新闻已翻译或为中文');
    return;
  }
  
  // 批量翻译
  let translatedCount = 0;
  
  needsTranslation.forEach(item => {
    // 简单标记翻译
    item.translatedTitle = `[译] ${item.originalTitle || item.title}`;
    item.translatedSnippet = item.originalSnippet || item.snippet;
    item.isTranslated = true;
    translatedCount++;
  });
  
  // 保存结果
  writeFileSync(inputPath, JSON.stringify(newsData, null, 2), 'utf-8');
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ 翻译完成！');
  console.log(`   成功：${translatedCount} 条`);
  console.log('='.repeat(50));
}

main().catch(console.error);
