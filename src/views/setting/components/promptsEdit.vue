<template>
  <div class="promptEditorContainer">
    <!-- 左侧导航 -->
    <t-menu v-model:value="currentPromptCode" class="promptSidebar" :collapsed="false" @change="onMenuChange">
      <template v-for="group in groupedPrompts" :key="group.type">
        <t-menu-group :title="getTypeName(group.type)">
          <t-menu-item v-for="item in group.items" :key="item.code" :value="item.code">
            <div class="menuItemContent">
              <span class="promptName">{{ item.name }}</span>
              <span class="promptCode">{{ item.code }}</span>
            </div>
          </t-menu-item>
        </t-menu-group>
      </template>
      <t-menu-item v-if="promptList.length === 0" disabled>
        <div class="emptyList">
          <i-inbox theme="outline" size="24" />
          <span>暂无提示词</span>
        </div>
      </t-menu-item>
    </t-menu>

    <!-- 右侧编辑区 -->
    <div class="promptEditor">
      <template v-if="currentPrompt">
        <t-card class="editorCard" :bordered="true">
          <template #header>
            <div class="editorHeader">
              <div class="editorInfo">
                <div class="titleRow">
                  <span class="editorTitle">{{ currentPrompt.name }}</span>
                  <t-tag :theme="hasCustomValue ? 'warning' : 'success'" variant="light">
                    {{ hasCustomValue ? "已自定义" : "默认值" }}
                  </t-tag>
                </div>
                <div class="editorMeta">
                  <t-tag :theme="getTypeTheme(currentPrompt.type)" variant="outline">{{ getTypeName(currentPrompt.type) }}</t-tag>
                  <t-tag theme="default" variant="outline">{{ currentPrompt.code }}</t-tag>
                  <t-tag v-if="currentPrompt.parentCode" theme="default" variant="light">父级: {{ currentPrompt.parentCode }}</t-tag>
                </div>
              </div>
              <div class="editorActions">
                <t-button theme="default" @click="resetToDefault">
                  <template #icon>
                    <i-redo theme="outline" size="14" fill="currentColor" />
                  </template>
                  重置提示词
                </t-button>
                <t-button theme="primary" @click="savePrompt" :loading="saving">
                  <template #icon>
                    <i-check theme="outline" size="14" fill="currentColor" />
                  </template>
                  保存
                </t-button>
              </div>
            </div>
          </template>
          <div class="editorBody">
            <t-textarea v-model="editingValue" placeholder="请输入提示词内容" class="promptTextarea" />
     <span>*{{ hasCustomValue ? '当前使用自定义提示词，点击"一键重置"可恢复默认值' : "当前使用默认提示词，编辑后将保存为自定义值" }}</span>
          </div>
        </t-card>
      </template>

      <t-card v-else class="emptyEditor" :bordered="true">
        <t-empty description="请从左侧选择一个提示词进行编辑">
          <template #image>
            <i-edit theme="outline" size="48" />
          </template>
        </t-empty>
      </t-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { message as ElMessage } from "ant-design-vue";
import axios from "@/utils/axios";

interface Prompt {
  id: number;
  code: string;
  name: string;
  type: "mainAgent" | "subAgent" | "system";
  parentCode: string;
  defaultValue: string;
  customValue: string;
}

const promptList = ref<Prompt[]>([]);
const currentPrompt = ref<Prompt | null>(null);
const editingValue = ref("");
const saving = ref(false);

const typeConfig: Record<string, { name: string; color: string; theme: string }> = {
  system: { name: "系统提示词", color: "green", theme: "success" },
  mainAgent: { name: "主Agent", color: "purple", theme: "primary" },
  subAgent: { name: "子Agent", color: "blue", theme: "warning" },
};

const groupedPrompts = computed(() => {
  const groups: Record<string, Prompt[]> = {};
  promptList.value.forEach((item) => {
    (groups[item.type] ??= []).push(item);
  });
  return Object.keys(typeConfig)
    .filter((type) => groups[type])
    .map((type) => ({ type, items: groups[type] }));
});

