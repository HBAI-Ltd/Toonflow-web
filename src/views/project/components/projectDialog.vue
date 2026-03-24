<template>
  <div class="addProject">
    <t-dialog
      placement="center"
      v-model:visible="addProjectShow"
      :header="isEdit ? '编辑项目' : '新建项目'"
      width="60%"
      @confirm="handleOk"
      @close-btn-click="handleCancel"
      @cancel="handleCancel"
      :confirm-btn="isEdit ? '保存' : '确定'"
      cancel-btn="取消">
      <t-form :data="formState" label-align="left">
        <t-form-item v-if="!isEdit" label="项目类型">
          <t-select v-model="formState.projectType" placeholder="选择项目类型">
            <t-option key="基于小说原文" label="基于小说原文" value="基于小说原文" />
            <!-- <t-option key="基于剧本" label="基于剧本" value="基于剧本" /> -->
          </t-select>
        </t-form-item>
        <t-form-item label="项目名称">
          <t-input v-model="formState.name" placeholder="请输入项目名称" />
        </t-form-item>
        <t-form-item label="小说类型">
          <t-input v-model="formState.type" placeholder="例如:玄幻、科幻、言情" />
        </t-form-item>
        <t-form-item label="影片画风">
          <div class="artStylePicker">
            <div class="artStyleHeader">
              <div class="headerLeft">
                <span v-if="formState.artStyle" class="selectedLabel">
                  已选：
                  <t-tag theme="primary" size="small" closable @close="formState.artStyle = ''">{{ formState.artStyle }}</t-tag>
                </span>
                <span v-else class="selectedHint">请选择画风</span>
              </div>
              <t-button size="small" variant="outline" @click="openArtStyleDialog()">
                <template #icon><i-plus size="14" /></template>
                新建画风
              </t-button>
            </div>
            <div class="artStyleContent">
              <t-loading :loading="artStyleLoading" text="加载中...">
                <div class="gridContainer">
                  <div
                    v-for="item in artStyleOptions"
                    :key="item.label"
                    class="gridItem"
                    :class="{ active: formState.artStyle === item.label }"
                    @click="formState.artStyle = item.label">
                    <div class="imageWrapper">
                      <img :src="item.fileUrl" :alt="item.label" class="artImage" loading="lazy" />
                      <div class="text">{{ item.label }}</div>
                      <div class="editBtn" @click.stop="openArtStyleDialog(item)">
                        <i-edit theme="outline" size="14" />
                      </div>
                    </div>
                  </div>
                </div>
              </t-loading>
            </div>
          </div>
        </t-form-item>
        <t-form-item label="影片比例">
          <t-select v-model="formState.videoRatio" :options="RATIO_OPTIONS" />
        </t-form-item>
        <t-form-item label="小说简介">
          <t-textarea v-model="formState.intro" :autosize="{ minRows: 3, maxRows: 10 }" placeholder="请输入小说简介" />
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 新建/编辑画风弹窗 -->
    <t-dialog
      class="artStyleDialog"
      v-model:visible="artStyleDialogVisible"
      :header="editingArtStyle ? '编辑画风' : '新建画风'"
      width="80vw"
      placement="center"
      @confirm="handleArtStyleSubmit"
      @close-btn-click="resetArtStyleDialog"
      @cancel="resetArtStyleDialog"
      confirm-btn="确定"
      cancel-btn="取消">
      <t-form label-align="left">
        <t-form-item label="画风名称">
          <t-input v-model="artStyleForm.name" placeholder="请输入画风名称" />
        </t-form-item>
        <t-form-item label="画风图片">
          <div class="coverUploadArea">
            <div v-if="artStyleForm.coverUrl" class="coverPreview">
              <img :src="artStyleForm.coverUrl" class="coverImg" />
              <div class="coverActions">
                <t-button size="small" variant="text" theme="danger" @click="artStyleForm.coverUrl = ''">移除</t-button>
              </div>
            </div>
            <div v-else class="coverUploadTrigger" @click="triggerCoverUpload">
              <input ref="coverInputRef" type="file" accept="image/*" style="display: none" @change="handleCoverFileChange" />
              <i-plus size="24" />
              <span>上传封面</span>
            </div>
          </div>
        </t-form-item>
        <t-form-item label="画风提示词">
          <div class="promptEditorWrapper">
            <div class="promptEditorHeader">
              <div class="aiExtractInline">
                <div class="aiImageList">
                  <div v-for="(img, idx) in aiImagePreviews" :key="idx" class="aiImageItem">
                    <img :src="img" class="aiImg" />
                    <div class="aiImgRemove" @click="removeAiImage(idx)">
                      <i-close size="10" />
                    </div>
                  </div>
                  <div class="aiImageAdd" @click="triggerAiUpload">
                    <input ref="aiInputRef" type="file" accept="image/*" multiple style="display: none" @change="handleAiFileChange" />
                    <i-plus size="14" />
                  </div>
                </div>
                <t-button size="small" theme="primary" :loading="extractLoading" :disabled="!aiImagePreviews.length" @click="extractStylePrompt">
                  <template #icon><i-magic size="14" /></template>
                  AI提取提示词
                </t-button>
              </div>
            </div>
            <MdEditor
              v-model="artStyleForm.prompt"
              :theme="'light'"
              :toolbars="promptToolbars"
              :footers="[]"
              :placeholder="'描述画风提示词，用于生成图片时指定风格'"
              style="height: 47vh"
              @onUploadImg="() => {}" />
          </div>
        </t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import axios from "@/utils/axios";
