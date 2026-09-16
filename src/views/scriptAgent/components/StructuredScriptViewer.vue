<template>
  <article class="structuredScriptViewer">
    <header class="scriptSummary">
      <div class="summaryTitleRow">
        <h2>{{ script.title }}</h2>
        <div class="summaryActions">
          <t-button size="small" variant="text" @click="expandAll">{{ $t("workbench.scriptAgent.expandAll") }}</t-button>
          <t-button size="small" variant="text" @click="collapseAll">{{ $t("workbench.scriptAgent.collapseAll") }}</t-button>
        </div>
      </div>
      <div class="summaryMetrics" :aria-label="script.title">
        <span>{{ $t("workbench.scriptAgent.duration") }}: {{ script.overview.estimatedDurationSeconds }}s</span>
        <span>{{ $t("workbench.scriptAgent.voiceWordCount") }}: {{ script.overview.voiceWordCount }}</span>
        <span>{{ $t("workbench.scriptAgent.shotCount") }}: {{ script.overview.shotCount }}</span>
      </div>
      <div class="summaryBlocks">
        <div class="summaryBlock">
          <span class="contentLabel">{{ $t("workbench.scriptAgent.coreQuestion") }}</span>
          <p>{{ script.overview.coreQuestion }}</p>
        </div>
        <div class="summaryBlock">
          <span class="contentLabel">{{ $t("workbench.scriptAgent.coreConclusion") }}</span>
          <p>{{ script.overview.coreConclusion }}</p>
        </div>
      </div>
      <dl class="overviewDetails">
        <div>
          <dt>{{ $t("workbench.scriptAgent.knowledgeStructure") }}</dt>
          <dd>{{ script.overview.knowledgeStructure }}</dd>
        </div>
        <div>
          <dt>{{ $t("workbench.scriptAgent.narrativeStance") }}</dt>
          <dd>{{ script.overview.narrativeStance }}</dd>
        </div>
        <div>
          <dt>{{ $t("workbench.scriptAgent.voiceStyle") }}</dt>
          <dd>{{ script.overview.voiceStyle }}</dd>
        </div>
      </dl>
    </header>

    <section v-for="section in script.sections" :key="section.id" class="scriptSection">
      <button
        type="button"
        class="sectionHeader"
        :aria-expanded="!collapsedSections.has(section.id)"
        @click="toggleSection(section.id)">
        <span class="sectionIdentity">
          <span class="sectionId">{{ $t("workbench.scriptAgent.section") }} · {{ section.id }}</span>
          <span class="sectionTitle">{{ section.title }}</span>
        </span>
        <span class="sectionMeta">
          <span>{{ $t("workbench.scriptAgent.shotCount") }}: {{ section.shots.length }}</span>
          <span>{{ $t("workbench.scriptAgent.duration") }}: {{ section.estimatedDurationSeconds }}s</span>
        </span>
      </button>
      <div v-show="!collapsedSections.has(section.id)" class="sectionShots">
        <article v-for="shot in section.shots" :key="shot.number" class="shotCard">
          <button
            type="button"
            class="shotHeader"
            :aria-expanded="!collapsedShots.has(shot.number)"
            @click="toggleShot(shot.number)">
            <span class="shotIdentity">
              <span class="shotNumber">{{ $t("workbench.scriptAgent.shot") }} {{ formatShotNumber(shot.number) }}</span>
              <span class="shotTitle">{{ shot.title }}</span>
            </span>
            <span class="shotMeta">
              <span>{{ $t("workbench.scriptAgent.duration") }}: {{ shot.estimatedDurationSeconds }}s</span>
              <span>{{ shot.evidenceType }}</span>
            </span>
          </button>
          <div v-show="!collapsedShots.has(shot.number)" class="shotBody">
            <div class="claimTags">
              <span v-for="claimId in shot.claimIds" :key="claimId" class="claimTag">{{ claimId }}</span>
            </div>
            <div class="contentBlock voiceoverBlock">
              <span class="contentLabel">{{ $t("workbench.scriptAgent.voiceover") }}</span>
              <p>{{ shot.voiceover }}</p>
            </div>
            <div class="contentBlock">
              <span class="contentLabel">{{ $t("workbench.scriptAgent.visual") }}</span>
              <p>{{ shot.visual }}</p>
            </div>
            <div class="contentBlock">
              <span class="contentLabel">{{ $t("workbench.scriptAgent.visualFunction") }}</span>
              <p>{{ shot.visualFunction }}</p>
            </div>
            <div class="contentBlock">
              <span class="contentLabel">{{ $t("workbench.scriptAgent.motion") }}</span>
              <p>{{ shot.motion }}</p>
            </div>
            <div class="contentBlock">
              <span class="contentLabel">{{ $t("workbench.scriptAgent.soundEffects") }}</span>
              <p>{{ shot.soundEffects || $t("workbench.scriptAgent.noSoundEffects") }}</p>
            </div>
          </div>
        </article>
      </div>
    </section>
  </article>
</template>

