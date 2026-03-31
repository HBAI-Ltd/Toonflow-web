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
      <div class="formColumns">
        <div class="formLeft">
          <t-form :data="formState" label-align="top">
            <t-form-item :label="$t('workbench.project.dialog.projectType')">
              <t-select v-model="formState.projectType" :placeholder="$t('workbench.project.dialog.selectType')">
                <t-option key="基于小说原文" :label="$t('workbench.project.dialog.basedOnNovel')" value="novel" />
                <t-option key="基于剧本" :label="$t('workbench.project.dialog.basedOnScript')" value="script" />
              </t-select>
            </t-form-item>
            <t-form-item :label="$t('workbench.project.dialog.projectName')">
              <t-input v-model="formState.name" :placeholder="$t('workbench.project.dialog.projectNamePh')" />
            </t-form-item>
            <t-form-item :label="$t('workbench.project.dialog.novelType')">
              <t-input v-model="formState.type" :placeholder="$t('workbench.project.dialog.novelTypePh')" />
            </t-form-item>
            <t-form-item :label="$t('workbench.project.dialog.modelData')">
              <div class="ac" style="gap: 5px">
                <modelSelect v-model="formState.imageModel" type="image" />
                <t-select v-model="formState.imageQuality" class="paramSelect ml-5" :placeholder="$t('workbench.production.editImage.quality')">
                  <t-option value="1K" label="1K" />
                  <t-option value="2K" label="2K" />
                  <t-option value="4K" label="4K" />
                </t-select>
              </div>
            </t-form-item>
            <t-form-item :label="$t('workbench.project.dialog.videoModelData')">
              <modelSelect v-model="formState.videoModel" type="video" />
            </t-form-item>
            <t-form-item :label="$t('workbench.project.dialog.videoRatio')">
              <t-select v-model="formState.videoRatio" :options="RATIO_OPTIONS" />
            </t-form-item>
            <t-form-item :label="$t('workbench.project.dialog.novelIntro')">
              <t-textarea
                v-model="formState.intro"
                :autosize="{ minRows: 3, maxRows: 6 }"
                :placeholder="$t('workbench.project.dialog.novelIntroPh')" />
            </t-form-item>
          </t-form>
        </div>
        <div class="formRight">
          <t-form label-align="top">
            <t-form-item>
              <div class="artStylePicker">
                <div class="artStyleHeader">
                  <span>{{ $t("workbench.project.dialog.visualManual") }}</span>
                  <t-button size="small" variant="outline" @click="openVisualManualDialog()">
                    <template #icon><i-plus size="14" /></template>
                    {{ $t("workbench.project.dialog.newVisualManual") }}
                  </t-button>
                </div>
                <div class="artStyleContent">
                  <t-loading :loading="visualManualLoading" :text="$t('workbench.project.dialog.loading')">
                    <div class="gridContainer">
                      <div
                        v-for="(item, index) in visualManualOptions"
                        :key="index"
                        class="gridItem"
                        :class="{ active: formState.artStyle === item.name }"
                        @click="formState.artStyle = item.name">
                        <div class="imageWrapper">
                          <img :src="item.images && item.images[0]" :alt="item.name" class="artImage" loading="lazy" />
                          <div class="text">{{ item.name }}</div>
                        </div>
                        <div class="editBtn" @click.stop="openVisualManualDialog(item)">
                          <i-edit theme="outline" size="14" />
                        </div>
                        <div class="delBtn" @click.stop="deleteVisualManual(item)">
                          <i-delete theme="outline" size="14" />
                        </div>
                      </div>
                    </div>
                  </t-loading>
                </div>
              </div>
            </t-form-item>
          </t-form>
        </div>
      </div>
    </t-dialog>
    <!-- 新建/编辑视觉手册弹窗 -->
    <t-dialog
      class="artStyleDialog"
      v-model:visible="visualManualDialogVisible"
      :header="editingVisualManual ? $t('workbench.project.dialog.editVisualManualTitle') : $t('workbench.project.dialog.newVisualManualTitle')"
      width="90vw"
      placement="center"
      @confirm="handleVisualManualSubmit"
      @close-btn-click="resetVisualManualDialog"
      @cancel="resetVisualManualDialog"
      :confirm-btn="$t('workbench.project.dialog.ok')"
      :cancel-btn="$t('workbench.project.dialog.cancel')">
      <t-loading :loading="loading">
        <t-form label-align="top">
          <t-form-item>
            <div class="nameAndCoverRow">
              <div class="nameField">
                <label class="fieldLabel">{{ $t("workbench.project.dialog.visualManualName") }}</label>
                <t-input v-model="visualManualForm.name" :placeholder="$t('workbench.project.dialog.visualManualNamePh')" @keydown.stop />
              </div>
              <div class="mdFileLocation">
                <label class="fieldLabel">{{ $t("workbench.project.dialog.visualManualName") }}</label>
                <t-input v-model="visualManualForm.name" :placeholder="$t('workbench.project.dialog.visualManualNamePh')" @keydown.stop />
              </div>
              <div class="coverField">
                <label class="fieldLabel">{{ $t("workbench.project.dialog.visualManualCover") }}</label>
                <div class="coverUploadArea multiCoverUploadArea">
                  <div v-for="(img, idx) in visualManualForm.images" :key="idx" class="coverPreview">
                    <img :src="img" class="coverImg" />
                    <div class="coverImgRemove" @click="removeVisualManualCover(idx)">
                      <i-close size="10" />
                    </div>
                  </div>
                  <div class="coverUploadTrigger" @click="triggerVisualManualCoverUpload">
                    <input
                      ref="visualManualCoverInputRef"
                      type="file"
                      accept="image/*"
                      multiple
                      style="display: none"
                      @change="handleVisualManualCoverFileChange" />
                    <i-plus size="24" />
                    <span>{{ $t("workbench.project.dialog.uploadCover") }}</span>
                  </div>
                </div>
              </div>
            </div>
          </t-form-item>
          <t-form-item :label="$t('workbench.project.dialog.visualManualPrompt')">
            <div class="promptEditorWrapper">
              <div class="promptEditorHeader">
                <div class="aiExtractInline">
                  <t-tabs :value="visualManualTabValue" size="medium" @change="(v) => (visualManualTabValue = v)">
                    <t-tab-panel v-for="tab in visualManualTabData" :key="tab.value" :value="tab.value" :label="tab.label">
                      <MdEditor
                        v-model="tab.data"
                        :theme="'light'"
                        :toolbars="promptToolbars"
                        :footers="[]"
                        :placeholder="$t('workbench.project.dialog.promptPlaceholder')"
                        style="height: 38vh; margin-top: 5px"
                        @onUploadImg="() => {}" />
                    </t-tab-panel>
                  </t-tabs>
                </div>
              </div>
            </div>
          </t-form-item>
        </t-form>
      </t-loading>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
