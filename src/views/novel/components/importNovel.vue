<template>
  <div class="purgeNovel">
    <t-dialog :footer="false" v-model:visible="purgeNovelShow" :header="$t('workbench.novel.import.title')" width="50%" placement="center">
      <div class="data">
        <t-tabs :value="activeKey" disabled>
          <t-tab-panel value="To1" :label="$t('workbench.novel.import.step1')" style="height: 680px; overflow-y: auto">
            <div class="uploadArea" @click="triggerUpload" @dragover.prevent @drop.prevent="handleDrop">
              <t-upload
                ref="uploadRef"
                v-model="fileList"
                theme="file"
                :multiple="false"
                :max="1"
                :before-upload="handleBeforeUpload"
                :request-method="requestMethod"
                style="display: none" />
              <div class="dragIcon">
                <i-upload-one theme="outline" size="32" fill="var(--td-brand-color)" />
              </div>
              <p class="uploadText">{{ $t("workbench.novel.import.dragUpload") }}</p>
              <p class="uploadHint">{{ $t("workbench.novel.import.uploadHint") }}</p>
            </div>
            <t-divider>{{ $t("workbench.novel.import.or") }}</t-divider>
            <div class="batchImportBar f ac jb">
              <div class="batchImportInfo">
                <div class="label">{{ $t("workbench.novel.import.multiFile") }}</div>
                <div class="uploadHint">{{ $t("workbench.novel.import.multiFileHint") }}</div>
              </div>
              <t-button variant="outline" :disabled="batchImporting" @click="triggerBatchUpload">
                <template #icon><i-upload-one size="16" /></template>
                {{ $t("workbench.novel.import.selectMultiple") }}
              </t-button>
              <input ref="batchFileInputRef" type="file" accept=".txt,text/plain" multiple class="hiddenFileInput" @change="handleBatchFileChange" />
            </div>
            <div class="formItem">
              <div class="label">{{ $t("workbench.novel.import.pasteLabel") }}</div>
              <div class="uploadWrap">
                <t-textarea v-model="content" :placeholder="$t('workbench.novel.import.pastePlaceholder')" :autosize="{ minRows: 12, maxRows: 12 }" />
              </div>
              <div class="footerInfo f ac jb" style="margin-top: 8px">
                <div>
                  <span class="charCount">{{ content.length }} {{ $t("workbench.novel.import.chars") }}</span>
                  <span v-if="content.length > 0 && content.length < 100" class="tips warn">{{ $t("workbench.novel.import.tooShort") }}</span>
                </div>
                <span>{{ $t("workbench.novel.import.parsedChapters", { count: tableData.length }) }}</span>
              </div>
            </div>

            <div style="margin-top: 16px; text-align: right">
              <t-button theme="primary" style="margin-left: 10px" :disabled="!content || !tableData.length" @click="activeKey = 'To2'">
                {{ $t("workbench.novel.import.nextStep") }}
              </t-button>
            </div>
          </t-tab-panel>
          <t-tab-panel value="To2" :label="$t('workbench.novel.import.step2')" style="height: 680px; overflow-y: auto">
            <div class="fc to2Box">
              <t-table
                ref="tableRef"
                row-key="index"
                :data="tableData"
                :columns="columns"
                :selected-row-keys="selectedRowKeys"
                hover
                style="flex: 1; overflow-y: auto"
                @select-change="onSelectChange">
                <template #chapterData="{ row }">
                  <t-tooltip :content="row.chapterData" placement="top">
                    <span class="ellipsisText">{{ row.chapterData }}</span>
                  </t-tooltip>
                </template>
              </t-table>
              <div class="selectedInfo">{{ $t("workbench.novel.import.selectedInfo", { count: selectedTextLength }) }}</div>
              <div style="margin-top: 16px; text-align: right">
                <t-button variant="outline" @click="activeKey = 'To1'">{{ $t("workbench.novel.import.prevStep") }}</t-button>
                <t-button theme="primary" style="margin-left: 10px" :loading="nextLoading" @click="keep">
                  保存
                </t-button>
              </div>
            </div>
          </t-tab-panel>
          <t-tab-panel v-if="activeKey === 'Batches'" value="Batches" :label="$t('workbench.novel.import.batches')" style="height: 680px; overflow-y: auto">
            <div class="batchList">
              <div v-if="batchImporting" class="batchProgress">{{ $t("workbench.novel.import.importing") }}</div>
              <div v-for="(batch, index) in batchResults" :key="`${batch.fileName}-${index}`" class="batchItem">
                <div class="batchMain">
                  <div class="batchName">{{ batch.fileName }}</div>
                  <t-tag v-if="batch.success" theme="success" variant="light" size="small">{{ $t("workbench.novel.import.imported") }}</t-tag>
                  <t-tag v-else theme="danger" variant="light" size="small">{{ $t("workbench.novel.import.importFailed") }}</t-tag>
                </div>
                <div class="batchActions f ac" v-if="batch.success">
                  <t-button size="small" theme="primary" @click="generateNewScript(batch)">{{ $t("workbench.novel.import.newScript") }}</t-button>
                  <t-button size="small" variant="outline" @click="openMergeDialog(batch)">{{ $t("workbench.novel.import.mergeScript") }}</t-button>
                </div>
                <div v-else class="batchError">{{ batch.error }}</div>
              </div>
            </div>
          </t-tab-panel>
        </t-tabs>
      </div>
    </t-dialog>
    <t-dialog
      v-model:visible="mergeDialogVisible"
      :header="$t('workbench.novel.import.selectScript')"
      :confirm-btn="$t('workbench.novel.import.confirmMerge')"
      :cancel-btn="$t('workbench.novel.import.cancel')"
      width="480px"
      placement="center"
      :confirm-loading="scriptLoading"
      @confirm="confirmMerge"
      @close="mergeDialogVisible = false"
      @cancel="mergeDialogVisible = false">
      <t-select v-model="selectedScriptId" :loading="scriptLoading" :placeholder="$t('workbench.novel.import.selectScriptPh')">
        <t-option v-for="item in scriptOptions" :key="item.id" :value="item.id" :label="item.name" />
      </t-select>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { LoadingPlugin } from "tdesign-vue-next";
