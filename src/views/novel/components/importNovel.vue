<template>
  <div class="purgeNovel">
    <t-dialog :footer="false" v-model:visible="purgeNovelShow" :header="$t(isExplainer ? 'workbench.novel.import.explainer.title' : 'workbench.novel.import.title')" width="50%" placement="center">
      <div class="data">
        <t-tabs :value="activeKey" disabled>
          <t-tab-panel value="To1" :label="$t('workbench.novel.import.step1')" style="height: 680px; overflow-y: auto">
            <div class="uploadArea" :class="{ importing: fileImporting }" @click="triggerUpload" @dragover.prevent @drop.prevent="handleDrop">
              <input
                ref="fileInputRef"
                type="file"
                accept=".txt,.docx,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                multiple
                class="hiddenFileInput"
                :disabled="fileImporting"
                @change="handleFileChange" />
              <div class="dragIcon">
                <i-upload-one theme="outline" size="32" fill="var(--td-brand-color)" />
              </div>
              <p class="uploadText">{{ $t(isExplainer ? "workbench.novel.import.explainer.dragUpload" : "workbench.novel.import.dragUpload") }}</p>
              <p class="uploadHint">{{ $t(isExplainer ? "workbench.novel.import.explainer.uploadHint" : "workbench.novel.import.uploadHint") }}</p>
            </div>
            <div v-if="fileImporting" class="importProgress">{{ $t("workbench.novel.import.importingProgress", { current: importingCurrent, total: importTotal }) }}</div>
            <div v-if="importResults.length" class="fileResultList">
              <div v-for="(result, index) in importResults" :key="`${result.fileName}-${index}`" class="fileResultItem">
                <div class="fileResultMain">
                  <span class="fileName">{{ result.fileName }}</span>
                  <t-loading v-if="result.status === 'pending'" size="small" />
                  <t-tag v-else-if="result.status === 'success'" theme="success" variant="light" size="small">
                    {{ $t(isExplainer ? "workbench.novel.import.explainer.importedChapters" : "workbench.novel.import.importedChapters", { count: result.chapterCount || 0 }) }}
                  </t-tag>
                  <t-tag v-else theme="danger" variant="light" size="small">{{ $t("workbench.novel.import.importFailed") }}</t-tag>
                </div>
                <div v-if="result.status === 'error'" class="fileError">{{ result.error }}</div>
              </div>
            </div>
            <t-divider>{{ $t("workbench.novel.import.or") }}</t-divider>
            <div class="formItem">
              <div class="label">{{ $t(isExplainer ? "workbench.novel.import.explainer.pasteLabel" : "workbench.novel.import.pasteLabel") }}</div>
              <div class="uploadWrap">
                <t-textarea v-model="content" :placeholder="$t(isExplainer ? 'workbench.novel.import.explainer.pastePlaceholder' : 'workbench.novel.import.pastePlaceholder')" :autosize="{ minRows: 12, maxRows: 12 }" />
              </div>
              <div class="footerInfo f ac jb" style="margin-top: 8px">
                <div>
                  <span class="charCount">{{ content.length }} {{ $t("workbench.novel.import.chars") }}</span>
                  <span v-if="content.length > 0 && content.length < 100" class="tips warn">{{ $t("workbench.novel.import.tooShort") }}</span>
                </div>
                <span>{{ $t(isExplainer ? "workbench.novel.import.explainer.parsedChapters" : "workbench.novel.import.parsedChapters", { count: tableData.length }) }}</span>
              </div>
            </div>

            <div style="margin-top: 16px; text-align: right">
              <t-button theme="primary" :disabled="!content || !tableData.length" @click="activeKey = 'To2'">
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
              <div class="to2Footer f ac jb">
                <t-input v-model="pasteBatchName" class="batchNameInput" :placeholder="$t(isExplainer ? 'workbench.novel.import.explainer.batchNamePlaceholder' : 'workbench.novel.import.batchNamePlaceholder')" :maxlength="60" clearable />
                <div class="f ac">
                  <t-button variant="outline" @click="activeKey = 'To1'">{{ $t("workbench.novel.import.prevStep") }}</t-button>
                  <t-button theme="primary" style="margin-left: 10px" :loading="nextLoading" @click="keep">
                    {{ $t("workbench.novel.import.save") }}
                  </t-button>
                </div>
              </div>
            </div>
          </t-tab-panel>
        </t-tabs>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import axios from "@/utils/axios";
import parseNovel from "@/utils/parseNovel";
import mammoth from "mammoth";
import type { PrimaryTableCol, TableRowData } from "tdesign-vue-next";
import projectStore from "@/stores/project";
const { project } = storeToRefs(projectStore());
// 科普形态：弹窗切换「知识文本」文案；批次名默认 导入文本_日期，提取完成后由后端自动改为标题
const isExplainer = computed(() => project.value?.contentFormat === "explainer_video");
interface ChapterItem {
  index: number;
  reel: string;
  chapter: string;
  chapterData: string;
}
interface FileImportResult {
  fileName: string;
  status: "pending" | "success" | "error";
  chapterCount?: number;
  importId?: number;
  error?: string;
}

const purgeNovelShow = defineModel<boolean>();
const emit = defineEmits<{
  (event: "select", importIds: number[]): void;
}>();