import { MdEditor } from "md-editor-v3";
import type { ToolbarNames } from "md-editor-v3";
import "md-editor-v3/lib/style.css";

const addProjectShow = defineModel<boolean>();
const props = defineProps<{
  projectData?: ProjectData | null;
}>();
const emit = defineEmits<{
  (e: "add", data: ProjectFormData): void;
  (e: "edit", data: { id: string; name: string; intro: string; type: string; artStyle: string; videoRatio: string }): void;
}>();

// ===== 类型定义 =====
interface ProjectData {
  id: string;
  name: string;
  intro: string;
  type: string;
  artStyle: string | null;
  videoRatio: string | null;
}

interface ProjectFormData {
  projectType: string;
  name: string;
  intro: string;
  type: string;
  artStyle: string;
  videoRatio: string;
}

interface ArtStyleItem {
  id?: string | number;
  fileUrl: string;
  label: string;
  prompt?: string;
}

const isEdit = computed(() => !!props.projectData);

// ===== 常量 =====
const RATIO_OPTIONS = [
  { value: "16:9", label: "16:9" },
  { value: "9:16", label: "9:16" },
];

const DEFAULT_FORM: () => ProjectFormData & { id: number; era: string; createTime: number; userId: number } = () => ({
  id: 0,
  projectType: "基于小说原文",
  name: "",
  intro: "",
  type: "",
  artStyle: "",
  era: "",
  videoRatio: "16:9",
  createTime: 0,
  userId: 0,
});

// ===== 表单 =====
const formState = ref(DEFAULT_FORM());

function resetForm() {
  formState.value = DEFAULT_FORM();
}

function handleCancel() {
  addProjectShow.value = false;
  resetForm();
}

function handleOk() {
  if (isEdit.value) {
    emit("edit", {
      id: formState.value.id as unknown as string,
      name: formState.value.name,
      intro: formState.value.intro,
      type: formState.value.type,
      artStyle: formState.value.artStyle,
      videoRatio: formState.value.videoRatio,
    });
  } else {
    emit("add", {
      projectType: formState.value.projectType || "基于小说原文",
      name: formState.value.name || "名称",
      intro: formState.value.intro || "这个是一条小说简介",
      type: formState.value.type || "玄幻",
      artStyle: formState.value.artStyle || "动漫",
      videoRatio: formState.value.videoRatio || "16:9",
    });
  }
  resetForm();
  addProjectShow.value = false;
}

// ===== 影片画风 =====
const artStyleOptions = ref<ArtStyleItem[]>([]);
const artStyleLoading = ref(false);

