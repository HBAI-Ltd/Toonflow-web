<template>
  <t-drawer
    v-model:visible="visible"
    :header="$t('workbench.sourceFoundation.issues.title')"
    size="560px"
    :footer="false"
    @cancel="visible = false"
  >
    <div class="issue-list">
      <div v-if="!issues.length" class="empty">{{ $t("workbench.sourceFoundation.issues.empty") }}</div>
      <t-card
        v-for="issue in issues"
        :key="issue.issueId"
        class="issue-card"
        :bordered="true"
        :header-bordered="true"
      >
        <template #header>
          <div class="issue-head">
            <t-tag size="small" :theme="severityTheme(issue.severity)" variant="light">
              {{ $t(`workbench.sourceFoundation.issues.severity.${issue.severity}`) }}
            </t-tag>
            <span class="code">{{ issue.code }}</span>
            <t-tag size="small" variant="outline">{{ issue.scopeType }}:{{ issue.scopeId }}</t-tag>
          </div>
        </template>
        <p class="message">{{ issue.message }}</p>
        <div class="decide-row">
          <t-input
            v-model="reasonByIssue[issue.issueId]"
            :placeholder="$t('workbench.sourceFoundation.issues.reasonPlaceholder')"
            size="small"
            clearable
          />
          <t-button-group size="small">
            <t-button
              v-for="decision in allowedDecisions(issue)"
              :key="decision"
              :theme="decision === 'resolved' ? 'primary' : 'default'"
              :disabled="!reasonByIssue[issue.issueId]"
              @click="onDecide(issue, decision)"
            >
              {{ $t(`workbench.sourceFoundation.issues.decision.${decision}`) }}
            </t-button>
          </t-button-group>
        </div>
      </t-card>
    </div>
  </t-drawer>
</template>

<script setup lang="ts">
import type { SourceIssue } from "@/types/sourceFoundation";

defineProps<{
  issues: SourceIssue[];
}>();

const visible = defineModel<boolean>();
const emit = defineEmits<{
  (
    e: "decide",
    payload: { issue: SourceIssue; decision: "resolved" | "accepted" | "dismissed"; reason: string },
  ): void;
}>();

const reasonByIssue = ref<Record<string, string>>({});

function allowedDecisions(issue: SourceIssue) {
  if (issue.severity === "blocker") return ["resolved"] as const;
  if (issue.severity === "confirm") return ["resolved", "accepted"] as const;
  return ["resolved", "dismissed"] as const;
}

function severityTheme(severity: SourceIssue["severity"]) {
  if (severity === "blocker") return "danger";
  if (severity === "confirm") return "warning";
  return "default";
}

function onDecide(issue: SourceIssue, decision: "resolved" | "accepted" | "dismissed") {
  const reason = reasonByIssue.value[issue.issueId];
  if (!reason) return;
  emit("decide", { issue, decision, reason });
  reasonByIssue.value[issue.issueId] = "";
}
</script>

<style lang="scss" scoped>
.issue-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.empty {
  color: var(--td-text-color-secondary);
  text-align: center;
  padding: 32px 0;
}
.issue-card {
  .issue-head {
    display: flex;
    align-items: center;
    gap: 8px;
    .code {
      font-weight: 600;
    }
  }
  .message {
    margin: 0 0 12px;
    font-size: 13px;
    line-height: 1.6;
  }
  .decide-row {
    display: flex;
    gap: 8px;
    align-items: center;
  }
}
</style>
