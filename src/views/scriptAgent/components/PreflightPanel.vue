<template>
  <section class="preflightPanel" aria-label="科普预审">
    <p v-if="phase === 'reviewing'" class="notice" role="status">正在完整复审，请等待结果…</p>
    <p v-else-if="phase === 'awaiting_review'" class="notice" role="status">修改已确认，等待完整复审结果后再继续。</p>
    <p v-else-if="phase === 'failed'" class="notice" role="alert">预审未完成，请在对话中重新发起预审。</p>
    <p v-else-if="phase === 'passed'" class="notice" role="status">已确认继续，预审环节已完成。</p>
    <p v-else-if="phase === 'unreviewed'" class="notice">请先在对话中开始预审，完成后可在此选择修复项。</p>

    <div v-if="phase === 'findings'" class="findings">
      <h3>预审问题</h3>
      <p v-if="findings.length" class="hint">黄色问题默认勾选，警告默认不勾选。仅修复你选中的问题。</p>
      <label v-for="finding in findings" :key="finding.findingId" class="finding">
        <input v-model="selectedIds" type="checkbox" :value="finding.findingId" :disabled="busy || !connected" />
        <span><strong>{{ finding.level }} {{ blockLabel(finding.blockRef) }}</strong><span class="issue">{{ finding.issue }}</span></span>
      </label>
      <div v-for="issue in blockingIssues" :key="issue.issueId" class="finding blocking">
        <span><strong>🔴 {{ blockLabel(issue.blockRef) }} · 不支持自动修复</strong><span class="issue">{{ issue.issue }}</span></span>
      </div>
      <p v-if="!issueCount" class="notice">本轮预审未发现待处理问题，可以继续。</p>
      <p v-else-if="blockingIssues.length" class="hint">红色问题需要手动处理，也可以使用下方按钮明确忽略全部问题并继续。</p>
      <div class="actions">
        <button v-if="findings.length" type="button" class="primary" :disabled="!canRepair" @click="submit('repair')">修复已选问题（{{ selectedIds.length }}）</button>
        <button v-if="issueCount" type="button" :disabled="busy || !connected" @click="submit('ignore')">手动忽略并继续</button>
        <button v-else type="button" class="primary" :disabled="busy || !connected" @click="submit('proceed')">继续下一步</button>
      </div>
    </div>

    <div v-if="state?.proposal" class="proposal">
      <h3>{{ state.proposal.confirmed ? '已确认的修改差异' : '请确认修改差异' }}</h3>
      <p class="hint">以下为服务器生成的逐块实际差异。确认后会对修改后的临时全文重新预审；复审完成并确认继续后，才会将修改写入正文。</p>
      <div class="diffBar">
        <div class="legend"><span class="removed">− 删除</span><span class="added">＋ 新增</span></div>
        <label class="toggle"><input v-model="onlyChanges" type="checkbox" />只看改动行</label>
      </div>
      <details v-for="block in state.proposal.blocks" :key="`${block.importId}:${block.internalIndex}`" :open="!state.proposal.confirmed" class="diffBlock">
        <summary>{{ blockLabel(block) }}<span class="stat">{{ blockStat(block) }}</span></summary>
        <div class="diffTable" role="table">
          <div class="diffHead" role="row"><span role="columnheader">修改前</span><span role="columnheader">修改后</span></div>
          <template v-for="(item, index) in viewRows(block)" :key="index">
            <div v-if="isGap(item)" class="gapRow" role="row"><span>⋯ 省略 {{ item.count }} 行未改动 ⋯</span></div>
            <div v-else class="diffRow" :class="item.type" role="row">
              <span class="lineNo">{{ item.leftNo ?? '' }}</span>
              <span class="cell left" :class="{ empty: !item.left }"><template v-if="item.left"><span v-for="(seg, i) in item.left" :key="i" :class="seg.type">{{ seg.text }}</span></template></span>
              <span class="lineNo">{{ item.rightNo ?? '' }}</span>
              <span class="cell right" :class="{ empty: !item.right }"><template v-if="item.right"><span v-for="(seg, i) in item.right" :key="i" :class="seg.type">{{ seg.text }}</span></template></span>
            </div>
          </template>
        </div>
        <details class="fullText"><summary>查看修改前后全文</summary><h4>修改前</h4><pre>{{ block.oldText }}</pre><h4>修改后</h4><pre>{{ block.newText }}</pre></details>
      </details>
      <p v-if="phase === 'diff'" class="hint">
        确认后可以再复审一遍（对修改后的临时全文重新审计，更稳），也可以直接提交（跳过复审立即落库，修改后的全文不再被审计，风险由你承担）。
      </p>
      <p class="hint">放弃操作会清除全部临时候选块修改，保留原文，并对当前原文重新预审。</p>
      <div class="actions">
        <button v-if="phase === 'diff'" type="button" class="primary" :disabled="busy || !connected" @click="submit('confirm_diff')">确认差异并复审</button>
        <button v-if="phase === 'diff'" type="button" :disabled="busy || !connected" @click="submit('confirm_commit')">确认差异并提交（跳过复审）</button>
        <button type="button" :disabled="busy || !connected" @click="submit('discard')">放弃全部候选修改并重审原文</button>
      </div>
    </div>

    <p v-if="!connected" class="hint" role="status">连接恢复后可操作，已保存的预审结果会自动同步。</p>
    <!-- 默认展开：报告是这一步的主要内容，折叠起来每次都要多点一下；用静态 open，用户手动收起后不会被阶段切换重新掰开 -->
    <details v-if="report" class="report" open>
      <summary>完整预审报告</summary>
      <MdPreview :modelValue="report" :theme="theme" />
    </details>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { MdPreview } from "md-editor-v3";
