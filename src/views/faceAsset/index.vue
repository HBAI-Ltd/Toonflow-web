<template>
  <div class="faceAssetPage">
    <!-- 顶部工具栏 -->
    <div class="toolbar f ac jb">
      <div class="left f ac">
        <h2 class="title">人物资产库</h2>
        <span class="sub">双真人人脸参考底图 · 角色生图自动抽样 · 支持拖拽直接上传</span>
      </div>
      <div class="right f ac">
        <t-select v-model="filter.gender" placeholder="性别" clearable style="width: 100px" @change="loadList(1)">
          <t-option v-for="g in genderOptions" :key="g.value" :value="g.value" :label="g.label" />
        </t-select>
        <t-select v-model="filter.ethnicity" placeholder="人种" clearable style="width: 110px" @change="loadList(1)">
          <t-option v-for="e in ethnicityOptions" :key="e.value" :value="e.value" :label="e.label" />
        </t-select>
        <t-select v-model="filter.ageGroup" placeholder="年龄段" clearable style="width: 100px" @change="loadList(1)">
          <t-option v-for="a in ageOptions" :key="a.value" :value="a.value" :label="a.label" />
        </t-select>
        <t-select v-model="filter.beautyBand" placeholder="颜值档位" clearable style="width: 130px" @change="loadList(1)">
          <t-option v-for="b in beautyBandOptions" :key="b.value" :value="b.value" :label="b.label" />
        </t-select>

        <!-- 批量删除模式：点击「批量删除」进入，卡片显示复选框 -->
        <template v-if="deleteMode">
          <span class="batchInfo" v-if="selectedIds.size > 0">已选 {{ selectedIds.size }}/{{ total }} 项</span>
          <t-button variant="outline" @click="selectAllPage">
            <template #icon><i-check-circle class="icon" /></template>
            全选本页
          </t-button>
          <t-button variant="outline" @click="selectAllFiltered">
            <template #icon><i-check-double class="icon" /></template>
            全选全部
          </t-button>
          <t-button variant="text" @click="clearSelected">取消选择</t-button>
          <t-button variant="outline" theme="danger" :disabled="selectedIds.size === 0" @click="confirmBatchDel">
            <template #icon><i-delete class="icon" /></template>
            删除所选
          </t-button>
          <t-button variant="text" @click="exitDeleteMode">退出</t-button>
        </template>
        <template v-else>
          <t-button variant="outline" theme="danger" @click="enterDeleteMode">
            <template #icon><i-delete class="icon" /></template>
            批量删除
          </t-button>
        </template>

        <t-button theme="primary" @click="openUpload">
          <template #icon><i-add class="icon" /></template>
          批量上传人脸
        </t-button>
      </div>
    </div>

    <!-- 库存覆盖提示：按 性别×年龄段 统计，缺口一目了然（选图策略：年龄段硬锁、族裔可放宽） -->
    <div class="coverageBar f ac" v-if="coverageBuckets.length">
      <span class="coverageLabel">库存覆盖</span>
      <t-tag
        v-for="b in coverageBuckets"
        :key="b.label"
        size="small"
        :theme="b.total === 0 ? 'danger' : 'success'"
        variant="light"
        style="margin-right: 6px">
        {{ b.label }} {{ b.total }}
      </t-tag>
      <span v-if="missingBuckets.length" class="coverageWarn">⚠ 缺口：{{ missingBuckets.join("、") }}（该档生图将拿不到参考底图，请优先补充）</span>
    </div>

    <!-- 卡片列表 -->
    <div v-if="list.length" class="cardGrid">
      <div v-for="item in list" :key="item.id" class="card" :class="{ selected: selectedIds.has(item.id) }">
        <div class="imgBox" @click="preview(item)">
          <!-- 使用高清原图（fileUrlRaw），避免列表模糊；原图懒加载 -->
          <img :src="item.fileUrlRaw || item.fileUrl" :alt="item.name" loading="lazy" class="cardImg" />
          <div class="hoverOverlay">
            <i-expand-text-input class="zoomIcon" />
            <span>点击查看大图</span>
          </div>
          <!-- 多选复选框：仅在删除模式下显示 -->
          <div v-if="deleteMode" class="cardCheck" @click.stop>
            <t-checkbox
              :checked="selectedIds.has(item.id)"
              @change="(v) => toggleSelect(item.id, !!v)" />
          </div>
        </div>
        <div class="info">
          <div class="nameRow f ac jb">
            <span class="name" :title="item.name">{{ item.name }}</span>
            <span class="gender" :class="Number(item.gender) === 2 ? 'female' : Number(item.gender) === 1 ? 'male' : ''">{{ genderText(item.gender) }}</span>
          </div>
          <div class="meta">
            <t-tag size="small" variant="light">{{ ethnicityText(item.ethnicity) }}</t-tag>
            <t-tag size="small" variant="light" theme="primary">{{ ageGroupText(item.ageGroup) }}</t-tag>
            <t-tag v-if="item.beautyScore != null" size="small" variant="light" theme="warning">颜值 {{ item.beautyScore }}</t-tag>
          </div>
          <!-- 始终可见的操作按钮区（不依赖 hover，触屏/桌面均可用） -->
          <div class="cardActionsBar">
            <t-button size="small" variant="text" theme="primary" @click="openDetail(item)">
              <template #icon><i-view-list /></template>
              详情
            </t-button>
            <t-button size="small" variant="text" theme="primary" @click="openEdit(item)">
              <template #icon><i-edit /></template>
              编辑
            </t-button>
            <t-button size="small" variant="text" theme="danger" @click="confirmDel(item)">
              <template #icon><i-delete /></template>
              删除
            </t-button>
          </div>
        </div>
      </div>
    </div>
    <t-empty v-else description="暂无人物资产，把人脸照片拖进本页即可上传，或点击右上角「批量上传人脸」" style="margin-top: 80px" />

    <!-- 分页 -->
    <div class="pager f ac" v-if="total > pageSize">
      <t-pagination :total="total" :page-size="pageSize" :current="page" show-jumper @change="onPageChange" />
    </div>

    <!-- 全页拖拽遮罩（pointer-events: none，保证 drop 事件落在页面根元素） -->
    <div v-if="pageDragOver" class="pageDropOverlay">
      <div class="pageDropOverlay__inner">
        <i-upload-one class="pageDropOverlay__icon" />
        <div class="pageDropOverlay__title">松开鼠标，立即上传并 AI 解析</div>
        <div class="pageDropOverlay__sub">支持多张 · 自动识别性别/年龄段/族裔/颜值 · 后台静默录入，不打断浏览</div>
      </div>
    </div>


    <!-- 批量上传对话框 -->
    <t-dialog :visible="dialogVisible" :header="'批量上传人物资产'" :footer="false" width="640px" @close="closeDialog">
      <t-form label-align="left" :label-width="80">
        <t-form-item label="照片" required :error="imgError">
          <div
            class="uploadArea"
            :class="{ isDragOver }"
            v-if="!pendingFiles.length"
            @dragover.prevent="isDragOver = true"
            @dragleave.prevent="isDragOver = false"
            @drop.prevent="handleDrop">
            <label class="pickBtn c">
              <input type="file" accept="image/*" multiple style="display: none" @change="onPickImages" />
              <i-upload-one class="icon" />
              <span>点击或将多张人脸照片拖拽至此处</span>
            </label>
            <div class="tips">支持 jpg/png/webp 格式，可拖动或多选批量上传；每张可开启 AI 自动打标</div>
          </div>
          <div
            v-else
            class="pendingBox"
            :class="{ isDragOver }"
            @dragover.prevent="isDragOver = true"
            @dragleave.prevent="isDragOver = false"
            @drop.prevent="handleDrop">
            <div class="thumbs">
              <div v-for="(f, i) in pendingFiles" :key="i" class="thumb">
                <img :src="f.base64" />
                <div class="rm" @click="removePending(i)"><i-close class="icon" /></div>
              </div>
            </div>
            <div class="btnRow f ac">
              <label class="addMore"><input type="file" accept="image/*" multiple style="display: none" @change="onPickImages" />＋ 继续添加（或直接拖入）</label>
              <span class="count">共 {{ pendingFiles.length }} 张</span>
            </div>
          </div>
        </t-form-item>
        <t-form-item label="性别">
          <t-radio-group v-model="form.gender" variant="default-filled">
            <t-radio-button :value="0">自动识别</t-radio-button>
            <t-radio-button v-for="g in genderOptions" :key="g.value" :value="g.value">{{ g.label }}</t-radio-button>
          </t-radio-group>
        </t-form-item>
        <t-form-item label="年龄段">
          <t-radio-group v-model="form.ageGroup" variant="default-filled">
            <t-radio-button :value="0">自动识别</t-radio-button>
            <t-radio-button v-for="a in ageOptions" :key="a.value" :value="a.value">{{ a.label }}</t-radio-button>
          </t-radio-group>
        </t-form-item>
        <t-form-item label="人种">
          <t-radio-group v-model="form.ethnicity" variant="default-filled">
            <t-radio-button :value="0">自动识别</t-radio-button>
            <t-radio-button v-for="e in ethnicityOptions" :key="e.value" :value="e.value">{{ e.label }}</t-radio-button>
          </t-radio-group>
        </t-form-item>
        <t-form-item label="颜值评分">
          <div class="f ac">
            <t-input-number
              v-model="form.beautyScore"
              :min="2"
              :max="10"
              :step="0.1"
              :decimal-places="1"
              theme="column"
              placeholder="留空自动评分"
              style="width: 150px" />
            <span class="autoTip" style="margin-left: 10px">2.0~10.0 客观连续分；留空由视觉模型评分</span>
          </div>
        </t-form-item>
        <t-form-item label="AI 自动打标">
          <t-switch v-model="form.autoTag" />
          <span class="autoTip" style="margin-left: 10px">开启后由视觉模型自动分析性别/年龄段/族裔/颜值评分（未手填的字段）</span>
        </t-form-item>
      </t-form>
      <div class="dialogFooter f ac jb">
        <span v-if="uploading" class="uploading">正在上传 {{ uploadedCount }}/{{ pendingFiles.length }}，请勿关闭…</span>
        <div class="f ac">
          <t-button variant="outline" :disabled="uploading" @click="closeDialog">取消</t-button>
          <t-button theme="primary" :loading="uploading" :disabled="!pendingFiles.length" style="margin-left: 10px" @click="submit">开始上传</t-button>
        </div>
      </div>
    </t-dialog>

    <!-- 编辑对话框 -->
    <t-dialog :visible="editVisible" header="编辑人物资产" :footer="false" width="520px" @close="editVisible = false">
      <t-form label-align="left" :label-width="80">
        <t-form-item label="名称">
          <t-input v-model="editForm.name" />
        </t-form-item>
        <t-form-item label="性别">
          <t-radio-group v-model="editForm.gender" variant="default-filled">
            <t-radio-button v-for="g in genderOptions" :key="g.value" :value="g.value">{{ g.label }}</t-radio-button>
          </t-radio-group>
        </t-form-item>
        <t-form-item label="年龄段">
          <t-radio-group v-model="editForm.ageGroup" variant="default-filled">
            <t-radio-button v-for="a in ageOptions" :key="a.value" :value="a.value">{{ a.label }}</t-radio-button>
          </t-radio-group>
        </t-form-item>
        <t-form-item label="人种">
          <t-radio-group v-model="editForm.ethnicity" variant="default-filled">
            <t-radio-button v-for="e in ethnicityOptions" :key="e.value" :value="e.value">{{ e.label }}</t-radio-button>
          </t-radio-group>
        </t-form-item>
        <t-form-item label="颜值评分">
          <t-input-number
            v-model="editForm.beautyScore"
            :min="2"
            :max="10"
            :step="0.1"
            :decimal-places="1"
            theme="column"
            placeholder="2.0 ~ 10.0"
            style="width: 150px" />
        </t-form-item>
      </t-form>
      <div class="dialogFooter f ac jb">
        <span></span>
        <div class="f ac">
          <t-button variant="outline" @click="editVisible = false">取消</t-button>
          <t-button theme="primary" style="margin-left: 10px" @click="submitEdit">保存</t-button>
        </div>
      </div>
    </t-dialog>

    <!-- 详情对话框（只读查看全部元信息） -->
    <t-dialog
      :visible="detailVisible"
      header="人物资产详情"
      :footer="false"
      width="640px"
      @close="detailVisible = false">
      <div v-if="detailItem" class="detailDialog">
        <div class="detailDialog__hero">
          <img
            :src="detailItem.fileUrlRaw || detailItem.fileUrl"
            :alt="detailItem.name"
            class="detailDialog__img" />
          <div class="detailDialog__basic">
            <div class="detailDialog__name">{{ detailItem.name || "未命名" }}</div>
            <div class="detailDialog__chips">
              <t-tag theme="primary" variant="light">性别：{{ genderText(detailItem.gender) }}</t-tag>
              <t-tag theme="success" variant="light">年龄段：{{ ageGroupText(detailItem.ageGroup) }}</t-tag>
              <t-tag theme="warning" variant="light">人种：{{ ethnicityText(detailItem.ethnicity) }}</t-tag>
              <t-tag v-if="detailItem.beautyScore != null" theme="danger" variant="light">颜值：{{ detailItem.beautyScore }}</t-tag>
            </div>
          </div>
        </div>

        <t-form label-align="top" class="detailDialog__form">
          <t-form-item label="文件信息">
            <div class="detailDialog__fileinfo">
              <div><b>路径：</b>{{ detailItem.filePath || "-" }}</div>
              <div><b>缩略图：</b>{{ detailItem.fileUrl || "-" }}</div>
              <div><b>原图：</b>{{ detailItem.fileUrlRaw || "-" }}</div>
            </div>
          </t-form-item>
        </t-form>

        <div class="dialogFooter f ac jb">
          <span></span>
          <div class="f ac">
            <t-button variant="outline" @click="detailVisible = false">关闭</t-button>
            <t-button theme="primary" style="margin-left: 10px" @click="() => { detailVisible = false; openEdit(detailItem); }">
              <template #icon><i-edit /></template>
              去编辑
            </t-button>
          </div>
        </div>
      </div>
    </t-dialog>

    <!-- 高清人脸预览（自定义灯箱：解决 t-image-viewer 在竖屏/EXIF 方向下的排版问题） -->
    <teleport to="body">
      <div v-if="previewVisible" class="faceLightbox" @click.self="closePreview">
        <div class="faceLightbox__topbar">
          <div class="faceLightbox__title">{{ previewCurrent?.name || "" }}</div>
          <div class="faceLightbox__meta">
            <span v-if="previewCurrent?.gender != null">{{ genderText(previewCurrent.gender) }}</span>
            <span v-if="previewCurrent?.ageGroup != null">{{ ageGroupText(previewCurrent.ageGroup) }}</span>
            <span v-if="previewCurrent?.ethnicity != null">{{ ethnicityText(previewCurrent.ethnicity) }}</span>
            <span v-if="previewCurrent?.beautyScore != null">颜值 {{ previewCurrent.beautyScore }}</span>
            <span class="counter">{{ previewIndex + 1 }} / {{ previewImages.length }}</span>
          </div>
          <button class="faceLightbox__close" @click="closePreview" aria-label="关闭">
            <i-close size="22" />
          </button>
        </div>

        <button v-if="previewImages.length > 1" class="faceLightbox__nav faceLightbox__nav--prev" @click="prevPreview" aria-label="上一张">
          <i-chevron-left size="28" />
        </button>
        <button v-if="previewImages.length > 1" class="faceLightbox__nav faceLightbox__nav--next" @click="nextPreview" aria-label="下一张">
          <i-chevron-right size="28" />
        </button>

        <div class="faceLightbox__stage" @click.stop>
          <img
            v-if="previewCurrentRaw"
            :key="previewCurrentRaw"
            :src="previewCurrentRaw"
            :alt="previewCurrent?.name"
            class="faceLightbox__img"
            @load="onPreviewImgLoad"
            @error="onPreviewImgError" />
        </div>

        <div v-if="previewImages.length > 1" class="faceLightbox__thumbs">
          <div
            v-for="(img, i) in previewImages"
            :key="i"
            class="faceLightbox__thumb"
            :class="{ active: i === previewIndex }"
            @click="goPreview(i)">
            <img :src="img" />
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount } from "vue";
import axios from "@/utils/axios";
import { MessagePlugin } from "tdesign-vue-next";

