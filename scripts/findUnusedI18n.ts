import fs from 'fs';
import path from 'path';

// 配置
const localesDir = './src/locales/language';
const srcDir = './src';

// 递归获取文件
function getFiles(dir: string, extensions: string[]): string[] {
  const files: string[] = [];

  function walk(currentDir: string): void {
    const items = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(currentDir, item.name);

      if (item.isDirectory()) {
        if (!['node_modules', 'dist', '.git', 'locales'].includes(item.name)) {
          walk(fullPath);
        }
      } else if (item.isFile()) {
        const ext = path.extname(item.name);
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }

  walk(dir);
  return files;
}

// 获取所有 i18n key
function getAllI18nKeys(): Set<string> {
  const keys = new Set<string>();
  const files = getFiles(localesDir, ['.json']);

  files.forEach(file => {
    const content = JSON.parse(fs.readFileSync(file, 'utf-8'));
    extractKeys(content, '', keys);
  });

  return keys;
}

function extractKeys(obj: Record<string, unknown>, prefix: string, keys: Set<string>): void {
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      extractKeys(obj[key] as Record<string, unknown>, fullKey, keys);
    } else {
      keys.add(fullKey);
    }
  }
}

// 判断字符串是否像 i18n key
function looksLikeI18nKey(str: string): boolean {
  if (!str.includes('.')) return false;
  if (str.startsWith('http')) return false;
  if (str.includes('/')) return false;
  if (str.includes(' ')) return false;
  if (/^\d/.test(str)) return false;
  if (str.includes('@')) return false;
  return /^[a-zA-Z][a-zA-Z0-9]*(\.[a-zA-Z][a-zA-Z0-9]*)+$/.test(str);
}