import { buildDiffRows, collapseUnchanged, isGap } from "@/utils/diffRows";
import { buildPreflightAction, getPreflightPhase } from "@/utils/preflight";
import { usePreflightSelection } from "@/utils/usePreflightSelection";
import type { PreflightAction, PreflightBlockRef, PreflightState } from "@/utils/preflight";

const props = defineProps<{ state?: PreflightState; report: string; busy: boolean; connected: boolean; sessionKey: string; theme?: "light" | "dark" }>();
const emit = defineEmits<{ action: [action: PreflightAction] }>();
const phase = computed(() => getPreflightPhase(props.state));
const findings = computed(() => props.state?.pendingFindings?.findings ?? []);
const blockingIssues = computed(() => props.state?.pendingFindings?.blockingIssues ?? []);
const issueCount = computed(() => findings.value.length + blockingIssues.value.length);
const selectedIds = usePreflightSelection(() => props.state, () => props.sessionKey);
const canRepair = computed(() => !!buildPreflightAction(props.state, "repair", selectedIds.value, props.busy || !props.connected));
function submit(type: PreflightAction["type"]) {
  const action = buildPreflightAction(props.state, type, selectedIds.value, props.busy || !props.connected);
  if (action) emit("action", action);
}
function blockLabel(block: PreflightBlockRef) {
  return `批次 ${block.importId} · 块 ${block.internalIndex}`;
}

/** 只看改动行：长文里未改动段落折叠，默认开启 */
const onlyChanges = ref(true);
type DiffBlock = { oldText: string; newText: string };
// 行级对齐从前后全文重算，历史提案里存的整块红/整块绿也能正常显示
const rowsCache = new Map<string, ReturnType<typeof buildDiffRows>>();
function diffRows(block: DiffBlock) {
  const key = `${block.oldText.length}:${block.newText.length}:${block.oldText}`;
  let rows = rowsCache.get(key);
  if (!rows) { rows = buildDiffRows(block.oldText, block.newText); rowsCache.set(key, rows); }
  return rows;
}
function viewRows(block: DiffBlock) {
  const rows = diffRows(block);
  return onlyChanges.value ? collapseUnchanged(rows) : rows;
}
function blockStat(block: DiffBlock) {
  const rows = diffRows(block);
  const removed = rows.filter((row) => row.type === "remove" || row.type === "change").length;
  const added = rows.filter((row) => row.type === "add" || row.type === "change").length;
  return removed || added ? ` −${removed} ＋${added} 行` : " 无改动";
}
</script>