// 全系统统一数字码值字典：1男/2女/3中性；1东亚/2欧美/3东南亚/4南亚/5拉丁/6非裔/7混血；1少年/2青年/3中年/4老年
const genderOptions = [
  { value: 1, label: "男" },
  { value: 2, label: "女" },
  { value: 3, label: "中性" },
];
const ethnicityOptions = [
  { value: 1, label: "东亚" },
  { value: 2, label: "欧美" },
  { value: 3, label: "东南亚" },
  { value: 4, label: "南亚" },
  { value: 5, label: "拉丁" },
  { value: 6, label: "非裔" },
  { value: 7, label: "混血/其他" },
];
const ageOptions = [
  { value: 1, label: "少年" },
  { value: 2, label: "青年" },
  { value: 3, label: "中年" },
  { value: 4, label: "老年" },
];
// 颜值筛选档位（映射为 2.0~10.0 连续分区间，与选角打分锚点一致）
const beautyBandOptions = [
  { value: "top", label: "神颜 9.0+", min: 9.0, max: 10.0 },
  { value: "high", label: "俊美 7.5~8.9", min: 7.5, max: 8.9 },
  { value: "good", label: "清秀 5.5~7.4", min: 5.5, max: 7.4 },
  { value: "plain", label: "路人 4.0~5.4", min: 4.0, max: 5.4 },
  { value: "rough", label: "特型 2.0~3.9", min: 2.0, max: 3.9 },
];