// 扫描源码中使用的 key
function getUsedKeys(allKeys: Set<string>): Set<string> {
  const used = new Set<string>();
  const files = getFiles(srcDir, ['.vue', '.js', '.ts', '.jsx', '.tsx']);

  const patterns = [
    /\$t\s*\(\s*['"`]([^'"`]+)['"`]/g,
    /\bt\s*\(\s*['"`]([^'"`]+)['"`]/g,
    /i18n\.t\s*\(\s*['"`]([^'"`]+)['"`]/g,
    /label:\s*['"`]([^'"`]+)['"`]/g,
    /title:\s*['"`]([^'"`]+)['"`]/g,
    /placeholder:\s*['"`]([^'"`]+)['"`]/g,
    /message:\s*['"`]([^'"`]+)['"`]/g,
    /text:\s*['"`]([^'"`]+)['"`]/g,
  ];

  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');

    patterns.forEach(pattern => {
      let match;
      pattern.lastIndex = 0;
      while ((match = pattern.exec(content)) !== null) {
        used.add(match[1]);
      }
    });

    allKeys.forEach(key => {
      if (
        content.includes(`'${key}'`) ||
        content.includes(`"${key}"`) ||
        content.includes(`\`${key}\``)
      ) {
        used.add(key);
      }
    });
  });

  return used;
}

// 检查 key 是否存在
function keyExists(key: string, allKeys: Set<string>): boolean {
  if (allKeys.has(key)) return true;
  for (const existKey of allKeys) {
    if (existKey.startsWith(`${key}.`)) return true;
  }
  return false;
}

// 硬编码文本信息
interface HardcodedText {
  file: string;
  line: number;
  text: string;
  context: string;
}

// 检测硬编码的中英文
function findHardcodedTexts(): HardcodedText[] {
  const results: HardcodedText[] = [];
  const files = getFiles(srcDir, ['.vue', '.js', '.ts', '.jsx', '.tsx']);

  // 中文匹配
  const chinesePattern = /[\u4e00-\u9fa5]+[^'"`]*[\u4e00-\u9fa5]*/g;

  // 英文短语匹配（至少两个单词，排除常见代码模式）
  const englishPattern = /['"`]([A-Z][a-z]+(?:\s+[a-zA-Z]+){1,10})['"` ]/g;

  // 需要忽略的模式
  const ignorePatterns = [
    /console\.(log|warn|error|info)/,
    /\/\/.*/,
    /\/\*[\s\S]*?\*\//,
    /import\s+/,
    /export\s+/,
    /require\s*\(/,
    /^\s*\*/,
    /eslint-disable/,
    /TODO:|FIXME:|NOTE:/,
    /http[s]?:\/\//,
    /\.(vue|js|ts|css|scss|json|png|jpg|svg)/,
  ];

  // 常见的可忽略英文
  const ignoreEnglishWords = new Set([
    'New Tab',
    'Click Me',
    'Hello World',
    'Vue Router',
    'Event Bus',
    'Local Storage',
    'Session Storage',
    'Content Type',
    'User Agent',
    'Access Control',
  ]);

  files.forEach(filePath => {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // 跳过注释和导入
      const shouldIgnore = ignorePatterns.some(pattern => pattern.test(line));
      if (shouldIgnore) return;

      // 跳过已使用 $t 或 t() 的行
      if (/\$t\s*\(/.test(line) || /\bt\s*\(/.test(line)) return;

      // 检测中文
      const chineseMatches = line.match(chinesePattern);
      if (chineseMatches) {
        chineseMatches.forEach(text => {
          // 过滤掉注释中的中文
          if (line.trimStart().startsWith('//')) return;
          if (line.trimStart().startsWith('*')) return;

          // 检查是否在字符串中
          const inString = 
            line.includes(`'${text}`) ||
            line.includes(`"${text}`) ||
            line.includes(`\`${text}`);

          if (inString && text.length >= 2) {
            results.push({
              file: filePath,
              line: index + 1,
              text: text.trim(),
              context: line.trim().slice(0, 100),
            });
          }
        });
      }

      // 检测英文短语
      let match;
      englishPattern.lastIndex = 0;
      while ((match = englishPattern.exec(line)) !== null) {
        const text = match[1];
        
        // 过滤
        if (ignoreEnglishWords.has(text)) continue;
        if (text.length < 5) continue;
        if (/^[A-Z_]+$/.test(text)) continue; // 常量
        if (looksLikeI18nKey(text)) continue;

        // 看起来像用户可见文本
        if (/^[A-Z][a-z]+(\s+[a-zA-Z]+)+$/.test(text)) {
          results.push({
            file: filePath,
            line: index + 1,
            text,
            context: line.trim().slice(0, 100),
          });
        }
      }
    });
  });

  // 去重
  const unique = new Map<string, HardcodedText>();
  results.forEach(item => {
    const key = `${item.file}:${item.line}:${item.text}`;
    if (!unique.has(key)) {
      unique.set(key, item);
    }
  });

  return [...unique.values()];
}

// 主逻辑
function main(): void {
  const allKeys = getAllI18nKeys();
  const usedKeys = getUsedKeys(allKeys);

  console.log(`\n📊 总 key 数量: ${allKeys.size}`);
  console.log(`📊 使用中的 key: ${usedKeys.size}`);

  // 未使用的 key
  const unused = [...allKeys].filter(key => !usedKeys.has(key));
  console.log(`\n❌ 未使用的 key (${unused.length}):\n`);
  unused.sort().forEach(key => console.log(`  - ${key}`));

  // 缺失的 key
  const missing = [...usedKeys].filter(key => {
    if (!looksLikeI18nKey(key)) return false;
    return !keyExists(key, allKeys);
  });

  if (missing.length) {
    console.log(`\n⚠️  缺失的 key (${missing.length}):\n`);
    missing.sort().forEach(key => console.log(`  - ${key}`));
  }

  // 硬编码文本
  console.log('\n🔍 检测硬编码文本...');
  const hardcoded = findHardcodedTexts();
  
  if (hardcoded.length) {
    console.log(`\n📝 硬编码文本 (${hardcoded.length}):\n`);
    
    // 按文件分组
    const byFile = new Map<string, HardcodedText[]>();
    hardcoded.forEach(item => {
      const list = byFile.get(item.file) || [];
      list.push(item);
      byFile.set(item.file, list);
    });

    byFile.forEach((items, file) => {
      console.log(`\n  📄 ${file}`);
      items.forEach(item => {
        console.log(`     L${item.line}: "${item.text}"`);
      });
    });
  }

  // // 输出报告
  // const report = {
  //   summary: {
  //     totalKeys: allKeys.size,
  //     usedKeys: usedKeys.size,
  //     unusedCount: unused.length,
  //     missingCount: missing.length,
  //     hardcodedCount: hardcoded.length,
  //   },
  //   unused,
  //   missing,
  //   hardcoded: hardcoded.map(h => ({
  //     file: h.file,
  //     line: h.line,
  //     text: h.text,
  //   })),
  // };

  // fs.writeFileSync('./i18n-report.json', JSON.stringify(report, null, 2));
  // console.log('\n✅ 报告已保存到 i18n-report.json');
}

main();