<script setup lang="ts">
import type { StructuredScript } from "@/utils/structuredScript";

const props = withDefaults(defineProps<{
  script: StructuredScript;
  initiallyCollapsed?: boolean;
}>(), {
  initiallyCollapsed: false,
});

const collapsedSections = ref(new Set<string>());
const collapsedShots = ref(new Set<number>());

function setCollapsed(collapsed: boolean) {
  collapsedSections.value = collapsed ? new Set(props.script.sections.map((section) => section.id)) : new Set();
  collapsedShots.value = collapsed ? new Set(props.script.sections.flatMap((section) => section.shots.map((shot) => shot.number))) : new Set();
}

function toggleSection(id: string) {
  const next = new Set(collapsedSections.value);
  next.has(id) ? next.delete(id) : next.add(id);
  collapsedSections.value = next;
}

function toggleShot(number: number) {
  const next = new Set(collapsedShots.value);
  next.has(number) ? next.delete(number) : next.add(number);
  collapsedShots.value = next;
}

function expandAll() {
  setCollapsed(false);
}

function collapseAll() {
  setCollapsed(true);
}

function formatShotNumber(number: number) {
  return String(number).padStart(2, "0");
}

if (props.initiallyCollapsed) setCollapsed(true);
</script>

<style scoped lang="scss">
.structuredScriptViewer {
  display: flex;
  flex-direction: column;
  gap: 16px;
  color: var(--td-text-color-primary);
}

.scriptSummary,
.scriptSection,
.shotCard {
  border: 1px solid var(--td-border-level-2-color);
  border-radius: 10px;
  background: var(--td-bg-color-container);
}

.scriptSummary {
  padding: 16px;
}

.summaryTitleRow,
.sectionHeader,
.shotHeader,
.sectionIdentity,
.shotIdentity,
.summaryActions,
.summaryMetrics,
.sectionMeta,
.shotMeta,
.claimTags {
  display: flex;
  align-items: center;
}

.summaryTitleRow,
.sectionHeader,
.shotHeader {
  justify-content: space-between;
  gap: 12px;
}

.summaryTitleRow h2 {
  margin: 0;
  min-width: 0;
  overflow-wrap: anywhere;
  font-size: 18px;
}

.summaryActions,
.summaryMetrics,
.sectionMeta,
.shotMeta,
.claimTags {
  flex-wrap: wrap;
  gap: 8px;
}

.summaryMetrics,
.sectionMeta,
.shotMeta {
  color: var(--td-text-color-secondary);
  font-size: 13px;
}

.summaryMetrics {
  margin-top: 12px;
}

.summaryMetrics span,
.sectionMeta span,
.shotMeta span,
.claimTag,
.sectionId,
.shotNumber {
  padding: 3px 7px;
  border-radius: 999px;
  background: var(--td-bg-color-secondarycontainer);
}

.summaryBlocks {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.summaryBlock,
.contentBlock {
  min-width: 0;
  border-radius: 8px;
  background: var(--td-bg-color-secondarycontainer);
  padding: 12px;
}

.summaryBlock p,
.contentBlock p {
  margin: 6px 0 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.65;
}

.contentLabel,
.overviewDetails dt {
  color: var(--td-text-color-secondary);
  font-size: 12px;
  font-weight: 600;
}

.overviewDetails {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 16px 0 0;
}

.overviewDetails div {
  min-width: 0;
}

.overviewDetails dd {
  margin: 4px 0 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.5;
}

.scriptSection {
  overflow: hidden;
}

.sectionHeader,
.shotHeader {
  width: 100%;
  border: 0;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.sectionHeader {
  padding: 12px 16px;
  background: var(--td-bg-color-secondarycontainer);
}

.shotHeader {
  padding: 12px;
  background: transparent;
}

.sectionIdentity,
.shotIdentity {
  min-width: 0;
  gap: 8px;
}

.sectionId,
.shotNumber {
  flex-shrink: 0;
  color: var(--td-brand-color);
  font-size: 12px;
  font-weight: 700;
}

.sectionTitle,
.shotTitle {
  min-width: 0;
  overflow-wrap: anywhere;
  font-weight: 700;
}

.sectionShots {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
}

.shotCard {
  overflow: hidden;
}

.shotBody {
  display: grid;
  gap: 10px;
  padding: 0 12px 12px;
}

.claimTag {
  color: var(--td-brand-color);
  font-size: 12px;
}

.voiceoverBlock {
  border: 1px solid var(--td-brand-color-focus);
  background: var(--td-brand-color-light);
}

.voiceoverBlock p {
  color: var(--td-text-color-primary);
  font-size: 15px;
  font-weight: 600;
}

@media (max-width: 900px) {
  .summaryTitleRow,
  .sectionHeader,
  .shotHeader {
    align-items: flex-start;
    flex-direction: column;
  }

  .summaryBlocks,
  .overviewDetails {
    grid-template-columns: 1fr;
  }

  .sectionMeta,
  .shotMeta {
    width: 100%;
  }
}
</style>