// 码值 → 中文展示
const GENDER_LABEL: Record<number, string> = { 1: "男", 2: "女", 3: "中性" };
const ETHNICITY_LABEL: Record<number, string> = { 1: "东亚", 2: "欧美", 3: "东南亚", 4: "南亚", 5: "拉丁", 6: "非裔", 7: "混血" };
const AGE_GROUP_LABEL: Record<number, string> = { 1: "少年", 2: "青年", 3: "中年", 4: "老年" };
function genderText(v: any) {
  return GENDER_LABEL[Number(v)] || "未标注";
}
function ethnicityText(v: any) {
  return ETHNICITY_LABEL[Number(v)] || "未标注";
}
function ageGroupText(v: any) {
  return AGE_GROUP_LABEL[Number(v)] || "未标注";
}

const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(30);
const filter = reactive<any>({ gender: undefined, ethnicity: undefined, ageGroup: undefined, beautyBand: "" });

// ---- 多选删除（删除模式）----
const selectedIds = ref<Set<number>>(new Set());
const deleteMode = ref(false); // 是否处于「批量删除」模式：仅此模式下卡片显示复选框

function enterDeleteMode() {
  deleteMode.value = true;
}

function exitDeleteMode() {
  deleteMode.value = false;
  clearSelected();
}