import axios from "@/utils/axios";
import parseNovel from "@/utils/parseNovel";
import mammoth from "mammoth";
import type { UploadFile, PrimaryTableCol, TableRowData } from "tdesign-vue-next";
import projectStore from "@/stores/project";
const { project } = storeToRefs(projectStore());
interface ChapterItem {
  index: number;
  reel: string;
  chapter: string;
  chapterData: string;
}

const purgeNovelShow = defineModel<boolean>();

const activeKey = ref("To1");
const uploadRef = ref();
const content = ref("");
const fileList = ref<any[]>([]);
const selectedRowKeys = ref<number[]>([]);

const nextLoading = ref(false);
const router = useRouter();
const emit = defineEmits(["select"]);

interface ImportBatch {
  importId: number;
  fileName: string;
  success: boolean;
  error?: string;
}

interface ScriptOption {
  id: number;
  name: string;
}

const batchFileInputRef = ref<HTMLInputElement>();
const batchImporting = ref(false);
const batchResults = ref<ImportBatch[]>([]);
const mergeDialogVisible = ref(false);
const scriptLoading = ref(false);
const scriptOptions = ref<ScriptOption[]>([]);
const selectedScriptId = ref<number>();
const mergingBatch = ref<ImportBatch>();

const columns: PrimaryTableCol<TableRowData>[] = [
  { colKey: "row-select", type: "multiple", width: 60 },
  { colKey: "index", title: $t("workbench.novel.import.col.chapter"), width: 100 },
  { colKey: "reel", title: $t("workbench.novel.import.col.reel"), width: 100 },
  { colKey: "chapter", title: $t("workbench.novel.import.col.chapterName"), width: 200, ellipsis: true },
  { colKey: "chapterData", title: $t("workbench.novel.import.col.chapterData"), ellipsis: true },
];

// 解析后的章节数据
const tableData = computed<ChapterItem[]>(() => {
  if (!content.value) return [];
  try {
    return parseNovel(content.value).flatMap((reel) =>
      reel.chapters.map((chapter) => ({
        index: chapter.index,
        reel: reel.reel,
        chapter: chapter.chapter,
        chapterData: chapter.text,
      })),
    );
  } catch (e) {
    console.error("解析小说内容出错:", e);
    return [];
  }
});