<style scoped>
.preflightPanel { display: grid; gap: 20px; color: var(--td-text-color-primary); }
h3, h4, p { margin: 0; }
h3 { font-size: 16px; }
.findings, .proposal { display: grid; gap: 12px; }
.notice { padding: 12px; border-radius: 6px; background: var(--td-bg-color-secondarycontainer); }
.hint { font-size: 13px; color: var(--td-text-color-secondary); line-height: 1.6; }
.finding { display: flex; gap: 10px; padding: 12px; border: 1px solid var(--td-border-level-1-color); border-radius: 6px; }
.finding input { flex: none; align-self: flex-start; margin-top: 4px; width: 16px; height: 16px; accent-color: var(--td-brand-color); }
.finding strong { font-size: 13px; }
.issue { display: block; margin-top: 5px; white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.6; }
.blocking { border-color: var(--td-error-color); }
.actions { display: flex; gap: 10px; flex-wrap: wrap; }
button { padding: 8px 14px; border: 1px solid var(--td-border-level-2-color); border-radius: 6px; background: var(--td-bg-color-container); color: inherit; cursor: pointer; font: inherit; }
button.primary { background: var(--td-brand-color); border-color: var(--td-brand-color); color: white; }
button:disabled { opacity: .45; cursor: not-allowed; }
button:focus-visible, input:focus-visible, summary:focus-visible { outline: 2px solid var(--td-brand-color); outline-offset: 3px; }
.diffBar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.legend { display: flex; gap: 12px; font-size: 13px; }
.toggle { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--td-text-color-secondary); cursor: pointer; }
.toggle input { width: 15px; height: 15px; accent-color: var(--td-brand-color); }
.removed { color: var(--td-error-color); }
.added { color: var(--td-success-color); }
.diffBlock { border: 1px solid var(--td-border-level-1-color); border-radius: 6px; overflow: hidden; }
summary { cursor: pointer; padding: 10px; font-weight: 500; }
.stat { margin-left: 8px; font-weight: 400; font-size: 12px; color: var(--td-text-color-secondary); }
pre { margin: 0; padding: 10px; white-space: pre-wrap; overflow-wrap: anywhere; font-size: 13px; line-height: 1.7; }

/* 左右对照：行号 + 内容 各两列，行内高亮只标真正改掉的字 */
.diffTable { border-top: 1px solid var(--td-border-level-1-color); font-size: 13px; line-height: 1.7; }
.diffHead, .diffRow { display: grid; grid-template-columns: 44px minmax(0, 1fr) 44px minmax(0, 1fr); }
.diffHead { position: sticky; top: 0; z-index: 1; background: var(--td-bg-color-secondarycontainer); font-size: 12px; color: var(--td-text-color-secondary); }
.diffHead span:first-child { grid-column: 1 / 3; padding: 6px 10px; }
.diffHead span:last-child { grid-column: 3 / 5; padding: 6px 10px; border-left: 1px solid var(--td-border-level-1-color); }
.diffRow > .lineNo { padding: 2px 8px; text-align: right; color: var(--td-text-color-placeholder); font-variant-numeric: tabular-nums; user-select: none; }
.diffRow > *:nth-child(3) { border-left: 1px solid var(--td-border-level-1-color); }
.cell { padding: 2px 10px 2px 6px; white-space: pre-wrap; overflow-wrap: anywhere; }
.cell.empty { background: var(--td-bg-color-secondarycontainer); }
.diffRow.change .cell.left, .diffRow.remove .cell.left { background: var(--td-error-color-1); }
.diffRow.change .cell.right, .diffRow.add .cell.right { background: var(--td-success-color-1); }
.cell .remove { background: var(--td-error-color-3); color: var(--td-error-color-8); border-radius: 2px; }
.cell .add { background: var(--td-success-color-3); color: var(--td-success-color-8); border-radius: 2px; }
.gapRow { padding: 4px 10px; text-align: center; font-size: 12px; color: var(--td-text-color-placeholder); background: var(--td-bg-color-secondarycontainer); }
@media (max-width: 860px) {
  .diffHead, .diffRow { grid-template-columns: 36px minmax(0, 1fr); }
  .diffHead span:last-child, .diffRow > *:nth-child(3) { border-left: none; }
  .diffHead span:first-child, .diffHead span:last-child { grid-column: auto / span 2; }
}
.fullText h4 { padding: 8px 10px 0; }
.report { border-top: 1px solid var(--td-border-level-1-color); }
</style>