function toggleSelect(id: number, checked: boolean) {
  const set = new Set(selectedIds.value);
  if (checked) set.add(id);
  else set.delete(id);
  selectedIds.value = set;
}

function clearSelected() {
  selectedIds.value = new Set();
}

// 全选：选中当前页全部卡片
function selectAllPage() {
  const set = new Set(selectedIds.value);
  for (const item of list.value) set.add(item.id);
  selectedIds.value = set;
}

// 全选全部：选中当前筛选条件下的全部资产（跨页，最多 5000 条，避免一次拉取过多）
async function selectAllFiltered() {
  const { data } = await axios.post("/faceAsset/getFaceAssets", {
    page: 1,
    pageSize: 5000,
    ...filterPayload(),
  });
  const all = (data?.list || []) as any[];
  if (!all.length) return;
  const set = new Set(selectedIds.value);
  for (const item of all) set.add(item.id);
  selectedIds.value = set;
  MessagePlugin.success(`已选中 ${set.size} 张人脸（当前筛选条件下全部 ${all.length} 张已加入选择）`);
}

function confirmBatchDel() {
  const ids = [...selectedIds.value];
  if (!ids.length) return;
  const dialog = DialogPlugin.confirm({
    header: "批量删除人物资产",
    body: `确定删除选中的 ${ids.length} 个人脸资产吗？删除后角色将无法追溯这些参考底图。`,
    theme: "danger",
    confirmBtn: "删除",
    cancelBtn: "取消",
    onConfirm: async () => {
      await delByIds(ids);
      dialog.destroy();
    },
    onClose: () => dialog.destroy(),
  });
}

async function delByIds(ids: number[]) {
  try {
    await axios.post("/faceAsset/delFaceAsset", { ids });
    MessagePlugin.success(`已删除 ${ids.length} 项`);
    exitDeleteMode();
    loadList();
  } catch (e: any) {
    console.error("[Face Batch Del Error]:", e);
    MessagePlugin.error(e?.response?.data?.message || "删除失败，请重试");
  }
}

// ---- 批量上传 ----
const dialogVisible = ref(false);
const pendingFiles = ref<{ base64: string }[]>([]);
const uploading = ref(false);
const uploadedCount = ref(0);
const imgError = ref("");
const isDragOver = ref(false);
const form = reactive<any>({
  gender: 0, // 0 = 自动识别（数字码值从 1 开始）
  ageGroup: 0,
  ethnicity: 0,
  beautyScore: undefined,
  autoTag: true,
});