const activeKey = ref("To1");
const tableRef = ref();
const fileInputRef = ref<HTMLInputElement>();
const content = ref("");
const selectedRowKeys = ref<number[]>([]);
const pasteBatchName = ref("");
const nextLoading = ref(false);
const fileImporting = ref(false);
const importResults = ref<FileImportResult[]>([]);
const importTotal = ref(0);
const importingCurrent = computed(() => {
  const index = importResults.value.findIndex((result) => result.status === "pending");
  return index === -1 ? importTotal.value : index + 1;
});

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

function triggerUpload() {
  if (!fileImporting.value) fileInputRef.value?.click();
}

async function readFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  if (file.type === "text/plain") {
    return new TextDecoder().decode(buffer);
  }
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value;
}

function getChapters(contentText: string, fileName: string): ChapterItem[] {
  try {
    const parsed = parseNovel(contentText);
    const chapters = parsed.flatMap((reel) =>
      reel.chapters.map((chapter) => ({
        index: chapter.index,
        reel: reel.reel,
        chapter: chapter.chapter,
        chapterData: chapter.text,
      })),
    );
    return chapters.length ? chapters : [{ index: 1, reel: "", chapter: fileName, chapterData: contentText }];
  } catch {
    return [{ index: 1, reel: "", chapter: fileName, chapterData: contentText }];
  }
}

function validateFile(file: File): string | undefined {
  const allowTypes = ["text/plain", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
  if (file.type === "application/msword") return $t("workbench.novel.import.msg.docNotSupported");
  if (!allowTypes.includes(file.type)) return $t("workbench.novel.import.msg.unsupportedType");
  if (file.size > 10 * 1024 * 1024) return $t("workbench.novel.import.msg.fileTooLarge");
  return undefined;
}

async function importFiles(files: File[]) {
  if (!files.length || fileImporting.value) return;
  fileImporting.value = true;
  importResults.value = files.map((file) => ({ fileName: file.name, status: "pending" }));
  importTotal.value = files.length;
  const successImportIds: number[] = [];

  for (const [index, file] of files.entries()) {
    const result = importResults.value[index];
    const invalidReason = validateFile(file);
    if (invalidReason) {
      result.status = "error";
      result.error = invalidReason;
      continue;
    }

    try {
      const contentText = await readFile(file);
      const chapters = getChapters(contentText, file.name);
      const { data } = await axios.post("/novel/addNovel", {
        projectId: project.value?.id,
        data: chapters,
      });
      const importId = Number(data?.importId);
      if (!Number.isFinite(importId) || importId <= 0) throw new Error($t("workbench.novel.import.msg.missingImportId"));
      result.status = "success";
      result.chapterCount = chapters.length;
      result.importId = importId;
      successImportIds.push(importId);
    } catch (e) {
      result.status = "error";
      result.error = (e as Error).message || $t("workbench.novel.import.msg.importFailed");
    }
  }

  fileImporting.value = false;
  if (successImportIds.length) emit("select", successImportIds);
  if (successImportIds.length === files.length) {
    window.$message.success($t("workbench.novel.import.msg.allSuccess"));
    purgeNovelShow.value = false;
  } else {
    window.$message.warning($t("workbench.novel.import.msg.hasFailures"));
  }
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files || []);
  input.value = "";
  importFiles(files);
}

async function handleDrop(event: DragEvent) {
  const files = Array.from(event.dataTransfer?.files || []);
  await importFiles(files);
}

// 勾选变化
function onSelectChange(selectedKeys: Array<string | number>, context: { selectedRowData: TableRowData[] }) {
  selectedRowKeys.value = selectedKeys as number[];
}

// 保存粘贴流程，批次名可选
async function keep() {
  nextLoading.value = true;
  if (!selectedRows.value.length) {
    window.$message.warning($t("workbench.novel.import.msg.selectChapters"));
    nextLoading.value = false;
    return;
  }
  try {
    const { data } = await axios.post("/novel/addNovel", {
      projectId: project.value?.id,
      ...(pasteBatchName.value.trim() ? { name: pasteBatchName.value.trim() } : {}),
      data: selectedRows.value,
    });
    emit("select", [Number(data?.importId)].filter((id) => Number.isFinite(id) && id > 0));
    window.$message.success($t("workbench.novel.import.msg.saveSuccess"));
    purgeNovelShow.value = false;
  } catch (e) {
    window.$message.error((e as Error).message);
  } finally {
    nextLoading.value = false;
  }
}

// 关闭弹窗时重置数据
watch(purgeNovelShow, (visible) => {
  if (!visible) {
    if (fileImporting.value) {
      purgeNovelShow.value = true;
      return;
    }
    content.value = "";
    selectedRowKeys.value = [];
    activeKey.value = "To1";
    pasteBatchName.value = "";
    fileImporting.value = false;
    importResults.value = [];
    importTotal.value = 0;
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
      &.importing {
        cursor: not-allowed;
        opacity: 0.7;
      }

      .hiddenFileInput {
        display: none;
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
      .to2Footer {
        gap: 16px;
        margin-top: 16px;
        .batchNameInput {
          width: 280px;
        }
      }
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

    .importProgress {
      margin-top: 12px;
      font-size: 13px;
      color: var(--td-text-color-secondary);
    }

    .fileResultList {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 12px;

      .fileResultItem {
        padding: 10px 12px;
        border: 1px solid var(--td-border-level-1-color);
        border-radius: 8px;

        .fileResultMain {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;

          .fileName {
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-weight: 500;
          }
        }

        .fileError {
          margin-top: 6px;
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