import axios from "@/utils/axios";
import { MdEditor } from "md-editor-v3";
import type { ToolbarNames } from "md-editor-v3";
import "md-editor-v3/lib/style.css";
import modelSelect from "@/components/modelSelect.vue";
import type { TabValue } from "tdesign-vue-next";
import { DialogPlugin } from "tdesign-vue-next";

const addProjectShow = defineModel<boolean>();
const props = defineProps<{
  projectData?: ProjectData | null;
}>();
const emit = defineEmits<{
  (e: "add", data: ProjectFormData): void;
  (
    e: "edit",
    data: {
      id: string;
      name: string;
      intro: string;
      type: string;
      artStyle: string;
      videoRatio: string;
      imageModel: string;
      videoModel: string;
      projectType: string;
      imageQuality: "1K" | "2K" | "4K" | "";
    },
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
  imageModel: string;
  videoModel: string;
  projectType: string;
  imageQuality: "1K" | "2K" | "4K" | "";
  visualManual?: string;
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
  imageQuality: "1K" | "2K" | "4K" | "";
}
interface VisualManualItem {
  name: string;
  images?: string[];
  data?: Data[];
}
interface Data {
  label: string;
  value: string;
  data: string;
}

const DEFAULT_TAB_DATA: () => Data[] = () => [
  { label: "README", value: "README", data: "" },
  { label: "前缀", value: "prefix", data: "" },
  { label: "角色", value: "art_character", data: "" },
  { label: "角色衍生", value: "art_character_derivative", data: "" },
  { label: "道具", value: "art_prop", data: "" },
  { label: "道具衍生", value: "art_prop_derivative", data: "" },
  { label: "场景", value: "art_scene", data: "" },
  { label: "场景衍生", value: "art_scene_derivative", data: "" },
  { label: "分镜", value: "art_storyboard", data: "" },
  { label: "分镜视频", value: "art_storyboard_video", data: "" },
  { label: "技法-导演规划", value: "director_planning", data: "" },
  { label: "技法-分镜表设计", value: "director_storyboard_table", data: "" },
];

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
  imageQuality: "",
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
  if (!formState.value.name) return window.$message.warning($t("workbench.project.msg.enterProjectName"));
  if (!formState.value.type) return window.$message.warning($t("workbench.project.msg.enterProjectType"));
  if (!formState.value.imageModel) return window.$message.warning($t("workbench.project.msg.enterImageModel"));
  if (!formState.value.videoModel) return window.$message.warning($t("workbench.project.msg.enterVideoModel"));
  if (!formState.value.artStyle) return window.$message.warning($t("workbench.project.msg.enterArtStyle"));
  if (!formState.value.videoRatio) return window.$message.warning($t("workbench.project.msg.enterVideoRatio"));
  if (!formState.value.intro) return window.$message.warning($t("workbench.project.msg.enterProjectIntro"));
  if (!formState.value.imageQuality) return window.$message.warning($t("workbench.project.msg.enterProjectQuality"));
  if (isEdit.value) {
    emit("edit", {
      id: formState.value.id as unknown as string,
      name: formState.value.name,
      intro: formState.value.intro,
      type: formState.value.type,
      artStyle: formState.value.artStyle,
      videoRatio: formState.value.videoRatio,
      imageModel: formState.value.imageModel,
      videoModel: formState.value.videoModel,
      projectType: formState.value.projectType || "novel",
      imageQuality: formState.value.imageQuality,
    });
  } else {
    emit("add", {
      projectType: formState.value.projectType || "novel",
      name: formState.value.name,
      intro: formState.value.intro,
      type: formState.value.type,
      artStyle: formState.value.artStyle,
      videoRatio: formState.value.videoRatio || "16:9",
      imageModel: formState.value.imageModel,
      videoModel: formState.value.videoModel,
      imageQuality: formState.value.imageQuality,
    });
  }
  resetForm();
  addProjectShow.value = false;
}