const currentPromptCode = ref<string>("");

const hasCustomValue = computed(() => {
  if (!currentPrompt.value) return false;
  const defaultVal = processLineBreaks(currentPrompt.value.defaultValue || "");
  return editingValue.value.trim() !== "" && editingValue.value !== defaultVal;
});

const getTypeName = (type: string) => typeConfig[type]?.name || type;
const getTypeTheme = (type: string): "default" | "success" | "primary" | "warning" | "danger" =>
  (typeConfig[type]?.theme as "default" | "success" | "primary" | "warning" | "danger") || "default";
const processLineBreaks = (value: string) => value?.replace(/\\n/g, "\n") || "";

function onMenuChange(value: string | number) {
  const prompt = promptList.value.find((p) => p.code === value);
  if (prompt) selectPrompt(prompt);
}

function selectPrompt(prompt: Prompt) {
  currentPrompt.value = prompt;
  currentPromptCode.value = prompt.code;
  editingValue.value = processLineBreaks(prompt.customValue || prompt.defaultValue || "");
}

function resetToDefault() {
  if (!currentPrompt.value) return;
  editingValue.value = processLineBreaks(currentPrompt.value.defaultValue || "");
  ElMessage.info("已重置为默认值，点击保存生效");
}

async function savePrompt() {
  if (!currentPrompt.value) return;
  saving.value = true;
  try {
    const defaultVal = processLineBreaks(currentPrompt.value.defaultValue || "");
    const customVal = editingValue.value === defaultVal ? "" : editingValue.value.trim();

    await axios.post("/prompt/updatePrompt", {
      id: currentPrompt.value.id,
      code: currentPrompt.value.code,
      customValue: customVal,
    });

    const index = promptList.value.findIndex((p) => p.code === currentPrompt.value?.code);
    if (index !== -1) promptList.value[index].customValue = customVal;
    ElMessage.success("保存成功");
  } catch {
    ElMessage.error("保存失败");
  } finally {
    saving.value = false;
  }
}

async function fetchPrompts() {
  try {
    const res = await axios.get("/prompt/getPrompts");
    promptList.value = res.data || [];
    if (promptList.value.length > 0) selectPrompt(promptList.value[0]);
  } catch {
    ElMessage.error("获取提示词列表失败");
  }
}

onMounted(fetchPrompts);
</script>

<style lang="scss" scoped>
.promptEditorContainer {
  display: flex;
  height: 65vh;
  gap: 16px;
}

.promptSidebar {
  width: 260px;
  flex-shrink: 0;
  border-radius: 8px;
  overflow: hidden;

  :deep(.t-menu-group__title) {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    padding: 12px 16px 8px;
  }

  :deep(.t-menu__item) {
    height: auto;
    padding: 8px 16px;
    margin: 2px 8px;
    border-radius: 6px;
  }

  .menuItemContent {
    display: flex;
    flex-direction: column;
    gap: 2px;

    .promptName {
      font-size: 13px;
      font-weight: 500;
    }

    .promptCode {
      font-size: 11px;
      opacity: 0.6;
      font-family: monospace;
    }
  }

  .emptyList {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 24px;
  }
}

.promptEditor {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.editorCard {
  height: 100%;
  display: flex;
  flex-direction: column;

  :deep(.t-card__body) {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
}

.editorHeader {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.editorInfo {
  flex: 1;
  min-width: 200px;
}

.titleRow {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.editorTitle {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.editorMeta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.editorActions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.editorBody {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.promptTextarea {
  font-size: 13px;
  line-height: 1.7;
  font-family: "SF Mono", Monaco, Menlo, Consolas, monospace;
}

.editorTip {
  flex-shrink: 0;
}

.emptyEditor {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.t-textarea__inner) {
  height: 45vh;
  min-height: 200px;
}
</style>
