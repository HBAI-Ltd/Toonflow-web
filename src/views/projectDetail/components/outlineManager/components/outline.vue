<template>
  <div class="outline-container">
    <!-- 头部区域 -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">大纲管理</h1>
        <p class="page-desc">每一集的详细内容</p>
      </div>
      <t-button class="add-btn" @click="handleAddOutline">
        <i-plus :size="16" />
        新增大纲
      </t-button>
    </div>

    <!-- 大纲列表 -->
    <div class="outline-list" v-if="displayData.length">
      <div v-for="(item, index) in displayData" :key="item.id ?? index" class="outline-card">
        <div class="card-header">
          <div class="episode-badge">第 {{ item.episodeIndex }} 集</div>
          <div class="card-title">{{ item.title || "未命名" }}</div>
          <div class="card-actions">
            <t-button variant="text" size="small" class="action-btn" @click="startEdit(index)">
              <i-edit :size="16" />
            </t-button>
            <t-button variant="text" size="small" class="action-btn danger" @click="handleDelete(item)">
              <i-delete :size="16" />
            </t-button>
          </div>
        </div>

        <div class="card-body">
          <t-row :gutter="[16, 8]">
            <t-col :span="12">
              <div class="field-group highlight">
                <span class="field-icon">📖</span>
                <span class="field-label">章节范围</span>
                <span class="field-value">{{ formatChapterIndexes(item.chapterRange) }}</span>
              </div>
            </t-col>

            <t-col :span="4">
              <div class="field-group">
                <span class="field-icon">🎬</span>
                <span class="field-label">场景</span>
                <span class="field-value">{{ formatObjectArray(item.scenes) }}</span>
              </div>
            </t-col>

            <t-col :span="4">
              <div class="field-group">
                <span class="field-icon">👥</span>
                <span class="field-label">角色</span>
                <span class="field-value">{{ formatObjectArray(item.characters) }}</span>
              </div>
            </t-col>

            <t-col :span="4">
              <div class="field-group">
                <span class="field-icon">🎁</span>
                <span class="field-label">道具</span>
                <span class="field-value">{{ formatObjectArray(item.props) }}</span>
              </div>
            </t-col>

            <t-col :span="6">
              <div class="field-group">
                <span class="field-icon">🎯</span>
                <span class="field-label">核心冲突</span>
                <span class="field-value">{{ item.coreConflict || "—" }}</span>
              </div>
            </t-col>

            <t-col :span="6">
              <div class="field-group">
                <span class="field-icon">⚡</span>
                <span class="field-label">黄金3秒</span>
                <span class="field-value">{{ item.openingHook || "—" }}</span>
              </div>
            </t-col>

            <t-col :span="12" v-if="item.outline">
              <div class="field-group outline-field">
                <div class="field-header">
                  <span class="field-icon">📝</span>
                  <span class="field-label">剧情主干</span>
                </div>
                <p class="field-content">{{ item.outline }}</p>
              </div>
            </t-col>
          </t-row>

          <!-- 标签展示区 -->
          <div class="tags-section" v-if="item.keyEvents?.length || item.classicQuotes?.length">
            <div class="tag-group" v-if="item.keyEvents?.length">
              <span class="tag-label">关键节点</span>
              <div class="tag-list">
                <span v-for="(event, i) in item.keyEvents.slice(0, 3)" :key="i" class="custom-tag blue">{{ event }}</span>
                <span v-if="item.keyEvents.length > 3" class="custom-tag more">+{{ item.keyEvents.length - 3 }}</span>
              </div>
            </div>
            <div class="tag-group" v-if="item.classicQuotes?.length">
              <span class="tag-label">金句</span>
              <div class="tag-list">
                <span v-for="(quote, i) in item.classicQuotes.slice(0, 2)" :key="i" class="custom-tag purple">{{ quote }}</span>
                <span v-if="item.classicQuotes.length > 2" class="custom-tag more">+{{ item.classicQuotes.length - 2 }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div class="empty-state" v-else>
      <div class="empty-icon">📋</div>
      <p class="empty-text">暂无大纲数据</p>
      <t-button theme="primary" class="empty-btn" @click="handleAddOutline">创建第一个大纲</t-button>
    </div>

    <!-- 编辑弹窗 -->
    <t-dialog
      v-model:visible="editModalVisible"
      :header="isAddMode ? '新增大纲' : '编辑大纲'"
      width="900px"
      @confirm="saveEdit"
      @cancel="cancelEdit"
      class="outline-modal">
      <div class="modal-body">
        <t-form v-if="editTemp" layout="vertical" :data="editTemp" class="outline-form">
          <!-- 基础信息 -->
          <div class="form-section">
            <div class="section-title">
              <span class="section-icon">📌</span>
              基础信息
            </div>
            <t-row :gutter="16">
              <t-col :span="3">
                <t-form-item label="集数" name="episodeIndex">
                  <t-input-number v-model="editTemp.episodeIndex" :min="1" theme="normal" style="width: 100%" />
                </t-form-item>
              </t-col>
              <t-col :span="9">
                <t-form-item label="标题" name="title">
                  <t-input v-model="editTemp.title" :maxlength="100" placeholder="请输入本集标题" />
                </t-form-item>
              </t-col>
              <t-col :span="12">
                <t-form-item label="章节范围" name="chapterRange">
                  <div class="chapter-selector">
                    <t-button variant="outline" class="select-btn" @click="openChapterSelector">
                      <i-plus :size="14" />
                      选择章节
                    </t-button>
                    <span class="selected-text">{{ formatChapterIndexes(editTemp.chapterRange) || "未选择章节" }}</span>
                  </div>
                </t-form-item>
              </t-col>
            </t-row>
          </div>

          <!-- 资产关联 -->
          <div class="form-section">
            <div class="section-title">
              <span class="section-icon">🔗</span>
              资产关联
            </div>
            <t-row :gutter="16">
              <t-col :span="4" v-for="assetField in ['scenes', 'characters', 'props']" :key="assetField">
                <t-form-item :label="getAssetLabel(assetField)" :name="assetField">
                  <div class="asset-box">
                    <div class="asset-tags">
                      <span v-for="(obj, idx) in editTemp[assetField as keyof Outline] as ObjectItem[]" :key="idx" class="asset-tag">
                        {{ obj.name }}
                        <i-close :size="12" class="close-icon" @click="removeObjectItem(assetField, idx)" />
                      </span>
                    </div>
                    <t-button variant="dashed" size="small" class="add-asset-btn" @click="addObjectItem(assetField)">
                      <i-plus :size="12" />
                      添加
                    </t-button>
                  </div>
                </t-form-item>
              </t-col>
            </t-row>
          </div>

          <!-- 剧情设计 -->
          <div class="form-section">
            <div class="section-title">
              <span class="section-icon">🎭</span>
              剧情设计
            </div>
            <t-row :gutter="16">
              <t-col :span="6">
                <t-form-item label="黄金3秒" name="openingHook">
                  <t-input v-model="editTemp.openingHook" :maxlength="100" placeholder="开头吸引观众的亮点" />
                </t-form-item>
              </t-col>
              <t-col :span="6">
                <t-form-item label="结尾悬念" name="endingHook">
                  <t-input v-model="editTemp.endingHook" :maxlength="100" placeholder="结尾留下的悬念" />
                </t-form-item>
              </t-col>
              <t-col :span="12">
                <t-form-item label="核心冲突" name="coreConflict">
                  <t-input v-model="editTemp.coreConflict" :maxlength="200" placeholder="本集的核心矛盾点" />
                </t-form-item>
              </t-col>
              <t-col :span="12">
                <t-form-item label="剧情主干" name="outline">
                  <t-textarea
                    v-model="editTemp.outline"
                    :autosize="{ minRows: 4, maxRows: 8 }"
                    :maxlength="1000"
                    placeholder="详细描述本集剧情走向" />
                </t-form-item>
              </t-col>
            </t-row>
          </div>

          <!-- 补充信息 -->
          <div class="form-section">
            <div class="section-title">
              <span class="section-icon">💡</span>
              补充信息
            </div>
            <t-row :gutter="16">
              <t-col :span="6">
                <t-form-item label="关键节点" name="keyEvents">
                  <t-tag-input v-model="editTemp.keyEvents" placeholder="输入后回车添加" />
                </t-form-item>
              </t-col>
              <t-col :span="6">
                <t-form-item label="情绪曲线" name="emotionalCurve">
                  <t-input v-model="editTemp.emotionalCurve" placeholder="如：低开高走、波浪起伏" />
                </t-form-item>
              </t-col>
              <t-col :span="6">
                <t-form-item label="视觉重点" name="visualHighlights">
                  <t-tag-input v-model="editTemp.visualHighlights" placeholder="输入后回车添加" />
                </t-form-item>
              </t-col>
              <t-col :span="6">
                <t-form-item label="金句" name="classicQuotes">
                  <t-tag-input v-model="editTemp.classicQuotes" placeholder="输入后回车添加" />
                </t-form-item>
              </t-col>
            </t-row>
          </div>
        </t-form>
      </div>
    </t-dialog>

    <!-- 资产选择弹窗 -->
    <t-dialog v-model:visible="assetsSelectorVisible" @confirm="handleAssetSelected" width="60vw" header="选择资产" class="asset-modal">
      <div style="height: 600px; overflow-y: auto">
        <mainElement ref="mainElementRef" way="checkbox" :radio="currentRadio" v-if="assetsSelectorVisible" />
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { storeToRefs } from "pinia";
import axios from "@/utils/axios";
import { MessagePlugin, DialogPlugin } from "tdesign-vue-next";
import mainElement from "@/views/projectDetail/components/assetsManager/components/mainElement.vue";
import store from "@/stores";

const { projectId } = storeToRefs(store());

interface ObjectItem {
  name: string;
  description: string;
}

interface Outline {
  id?: number;
  episodeIndex: number;
  title: string;
  chapterRange: number[];
  scenes: ObjectItem[];
  characters: ObjectItem[];
  props: ObjectItem[];
  coreConflict: string;
  openingHook: string;
  outline: string;
  keyEvents: string[];
  emotionalCurve: string;
  visualHighlights: string[];
  endingHook: string;
  classicQuotes: string[];
}

interface ChapterData {
  id: number;
  index: string;
  chapter: string;
}

const assetLabelMap: Record<string, string> = {
  scenes: "场景",
  characters: "角色",
  props: "道具",
};

const typeMap: Record<string, "role" | "scene" | "props"> = {
  characters: "role",
  scenes: "scene",
  props: "props",
};

const defaultOutline = (): Outline => ({
  episodeIndex: 0,
  title: "",
  chapterRange: [],
  scenes: [],
  characters: [],
  props: [],
  coreConflict: "",
  openingHook: "",
  outline: "",
  keyEvents: [],
  emotionalCurve: "",
  visualHighlights: [],
  endingHook: "",
  classicQuotes: [],
});

const rawData = ref<{ id: number; episode: number; data: string }[]>([]);
const chapterList = ref<ChapterData[]>([]);
const editModalVisible = ref(false);
const editingIndex = ref<number | null>(null);
const editTemp = ref<Outline | null>(null);
const isAddMode = ref(false);
const assetsSelectorVisible = ref(false);
const currentRadio = ref<"props" | "role" | "scene">();
const mainElementRef = ref();
const assetResolve = ref<(data: any) => void>();

const displayData = computed<Outline[]>(() =>
  rawData.value.map((item) => {
    try {
      const parsed = JSON.parse(item.data);
      return { ...defaultOutline(), ...parsed, id: item.id, episodeIndex: parsed.episodeIndex || item.episode };
    } catch {
      return { ...defaultOutline(), id: item.id, episodeIndex: item.episode };
    }
  }),
);

function getAssetLabel(key: string): string {
  return assetLabelMap[key] || key;
}

function formatObjectArray(arr?: ObjectItem[]): string {
  return (
    arr
      ?.map((i) => i.name)
      .filter(Boolean)
      .join("、") || "—"
  );
}

function formatChapterIndexes(indexes?: number[]): string {
  if (!indexes?.length) return "—";
  return [...indexes]
    .sort((a, b) => a - b)
    .map((i) => {
      const ch = chapterList.value.find((c) => Number(c.index) === i);
      return ch ? `第${i}章` : `第${i}章`;
    })
    .join("、");
}

async function getData() {
  try {
    const res = await axios.post("/outline/getOutline", { projectId: projectId.value });
    rawData.value = res.data || [];
  } catch {
    MessagePlugin.error("获取大纲数据失败");
  }
}

async function getChapterList() {
  try {
    const res = await axios.post("/novel/getNovel", { projectId: projectId.value });
    chapterList.value = res.data || [];
  } catch {
    MessagePlugin.error("获取章节列表失败");
  }
}

function startEdit(index: number) {
  isAddMode.value = false;
  editingIndex.value = index;
  editTemp.value = JSON.parse(JSON.stringify(displayData.value[index]));
  editModalVisible.value = true;
}

function handleAddOutline() {
  isAddMode.value = true;
  editingIndex.value = null;
  editTemp.value = { ...defaultOutline(), episodeIndex: displayData.value.length + 1 };
  editModalVisible.value = true;
}

function cancelEdit() {
  editModalVisible.value = false;
  editingIndex.value = null;
  editTemp.value = null;
  isAddMode.value = false;
}

async function saveEdit() {
  if (!editTemp.value) return;
  try {
    const data = JSON.stringify(editTemp.value);
    if (isAddMode.value) {
      await axios.post("/outline/addOutline", { projectId: projectId.value, data });
      MessagePlugin.success("新增成功");
    } else {
      await axios.post("/outline/updateOutline", { id: editTemp.value.id, projectId: projectId.value, data });
      MessagePlugin.success("保存成功");
    }
    getData();
    cancelEdit();
  } catch {
    MessagePlugin.error(isAddMode.value ? "新增失败" : "保存失败");
  }
}

function handleDelete(outline: Outline) {
  const dialog = DialogPlugin.confirm({
    header: "高危操作",
    body: "删除大纲将会删除该大纲下的剧本和独有资产",
    theme: "warning",
    confirmBtn: "确定",
    cancelBtn: "取消",
    onConfirm: async () => {
      await axios.post("/outline/delOutline", { id: outline.id, projectId: projectId.value });
      MessagePlugin.success("删除成功");
      getData();
      dialog.destroy();
    },
  });
}

async function addObjectItem(key: string) {
  if (!editTemp.value) return;
  currentRadio.value = typeMap[key];
  assetsSelectorVisible.value = true;

  const data = await new Promise<{ name: string; intro: string }[]>((resolve) => {
    assetResolve.value = resolve;
  });

  (editTemp.value[key as keyof Outline] as ObjectItem[]).push(...data.map((i) => ({ name: i.name, description: i.intro })));
}

function removeObjectItem(key: string, index: number) {
  (editTemp.value?.[key as keyof Outline] as ObjectItem[])?.splice(index, 1);
}

function handleAssetSelected() {
  assetResolve.value?.(mainElementRef.value.getSelectData());
  assetsSelectorVisible.value = false;
}

function openChapterSelector() {
  // 章节选择逻辑
}

onMounted(() => {
  getData();
  getChapterList();
});

defineExpose({ getData });
</script>

<style scoped lang="scss">
.outline-container {
  max-width: 100%;
  margin: 0 auto;
  padding: 20px;
  background: var(--td-bg-color-page);
  min-height: 100%;
}

// 头部样式
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 24px;
  background: var(--mainGradient);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(152, 16, 250, 0.25);

  .header-content {
    .page-title {
      font-size: 22px;
      font-weight: 700;
      margin: 0 0 6px;
      color: #fff;
    }
    .page-desc {
      margin: 0;
      opacity: 0.9;
      font-size: 14px;
      color: rgba(255, 255, 255, 0.9);
    }
  }

  .add-btn {
    background: rgba(255, 255, 255, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.5);
    color: #fff;
    height: 40px;
    padding: 0 20px;
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 500;
    transition: all 0.3s;

    &:hover {
      background: rgba(255, 255, 255, 0.35);
      border-color: #fff;
      transform: translateY(-1px);
    }
  }
}

