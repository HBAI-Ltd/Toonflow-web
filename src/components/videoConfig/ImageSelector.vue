<template>
  <a-modal
    v-model:open="visible"
    :title="title"
    @ok="confirmSelection"
    @cancel="handleCancel"
    width="80%"
    :bodyStyle="{ maxHeight: '70vh', overflow: 'auto' }">
    <mainElement
      v-if="visible"
      :way="isMultiSelect ? 'checkbox' : 'radio'"
      radio="storyboard"
      ref="mainElementRef"
      @checkChange="handleCheckedChange"
      @check-all="handleBatchCheckAll" />
    <template #footer>
      <div class="selector-footer">
        <span class="selected-count">已选择 {{ tempSelectedImages.length }} 张</span>
        <div>
          <a-button @click="handleCancel">取消</a-button>
          <a-button type="primary" @click="confirmSelection">确定</a-button>
        </div>
      </div>
    </template>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { message } from "ant-design-vue";
import mainElement from "@/views/projectDetail/components/assetsManager/components/mainElement.vue";
import { getModelList, type ImageItem } from "./manufacturerConfig";

import store from "@/stores";
import { storeToRefs } from "pinia";

const storeInstance = store();
const { currentScriptId } = storeToRefs(storeInstance);

interface Storyboard {
  id: number;
  name: string;
  filePath: string;
  prompt: string;
  duration: number;
}

const props = defineProps<{
  scriptId?: number;
  mode: "start" | "end" | "multi" | "single";
  maxImages?: number;
  initialImages?: ImageItem[];
}>();

const emit = defineEmits<{
  (e: "confirm", images: ImageItem[]): void;
  (e: "cancel"): void;
}>();

const visible = defineModel<boolean>("visible", { default: false });

const mainElementRef = ref();
const tempSelectedImages = ref<ImageItem[]>([]);
const tempSelectedIds = ref<number[]>([]);

const isMultiSelect = computed(() => props.mode === "multi");

const title = computed(() => {
  const titleMap: Record<string, string> = {
    start: "选择首帧图片",
    end: "选择尾帧图片",
    single: "选择图片",
    multi: "选择图片序列（可多选）",
  };
  return titleMap[props.mode] || "选择图片";
});

// 监听弹窗打开，同步 scriptId 并初始化选中状态
watch(visible, (v) => {
  if (v) {
    getModelList();
    // 同步 scriptId 到 store
    if (props.scriptId && props.scriptId !== -1) {
      currentScriptId.value = props.scriptId;
    }
    // 初始化选中状态
    if (props.initialImages && props.initialImages.length > 0) {
      tempSelectedImages.value = [...props.initialImages];
      tempSelectedIds.value = props.initialImages.map((img) => img.id);
    } else {
      tempSelectedImages.value = [];
      tempSelectedIds.value = [];
    }
  }
});

function handleBatchCheckAll(data: { checked: boolean; records: Storyboard[] }, type: string) {
  if (type !== "storyboard") return;
  const maxImages = props.maxImages || 999;

  if (data.checked) {
    if (!isMultiSelect.value) {
      // 单选模式
      if (data.records.length > 0) {
        const row = data.records[0];
        tempSelectedIds.value = [row.id];
        tempSelectedImages.value = [{ id: row.id, filePath: row.filePath, prompt: row.prompt }];
      }
    } else {
      // 多选模式
      data.records.forEach((row) => {
        if (!tempSelectedIds.value.includes(row.id) && tempSelectedImages.value.length < maxImages) {
          tempSelectedIds.value.push(row.id);
          tempSelectedImages.value.push({ id: row.id, filePath: row.filePath, prompt: row.prompt });
        }
      });
    }
  } else {
    data.records.forEach((row) => {
      const index = tempSelectedIds.value.indexOf(row.id);
      if (index > -1) {
        tempSelectedIds.value.splice(index, 1);
        tempSelectedImages.value.splice(index, 1);
      }
    });
  }
}

function handleCheckedChange(data: { checked: boolean; row: Storyboard }) {
  const maxImages = props.maxImages || 999;

  if (data.checked) {
    if (!isMultiSelect.value) {
      // 单选模式
      tempSelectedIds.value = [data.row.id];
      tempSelectedImages.value = [{ id: data.row.id, filePath: data.row.filePath, prompt: data.row.prompt }];
    } else {
      // 多选模式
      if (!tempSelectedIds.value.includes(data.row.id)) {
        if (tempSelectedImages.value.length >= maxImages) {
          message.warning(`最多只能选择${maxImages}张图片`);
          return;
        }
        tempSelectedIds.value.push(data.row.id);
        tempSelectedImages.value.push({ id: data.row.id, filePath: data.row.filePath, prompt: data.row.prompt });
      }
    }
  } else {
    const index = tempSelectedIds.value.indexOf(data.row.id);
    if (index > -1) {
      tempSelectedIds.value.splice(index, 1);
      tempSelectedImages.value.splice(index, 1);
    }
  }
}

function confirmSelection() {
  emit("confirm", [...tempSelectedImages.value]);
  visible.value = false;
}

function handleCancel() {
  emit("cancel");
  visible.value = false;
}
onMounted(() => {
  getModelList();
});
</script>

<style lang="scss" scoped>
.selector-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .selected-count {
    color: #1890ff;
    font-weight: 500;
  }
}
</style>
