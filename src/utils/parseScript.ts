// 默认剧本集正则：匹配"第X集 标题"格式，支持中文数字和阿拉伯数字
const DEFAULT_EPISODE_REGEX = /第\s*([0-9０-９零一二三四五六七八九十百千万]+)\s*集\s*([^\n\r]*)/g;

const CHINESE_NUM_MAP: { [key: string]: number } = {
  零: 0,
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
};
const CHINESE_UNIT_MAP: { [key: string]: number } = {
  十: 10,
  百: 100,
  千: 1000,
};

/**
 * 单集剧本
 */
export interface Episode {
  /** 集数序号 */
  index: number;
  /** 剧本标题 */
  chapter: string;
  /** 剧本正文内容 */
  text: string;
}


function parseNumber(numStr: string): number {
  if (/^\d+$/.test(numStr)) return parseInt(numStr, 10);
  if (/^十[一二三四五六七八九]?$/.test(numStr)) {
    if (numStr.length === 1) return 10;
    return 10 + CHINESE_NUM_MAP[numStr[1]];
  }
  let num = 0,
    digit = 0;
  for (const c of numStr) {
    if (CHINESE_NUM_MAP[c] !== undefined) digit = CHINESE_NUM_MAP[c];
    else if (CHINESE_UNIT_MAP[c] !== undefined) {
      if (digit === 0 && c === "十") digit = 1;
      num += digit * CHINESE_UNIT_MAP[c];
      digit = 0;
    }
  }
  num += digit;
  return num;
}

/**
 * 将正则字符串解析为 RegExp 对象
 */
function parseRegStr(regStr: string): RegExp {
  const match = regStr.match(/^\/(.*)\/([ igmuy]*)$/);
  if (match) {
    return new RegExp(match[1], match[2].includes("g") ? match[2] : match[2] + "g");
  }
  return new RegExp(regStr, "g");
}

/**
 * 解析剧本文本，提取各集的集数、标题和正文内容
 * @param text 剧本原始文本
 * @param customRegStr 自定义正则字符串（优先级最高），留空则依次回退到设置中的正则和默认正则
 * @returns 解析后的剧本分组列表（每组包含若干集）
 */
export default function parseScript(text: string, customRegStr?: string): Episode[] {
  let EPISODE_REGEX: RegExp;

  // 优先级：调用方传入 > 默认正则
  const regStr = customRegStr?.trim();
  if (regStr) {
    EPISODE_REGEX = parseRegStr(regStr);
  } else {
    EPISODE_REGEX = DEFAULT_EPISODE_REGEX;
  }

  EPISODE_REGEX.lastIndex = 0;
  const matches = Array.from(text.matchAll(EPISODE_REGEX));
  const episodes: Episode[] = [];

  if (matches.length === 0 && text.trim() !== "") {
    // 没有找到集标记，将整段文本作为第 1 集
    episodes.push({ index: 1, chapter: "", text: text.trim() });
  } else {
    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index! + matches[i][0].length;
      const end = i + 1 < matches.length ? matches[i + 1].index! : text.length;
      const content = text
        .slice(start, end)
        .replace(/^[\r\n]+/, "")
        .trim();
      episodes.push({
        index: parseNumber(matches[i][1]),
        chapter: matches[i][2]?.trim() ?? "",
        text: content,
      });
    }
  }

  // 按集数排序
  episodes.sort((a, b) => a.index - b.index);

  return episodes;
}
