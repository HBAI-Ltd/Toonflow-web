<template>
  <div class="addProject">
    <t-dialog
      placement="center"
      v-model:visible="addProjectShow"
      :header="isEdit ? $t('workbench.project.dialog.editTitle') : $t('workbench.project.dialog.addTitle')"
      width="60%"
      @confirm="handleOk"
      @close-btn-click="handleCancel"
      @cancel="handleCancel"
      :confirm-btn="isEdit ? $t('workbench.project.dialog.save') : $t('workbench.project.dialog.ok')"
      :cancel-btn="$t('workbench.project.dialog.cancel')">
      <t-form :data="formState" label-align="top">
        <t-form-item v-if="!isEdit" :label="$t('workbench.project.dialog.projectType')">
          <t-select v-model="formState.projectType" :placeholder="$t('workbench.project.dialog.selectType')">
            <t-option key="基于小说原文" :label="$t('workbench.project.dialog.basedOnNovel')" value="novel" />
            <!-- <t-option key="basedOnScript" :label="$t('workbench.project.dialog.basedOnScript')" value="script" /> -->
          </t-select>
        </t-form-item>
        <t-form-item :label="$t('workbench.project.dialog.projectName')">
          <t-input v-model="formState.name" :placeholder="$t('workbench.project.dialog.projectNamePh')" />
        </t-form-item>
        <t-form-item :label="$t('workbench.project.dialog.novelType')">
          <t-input v-model="formState.type" :placeholder="$t('workbench.project.dialog.novelTypePh')" />
        </t-form-item>
        <t-form-item :label="$t('workbench.project.dialog.modelData')">
          <modelSelect v-model="imageModel" type="image" />
        </t-form-item>
        <t-form-item :label="$t('workbench.project.dialog.videoModelData')">
          <modelSelect v-model="videoModel" type="video" />
        </t-form-item>
        <t-form-item :label="$t('workbench.project.dialog.artStyle')">
          <div class="artStylePicker">
            <div class="artStyleHeader">
              <!-- <div class="headerLeft">
                <span v-if="formState.artStyle" class="selectedLabel">
                  {{ $t("workbench.project.dialog.selected") }}
                  <t-tag theme="primary" size="small" closable @close="formState.artStyle = ''">{{ formState.artStyle }}</t-tag>
                </span>
                <span v-else class="selectedHint">{{ $t("workbench.project.dialog.selectArtStyle") }}</span>
              </div> -->
              <t-button size="small" variant="outline" @click="openArtStyleDialog()">
                <template #icon><i-plus size="14" /></template>
                {{ $t("workbench.project.dialog.newArtStyle") }}
              </t-button>
            </div>
            <div class="artStyleContent">
              <t-loading :loading="artStyleLoading" :text="$t('workbench.project.dialog.loading')">
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
                    </div>
                    <div class="editBtn" @click.stop="openArtStyleDialog(item)">
                      <i-edit theme="outline" size="14" />
                    </div>
                  </div>
                </div>
              </t-loading>
            </div>
          </div>
        </t-form-item>
        <t-form-item :label="$t('workbench.project.dialog.videoRatio')">
          <t-select v-model="formState.videoRatio" :options="RATIO_OPTIONS" />
        </t-form-item>
        <t-form-item :label="$t('workbench.project.dialog.novelIntro')">
          <t-textarea v-model="formState.intro" :autosize="{ minRows: 3, maxRows: 10 }" :placeholder="$t('workbench.project.dialog.novelIntroPh')" />
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 新建/编辑画风弹窗 -->
    <t-dialog
      class="artStyleDialog"
      v-model:visible="artStyleDialogVisible"
      :header="editingArtStyle ? $t('workbench.project.dialog.editArtStyleTitle') : $t('workbench.project.dialog.newArtStyleTitle')"
      width="80vw"
      placement="center"
      @confirm="handleArtStyleSubmit"
      @close-btn-click="resetArtStyleDialog"
      @cancel="resetArtStyleDialog"
      :confirm-btn="$t('workbench.project.dialog.ok')"
      :cancel-btn="$t('workbench.project.dialog.cancel')">
      <t-form label-align="top">
        <t-form-item :label="$t('workbench.project.dialog.artStyleName')">
          <t-input v-model="artStyleForm.name" :placeholder="$t('workbench.project.dialog.artStyleNamePh')" />
        </t-form-item>
        <t-form-item :label="$t('workbench.project.dialog.artStyleImage')">
          <div class="coverUploadArea">
            <div v-if="artStyleForm.coverUrl" class="coverPreview">
              <img :src="artStyleForm.coverUrl" class="coverImg" />
              <div class="coverActions">
                <t-button size="small" variant="text" theme="danger" @click="artStyleForm.coverUrl = ''">
                  {{ $t("workbench.project.dialog.remove") }}
                </t-button>
              </div>
            </div>
            <div v-else class="coverUploadTrigger" @click="triggerCoverUpload">
              <input ref="coverInputRef" type="file" accept="image/*" style="display: none" @change="handleCoverFileChange" />
              <i-plus size="24" />
              <span>{{ $t("workbench.project.dialog.uploadCover") }}</span>
            </div>
          </div>
        </t-form-item>
        <t-form-item :label="$t('workbench.project.dialog.artStylePrompt')">
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
                  {{ $t("workbench.project.dialog.aiExtract") }}
                </t-button>
              </div>
            </div>
            <MdEditor
              v-model="artStyleForm.prompt"
              :theme="'light'"
              :toolbars="promptToolbars"
              :footers="[]"
              :placeholder="$t('workbench.project.dialog.promptPlaceholder')"
              style="height: 36vh"
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
import modelSelect from "@/components/modelSelect.vue";