// ---- 编辑 ----
const editVisible = ref(false);
const editId = ref<number | null>(null);
const editForm = reactive<any>({ name: "", gender: 2, ageGroup: 2, ethnicity: 1, beautyScore: undefined });

// ---- 库存覆盖（缺口报告）----
const missingBuckets = ref<string[]>([]);
const coverageMatrix = ref<Record<string, Record<string, Record<string, number>>> | null>(null);
const coverageBuckets = computed(() => {
  const m = coverageMatrix.value;
  if (!m) return [];
  const buckets: { label: string; total: number }[] = [];
  const genderLabels: [string, string][] = [["1", "男"], ["2", "女"], ["3", "中性"]];
  const ageLabels: [string, string][] = [["1", "少年"], ["2", "青年"], ["3", "中年"], ["4", "老年"]];
  for (const [g, gLabel] of genderLabels) {
    for (const [a, aLabel] of ageLabels) {
      const ages = m[g]?.[a] || {};
      const total = Object.values(ages).reduce((s: number, v) => s + (v as number), 0);
      buckets.push({ label: `${aLabel}${gLabel}`, total });
    }
  }
  return buckets;
});
async function loadStats() {
  try {
    const { data } = await axios.post("/faceAsset/faceAssetStats");
    coverageMatrix.value = data.matrix || null;
    missingBuckets.value = data.missingBuckets || [];
  } catch {
    coverageMatrix.value = null;
    missingBuckets.value = [];
  }
}

// ---- 页面级拖拽 + 全局后台上传（任务挂在 Pinia store，切到其他页面也继续运行）----
import backgroundTaskStore from "@/stores/backgroundTask";
const taskStore = backgroundTaskStore();
const pageDragOver = ref(false);
let pageDragDepth = 0; // dragenter/leave 在子元素间切换时会成对触发，用深度计数避免闪烁

// 在本页时：每录入成功一张就刷新列表（新纪录置顶）与库存覆盖统计
watch(
  () => taskStore.faceUploadSuccessVersion,
  () => loadList(),
);

function hasFilePayload(e: DragEvent) {
  return Array.from(e.dataTransfer?.types || []).includes("Files");
}

// ---- 文档级拖拽监听：不依赖页面根元素几何范围，空白处、内边距、滚动区都能触发 ----
function onDocDragEnter(e: DragEvent) {
  if (!hasFilePayload(e)) return;
  pageDragDepth++;
  pageDragOver.value = true;
}
function onDocDragOver(e: DragEvent) {
  if (!hasFilePayload(e)) return;
  e.preventDefault(); // 必须阻止默认行为，否则浏览器直接打开文件而不触发 drop
}
function onDocDragLeave() {
  pageDragDepth = Math.max(0, pageDragDepth - 1);
  if (pageDragDepth === 0) pageDragOver.value = false;
}
function onDocDrop(e: DragEvent) {
  pageDragDepth = 0;
  pageDragOver.value = false;
  // 批量上传弹窗打开时让弹窗自己的拖拽区处理，避免重复上传
  if (dialogVisible.value) return;
  const all = Array.from(e.dataTransfer?.files || []);
  const images = all.filter((f) => f.type?.startsWith("image/"));
  const oversized = images.filter((f) => f.size > 10 * 1024 * 1024);
  if (oversized.length) MessagePlugin.warning(`${oversized.length} 张超过 10MB 已跳过`);
  if (!images.length) return;
  // 不传任何码值字段：全部交给视觉模型自动识别（与批量上传弹窗的手动模式互补）
  taskStore.addFaceUploadFiles(images);
}

// 组装筛选参数：码值全等 + 颜值档位映射为连续分区间
function filterPayload() {
  const band = beautyBandOptions.find((b) => b.value === filter.beautyBand);
  return {
    gender: filter.gender || undefined,
    ethnicity: filter.ethnicity || undefined,
    ageGroup: filter.ageGroup || undefined,
    beautyMin: band ? band.min : undefined,
    beautyMax: band ? band.max : undefined,
  };
}

// ---- 大图预览 ----
async function loadList(p?: number) {
  if (p) page.value = p;
  const { data } = await axios.post("/faceAsset/getFaceAssets", {
    page: page.value,
    pageSize: pageSize.value,
    ...filterPayload(),
  });
  list.value = data.list || [];
  total.value = data.total || 0;
  // 清理已不存在的选中项（被删除或过滤掉）
  const ids = new Set(list.value.map((i: any) => i.id));
  selectedIds.value = new Set([...selectedIds.value].filter((id) => ids.has(id)));
  // 列表为空时自动退出删除模式
  if (deleteMode.value && list.value.length === 0) {
    deleteMode.value = false;
  }
  loadStats();
}

function onPageChange({ current, pageSize: size }: any) {
  page.value = current;
  pageSize.value = size;
  loadList();
}

const previewVisible = ref(false);
const previewImages = ref<string[]>([]);
const previewRawImages = ref<string[]>([]); // 高清原图 URL（无 ?size=20）
const previewIndex = ref(0);

const previewCurrent = computed(() => {
  const item = list.value[previewIndex.value];
  if (!item) return null;
  return item;
});

const previewCurrentRaw = computed(() => previewRawImages.value[previewIndex.value] || "");

function closePreview() {
  previewVisible.value = false;
}

function nextPreview() {
  if (!previewImages.value.length) return;
  previewIndex.value = (previewIndex.value + 1) % previewImages.value.length;
}