const promptToolbars: ToolbarNames[] = [
  "bold",
  "italic",
  "strikeThrough",
  "-",
  "unorderedList",
  "orderedList",
  "-",
  "revoke",
  "next",
  "=",
  "preview",
];

// 画风弹窗
const artStyleDialogVisible = ref(false);
const editingArtStyle = ref<ArtStyleItem | null>(null);
const artStyleForm = ref({ name: "", coverUrl: "", prompt: "" });
const coverInputRef = ref<HTMLInputElement>();
const aiInputRef = ref<HTMLInputElement>();
const aiImagePreviews = ref<string[]>([]);
const aiImageFiles = ref<File[]>([]);
const extractLoading = ref(false);

function openArtStyleDialog(item?: ArtStyleItem) {
  if (item) {
    editingArtStyle.value = item;
    artStyleForm.value = { name: item.label, coverUrl: item.fileUrl, prompt: item.prompt || "" };
  } else {
    editingArtStyle.value = null;
    artStyleForm.value = { name: "", coverUrl: "", prompt: "" };
  }
  aiImagePreviews.value = [];
  aiImageFiles.value = [];
  artStyleDialogVisible.value = true;
}

function resetArtStyleDialog() {
  artStyleDialogVisible.value = false;
  editingArtStyle.value = null;
  artStyleForm.value = { name: "", coverUrl: "", prompt: "" };
  aiImagePreviews.value = [];
  aiImageFiles.value = [];
}

function triggerCoverUpload() {
  coverInputRef.value?.click();
}

function handleCoverFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    artStyleForm.value.coverUrl = reader.result as string;
  };
  reader.readAsDataURL(file);
  (e.target as HTMLInputElement).value = "";
}

function triggerAiUpload() {
  aiInputRef.value?.click();
}

function handleAiFileChange(e: Event) {
  const files = (e.target as HTMLInputElement).files;
  if (!files) return;
  Array.from(files).forEach((file) => {
    aiImageFiles.value.push(file);
    const reader = new FileReader();
    reader.onload = () => {
      aiImagePreviews.value.push(reader.result as string);
    };
    reader.readAsDataURL(file);
  });
  (e.target as HTMLInputElement).value = "";
}

function removeAiImage(idx: number) {
  aiImagePreviews.value.splice(idx, 1);
  aiImageFiles.value.splice(idx, 1);
}

async function extractStylePrompt() {
  if (!aiImagePreviews.value.length) return;
  extractLoading.value = true;
  try {
    const { data } = await axios.post("/artStyle/extractStylePrompt", {
      images: aiImagePreviews.value,
    });
    artStyleForm.value.prompt = data.prompt || data;
    MessagePlugin.success("提示词提取成功");
  } catch (e: any) {
    MessagePlugin.error(e.message ?? "提取失败");
  } finally {
    extractLoading.value = false;
  }
}

async function handleArtStyleSubmit() {
  if (!artStyleForm.value.name.trim()) {
    MessagePlugin.warning("请输入画风名称");
    return;
  }
  try {
    if (editingArtStyle.value) {
      await axios.post("/artStyle/editArtStyle", {
        id: editingArtStyle.value.id,
        name: artStyleForm.value.name,
        fileUrl: artStyleForm.value.coverUrl,
        prompt: artStyleForm.value.prompt,
      });
      MessagePlugin.success("画风已更新");
    } else {
      await axios.post("/artStyle/addArtStyle", {
        name: artStyleForm.value.name,
        fileUrl: artStyleForm.value.coverUrl,
        prompt: artStyleForm.value.prompt,
      });
      MessagePlugin.success("画风已添加");
    }
    resetArtStyleDialog();
    fetchArtStyles();
  } catch (e: any) {
    MessagePlugin.error(e.message ?? "操作失败");
  }
}

watch(addProjectShow, (visible) => {
  if (visible) {
    if (props.projectData) {
      formState.value = {
        ...DEFAULT_FORM(),
        id: props.projectData.id as unknown as number,
        name: props.projectData.name || "",
        intro: props.projectData.intro || "",
        type: props.projectData.type || "",
        artStyle: props.projectData.artStyle || "",
        videoRatio: props.projectData.videoRatio || "16:9",
      };
    } else {
      resetForm();
    }
    fetchArtStyles();
  }
});