const addProjectShow = defineModel<boolean>();
const imageModel = ref(""); // 保存图片模型选择的数据
const videoModel = ref(""); // 保存视频模型选择的数据
const props = defineProps<{
  projectData?: ProjectData | null;
}>();
const emit = defineEmits<{
  (e: "add", data: ProjectFormData): void;
  (
    e: "edit",
    data: { id: string; name: string; intro: string; type: string; artStyle: string; videoRatio: string; imageModel: string; videoModel: string },
  ): void;
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
  imageModel: string;
  videoModel: string;
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
  projectType: "novel",
  name: "",
  intro: "",
  type: "",
  artStyle: "",
  era: "",
  videoRatio: "16:9",
  createTime: 0,
  userId: 0,
  imageModel: "",
  videoModel: "",
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
      imageModel: imageModel.value,
      videoModel: videoModel.value,
    });
  } else {
    emit("add", {
      projectType: formState.value.projectType || "novel",
      name: formState.value.name,
      intro: formState.value.intro,
      type: formState.value.type,
      artStyle: formState.value.artStyle,
      videoRatio: formState.value.videoRatio || "16:9",
      imageModel: imageModel.value,
      videoModel: videoModel.value,
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
    window.$message.success($t("workbench.project.msg.extractSuccess"));
  } catch (e: any) {
    window.$message.error(e.message ?? $t("workbench.project.msg.extractFailed"));
  } finally {
    extractLoading.value = false;
  }
}

async function handleArtStyleSubmit() {
  if (!artStyleForm.value.name.trim()) {
    window.$message.warning($t("workbench.project.msg.enterArtStyleName"));
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
      window.$message.success($t("workbench.project.msg.artStyleUpdated"));
    } else {
      await axios.post("/artStyle/addArtStyle", {
        name: artStyleForm.value.name,
        fileUrl: artStyleForm.value.coverUrl,
        prompt: artStyleForm.value.prompt,
      });
      window.$message.success($t("workbench.project.msg.artStyleAdded"));
    }
    resetArtStyleDialog();
    fetchArtStyles();
  } catch (e: any) {
    window.$message.error(e.message ?? $t("workbench.project.msg.operationFailed"));
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
    .post("/artStyle/getArtStyle")
    .then(({ data }) => {
      artStyleOptions.value = data.map((item: { id?: string | number; fileUrl: string; label: string; prompt?: string }) => ({
        id: item.id,
        fileUrl: item.fileUrl,
        label: item.label,
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
    height: 150px;
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
    position: relative;

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
    }
    .editBtn {
      position: absolute;
      top: 6px;
      right: 6px;
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
    white-space: nowrap;

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
