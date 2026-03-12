<template>
  <div class="details">
    <t-dialog
      :visible.sync="detailsShow"
      width="60vw"
      top="1vh"
      :closable="false"
      :maskClosable="false"
      wrapClassName="no-header-margin"
      dialogClass="custom-modal"
      @confirm="onConfirm"
      @close-btn-click="closeModal"
      :afterClose="handleClose"
      @cancel="closeModal">
      <template #header>
        <a-flex justify="space-between" align="center" class="modal-header">
          <a-flex align="center" gap="8">
            <a-input
              v-if="isEditingTitle"
              v-model:value="editableTitle"
              class="title-input"
              @pressEnter="saveTitle"
              @blur="saveTitle"
              :maxlength="50"
              placeholder="请输入标题"
              ref="titleInputRef" />
            <a-typography-title v-else :level="4" style="margin: 0">
              {{ props.item.name || "剧本详情" }}
            </a-typography-title>
            <a-button type="text" size="small" @click="toggleEditTitle">
              <template #icon>
                <i-edit v-if="!isEditingTitle" theme="outline" size="16" />
                <i-check v-else theme="outline" size="16" />
              </template>
            </a-button>
          </a-flex>
        </a-flex>
      </template>
      <div class="data">
        <textarea
          v-model="props.item.content"
          class="notebook-textarea"
          placeholder="请输入剧本内容..."
          spellcheck="false"
          @input="handleInput"
          :ref="setTextareaRef"></textarea>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import axios from "@/utils/axios";
// 添加类型定义
interface ScriptItem {
  id: number;
  name: string;
  content: string;
}

const detailsShow = defineModel<boolean>({
  default: false,
});

const props = defineProps<{
  item: ScriptItem;
}>();

const isEditingTitle = ref(false);
const editableTitle = ref("");
const titleInputRef = ref();

function toggleEditTitle() {
  if (!isEditingTitle.value) {
    editableTitle.value = props.item.name;
    isEditingTitle.value = true;
    nextTick(() => {
      titleInputRef.value?.focus();
    });
  } else {
    saveTitle();
  }
}
function saveTitle() {
  if (editableTitle.value.trim()) {
    props.item.name = editableTitle.value.trim().substring(0, 10); // 限制长度为10
  }
  isEditingTitle.value = false;
}

function handleClose() {
  detailsShow.value = false;
}
function closeModal() {
  detailsShow.value = false;
}
const emit = defineEmits(["searchScripts"]);
//确认
async function onConfirm() {
  try {
    await axios.post("/script/updateScript", { id: props.item.id, name: props.item.name, content: props.item.content });
    MessagePlugin.success("剧本更新成功");
  } catch (error) {
    console.error("更新剧本失败:", error);
    MessagePlugin.error("更新剧本失败，请稍后再试");
  } finally {
    close();
    emit("searchScripts");
  }
  detailsShow.value = false;
}
const LINE_HEIGHT = 28;
const MIN_LINES = 20;
const textareaRef = ref<HTMLTextAreaElement | null>(null);

function adjustTextareaHeight(textarea: HTMLTextAreaElement) {
  textarea.style.height = "auto";
  const newHeight = Math.max(textarea.scrollHeight, MIN_LINES * LINE_HEIGHT);
  textarea.style.height = `${newHeight}px`;
}

function handleInput(event: Event) {
  const textarea = event.target as HTMLTextAreaElement;
  adjustTextareaHeight(textarea);
}

function setTextareaRef(el: any) {
  if (el) {
    textareaRef.value = el;
    nextTick(() => {
      adjustTextareaHeight(el);
    });
  }
}

// 监听 detailsShow 变化，在对话框打开时重新调整高度
watch(detailsShow, (newVal) => {
  if (newVal && textareaRef.value) {
    nextTick(() => {
      adjustTextareaHeight(textareaRef.value!);
    });
  }
});
</script>

<style lang="scss" scoped>
$line-height: 28px;

.details {
  .modal-header {
    background: var(--td-bg-color-container);
    height: 60px;
    width: 100%;

    :deep(.ant-typography) {
      color: var(--td-text-color-primary);
      margin: 0;
    }

    :deep(.ant-btn-text) {
      color: var(--td-brand-color);

      &:hover {
        background: var(--td-bg-color-component-hover);
        color: var(--td-brand-color-hover);
      }
    }

    .title-input {
      width: 300px;

      :deep(.ant-input) {
        font-size: 16px;
        font-weight: 600;
        color: var(--td-text-color-primary);
        background: var(--td-bg-color-container);
        border: 1px solid var(--td-brand-color);

        &:focus {
          border-color: var(--td-brand-color);
          box-shadow: 0 0 0 2px rgba(153, 19, 250, 0.1);
        }
      }
    }
  }

  .data {
    width: 100%;
    height: 700px;
    overflow: auto;

    .notebook-textarea {
      flex: 1;
      padding: 12px 16px;
      border: none;
      outline: none;
      resize: none;
      overflow: hidden;
      min-height: calc($line-height * 20);
      width: 100%;
      font-size: 16px;
      line-height: $line-height;
      background: transparent;
      color: var(--td-text-color-primary);
      font-family: "KaiTi", "STKaiti", "PingFang SC", sans-serif;
      background-image: repeating-linear-gradient(
        transparent,
        transparent calc($line-height - 1px),
        var(--td-component-border) calc($line-height - 1px),
        var(--td-component-border) $line-height
      );
      background-position: 0 12px;

      &::placeholder {
        color: var(--td-text-color-placeholder);
      }
    }
  }
}
</style>