// 选中的行数据
const selectedRows = computed(() => tableData.value.filter((item) => selectedRowKeys.value.includes(item.index)));

// 已选文本总长度
const selectedTextLength = computed(() => selectedRows.value.reduce((sum, item) => sum + item.chapterData.length, 0));

// 触发上传
function triggerUpload() {
  uploadRef.value?.triggerUpload();
}

function triggerBatchUpload() {
  batchFileInputRef.value?.click();
}

async function readFileText(file: File) {
  const buffer = await file.arrayBuffer();
  return new TextDecoder().decode(buffer);
}

function getBatchChapters(contentText: string, fileName: string): ChapterItem[] {
  try {
    const parsed = parseNovel(contentText);
    return parsed.flatMap((reel) =>
      reel.chapters.map((chapter) => ({
        index: chapter.index,
        reel: reel.reel,
        chapter: chapter.chapter,
        chapterData: chapter.text,
      })),
    );
  } catch {
    return [{ index: 1, reel: "", chapter: fileName, chapterData: contentText }];
  }
}

async function handleBatchFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files || []);
  input.value = "";
  if (!files.length) return;
  const invalidFile = files.find((file) => !file.name.toLowerCase().endsWith(".txt"));
  if (invalidFile) {
    window.$message.error($t("workbench.novel.import.msg.onlyTxt"));
    return;
  }
  const tooLargeFile = files.find((file) => file.size > 10 * 1024 * 1024);
  if (tooLargeFile) {
    window.$message.error($t("workbench.novel.import.msg.fileTooLarge"));
    return;
  }

  batchImporting.value = true;
  batchResults.value = [];
  activeKey.value = "Batches";
  let hasSuccess = false;
  for (const file of files) {
    try {
      const contentText = await readFileText(file);
      const chapters = getBatchChapters(contentText, file.name);
      const { data } = await axios.post("/novel/addNovel", {
        projectId: project.value?.id,
        data: chapters,
      });
      batchResults.value.push({
        importId: Number(data.importId),
        fileName: file.name,
        success: true,
      });
      hasSuccess = true;
    } catch (e) {
      batchResults.value.push({
        importId: 0,
        fileName: file.name,
        success: false,
        error: (e as Error).message || $t("workbench.novel.import.msg.importFailed"),
      });
    }
  }
  batchImporting.value = false;
  if (hasSuccess) {
    emit("select");
    window.$message.success($t("workbench.novel.import.msg.batchSuccess"));
  }
}

function generateNewScript(batch: ImportBatch) {
  purgeNovelShow.value = false;
  router.push({ path: "/scriptAgent", query: { importId: String(batch.importId) } });
}

async function openMergeDialog(batch: ImportBatch) {
  mergingBatch.value = batch;
  selectedScriptId.value = undefined;
  mergeDialogVisible.value = true;
  scriptLoading.value = true;
  try {
    const { data } = await axios.post("/script/getScrptApi", { projectId: project.value?.id });
    scriptOptions.value = data || [];
  } catch (e) {
    window.$message.error((e as Error).message || $t("workbench.novel.import.msg.scriptLoadFailed"));
  } finally {
    scriptLoading.value = false;
  }
}

function confirmMerge() {
  if (!mergingBatch.value) return;
  if (!selectedScriptId.value) return window.$message.warning($t("workbench.novel.import.msg.selectScriptFirst"));
  const batch = mergingBatch.value;
  mergeDialogVisible.value = false;
  purgeNovelShow.value = false;
  router.push({
    path: "/scriptAgent",
    query: {
      importId: String(batch.importId),
      scriptId: String(selectedScriptId.value),
      merge: "1",
    },
  });
}

