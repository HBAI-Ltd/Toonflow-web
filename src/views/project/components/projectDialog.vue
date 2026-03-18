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
              <span v-if="formState.artStyle" class="selectedLabel">
                已选：
                <t-tag theme="primary" size="small" closable @close="formState.artStyle = ''">{{ formState.artStyle }}</t-tag>
              </span>
              <span v-else class="selectedHint">请在下方选择画风</span>
            </div>
            <t-tabs v-model="currentArtStyleTab" @change="handleTabChange">
              <t-tab-panel v-for="tab in artStyleTabs" :key="tab" :value="tab" :label="tab">
                <div v-if="tab === '自定义风格'" class="artStyleContent customizeContent">
                  <div class="customizeInputWrapper">
                    <div class="customizeInput">
                      <t-input v-model="customizeName" placeholder="请输入自定义影片画风名称" @enter="applyCustomize" clearable />
                      <t-button theme="primary" style="margin-left: 8px" :disabled="!customizeName.trim()" @click="applyCustomize">应用</t-button>
                    </div>
                    <div v-if="customStyleApplied" class="customizeApplied">
                      <span class="appliedText">✓ 已应用自定义画风「{{ formState.artStyle }}」</span>
                    </div>
                    <div v-else class="customizeHint">
                      {{ customizeName.trim() ? "按回车键或点击「应用」按钮确认" : "输入自定义画风名称后点击「应用」" }}
                    </div>
                  </div>
                </div>
                <div v-else class="artStyleContent">
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
                        </div>
                      </div>
                    </div>
                  </t-loading>
                </div>
              </t-tab-panel>
            </t-tabs>
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
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import axios from "@/utils/axios";

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
  fileUrl: string;
  label: string;
}

const isEdit = computed(() => !!props.projectData);

// ===== 常量 =====
const RATIO_OPTIONS = [
  { value: "16:9", label: "16:9" },
  { value: "9:16", label: "9:16" },
];

const ART_STYLE_TABS = ["常用风格", "ip风格", "插画风格", "可爱Q版", "立体风格", "日系风格", "自定义风格"] as const;
const artStyleTabs = ref([...ART_STYLE_TABS]);

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
const currentArtStyleTab = ref<string>("常用风格");
const artStyleOptions = ref<ArtStyleItem[]>([]);
const artStyleLoading = ref(false);
const customizeName = ref("");
const customStyleApplied = computed(() => {
  return !!customizeName.value.trim() && formState.value.artStyle === customizeName.value.trim();
});

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
    currentArtStyleTab.value = "常用风格";
    customizeName.value = "";
    fetchArtStyles();
  }
});

function handleTabChange(tab: string | number) {
  if (tab === "自定义风格") {
    artStyleOptions.value = [];
    return;
  }
  fetchArtStyles();
}

function applyCustomize() {
  if (!customizeName.value.trim()) return;
  formState.value.artStyle = customizeName.value.trim();
}

function fetchArtStyles() {
  artStyleLoading.value = true;
  axios
    .post("/artStyle/getArtStyle", { name: currentArtStyleTab.value })
    .then(({ data }) => {
      artStyleOptions.value = data.map((item: { fileUrl: string; name: string }) => ({
        fileUrl: item.fileUrl,
        label: item.name,
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
    height: 32px;
    display: flex;
    align-items: center;
    margin-bottom: 4px;

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
    height: 200px;
    overflow-y: auto;
    overflow-x: hidden;
    margin-top: 12px;
    padding: 4px;
  }

  .customizeContent {
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 32px !important;
  }

  .customizeInputWrapper {
    width: 100%;
    max-width: 460px;
  }

  .customizeInput {
    display: flex;
    align-items: center;
  }

  .customizeApplied {
    margin-top: 12px;

    .appliedText {
      font-size: 13px;
      color: var(--td-success-color);
    }
  }

  .customizeHint {
    margin-top: 12px;
    font-size: 13px;
    color: var(--td-text-color-placeholder);
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
  }
}
</style>