// 列表样式
.outline-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.outline-card {
  background: var(--td-bg-color-container);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: var(--td-shadow-1);
  border: 1px solid var(--td-component-stroke);
  transition: all 0.3s ease;

  &:hover {
    box-shadow: var(--td-shadow-2);
    border-color: var(--td-brand-color-light-hover);
    transform: translateY(-2px);
  }

  .card-header {
    display: flex;
    align-items: center;
    padding: 16px 20px;
    background: var(--td-brand-color-light);
    border-bottom: 1px solid var(--td-brand-color-light-hover);

    .episode-badge {
      background: var(--mainGradient);
      color: #fff;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      margin-right: 14px;
      box-shadow: 0 2px 8px rgba(152, 16, 250, 0.3);
    }

    .card-title {
      flex: 1;
      font-size: 16px;
      font-weight: 600;
      color: var(--td-text-color-primary);
    }

    .card-actions {
      display: flex;
      gap: 4px;

      .action-btn {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--td-text-color-secondary);
        transition: all 0.2s;

        &:hover {
          background: var(--td-brand-color-light);
          color: var(--td-brand-color);
        }

        &.danger:hover {
          background: var(--td-error-color-light);
          color: var(--td-error-color);
        }
      }
    }
  }

  .card-body {
    padding: 16px 20px;
  }
}