// 处理拖拽上传
async function handleDrop(e: DragEvent) {
  const files = e.dataTransfer?.files;
  if (files && files.length > 0) {
    await handleBeforeUpload({ raw: files[0] });
  }
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
function requestMethod() {
  return Promise.resolve({
    response: {},
    status: "success",
  } as const);
}

// 上传前校验并解析
async function handleBeforeUpload(file: UploadFile) {
  const rawFile = file.raw;
  if (!rawFile) {
    window.$message.error($t("workbench.novel.import.msg.selectFile"));
    return false;
  }
  const allowTypes = ["text/plain", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

  if (rawFile.type === "application/msword") {
    window.$message.warning($t("workbench.novel.import.msg.docNotSupported"));
    return false;
  }
  if (!allowTypes.includes(rawFile.type)) {
    window.$message.error($t("workbench.novel.import.msg.unsupportedType"));
    return false;
  }
  if (rawFile.size > 10 * 1024 * 1024) {
    window.$message.error($t("workbench.novel.import.msg.fileTooLarge"));
    return false;
  }

  LoadingPlugin(true);
  try {
    content.value = await readFile(rawFile);
  } catch {
    window.$message.error($t("workbench.novel.import.msg.parseFailed"));
  } finally {
    LoadingPlugin(false);
  }
  return false;
}

// 勾选变化
function onSelectChange(selectedKeys: Array<string | number>, context: { selectedRowData: TableRowData[] }) {
  selectedRowKeys.value = selectedKeys as number[];
}
//保存小说
async function keep() {
  nextLoading.value = true;
  if (!selectedRows.value.length) {
    window.$message.warning($t("workbench.novel.import.msg.selectChapters"));
    nextLoading.value = false;
    return;
  }
  try {
    await axios.post("/novel/addNovel", { projectId: project.value?.id, data: selectedRows.value });
    nextLoading.value = false;
    emit("select");
    window.$message.success($t("workbench.novel.import.msg.saveSuccess"));
  } catch (e) {
    window.$message.error((e as Error).message);
    nextLoading.value = false;
  } finally {
    nextLoading.value = false;
    purgeNovelShow.value = false;
  }
}
//关闭弹窗时重置数据
watch(purgeNovelShow, (newVal) => {
  if (!newVal) {
    content.value = "";
    fileList.value = [];
    selectedRowKeys.value = [];
    activeKey.value = "To1";
    batchImporting.value = false;
    batchResults.value = [];
    mergeDialogVisible.value = false;
    mergingBatch.value = undefined;
  }
});
</script>

<style lang="scss" scoped>
.purgeNovel {
  .data {
    .uploadArea {
      margin-top: 20px;
      padding: 42px 20px;
      border: 2px dashed #969494;
      border-radius: 8px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
      &:hover {
        border-color: #000000;
      }

      .dragIcon {
        margin-bottom: 12px;
      }

      .uploadText {
        font-size: 14px;
        margin: 0 0 8px;
      }

      .uploadHint {
        font-size: 12px;
        margin: 0;
      }
    }
    .to2Box {
      height: 100%;
    }
    .formItem {
      .label {
        font-weight: 500;
        margin-bottom: 8px;
      }
      .footerInfo {
        font-size: 12px;
        .tips.warn {
          margin-left: 8px;
        }
      }
    }

    .batchImportBar {
      gap: 16px;
      margin-bottom: 16px;
      padding: 14px;
      border: 1px solid var(--td-border-level-1-color);
      border-radius: 8px;

      .batchImportInfo {
        flex: 1;
        min-width: 0;

        .label {
          font-weight: 500;
          margin-bottom: 4px;
        }
      }

      .hiddenFileInput {
        display: none;
      }
    }

    .batchList {
      display: flex;
      flex-direction: column;
      gap: 12px;

      .batchProgress,
      .batchError {
        color: var(--td-text-color-secondary);
      }

      .batchItem {
        padding: 12px;
        border: 1px solid var(--td-border-level-1-color);
        border-radius: 8px;

        .batchMain {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;

          .batchName {
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-weight: 500;
          }
        }

        .batchActions {
          gap: 8px;
          margin-top: 12px;
          justify-content: flex-end;
        }

        .batchError {
          margin-top: 8px;
          font-size: 12px;
          color: var(--td-error-color);
        }
      }
    }
  }
}
.ellipsisText {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
  max-width: 100%;
}
.selectedInfo {
  margin-top: 12px;
  font-size: 14px;
}
</style>