function fetchArtStyles() {
  artStyleLoading.value = true;
  axios
    .post("/artStyle/getArtStyle", {})
    .then(({ data }) => {
      artStyleOptions.value = data.map((item: { id?: string | number; fileUrl: string; name: string; prompt?: string }) => ({
        id: item.id,
        fileUrl: item.fileUrl,
        label: item.name,
        prompt: item.prompt,
      }));
    })
    .finally(() => {
      artStyleLoading.value = false;
    });
}
</script>

<style lang="scss" scoped>
.artStylePicker {
  width: 100%;

  .artStyleHeader {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;

    .headerLeft {
      display: flex;
      align-items: center;
    }

    .selectedLabel {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: var(--td-text-color-secondary);
    }

    .selectedHint {
      font-size: 13px;
      color: var(--td-text-color-placeholder);
    }
  }

  .artStyleContent {
    height: 220px;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 4px;
  }
}

.gridContainer {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 12px;

  .gridItem {
    cursor: pointer;
    transition: transform 0.2s ease;
    border: 2px solid transparent;
    border-radius: 6px;

    &:hover {
      transform: scale(1.03);
      z-index: 1;

      .editBtn {
        opacity: 1;
      }
    }

    &.active {
      border-color: var(--td-brand-color);
    }

    .imageWrapper {
      position: relative;
      overflow: hidden;
      border-radius: 4px;

      .artImage {
        width: 100%;
        aspect-ratio: 1;
        object-fit: cover;
        display: block;
      }

      .text {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        background: rgba(0, 0, 0, 0.5);
        color: #fff;
        text-align: center;
        padding: 6px;
        font-size: 12px;
        line-height: 1;
      }

      .editBtn {
        position: absolute;
        top: 4px;
        right: 4px;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.9);
        border-radius: 4px;
        cursor: pointer;
        opacity: 0;
        transition: opacity 0.2s;

        &:hover {
          background: #fff;
        }
      }
    }
  }
}

// 画风弹窗样式
.coverUploadArea {
  width: 100%;

  .coverPreview {
    display: flex;
    align-items: center;
    gap: 12px;

    .coverImg {
      width: 80px;
      height: 80px;
      object-fit: cover;
      border-radius: 6px;
      border: 1px solid var(--td-component-border);
    }
  }

  .coverUploadTrigger {
    width: 80px;
    height: 80px;
    border: 2px dashed var(--td-component-border);
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--td-text-color-placeholder);
    gap: 4px;
    font-size: 12px;
    transition: border-color 0.2s;

    &:hover {
      border-color: var(--td-brand-color);
      color: var(--td-brand-color);
    }
  }
}

// AI提取行内样式（放在MdEditor上方）
.promptEditorWrapper {
  width: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;

  .promptEditorHeader {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    margin-bottom: 8px;

    .aiExtractInline {
      display: flex;
      align-items: center;
      gap: 8px;

      .aiImageList {
        display: flex;
        align-items: center;
        gap: 4px;

        .aiImageItem {
          position: relative;
          width: 36px;
          height: 36px;

          .aiImg {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 4px;
            border: 1px solid var(--td-component-border);
          }

          .aiImgRemove {
            position: absolute;
            top: -5px;
            right: -5px;
            width: 16px;
            height: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--td-error-color);
            color: #fff;
            border-radius: 50%;
            cursor: pointer;
            font-size: 9px;
          }
        }

        .aiImageAdd {
          width: 36px;
          height: 36px;
          border: 2px dashed var(--td-component-border);
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--td-text-color-placeholder);
          transition: border-color 0.2s;

          &:hover {
            border-color: var(--td-brand-color);
            color: var(--td-brand-color);
          }
        }
      }
    }
  }
}

// MdEditor 在弹窗内的样式调整
:deep(.md-editor) {
  border-radius: 6px;
}

// 画风弹窗整体高度72vh
:deep(.artStyleDialog) {
  .t-dialog__body {
    height: 72vh;
    overflow-y: auto;
  }
}
</style>
