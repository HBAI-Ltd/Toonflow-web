import fs from "fs";
import path from "path";

// 配置
const localesDir = "./src/locales/language";
const srcDir = "./src";

// 递归获取文件
function getFiles(dir: string, extensions: string[]): string[] {
  const files: string[] = [];

  function walk(currentDir: string): void {
    const items = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(currentDir, item.name);

      if (item.isDirectory()) {
        if (!["node_modules", "dist", ".git"].includes(item.name)) {
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
  const files = getFiles(localesDir, [".json"]);

  files.forEach((file) => {
    const content = JSON.parse(fs.readFileSync(file, "utf-8"));
    extractKeys(content, "", keys);
  });

  return keys;
}

function extractKeys(obj: Record<string, unknown>, prefix: string, keys: Set<string>): void {
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === "object" && obj[key] !== null) {
      extractKeys(obj[key] as Record<string, unknown>, fullKey, keys);
    } else {
      keys.add(fullKey);
    }
  }
}

// 判断字符串是否像 i18n key
function looksLikeI18nKey(str: string): boolean {
  // 至少包含一个点，且看起来像路径格式
  if (!str.includes(".")) return false;
  // 排除常见的非 i18n 字符串
  if (str.startsWith("http")) return false;
  if (str.includes("/")) return false;
  if (str.includes(" ")) return false;
  if (/^\d/.test(str)) return false;
  if (str.includes("@")) return false;
  // 看起来像 i18n key 的格式：word.word.word
  return /^[a-zA-Z][a-zA-Z0-9]*(\.[a-zA-Z][a-zA-Z0-9]*)+$/.test(str);
}

// 扫描源码中使用的 key
function getUsedKeys(allKeys: Set<string>): Set<string> {
  const used = new Set<string>();
  const files = getFiles(srcDir, [".vue", ".js", ".ts", ".jsx", ".tsx"]);

  // 匹配模式
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

  files.forEach((file) => {
    const content = fs.readFileSync(file, "utf-8");

    // 正则匹配
    patterns.forEach((pattern) => {
      let match;
      pattern.lastIndex = 0;
      while ((match = pattern.exec(content)) !== null) {
        used.add(match[1]);
      }
    });

    // 直接搜索：检查代码中是否包含完整的 key 字符串
    allKeys.forEach((key) => {
      if (content.includes(`'${key}'`) || content.includes(`"${key}"`) || content.includes(`\`${key}\``)) {
        used.add(key);
      }
    });
  });

  return used;
}

// 检查 key 是否存在（支持前缀匹配）
function keyExists(key: string, allKeys: Set<string>): boolean {
  // 完全匹配
  if (allKeys.has(key)) return true;

  // 作为前缀存在（动态 key 场景）
  // 例如：使用 `common.status.${status}` 时，只要有 common.status.* 的 key 就算存在
  for (const existKey of allKeys) {
    if (existKey.startsWith(`${key}.`)) return true;
  }

  return false;
}

// 主逻辑
function main(): void {
  const allKeys = getAllI18nKeys();
  const usedKeys = getUsedKeys(allKeys);

  console.log(`\n📊 总 key 数量: ${allKeys.size}`);
  console.log(`📊 使用中的 key: ${usedKeys.size}`);

  // 找未使用的 key
  const unused = [...allKeys].filter((key) => !usedKeys.has(key));

  console.log(`\n❌ 未使用的 key (${unused.length}):\n`);
  unused.sort().forEach((key) => console.log(`  - ${key}`));

  // 找缺失的 key（宽泛判断）
  const missing = [...usedKeys].filter((key) => {
    // 不像 i18n key 的跳过
    if (!looksLikeI18nKey(key)) return false;
    // 检查是否存在（包括前缀匹配）
    return !keyExists(key, allKeys);
  });

  if (missing.length) {
    console.log(`\n⚠️  缺失的 key (${missing.length}):\n`);
    missing.sort().forEach((key) => console.log(`  - ${key}`));
  }

  // // 输出到文件
  // const report = {
  //   total: allKeys.size,
  //   used: usedKeys.size,
  //   unusedCount: unused.length,
  //   missingCount: missing.length,
  //   unused,
  //   missing,
  // };

  // fs.writeFileSync('./i18n-report.json', JSON.stringify(report, null, 2));
  // console.log('\n✅ 报告已保存到 i18n-report.json');
}

main();