// ===== 视觉手册 Prompt 工具栏 =====

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
        imageModel: props.projectData.imageModel || "",
        videoModel: props.projectData.videoModel || "",
        imageQuality: props.projectData.imageQuality || "",
        projectType: props.projectData.projectType || "novel",
      };
    } else {
      resetForm();
    }
    fetchVisualManuals();
  }
});

// ===== 视觉手册 =====
const visualManualOptions = ref<VisualManualItem[]>([]);
const visualManualLoading = ref(false);
const visualManualDialogVisible = ref(false);
const editingVisualManual = ref<VisualManualItem | null>(null);
const visualManualForm = ref({ name: "", images: [] as string[] });
const visualManualCoverInputRef = ref<HTMLInputElement>();
const visualManualTabValue = ref<TabValue>("README");
const visualManualTabData = ref<Data[]>(DEFAULT_TAB_DATA());

function fetchVisualManuals() {
  visualManualLoading.value = true;
  axios
    .post("/project/getVisualManual")
    .then(({ data }) => {
      visualManualOptions.value = data.map(
        (item: { id?: string | number; name: string; image?: string | string[]; images?: string[]; data?: Data[] }) => ({
          id: item.id,
          name: item.name,
          images: item.images ?? (Array.isArray(item.image) ? item.image : item.image ? [item.image] : []),
          data: item.data,
        }),
      );
    })
    .finally(() => {
      visualManualLoading.value = false;
    });
}

function openVisualManualDialog(item?: VisualManualItem) {
  editingVisualManual.value = item ?? null;
  if (item) {
    visualManualForm.value.name = item.name;
    visualManualForm.value.images = item.images ? [...item.images] : [];
    const existingData: Data[] = Array.isArray(item.data) ? item.data : [];
    visualManualTabData.value = DEFAULT_TAB_DATA().map((tab) => {
      const found = existingData.find((d) => d.value === tab.value);
      return found ? { ...tab, data: found.data } : { ...tab };
    });
  } else {
    visualManualForm.value = { name: "", images: [] };
    visualManualTabData.value = DEFAULT_TAB_DATA();
  }
  visualManualTabValue.value = "README";
  visualManualDialogVisible.value = true;
}

function resetVisualManualDialog() {
  visualManualDialogVisible.value = false;
  editingVisualManual.value = null;
  visualManualForm.value = { name: "", images: [] };
  visualManualTabData.value = DEFAULT_TAB_DATA();
  visualManualTabValue.value = "README";
}

function triggerVisualManualCoverUpload() {
  visualManualCoverInputRef.value?.click();
}