// 字段样式
.field-group {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  background: var(--td-bg-color-secondarycontainer);
  border-radius: 10px;
  font-size: 13px;
  transition: all 0.2s;

  &:hover {
    background: var(--td-bg-color-secondarycontainer-hover);
  }

  &.highlight {
    background: var(--td-brand-color-light);
    border: 1px solid var(--td-brand-color-light-hover);
  }

  .field-icon {
    margin-right: 10px;
    font-size: 15px;
  }

  .field-label {
    color: var(--td-text-color-secondary);
    min-width: 65px;
    flex-shrink: 0;
    font-weight: 500;
  }

  .field-value {
    color: var(--td-text-color-primary);
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &.outline-field {
    flex-direction: column;
    align-items: flex-start;

    .field-header {
      display: flex;
      align-items: center;
      margin-bottom: 10px;
    }

    .field-content {
      margin: 0;
      color: var(--td-text-color-secondary);
      line-height: 1.7;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  }
}

// 标签样式
.tags-section {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px dashed var(--td-component-stroke);

  .tag-group {
    display: flex;
    align-items: center;
    margin-bottom: 10px;

    &:last-child {
      margin-bottom: 0;
    }

    .tag-label {
      font-size: 12px;
      color: var(--td-text-color-secondary);
      min-width: 65px;
      font-weight: 500;
    }

    .tag-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
  }
}

.custom-tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;

  &.blue {
    background: var(--td-brand-color-light);
    color: var(--td-brand-color);
    border: 1px solid var(--td-brand-color-light-hover);
  }

  &.purple {
    background: var(--td-brand-color-light);
    color: var(--td-brand-color);
    border: 1px solid var(--td-brand-color-light-hover);
  }

  &.more {
    background: var(--td-bg-color-secondarycontainer);
    color: var(--td-text-color-placeholder);
    border: 1px solid var(--td-component-stroke);
  }
}

// 空状态
.empty-state {
  padding: 80px 20px;
  background: var(--td-bg-color-container);
  border-radius: 16px;
  text-align: center;
  border: 2px dashed var(--td-component-stroke);

  .empty-icon {
    font-size: 48px;
    margin-bottom: 16px;
  }

  .empty-text {
    color: var(--td-text-color-placeholder);
    font-size: 15px;
    margin-bottom: 20px;
  }

  .empty-btn {
    background: var(--mainGradient);
    border: none;
    height: 40px;
    padding: 0 24px;
    font-weight: 500;

    &:hover {
      background: var(--mainGradientHover);
    }
  }
}

// 弹窗内容
.modal-body {
  max-height: 70vh;
  overflow-y: auto;
  padding: 4px;
}

// 表单弹窗样式
.form-section {
  margin-bottom: 20px;
  padding: 20px;
  background: var(--td-bg-color-secondarycontainer);
  border-radius: 12px;
  border: 1px solid var(--td-component-stroke);

  &:last-child {
    margin-bottom: 0;
  }

  .section-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--td-text-color-primary);
    margin-bottom: 18px;
    display: flex;
    align-items: center;
    gap: 8px;

    .section-icon {
      font-size: 16px;
    }

    &::after {
      content: "";
      flex: 1;
      height: 1px;
      background: linear-gradient(90deg, var(--td-component-stroke) 0%, transparent 100%);
      margin-left: 12px;
    }
  }
}

.chapter-selector {
  display: flex;
  align-items: center;
  gap: 14px;

  .select-btn {
    border-color: var(--td-brand-color);
    color: var(--td-brand-color);
    display: flex;
    align-items: center;
    gap: 4px;

    &:hover {
      background: var(--td-brand-color-light);
    }
  }

  .selected-text {
    color: var(--td-text-color-secondary);
    font-size: 13px;
  }
}

.asset-box {
  min-height: 80px;
  padding: 12px;
  background: var(--td-bg-color-container);
  border: 1px dashed var(--td-component-border);
  border-radius: 10px;
  transition: all 0.2s;

  &:hover {
    border-color: var(--td-brand-color);
  }

  .asset-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 10px;
  }

  .asset-tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 10px;
    background: var(--td-brand-color-light);
    color: var(--td-brand-color);
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;

    .close-icon {
      cursor: pointer;
      opacity: 0.7;
      transition: opacity 0.2s;

      &:hover {
        opacity: 1;
      }
    }
  }

  .add-asset-btn {
    border-color: var(--td-component-border);
    color: var(--td-text-color-secondary);

    &:hover {
      border-color: var(--td-brand-color);
      color: var(--td-brand-color);
    }
  }
}
</style>
