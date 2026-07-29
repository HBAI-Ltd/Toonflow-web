<script setup lang="ts">
// Region 4: 第一次审核。确定性和 AI Finding 分组；Issue 决议调用 /issues/:id/decide。
import type { Stage2Audit, Stage2EpisodeDetail, Stage2Issue } from "@/types/screenplayPipeline";

const props = defineProps<{
  detail: Stage2EpisodeDetail;
}>();

const emit = defineEmits<{
  (e: "decideIssue", issueId: string, decision: "resolved" | "accepted" | "dismissed", reason: string): void;
}>();

function onDecide(issue: Stage2Issue, decision: "resolved" | "accepted" | "dismissed"): void {
  emit("decideIssue", issue.id, decision, `工作台确认：${issue.code}`);
}

function parseFindings(audit: Stage2Audit): Array<{ code: string; severity: string; message: string }> {
  try {
    const p = JSON.parse(audit.payload);
    if (Array.isArray(p?.findings)) {
      return p.findings.map((f: any) => ({ code: String(f.code), severity: String(f.severity), message: String(f.message) }));
    }
  } catch (e) {
    // ignore
  }
  return [];
}

function severityClass(sev: string): string {
  switch (sev) {
    case "blocker":
      return "sev blocker";
    case "confirm":
      return "sev confirm";
    case "warning":
      return "sev warning";
    default:
      return "sev info";
  }
}

const confirmsCanPass = (): boolean => {
  return props.detail.listStatus === "screenplay-confirmed" || props.detail.listStatus === "voice-review" || props.detail.listStatus === "stage2-complete";
};
</script>

<template>
  <div class="auditPanel">
    <div class="header">
      <span class="title">第一次审核</span>
      <span class="status">{{ detail.listStatus }}</span>
    </div>
    <div v-if="detail.openIssues.length === 0 && detail.latestAudits.length === 0" class="empty">
      暂无审核记录
    </div>
    <section v-else>
      <h3>Findings (deterministic + AI)</h3>
      <ul class="findingList">
        <li v-for="(a, ai) in detail.latestAudits" :key="a.id">
          <div class="auditHeader">
            <span>auditId: {{ a.id }}</span>
            <span class="auditMeta">{{ a.subjectType }} / {{ a.subjectVersionId }}</span>
          </div>
          <ul class="findings">
            <li v-for="(f, fi) in parseFindings(a)" :key="`${a.id}-${fi}`" :class="severityClass(f.severity)">
              <span class="code">{{ f.code }}</span>
              <span class="sev">{{ f.severity }}</span>
              <span class="msg">{{ f.message }}</span>
            </li>
          </ul>
        </li>
      </ul>

      <h3>开放问题</h3>
      <ul v-if="detail.openIssues.length > 0" class="issueList">
        <li v-for="issue in detail.openIssues" :key="issue.id" class="issue">
          <div class="issueHeader">
            <span class="code">{{ issue.code }}</span>
            <span :class="severityClass(issue.severity)">{{ issue.severity }}</span>
          </div>
          <div class="issueMessage">{{ issue.message }}</div>
          <div class="issueActions">
            <t-button size="small" variant="outline" @click="onDecide(issue, 'resolved')">resolved</t-button>
            <t-button size="small" variant="outline" @click="onDecide(issue, 'accepted')">accepted</t-button>
            <t-button size="small" variant="outline" theme="danger" @click="onDecide(issue, 'dismissed')">dismissed</t-button>
          </div>
        </li>
      </ul>
      <p v-else class="empty">无开放问题</p>

      <div class="confirmHint">
        <span v-if="confirmsCanPass()" class="ok">当前列表状态已通过第一次确认</span>
        <span v-else class="pending">第一次确认由后端 detail.listStatus 决定</span>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
.auditPanel {
  padding: 16px;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  .title {
    font-weight: 600;
  }
  .status {
    color: var(--td-text-color-secondary, #666);
  }
}
.empty {
  color: var(--td-text-color-secondary, #666);
  padding: 24px 0;
}
h3 {
  margin: 16px 0 8px;
  font-size: 14px;
}
.findingList {
  list-style: none;
  margin: 0;
  padding: 0;
}
.auditHeader {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: var(--td-text-color-secondary, #666);
  margin-bottom: 4px;
}
.findings {
  list-style: none;
  margin: 0 0 8px;
  padding: 0;
  li {
    display: flex;
    gap: 8px;
    padding: 4px 8px;
    border-left: 3px solid var(--td-component-stroke, #e7e7e7);
    margin-bottom: 4px;
    .code {
      font-family: monospace;
    }
    .sev {
      font-size: 12px;
      padding: 0 4px;
    }
  }
  .sev.blocker {
    background: #fde7e7;
    color: #d54941;
  }
  .sev.confirm {
    background: #fff3e0;
    color: #c2671f;
  }
  .sev.warning {
    background: #fff8e6;
    color: #b88400;
  }
  .sev.info {
    background: #e6f4ff;
    color: #0052d9;
  }
}
.issueList {
  list-style: none;
  margin: 0;
  padding: 0;
}
.issue {
  border: 1px solid var(--td-component-stroke, #e7e7e7);
  padding: 8px;
  margin-bottom: 8px;
  border-radius: 4px;
}
.issueHeader {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 4px;
  .code {
    font-family: monospace;
    font-weight: 600;
  }
}
.issueMessage {
  font-size: 12px;
  margin-bottom: 8px;
}
.issueActions {
  display: flex;
  gap: 8px;
}
.confirmHint {
  margin-top: 16px;
  font-size: 12px;
  .ok {
    color: var(--td-success-color, #2ba471);
  }
  .pending {
    color: var(--td-text-color-secondary, #666);
  }
}
</style>