function prevPreview() {
  if (!previewImages.value.length) return;
  previewIndex.value = (previewIndex.value - 1 + previewImages.value.length) % previewImages.value.length;
}

function goPreview(i: number) {
  previewIndex.value = i;
}

function onPreviewImgLoad() {
  // 加载完成后无需操作，CSS 已自动按 EXIF 方向展示
}

function onPreviewImgError() {
  MessagePlugin.warning("图片加载失败");
}

function preview(item: any) {
  previewImages.value = list.value.map((i) => i.fileUrl || "");
  previewRawImages.value = list.value.map((i) => i.fileUrlRaw || i.fileUrl || "");
  previewIndex.value = list.value.findIndex((i) => i.id === item.id);
  previewVisible.value = true;
}

function onPreviewKeydown(e: KeyboardEvent) {
  if (!previewVisible.value) return;
  if (e.key === "Escape") closePreview();
  else if (e.key === "ArrowRight") nextPreview();
  else if (e.key === "ArrowLeft") prevPreview();
}

onMounted(() => {
  loadList();
  window.addEventListener("keydown", onPreviewKeydown);
  document.addEventListener("dragenter", onDocDragEnter);
  document.addEventListener("dragover", onDocDragOver);
  document.addEventListener("dragleave", onDocDragLeave);
  document.addEventListener("drop", onDocDrop);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onPreviewKeydown);
  document.removeEventListener("dragenter", onDocDragEnter);
  document.removeEventListener("dragover", onDocDragOver);
  document.removeEventListener("dragleave", onDocDragLeave);
  document.removeEventListener("drop", onDocDrop);
});
function openUpload() {
  pendingFiles.value = [];
  uploadedCount.value = 0;
  imgError.value = "";
  Object.assign(form, {
    gender: 0,
    ageGroup: 0,
    ethnicity: 0,
    beautyScore: undefined,
    autoTag: true,
  });
  dialogVisible.value = true;
}

function closeDialog() {
  if (uploading.value) return;
  dialogVisible.value = false;
}

function onPickImages(e: any) {
  const files: File[] = Array.from(e.target.files || []);
  processFiles(files);
  e.target.value = "";
}

function handleDrop(e: DragEvent) {
  isDragOver.value = false;
  const dt = e.dataTransfer;
  if (!dt || !dt.files || dt.files.length === 0) return;
  const files: File[] = Array.from(dt.files);
  processFiles(files);
}

function processFiles(files: File[]) {
  for (const file of files) {
    if (!file.type || !file.type.startsWith('image/')) continue;
    if (file.size > 10 * 1024 * 1024) {
      MessagePlugin.warning(`「${file.name}」超过 10MB 已跳过`);
      continue;
    }
    const reader = new FileReader();
    reader.onload = () => pendingFiles.value.push({ base64: reader.result as string });
    reader.readAsDataURL(file);
  }
}

function removePending(i: number) {
  pendingFiles.value.splice(i, 1);
}

async function submit() {
  if (!pendingFiles.value.length) {
    imgError.value = "请先选择至少一张人脸照片";
    return;
  }
  uploading.value = true;
  uploadedCount.value = 0;
  let fail = 0;
  for (const f of pendingFiles.value) {
    try {
      await axios.post("/faceAsset/addFaceAsset", {
        fileUrl: f.base64,
        species: 1,
        gender: form.gender || undefined,
        ageGroup: form.ageGroup || undefined,
        ethnicity: form.ethnicity || undefined,
        beautyScore: form.beautyScore ?? undefined,
        // 不传 model：由后端统一走全局配置的视觉模型（faceAssetVisionAgent → universalAi 降级链）
        model: form.autoTag ? undefined : "none",
      });
    } catch (err) {
      console.error("[Face Upload Single Error]:", err);
      fail++;
    }
    uploadedCount.value++;
  }
  uploading.value = false;
  if (fail === 0) {
    MessagePlugin.success(`成功上传 ${pendingFiles.value.length} 张人脸`);
  } else {
    MessagePlugin.warning(`完成，其中 ${fail} 张上传失败`);
  }
  pendingFiles.value = [];
  dialogVisible.value = false;
  loadList();
}

// ---- 编辑 ----
function openEdit(item: any) {
  editId.value = item.id;
  Object.assign(editForm, {
    name: item.name || "",
    gender: Number(item.gender) || 2,
    ageGroup: Number(item.ageGroup) || 2,
    ethnicity: Number(item.ethnicity) || 1,
    beautyScore: typeof item.beautyScore === "number" ? item.beautyScore : Number(item.beautyScore) || undefined,
  });
  editVisible.value = true;
}

// ---- 详情（只读查看，不进入编辑）----
const detailVisible = ref(false);
const detailItem = ref<any>(null);

function openDetail(item: any) {
  detailItem.value = item;
  detailVisible.value = true;
}

async function submitEdit() {
  if (!editId.value) return;
  try {
    await axios.post("/faceAsset/editFaceAsset", {
      id: editId.value,
      name: editForm.name || undefined,
      gender: editForm.gender || undefined,
      ageGroup: editForm.ageGroup || undefined,
      ethnicity: editForm.ethnicity || undefined,
      beautyScore: editForm.beautyScore ?? undefined,
    });
    MessagePlugin.success("更新成功");
    editVisible.value = false;
    loadList();
  } catch (e: any) {
    MessagePlugin.error(e?.response?.data?.message || "操作失败");
  }
}

