import settingStore from "@/stores/setting";
const REEL_REGEX = /^(第[\d一二三四五六七八九十百千]+卷)\s*([^\n第]*)/gm;
const DEFAULT_CHAPTER_REGEX = /第\s*([0-9０-９零一二三四五六七八九十百千万]+)\s*[章回节]\s*([^\n\r]*)/g;
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
interface Chapter {
  index: number;
  chapter: string;
  text: string;
}
interface Reel {
  index: number;
  reel: string;
  chapters: Chapter[];
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
export default function parseNovel(text: string): Reel[] {
  REEL_REGEX.lastIndex = 0;
  const reelMatches = Array.from(text.matchAll(REEL_REGEX));
  const reels: Reel[] = [];
  let CHAPTER_REGEX;

  const regStr = settingStore().otherSetting.chapterReg;
  if (regStr) {
    const match = regStr.match(/^\/(.*)\/([igmuy]*)$/);
    if (match) {
      CHAPTER_REGEX = new RegExp(match[1], match[2]);
    } else {
      CHAPTER_REGEX = new RegExp(regStr);
    }
  } else {
    CHAPTER_REGEX = DEFAULT_CHAPTER_REGEX;
  }

  // 没有卷结构
  if (reelMatches.length === 0) {
    const chapters: Chapter[] = [];
    CHAPTER_REGEX.lastIndex = 0;
    const matches = Array.from(text.matchAll(CHAPTER_REGEX));
    if (matches.length === 0 && text.trim() !== "") {
      chapters.push({ index: 1, chapter: "", text: text.trim() });
    } else {
      for (let i = 0; i < matches.length; i++) {
        const start = matches[i].index! + matches[i][0].length;
        const end = i + 1 < matches.length ? matches[i + 1].index! : text.length;
        const content = text
          .slice(start, end)
          .replace(/^[\r\n]+/, "")
          .trim();
        chapters.push({
          index: parseNumber(matches[i][1].replace(/第|章/g, "")),
          chapter: matches[i][2].trim(),
          text: content,
        });
      }
    }
    // 对章节排序
    chapters.sort((a, b) => a.index - b.index);
    reels.push({
      index: 1,
      reel: "正文卷",
      chapters,
    });
    return reels;
  }

  // 有卷结构
  const reelMap = new Map<string, Reel>();
  for (let i = 0; i < reelMatches.length; i++) {
    const match = reelMatches[i];
    const index = match.index!;
    const reelRaw = match[1];
    const reelName = match[2]?.trim() || "";
    const end = i + 1 < reelMatches.length ? reelMatches[i + 1].index! : text.length;
    const reelSection = text.slice(index, end);

    const chapterMatches = Array.from(reelSection.matchAll(CHAPTER_REGEX));
    const chapters: Chapter[] = [];
    if (chapterMatches.length === 0 && reelSection.replace(REEL_REGEX, "").trim() !== "") {
      chapters.push({
        index: 1,
        chapter: "",
        text: reelSection.replace(REEL_REGEX, "").trim(),
      });
    }
    for (let j = 0; j < chapterMatches.length; j++) {
      const start = chapterMatches[j].index! + chapterMatches[j][0].length;
      const end = j + 1 < chapterMatches.length ? chapterMatches[j + 1].index! : reelSection.length;
      const content = reelSection
        .slice(start, end)
        .replace(/^[\r\n]+/, "")
        .trim();
      chapters.push({
        index: parseNumber(chapterMatches[j][1].replace(/第|章/g, "")),
        chapter: chapterMatches[j][2].trim(),
        text: content,
      });
    }
    // 每卷内章节排序
    chapters.sort((a, b) => a.index - b.index);

    if (!reelMap.has(reelName)) {
      reelMap.set(reelName, {
        index: parseNumber(reelRaw.replace(/第|卷/g, "")),
        reel: reelName,
        chapters: [],
      });
    }
    reelMap.get(reelName)!.chapters.push(...chapters);
  }
  // 按卷序号排序输出
  const result = Array.from(reelMap.values()).sort((a, b) => a.index - b.index);
  // 再次确保合并同名卷后，章节整体排序
  result.forEach((reel) => reel.chapters.sort((a, b) => a.index - b.index));
  return result;
}
