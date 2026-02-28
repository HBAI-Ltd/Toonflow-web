<template>
  <el-dialog top="3vh" v-model="open" title="提示词管理" width="80vw" :footer="null" :maskClosable="false" centered class="promptEditorModal">
    <div class="promptEditorContainer">
      <!-- 左侧导航 -->
      <div class="promptSidebar">
        <div class="promptTypeGroup" v-for="group in groupedPrompts" :key="group.type">
          <div class="typeHeader">
            <i-tag-one theme="outline" size="14" fill="currentColor" />
            <span>{{ getTypeName(group.type) }}</span>
          </div>
          <div
            class="promptItem"
            v-for="item in group.items"
            :key="item.code"
            :class="{ active: currentPrompt?.code === item.code }"
            @click="selectPrompt(item)">
            <span class="promptName">{{ item.name }}</span>
            <span class="promptCode">{{ item.code }}</span>
          </div>
        </div>
        <div v-if="promptList.length === 0" class="emptyList">
          <i-inbox theme="outline" size="32" fill="#d1d5db" />
          <span>暂无提示词</span>
        </div>
      </div>

      <!-- 右侧编辑区 -->
      <div class="promptEditor">
        <template v-if="currentPrompt">
          <div class="editorHeader">
            <div class="editorInfo">
              <div class="titleRow">
                <h3 class="editorTitle">{{ currentPrompt.name }}</h3>
                <span v-if="hasCustomValue" class="customBadge">已自定义</span>
                <span v-else class="defaultBadge">默认值</span>
              </div>
              <div class="editorMeta">
                <a-tag :color="getTypeColor(currentPrompt.type)">{{ getTypeName(currentPrompt.type) }}</a-tag>
                <span class="promptCodeBadge">{{ currentPrompt.code }}</span>
                <span v-if="currentPrompt.parentCode" class="parentInfo">父级: {{ currentPrompt.parentCode }}</span>
              </div>
            </div>
            <div class="editorActions">
              <a-button @click="resetToDefault">
                <i-redo theme="outline" size="14" fill="currentColor" />
                一键重置
              </a-button>
              <a-button type="primary" @click="savePrompt" :loading="saving">
                <i-check theme="outline" size="14" fill="currentColor" />
                保存
              </a-button>
            </div>
          </div>

          <div class="editorBody">
            <!-- 提示词编辑区 -->
            <div class="promptEditSection">
              <a-textarea
                v-model:value="editingValue"
                placeholder="请输入提示词内容"
                :autoSize="{ minRows: 18, maxRows: 26 }"
                class="promptTextarea" />
            </div>
            <div class="editorFooter">
              <div class="editorTip">
                <i-info theme="outline" size="14" fill="currentColor" />
                <span v-if="hasCustomValue">当前使用自定义提示词，点击"一键重置"可恢复默认值</span>
                <span v-else>当前使用默认提示词，编辑后将保存为自定义值</span>
              </div>
            </div>
          </div>
        </template>

        <div v-else class="emptyEditor">
          <i-edit theme="outline" size="48" fill="#d1d5db" />
          <p>请从左侧选择一个提示词进行编辑</p>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, h } from "vue";
import { message, Modal } from "ant-design-vue";
import axios from "@/utils/axios";

// 提示词数据结构
interface Prompt {
  id: number;
  code: string;
  name: string;
  type: "mainAgent" | "subAgent" | "system";
  parentCode: string;
  defaultValue: string;
  customValue: string;
}

interface PromptGroup {
  type: string;
  items: Prompt[];
}

const open = defineModel<boolean>({ default: false });

const promptList = ref<Prompt[]>([]);
const currentPrompt = ref<Prompt | null>(null);
const editingValue = ref("");
const saving = ref(false);

// 按类型分组
const groupedPrompts = computed<PromptGroup[]>(() => {
  const groups: Record<string, Prompt[]> = {};
  promptList.value.forEach((item) => {
    if (!groups[item.type]) {
      groups[item.type] = [];
    }
    groups[item.type].push(item);
  });

  const typeOrder = ["system", "mainAgent", "subAgent"];
  return typeOrder
    .filter((type) => groups[type])
    .map((type) => ({
      type,
      items: groups[type],
    }));
});

// 是否有自定义值（当前编辑内容与默认值不同）
const hasCustomValue = computed(() => {
  if (!currentPrompt.value) return false;
  const defaultVal = processLineBreaks(currentPrompt.value.defaultValue || "");
  return editingValue.value.trim() !== "" && editingValue.value !== defaultVal;
});

// 获取类型名称
function getTypeName(type: string): string {
  const typeMap: Record<string, string> = {
    mainAgent: "主Agent",
    subAgent: "子Agent",
    system: "系统提示词",
  };
  return typeMap[type] || type;
}

// 获取类型颜色
function getTypeColor(type: string): string {
  const colorMap: Record<string, string> = {
    mainAgent: "purple",
    subAgent: "blue",
    system: "green",
  };
  return colorMap[type] || "default";
}

// 处理换行符
function processLineBreaks(value: string): string {
  if (!value) return "";
  // 将转义的\n转换为实际换行符
  return value.replace(/\\n/g, "\n");
}