async function delItem(item: any) {
  try {
    await axios.post("/faceAsset/delFaceAsset", { ids: [item.id] });
    MessagePlugin.success("已删除");
    loadList();
  } catch (e: any) {
    console.error("[Face Del Error]:", e);
    MessagePlugin.error(e?.response?.data?.message || "删除失败，请重试");
  }
}

async function confirmDel(item: any) {
  const dialog = DialogPlugin.confirm({
    header: "删除人物资产",
    body: `确定删除「${item.name || "该人脸"}」吗？删除后角色将无法追溯该参考底图。`,
    theme: "danger",
    confirmBtn: "删除",
    cancelBtn: "取消",
    onConfirm: async () => {
      await delItem(item);
      dialog.destroy();
    },
    onClose: () => dialog.destroy(),
  });
}

// ---- 高清预览 ----
// （新逻辑已统一到上方自定义灯箱区块，此处移除重复定义，避免与上方的 preview() 冲突）
</script>

<style lang="scss" scoped>
.faceAssetPage {
  padding: 20px 24px;
  height: 100%;
  overflow-y: auto;

  .toolbar {
    margin-bottom: 20px;

    .title {
      font-size: 18px;
      margin: 0;
    }
    .sub {
      margin-left: 12px;
      font-size: 12px;
      color: var(--td-text-color-placeholder);
    }
    .right {
      gap: 10px;

      .batchInfo {
        font-size: 13px;
        color: var(--td-brand-color, #0052d9);
        font-weight: 500;
      }
    }
  }

  .cardGrid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 14px;
  }

  .card {
    border-radius: 8px;
    overflow: hidden;
    background: var(--td-bg-color-container);
    border: 1px solid var(--td-component-border);
    transition: all 0.2s ease;

    &.selected {
      border-color: var(--td-brand-color, #0052d9);
      box-shadow: 0 0 0 2px rgba(0, 82, 217, 0.25);
    }

    .cardCheck {
      position: absolute;
      top: 6px;
      left: 6px;
      z-index: 3;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.85);
      padding: 2px;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
    }

    &:hover {
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.1);
      transform: translateY(-2px);
      .hoverOverlay {
        opacity: 1;
      }
    }

    .imgBox {
      position: relative;
      aspect-ratio: 1 / 1;
      background: #f5f5f5;
      overflow: hidden;
      cursor: pointer;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .hoverOverlay {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 6px;
        background: rgba(0, 0, 0, 0.35);
        color: #fff;
        font-size: 11px;
        opacity: 0;
        transition: opacity 0.2s;
        pointer-events: none;

        .zoomIcon {
          font-size: 20px;
        }
      }
    }

    .info {
      padding: 8px 10px 10px;

      .nameRow {
        .name {
          font-size: 13px;
          font-weight: 600;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .gender {
          font-size: 11px;
          padding: 0 6px;
          border-radius: 8px;
          &.female {
            color: #e34d59;
            background: rgba(227, 77, 89, 0.1);
          }
          &.male {
            color: #0052d9;
            background: rgba(0, 82, 217, 0.1);
          }
        }
      }

      .meta {
        margin: 6px 0;
        display: flex;
        gap: 4px;
      }

      /* 始终可见的操作栏 */
      .cardActionsBar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 6px;
        padding-top: 6px;
        border-top: 1px dashed var(--td-component-border);
        gap: 2px;

        .t-button {
          flex: 1;
          padding: 0 4px;
        }
      }

      .tags {
        display: flex;
        align-items: center;
        flex-wrap: nowrap;
        overflow: hidden;
        margin-bottom: 4px;

        .moreTags {
          font-size: 10px;
          color: var(--td-text-color-placeholder);
        }
      }

      .desc {
        margin-top: 4px;
        font-size: 11px;
        color: var(--td-text-color-secondary);
        display: -webkit-box;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
    }
  }

  .pager {
    margin-top: 20px;
    justify-content: flex-end;
  }

  .uploadArea {
    width: 100%;
    transition: all 0.2s ease;

    &.isDragOver .pickBtn {
      border-color: var(--td-brand-color);
      background-color: var(--td-brand-color-light);
      color: var(--td-brand-color);
      transform: scale(1.01);
    }

    .pickBtn {
      width: 100%;
      height: 130px;
      border: 1px dashed var(--td-component-border);
      border-radius: 8px;
      flex-direction: column;
      gap: 8px;
      cursor: pointer;
      color: var(--td-text-color-placeholder);
      font-size: 13px;
      transition: all 0.2s ease;

      .icon {
        font-size: 30px;
      }

      &:hover {
        border-color: var(--td-brand-color);
        color: var(--td-brand-color);
      }
    }

    .tips {
      margin-top: 8px;
      font-size: 12px;
      color: var(--td-text-color-placeholder);
    }
  }

  .pendingBox {
    width: 100%;
    transition: all 0.2s ease;

    &.isDragOver {
      outline: 2px dashed var(--td-brand-color);
      outline-offset: 4px;
      border-radius: 8px;
    }

    .thumbs {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      max-height: 220px;
      overflow-y: auto;

      .thumb {
        position: relative;
        width: 72px;
        height: 92px;
        border-radius: 6px;
        overflow: hidden;

        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .rm {
          position: absolute;
          top: 2px;
          right: 2px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.6);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 10px;
        }
      }
    }

    .btnRow {
      margin-top: 10px;
      gap: 12px;

      .addMore {
        font-size: 13px;
        color: var(--td-brand-color);
        cursor: pointer;
      }

      .count {
        font-size: 12px;
        color: var(--td-text-color-placeholder);
      }
    }
  }

  .dialogFooter {
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid var(--td-component-border);

    .uploading {
      font-size: 13px;
      color: var(--td-brand-color);
    }
  }

  .autoTip {
    margin-left: 10px;
    font-size: 12px;
    color: var(--td-text-color-placeholder);
  }

  .cardImg {
    width: 100%;
    height: 100%;
    object-fit: cover;
    image-orientation: from-image;
  }

  .infoBtn:hover {
    background: rgba(0, 82, 217, 0.85);
  }
}

