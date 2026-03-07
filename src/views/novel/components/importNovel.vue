<template>
  <div class="purgeNovel">
    <t-dialog :footer="false" v-model:visible="purgeNovelShow" header="上传小说原文" width="50%" placement="center">
      <div class="data">
        <t-tabs :value="activeKey" disabled>
          <t-tab-panel value="To1" label="第一步" style="height: 680px; overflow-y: auto">
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
              <p class="uploadText">拖拽小说原文文件到此处或点击上传</p>
              <p class="uploadHint">支持 .txt, .docx 格式，建议文件大小不超过 10MB</p>
            </div>
            <t-divider>或</t-divider>
            <div class="formItem">
              <div class="label">直接粘贴小说原文内容</div>
              <div class="uploadWrap">
                <t-textarea v-model="content" placeholder="请输入小说原文内容" :autosize="{ minRows: 12, maxRows: 12 }" />
              </div>
              <div class="footerInfo f ac jb" style="margin-top: 8px">
                <div>
                  <span class="charCount">{{ content.length }} 字符</span>
                  <span v-if="content.length > 0 && content.length < 100" class="tips warn">内容过短，建议至少100字符</span>
                </div>
                <span>已解析 {{ tableData.length }} 章节</span>
              </div>
            </div>

            <div style="margin-top: 16px; text-align: right">
              <t-button theme="primary" style="margin-left: 10px" :disabled="!content || !tableData.length" @click="activeKey = 'To2'">
                下一步
              </t-button>
            </div>
          </t-tab-panel>
          <t-tab-panel value="To2" label="第二步" style="height: 680px; overflow-y: auto">
            <div>
              <t-table
                ref="tableRef"
                row-key="index"
                :data="tableData"
                :columns="columns"
                :selected-row-keys="selectedRowKeys"
                hover
                @select-change="onSelectChange">
                <template #chapterData="{ row }">
                  <t-tooltip :content="row.chapterData" placement="top">
                    <span class="ellipsisText">{{ row.chapterData }}</span>
                  </t-tooltip>
                </template>
              </t-table>
            </div>
            <div class="selectedInfo">已勾选：{{ selectedTextLength }}字(小于200000字)</div>
            <div style="margin-top: 16px; text-align: right">
              <t-button variant="outline" @click="activeKey = 'To1'">上一步</t-button>
              <t-button theme="primary" style="margin-left: 10px" :disabled="selectedTextLength > 200000" :loading="nextLoading" @click="keep">
                保存
              </t-button>
            </div>
          </t-tab-panel>
        </t-tabs>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ElLoading } from "element-plus";
import axios from "@/utils/axios";
import parseNovel from "@/utils/parseNovel";
import mammoth from "mammoth";
import { MessagePlugin } from "tdesign-vue-next";
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

const columns: PrimaryTableCol<TableRowData>[] = [
  { colKey: "row-select", type: "multiple", width: 60 },
  { colKey: "index", title: "章", width: 100 },
  { colKey: "reel", title: "卷", width: 100 },
  { colKey: "chapter", title: "章节名称", width: 200, ellipsis: true },
  { colKey: "chapterData", title: "章节内容", ellipsis: true },
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
    MessagePlugin.error("请先选择文件");
    return false;
  }
  const allowTypes = ["text/plain", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

  if (rawFile.type === "application/msword") {
    MessagePlugin.warning(".doc文件不支持解析，请转换为.txt或.docx文件");
    return false;
  }
  if (!allowTypes.includes(rawFile.type)) {
    MessagePlugin.error("不支持的文件类型");
    return false;
  }
  if (rawFile.size > 10 * 1024 * 1024) {
    MessagePlugin.error("文件大小超过10MB，请上传更小的文件");
    return false;
  }

  const loading = ElLoading.service({ lock: true, text: "文件解析中...", background: "rgba(0,0,0,0.7)" });
  try {
    content.value = await readFile(rawFile);
  } catch {
    MessagePlugin.error("文件解析失败，请重新上传");
  } finally {
    loading.close();
  }
  return false;
}

// 勾选变化
function onSelectChange(selectedKeys: Array<string | number>, context: { selectedRowData: TableRowData[] }) {
  selectedRowKeys.value = selectedKeys as number[];
}
const emit = defineEmits(["select"]);
//保存小说
async function keep() {
  nextLoading.value = true;
  if (!selectedRows.value.length) {
    MessagePlugin.warning("请先勾选章节");
    nextLoading.value = false;
    return;
  }
  try {
    await axios.post("/novel/addNovel", { projectId: project.value?.id, data: selectedRows.value });
    nextLoading.value = false;
    emit("select");
    MessagePlugin.success("小说原文保存成功");
  } catch (e) {
    MessagePlugin.error((e as Error).message);
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