function handleVisualManualCoverFileChange(e: Event) {
  const files = (e.target as HTMLInputElement).files;
  if (!files || files.length === 0) return;
  Array.from(files).forEach((file) => {
    const reader = new FileReader();
    reader.onload = () => {
      visualManualForm.value.images.push(reader.result as string);
    };
    reader.readAsDataURL(file);
  });
  (e.target as HTMLInputElement).value = "";
}

function removeVisualManualCover(idx: number) {
  visualManualForm.value.images.splice(idx, 1);
}
const loading = ref(false);
async function handleVisualManualSubmit() {
  if (!visualManualForm.value.name.trim()) {
    window.$message.warning($t("workbench.project.msg.enterVisualManualName"));
    return;
  }
  if (!visualManualForm.value.images.length) {
    window.$message.warning($t("workbench.project.msg.enterVisualManualImage"));
    return;
  }
  const emptyTab = visualManualTabData.value.find((tab) => !tab.data.trim());
  if (emptyTab) {
    window.$message.warning(`「${emptyTab.label}」${$t("workbench.project.msg.enterVisualManualTabData")}`);
    return;
  }
  try {
    loading.value = true;
    if (editingVisualManual.value) {
      await axios.post("/project/editVisualManual", {
        name: visualManualForm.value.name,
        images: visualManualForm.value.images,
        data: visualManualTabData.value,
      });
    } else {
      await axios.post("/project/addVisualManual", {
        name: visualManualForm.value.name,
        images: visualManualForm.value.images,
        data: visualManualTabData.value,
      });
    }

    loading.value = false;
    if (editingVisualManual.value) {
      window.$message.success($t("workbench.project.msg.visualManualUpdated"));
    } else {
      window.$message.success($t("workbench.project.msg.visualManualAdded"));
    }
    resetVisualManualDialog();
    fetchVisualManuals();
  } catch (e: any) {
    loading.value = false;
    window.$message.error(e.message ?? $t("workbench.project.msg.operationFailed"));
  }
}
function deleteVisualManual(item: VisualManualItem) {
  const dialog = DialogPlugin.confirm({
    header: $t("workbench.project.msg.deleteVisualManualHeader"),
    body: $t("workbench.project.msg.deleteVisualManualBody", { name: item.name }),
    confirmBtn: $t("workbench.project.msg.deleteVisualManualConfirm"),
    cancelBtn: $t("workbench.project.msg.deleteVisualManualCancel"),
    onConfirm: () => {
      axios
        .post("/project/deleteVisualManual", { name: item.name })
        .then(() => {
          fetchVisualManuals();
          resetVisualManualDialog();
          window.$message.success($t("workbench.project.msg.visualManualDeleted"));
        })
        .catch((e) => {
          window.$message.error(e.message ?? $t("workbench.project.msg.operationFailed"));
        })
        .finally(() => {
          fetchVisualManuals();
          dialog.destroy();
        });
    },
  });
}
</script>

<style lang="scss" scoped>
.formColumns {
  display: flex;
  gap: 24px;

  .formLeft {
    flex: 1;
    min-width: 0;
  }

  .formRight {
    flex: 1;
    min-width: 0;
  }
}

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
    }

    .selectedHint {
      font-size: 13px;
    }
  }

  .artStyleContent {
    height: 300px;
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
      .delBtn {
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
      left: 6px;
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
    .delBtn {
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

// 视觉手册名称与封面同行布局
.nameAndCoverRow {
  gap: 16px;
  width: 100%;
  .nameField {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .mdFileLocation {
    margin-top: 10px;
  }

  .coverField {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 20px;
  }

  .fieldLabel {
    font-size: 14px;
    color: var(--td-text-color-primary);
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

  &.multiCoverUploadArea {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: flex-start;

    .coverPreview {
      position: relative;
      flex-shrink: 0;

      .coverImg {
        width: 80px;
        height: 80px;
        object-fit: cover;
        border-radius: 6px;
        border: 1px solid var(--td-component-border);
        display: block;
      }

      .coverImgRemove {
        position: absolute;
        top: -6px;
        right: -6px;
        width: 18px;
        height: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--td-error-color);
        color: #fff;
        border-radius: 50%;
        cursor: pointer;
        font-size: 10px;
        z-index: 1;

        &:hover {
          background: var(--td-error-color-hover);
        }
      }
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

.promptEditorWrapper {
  width: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;

  .promptEditorHeader {
    display: flex;
    margin-bottom: 8px;

    .aiExtractInline {
      width: 100%;
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
    height: 75vh;
    overflow-y: auto;
  }
}
</style>