/* ===================== 详情对话框 ===================== */
.detailDialog {
  display: flex;
  flex-direction: column;
  gap: 16px;

  &__hero {
    display: flex;
    gap: 18px;
    align-items: stretch;
  }

  &__img {
    width: 200px;
    height: 240px;
    object-fit: cover;
    border-radius: 8px;
    image-orientation: from-image;
    background: #f3f4f6;
    flex-shrink: 0;
  }

  &__basic {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-width: 0;
  }

  &__name {
    font-size: 18px;
    font-weight: 600;
    color: #1f2329;
    margin-bottom: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 10px;
  }

  &__time {
    font-size: 12px;
    color: var(--td-text-color-placeholder);
  }

  &__form {
    margin-top: 4px;
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
  }

  &__desc {
    padding: 12px 14px;
    background: var(--td-bg-color-container);
    border: 1px solid var(--td-component-border);
    border-radius: 6px;
    font-size: 13px;
    color: #1f2329;
    line-height: 1.6;
    word-break: break-word;
  }

  &__fileinfo {
    font-size: 12px;
    color: var(--td-text-color-secondary);
    background: var(--td-bg-color-container);
    padding: 10px 12px;
    border-radius: 6px;
    word-break: break-all;

    div {
      margin-bottom: 4px;
    }
    div:last-child {
      margin-bottom: 0;
    }
  }

  &__empty {
    color: var(--td-text-color-placeholder);
    font-size: 12px;
    font-style: italic;
  }
}

/* ===================== 独立灯箱预览（全局 teleport，脱离 scoped） ===================== */
.faceLightbox {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.92);
  z-index: 3000;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: space-between;
  padding: 56px 24px 24px;
  animation: faceLightboxFade 0.2s ease-out;

  &__topbar {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 48px;
    padding: 0 56px 0 20px;
    display: flex;
    align-items: center;
    gap: 16px;
    color: #fff;
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0.55), transparent);
  }

  &__title {
    font-size: 15px;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 30vw;
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.78);
    flex: 1;
    overflow: hidden;

    span {
      padding: 2px 8px;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.12);
    }

    .counter {
      margin-left: auto;
      background: rgba(0, 82, 217, 0.6);
    }
  }

  &__close {
    position: absolute;
    top: 8px;
    right: 12px;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: none;
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;

    &:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  }

  &__stage {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 0;
    margin-bottom: 12px;
    overflow: hidden;
  }

  &__img {
    max-width: 100%;
    max-height: 100%;
    width: auto;
    height: auto;
    object-fit: contain;
    /* 自动按 EXIF 旋转方向展示（手机竖屏拍摄默认正常） */
    image-orientation: from-image;
    border-radius: 4px;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
    user-select: none;
    -webkit-user-drag: none;
  }

  &__nav {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 44px;
    height: 64px;
    border: none;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
    z-index: 1;

    &:hover {
      background: rgba(255, 255, 255, 0.18);
    }

    &--prev {
      left: 16px;
    }

    &--next {
      right: 16px;
    }
  }

  &__thumbs {
    flex-shrink: 0;
    display: flex;
    justify-content: center;
    gap: 8px;
    padding: 8px 8px 4px;
    max-width: 100%;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: thin;
  }

  &__thumb {
    width: 56px;
    height: 72px;
    border-radius: 4px;
    overflow: hidden;
    cursor: pointer;
    flex-shrink: 0;
    border: 2px solid transparent;
    opacity: 0.6;
    transition: all 0.2s ease;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      image-orientation: from-image;
    }

    &:hover {
      opacity: 0.9;
    }

    &.active {
      opacity: 1;
      border-color: var(--td-brand-color, #0052d9);
      transform: scale(1.06);
    }
  }
}

@keyframes faceLightboxFade {
  from { opacity: 0; }
  to { opacity: 1; }
}
.coverageBar {
  flex-wrap: wrap;
  gap: 4px 0;
  margin-bottom: 12px;
  .coverageLabel {
    color: var(--td-text-color-secondary);
    font-size: 12px;
    margin-right: 8px;
  }
  .coverageWarn {
    color: var(--td-error-color);
    font-size: 12px;
    margin-left: 8px;
  }
}
.pageDropOverlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 82, 217, 0.12);
  backdrop-filter: blur(2px);
  pointer-events: none; // 关键：让 drop 事件落在页面根元素上，遮罩只做视觉反馈

  &__inner {
    text-align: center;
    padding: 48px 72px;
    border: 2px dashed var(--td-brand-color, #0052d9);
    border-radius: 16px;
    background: var(--td-bg-color-container, #fff);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
  }

  &__icon {
    font-size: 48px;
    color: var(--td-brand-color, #0052d9);
  }

  &__title {
    margin-top: 12px;
    font-size: 18px;
    font-weight: 700;
    color: var(--td-text-color-primary, #333);
  }

  &__sub {
    margin-top: 6px;
    font-size: 13px;
    color: var(--td-text-color-secondary, #999);
  }
}
</style>