// 选择提示词
function selectPrompt(prompt: Prompt) {
  currentPrompt.value = prompt;
  // 优先显示自定义值，否则显示默认值
  const value = prompt.customValue || prompt.defaultValue || "";
  editingValue.value = processLineBreaks(value);
}

// 重置为默认值
function resetToDefault() {
  if (!currentPrompt.value) return;
  // 重置时显示默认值内容
  editingValue.value = processLineBreaks(currentPrompt.value.defaultValue || "");
  ElMessage.info("已重置为默认值，点击保存生效");
}

// 保存提示词
async function savePrompt() {
  if (!currentPrompt.value) return;

  saving.value = true;
  try {
    // 判断当前值是否与默认值相同，相同则保存空字符串
    const defaultVal = processLineBreaks(currentPrompt.value.defaultValue || "");
    const customVal = editingValue.value === defaultVal ? "" : editingValue.value.trim();

    await axios.post("/prompt/updatePrompt", {
      id: currentPrompt.value.id,
      code: currentPrompt.value.code,
      customValue: customVal,
    });

    // 更新本地数据
    const index = promptList.value.findIndex((p) => p.code === currentPrompt.value?.code);
    if (index !== -1) {
      promptList.value[index].customValue = customVal;
    }

    ElMessage.success("保存成功");
  } catch (error) {
    ElMessage.error("保存失败");
  } finally {
    saving.value = false;
  }
}

// 获取提示词列表
async function fetchPrompts() {
  try {
    const res = await axios.get("/prompt/getPrompts");
    promptList.value = res.data || [];
    // 默认选中第一个
    if (promptList.value.length > 0 && !currentPrompt.value) {
      selectPrompt(promptList.value[0]);
    }
  } catch (error) {
    ElMessage.error("获取提示词列表失败");
  }
}

// 监听弹窗打开
watch(open, (val) => {
  if (val) {
    fetchPrompts();
  } else {
    currentPrompt.value = null;
    editingValue.value = "";
  }
});
</script>

<style lang="scss" scoped>
.promptEditorContainer {
  display: flex;
  height: 80vh;
}

/* 左侧边栏 */
.promptSidebar {
  width: 240px;
  border-right: 1px solid #f0f0f0;
  display: flex;
  flex-direction: column;
  background: #fafafa;
  height: 100%;
  overflow: auto;
}

.sidebarHeader {
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.sidebarTitle {
  font-weight: 600;
  color: #1f2937;
}

.promptTypeGroup {
  padding: 8px 0;
}

.typeHeader {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
}

.promptItem {
  display: flex;
  flex-direction: column;
  padding: 10px 16px;
  cursor: pointer;
  transition: all 0.2s;
  border-left: 3px solid transparent;
}

.promptItem:hover {
  background: #f3e8ff;
}

.promptItem.active {
  background: #f3e8ff;
  border-left-color: var(--mainColor);
}

.promptName {
  font-size: 13px;
  color: #1f2937;
  font-weight: 500;
}

.promptCode {
  font-size: 11px;
  color: #9ca3af;
  font-family: monospace;
}

.emptyList {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: #9ca3af;
  gap: 8px;
}

/* 右侧编辑区 */
.promptEditor {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.editorHeader {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  gap: 16px;
}

.editorInfo {
  flex: 1;
  min-width: 0;
}

.editorTitle {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.editorMeta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.promptCodeBadge {
  font-size: 12px;
  color: #6b7280;
  background: #f3f4f6;
  padding: 2px 8px;
  border-radius: 4px;
  font-family: monospace;
}

.parentInfo {
  font-size: 12px;
  color: #9ca3af;
}

.editorActions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.editorActions .ant-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.titleRow {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.customBadge {
  font-size: 11px;
  color: #f97316;
  background: #fff7ed;
  padding: 3px 10px;
  border-radius: 12px;
  font-weight: 500;
}

.defaultBadge {
  font-size: 11px;
  color: #10b981;
  background: #ecfdf5;
  padding: 3px 10px;
  border-radius: 12px;
  font-weight: 500;
}

.editorBody {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.promptEditSection {
  flex: 1;
}

.promptTextarea {
  font-size: 13px;
  line-height: 1.7;
  border-radius: 8px;
  font-family: "SF Mono", Monaco, Menlo, Consolas, monospace;
}

.promptTextarea:focus {
  border-color: var(--mainColor);
  box-shadow: 0 0 0 3px rgba(152, 16, 250, 0.1);
}

:deep(.promptTextarea .ant-input) {
  font-family: "SF Mono", Monaco, Menlo, Consolas, monospace;
}

.editorFooter {
  padding-top: 12px;
}

.editorTip {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #9ca3af;
}

.emptyEditor {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #9ca3af;
}

.emptyEditor p {
  margin: 16px 0 0 0;
  font-size: 14px;
}

/* 主题色按钮 */
:deep(.ant-btn-primary) {
  background: var(--mainGradient);
  border: none;
}

:deep(.ant-btn-primary:hover) {
  background: var(--mainGradientHover);
}
</style>
