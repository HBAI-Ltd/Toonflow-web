export type DiffSegType = "equal" | "remove" | "add";
export interface DiffSeg {
  type: DiffSegType;
  text: string;
}
export interface DiffRow {
  /** equal=两侧相同；change=同一行被改写；remove=仅左侧有；add=仅右侧有 */
  type: "equal" | "change" | "remove" | "add";
  leftNo: number | null;
  rightNo: number | null;
  left: DiffSeg[] | null;
  right: DiffSeg[] | null;
}

const MAX_CELLS = 4_000_000;
/** 行内高亮只对改动比例不大的一对行有意义；差太远时整行替换比满屏碎片好读 */
const INLINE_MIN_SIMILARITY = 0.3;
const INLINE_MAX_LEN = 2000;

/** LCS 编辑脚本。full matrix，规模由调用方用 MAX_CELLS 约束 */
function editScript<T>(x: T[], y: T[]): Array<{ type: DiffSegType; index: number }> {
  const rows = Array.from({ length: x.length + 1 }, () => new Uint32Array(y.length + 1));
  for (let i = x.length - 1; i >= 0; i--)
    for (let j = y.length - 1; j >= 0; j--)
      rows[i][j] = x[i] === y[j] ? rows[i + 1][j + 1] + 1 : Math.max(rows[i + 1][j], rows[i][j + 1]);
  const out: Array<{ type: DiffSegType; index: number }> = [];
  let i = 0, j = 0;
  while (i < x.length || j < y.length) {
    if (i < x.length && j < y.length && x[i] === y[j]) { out.push({ type: "equal", index: i++ }); j++; }
    else if (i < x.length && (j === y.length || rows[i + 1][j] >= rows[i][j + 1])) out.push({ type: "remove", index: i++ });
    else out.push({ type: "add", index: j++ });
  }
  return out;
}

function pushSeg(list: DiffSeg[], type: DiffSegType, text: string) {
  if (!text) return;
  const last = list[list.length - 1];
  if (last?.type === type) last.text += text;
  else list.push({ type, text });
}

/** 一对改动行的字符级差异；差异过大或过长时退回整行替换 */
function inlineSegs(oldLine: string, newLine: string): { left: DiffSeg[]; right: DiffSeg[] } {
  const plain = () => ({
    left: oldLine ? [{ type: "remove" as const, text: oldLine }] : [],
    right: newLine ? [{ type: "add" as const, text: newLine }] : [],
  });
  if (oldLine.length > INLINE_MAX_LEN || newLine.length > INLINE_MAX_LEN) return plain();
  const a = Array.from(oldLine), b = Array.from(newLine);
  let start = 0, end = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  while (end < a.length - start && end < b.length - start && a[a.length - 1 - end] === b[b.length - 1 - end]) end++;
  const shared = start + end;
  if (shared / Math.max(a.length, b.length, 1) < INLINE_MIN_SIMILARITY) return plain();
  const x = a.slice(start, a.length - end), y = b.slice(start, b.length - end);
  if (x.length * y.length > MAX_CELLS) return plain();
  const left: DiffSeg[] = [], right: DiffSeg[] = [];
  const head = a.slice(0, start).join(""), tail = end ? a.slice(a.length - end).join("") : "";
  pushSeg(left, "equal", head); pushSeg(right, "equal", head);
  for (const op of editScript(x, y)) {
    if (op.type === "equal") { pushSeg(left, "equal", x[op.index]); pushSeg(right, "equal", x[op.index]); }
    else if (op.type === "remove") pushSeg(left, "remove", x[op.index]);
    else pushSeg(right, "add", y[op.index]);
  }
  pushSeg(left, "equal", tail); pushSeg(right, "equal", tail);
  return { left, right };
}

/**
 * 左右对照的行级差异。
 * 直接从前后全文重算，不依赖服务端存下来的 diff 片段——旧提案里存的是整块红/整块绿，
 * 那种数据没法还原成左右对齐的行，重算才能让历史提案也正常显示。
 */
export function buildDiffRows(oldText: string, newText: string): DiffRow[] {
  const split = (text: string) => (text.length ? text.replace(/\n$/, "").split("\n") : []);
  const a = split(oldText), b = split(newText);
  const rows: DiffRow[] = [];
  let leftNo = 0, rightNo = 0;

  const pushRow = (left: DiffSeg[] | null, right: DiffSeg[] | null, type: DiffRow["type"]) => {
    rows.push({
      type,
      left, right,
      leftNo: left ? ++leftNo : null,
      rightNo: right ? ++rightNo : null,
    });
  };

  let start = 0, end = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  while (end < a.length - start && end < b.length - start && a[a.length - 1 - end] === b[b.length - 1 - end]) end++;
  for (let i = 0; i < start; i++) pushRow([{ type: "equal", text: a[i] }], [{ type: "equal", text: a[i] }], "equal");

  const x = a.slice(start, a.length - end), y = b.slice(start, b.length - end);
  let removed: string[] = [], added: string[] = [];
  const flushHunk = () => {
    for (let i = 0; i < Math.max(removed.length, added.length); i++) {
      const oldLine = removed[i], newLine = added[i];
      if (oldLine !== undefined && newLine !== undefined) {
        const segs = inlineSegs(oldLine, newLine);
        pushRow(segs.left, segs.right, "change");
      } else if (oldLine !== undefined) {
        pushRow([{ type: "remove", text: oldLine }], null, "remove");
      } else {
        pushRow(null, [{ type: "add", text: newLine }], "add");
      }
    }
    removed = []; added = [];
  };

  if (x.length * y.length > MAX_CELLS) {
    removed = x; added = y;
    flushHunk();
  } else {
    for (const op of editScript(x, y)) {
      if (op.type === "equal") {
        flushHunk();
        pushRow([{ type: "equal", text: x[op.index] }], [{ type: "equal", text: x[op.index] }], "equal");
      } else if (op.type === "remove") removed.push(x[op.index]);
      else added.push(y[op.index]);
    }
    flushHunk();
  }

  for (let i = a.length - end; i < a.length; i++) pushRow([{ type: "equal", text: a[i] }], [{ type: "equal", text: a[i] }], "equal");
  return rows;
}

export interface DiffGap {
  type: "gap";
  count: number;
}
export type DiffViewItem = DiffRow | DiffGap;
export const isGap = (item: DiffViewItem): item is DiffGap => (item as DiffGap).type === "gap";

/** 只保留改动行及其上下文，中间成段的未改动行折叠成一条提示 */
export function collapseUnchanged(rows: DiffRow[], context = 2): DiffViewItem[] {
  const keep = new Set<number>();
  rows.forEach((row, index) => {
    if (row.type === "equal") return;
    for (let i = Math.max(0, index - context); i <= Math.min(rows.length - 1, index + context); i++) keep.add(i);
  });
  if (!keep.size) return [];
  const out: DiffViewItem[] = [];
  let skipped: DiffRow[] = [];
  // 只折叠一行没有意义，反而多出一条提示；两行起才折
  const flushSkipped = () => {
    if (skipped.length > 1) out.push({ type: "gap", count: skipped.length });
    else out.push(...skipped);
    skipped = [];
  };
  rows.forEach((row, index) => {
    if (keep.has(index)) { flushSkipped(); out.push(row); }
    else skipped.push(row);
  });
  flushSkipped();
  return out;
}
