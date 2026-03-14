<template>
  <div class="addScript">
    <t-dialog
      :visible.sync="addScriptShow"
      width="60vw"
      top="1vh"
      header="新增剧本"
      :closable="false"
      :maskClosable="false"
      wrapClassName="no-header-margin"
      dialogClass="custom-modal"
      @close-btn-click="handleCancel">
      <div class="data">
        <div class="name">
          <t-input v-model="scriptName" placeholder="请输入剧本名称" />
        </div>
        <div class="upload">
          <div class="upload-area" @click="triggerUpload" @dragover.prevent @drop.prevent="handleDrop">
            <t-upload
              ref="uploadRef"
              v-model="fileList"
              theme="file"
              :multiple="false"
              :max="1"
              :before-upload="handleBeforeUpload"
              style="display: none" />
            <div class="dragIcon">
              <i-upload-one theme="outline" size="32" fill="var(--td-brand-color)" />
            </div>
            <p class="upload-text">拖拽剧本文件到此处或点击上传</p>
            <p class="upload-hint">支持 .txt, .docx 格式，建议文件大小不超过 10MB</p>
          </div>
        </div>
        <div class="content">
          <!-- <textarea
            v-model="scriptData"
            class="notebook-textarea"
            placeholder="请上传剧本内容..."
            spellcheck="false"
            @input="handleInput"
            :ref="setTextareaRef"></textarea> -->
          <t-textarea
            v-model="scriptData"
            placeholder="请上传剧本内容..."
            name="description"
            :autosize="{ minRows: 15, maxRows: 15 }" />
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <t-button theme="default" @click="handleCancel">取消</t-button>
          <t-button theme="primary" @click="handleConfirm">确认</t-button>
        </div>
      </template>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import { LoadingPlugin } from "tdesign-vue-next";
import mammoth from "mammoth";
import { MessagePlugin } from "tdesign-vue-next";
import type { UploadFile } from "tdesign-vue-next";
import axios from "@/utils/axios";
import projectStore from "@/stores/project";

const { project } = storeToRefs(projectStore());

const addScriptShow = defineModel<boolean>({
  default: false,
});

const uploadRef = ref<any>(null);
const content = ref<string>("");
const fileList = ref<UploadFile[]>([]);
const scriptData = ref<string>("");
const LINE_HEIGHT: number = 28;
const MIN_LINES: number = 20;
const textareaRef = ref<HTMLTextAreaElement | null>(null);

// 触发上传
function triggerUpload(): void {
  uploadRef.value?.triggerUpload();
}
// 读取文件内容
async function readFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  if (file.type === "text/plain") {
    return new TextDecoder().decode(buffer);
  }
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value;
}
// 上传前校验并解析
async function handleBeforeUpload(file: UploadFile): Promise<boolean> {
  const rawFile = file.raw;
  if (!rawFile) {
    MessagePlugin.error("文件读取失败");
    return false;
  }

  const allowTypes = ["text/plain", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

  if (rawFile.type === "application/msword") {
    MessagePlugin.warning(".doc文件不支持解析,请转换为.txt或.docx文件");
    fileList.value = [];
    return false;
  }
  if (!allowTypes.includes(rawFile.type)) {
    MessagePlugin.error("不支持的文件类型");
    fileList.value = [];
    return false;
  }
  if (rawFile.size > 10 * 1024 * 1024) {
    MessagePlugin.error("文件大小超过10MB，请上传更小的文件");
    fileList.value = [];
    return false;
  }

  
  LoadingPlugin({
    fullscreen: true,
    attach: "body",
    text: "文件解析中...",
  });
  try {
    content.value = await readFile(rawFile);
    scriptData.value = content.value;
    nextTick(() => {
      if (textareaRef.value) {
        adjustTextareaHeight(textareaRef.value);
      }
    });
  } catch (error) {
    console.error("文件解析失败:", error);
    MessagePlugin.error("文件解析失败，请重新上传");
    fileList.value = [];
  } finally {
    LoadingPlugin(false);
  }
  return false;
}
// 处理拖拽上传
async function handleDrop(e: DragEvent): Promise<void> {
  const files = e.dataTransfer?.files;
  if (files && files.length > 0) {
    fileList.value = [];
    const file = files[0];
    await handleBeforeUpload({ raw: file } as UploadFile);
  }
}
function handleCancel(): void {
  addScriptShow.value = false;
  scriptData.value = "";
  content.value = "";
  fileList.value = [];
}
function close(): void {
  scriptData.value = "";
  content.value = "";
  fileList.value = [];
  addScriptShow.value = false;
}
function adjustTextareaHeight(textarea: HTMLTextAreaElement): void {
  textarea.style.height = "auto";
  const newHeight = Math.max(textarea.scrollHeight, MIN_LINES * LINE_HEIGHT);
  textarea.style.height = `${newHeight}px`;
}
function handleInput(event: Event): void {
  const textarea = event.target as HTMLTextAreaElement;
  adjustTextareaHeight(textarea);
}
function setTextareaRef(el: any | null): void {
  if (el) {
    textareaRef.value = el;
    nextTick(() => {
      adjustTextareaHeight(el);
    });
  }
}

// 监听 content 变化，同步到 scriptData
watch(content, (newVal) => {
  if (newVal) {
    scriptData.value = newVal;
    nextTick(() => {
      if (textareaRef.value) {
        adjustTextareaHeight(textareaRef.value);
      }
    });
  }
});

// 监听 addScriptShow 变化，在对话框打开时重新调整高度
watch(addScriptShow, (newVal) => {
  if (newVal && textareaRef.value) {
    nextTick(() => {
      if (textareaRef.value) {
        adjustTextareaHeight(textareaRef.value);
      }
    });
  }
});
const emit = defineEmits(["searchScripts"]);
async function handleConfirm(): Promise<void> {
  if (!scriptData.value.trim()) {
    MessagePlugin.warning("请上传或输入剧本内容");
    return;
  }
  if (!scriptName.value.trim()) {
    MessagePlugin.warning("请输入剧本名称");
    return;
  }
  try {
    await axios.post("/script/addScript", { name: scriptName.value, content: scriptData.value, projectId: project.value?.id });
    MessagePlugin.success("剧本添加成功");
  } catch (error) {
    console.error("添加剧本失败:", error);
    MessagePlugin.error("添加剧本失败，请稍后再试");
  } finally {
    close();
    emit("searchScripts");
  }
}
const scriptName = ref<string>("");
</script>

<style lang="scss" scoped>
$line-height: 28px;

.addScript {
  .titHeader {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 64px;
    width: 100%;

    .titleWrapper {
      display: flex;
      align-items: center;
      gap: 12px;
      .title {
        font-weight: 600;
        font-size: 18px;
      }
    }
  }

  .data {
    .upload {
      width: 100%;
      height: 200px;
      margin-top: 10px;
      .upload-area {
        padding: 42px 20px;
        border: 2px dashed var(--td-component-border);
        border-radius: 8px;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s;
        &:hover {
          background-color: var(--td-bg-color-secondarycontainer-hover);
          border-color: var(--td-brand-color);
        }

        .dragIcon {
          margin-bottom: 12px;
        }

        .upload-text {
          font-size: 14px;
          margin: 0 0 8px;
        }

        .upload-hint {
          font-size: 12px;
          margin: 0;
        }
      }
    }

    .content {
      margin-top: 20px;
      width: 100%;
      height: 400px;
      overflow: auto;
      background: var(--td-bg-color-container);

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

  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 16px 0 0;
  }
}
</style>
