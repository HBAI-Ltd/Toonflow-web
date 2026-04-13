<template>
  <div class="dbConfig">
    <!-- 数据库概览 -->
    <t-card class="actionItem">
      <div class="actionInfo">
        <h4>{{ $t("settings.db.dbInfo") }}</h4>
        <p>{{ $t("settings.db.dbInfoDesc") }}</p>
      </div>
      <t-button variant="outline" @click="loadDbInfo">
        <template #icon>
          <i-data theme="outline" size="14" fill="currentColor" />
        </template>
        {{ $t("settings.db.viewInfo") }}
      </t-button>
    </t-card>

    <!-- 导出数据库 -->
    <t-card class="actionItem">
      <div class="actionInfo">
        <h4>{{ $t("settings.db.exportDb") }}</h4>
        <p>{{ $t("settings.db.exportDbDesc") }}</p>
      </div>
      <t-button variant="outline" @click="exportData">
        <template #icon>
          <i-download theme="outline" size="14" fill="currentColor" />
        </template>
        {{ $t("settings.db.exportData") }}
      </t-button>
    </t-card>

    <!-- 导入数据库 -->
    <t-card class="actionItem">
      <div class="actionInfo">
        <h4>{{ $t("settings.db.importDb") }}</h4>
        <p>{{ $t("settings.db.importDbDesc") }}</p>
      </div>
      <t-button theme="warning" variant="outline" @click="triggerImport">
        <template #icon>
          <i-upload theme="outline" size="14" fill="currentColor" />
        </template>
        {{ $t("settings.db.importData") }}
      </t-button>
      <input ref="fileInputRef" type="file" accept=".json" style="display: none" @change="handleFileSelected" />
    </t-card>

    <!-- 清空指定表 -->
    <t-card class="actionItem clearTableCard">
      <div class="actionInfo">
        <h4>{{ $t("settings.db.clearTable") }}</h4>
        <p>{{ $t("settings.db.clearTableDesc") }}</p>
      </div>
      <div class="clearTableAction">
        <t-select v-model="selectedTable" :placeholder="$t('settings.db.selectTable')" :options="tableOptions" style="width: 200px" />
        <t-button theme="warning" variant="outline" @click="clearTable">
          <template #icon>
            <i-delete theme="outline" size="14" fill="currentColor" />
          </template>
          {{ $t("settings.db.clearTableBtn") }}
        </t-button>
      </div>
    </t-card>

    <!-- 清空数据库 -->
    <t-card class="actionItem">
      <div class="actionInfo">
        <h4>{{ $t("settings.db.clearDb") }}</h4>
        <p>{{ $t("settings.db.clearDbDesc") }}</p>
      </div>
      <t-button theme="danger" variant="outline" @click="deleteAllData">
        <template #icon>
          <i-clear theme="outline" size="14" fill="currentColor" />
        </template>
        {{ $t("settings.db.clearData") }}
      </t-button>
    </t-card>

    <!-- 数据库信息弹窗 -->
    <t-dialog v-model:visible="dbInfoVisible" :header="$t('settings.db.dbInfo')" :footer="false" width="520px">
      <div class="dbInfoContent">
        <p class="totalInfo">{{ $t("settings.db.totalTables", { count: tableInfoList.length }) }}</p>
        <t-table :data="tableInfoList" :columns="dbInfoColumns" row-key="name" size="small" max-height="400" bordered />
      </div>
    </t-dialog>

    <!-- 第一次确认对话框 -->
    <t-dialog
      v-model:visible="firstConfirmVisible"
      :header="confirmConfig.title"
      :confirm-btn="{ content: $t('settings.db.msg.confirm'), theme: 'danger' }"
      @confirm="handleFirstConfirm"
      @cancel="handleCancel">
      <div class="confirmContent">
        <i-attention theme="filled" size="48" fill="#e34d59" />
        <p>{{ confirmConfig.firstMessage }}</p>
      </div>
    </t-dialog>

    <!-- 第二次确认对话框 -->
    <t-dialog
      v-model:visible="secondConfirmVisible"
      :header="confirmConfig.title"
      :confirm-btn="{ content: confirmText, theme: 'danger', disabled: !canConfirm }"
      @confirm="handleSecondConfirm"
      @cancel="handleCancel">
      <div class="confirmContent">
        <i-attention theme="filled" size="48" fill="#e34d59" />
        <p>{{ confirmConfig.secondMessage }}</p>
        <t-input
          v-model="confirmInput"
          :placeholder="`${$t('settings.db.msg.pleaseInput')} ${confirmConfig.keyword} ${$t('settings.db.confirmAction')}`"
          class="confirmInput" />
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import axios from "@/utils/axios";
import { LoadingPlugin, DialogPlugin } from "tdesign-vue-next";
import router from "@/router";

const firstConfirmVisible = ref(false);
const secondConfirmVisible = ref(false);
const dbInfoVisible = ref(false);
const confirmInput = ref("");
const currentAction = ref<"deleteAll" | "import" | null>(null);
const selectedTable = ref("");
const tableInfoList = ref<{ name: string; rowCount: number }[]>([]);
const tableOptions = ref<{ label: string; value: string }[]>([]);
const fileInputRef = ref<HTMLInputElement | null>(null);
const importFileData = ref<any>(null);

const dbInfoColumns = computed(() => [
  { colKey: "name", title: $t("settings.db.tableName"), width: 220 },
  { colKey: "rowCount", title: $t("settings.db.rowCount"), width: 120 },
]);

const confirmConfigs = {
  deleteAll: {
    title: () => $t("settings.db.msg.clearDbTitle"),
    firstMessage: () => $t("settings.db.msg.firstConfirm"),
    secondMessage: () => $t("settings.db.msg.secondConfirm"),
    keyword: () => $t("settings.db.msg.keyword"),
  },
  import: {
    title: () => $t("settings.db.importDb"),
    firstMessage: () => $t("settings.db.msg.importConfirm"),
    secondMessage: () => $t("settings.db.msg.importSecondConfirm"),
    keyword: () => $t("settings.db.msg.keyword"),
  },
};

const confirmConfig = computed(() => {
  const config = confirmConfigs[currentAction.value || "deleteAll"];
  return {
    title: config.title(),
    firstMessage: config.firstMessage(),
    secondMessage: config.secondMessage(),
    keyword: config.keyword(),
  };
});

const canConfirm = computed(() => {
  return confirmInput.value === confirmConfig.value.keyword;
});

const confirmText = computed(() => {
  return canConfirm.value ? $t("settings.db.msg.confirm") : `${$t("settings.db.msg.pleaseInput")}"${confirmConfig.value.keyword}"`;
});

// 加载数据库信息
async function loadDbInfo() {
  LoadingPlugin(true);
  try {
    const res: any = await axios.get("/setting/dbConfig/dbInfo");
    tableInfoList.value = res.data || [];
    tableOptions.value = tableInfoList.value.map((t: any) => ({
      label: `${t.name} (${t.rowCount})`,
      value: t.name,
    }));
    dbInfoVisible.value = true;
  } catch {
    window.$message.error($t("settings.db.msg.loadDbInfoFailed"));
  } finally {
    LoadingPlugin(false);
  }
}

// 导出数据库
async function exportData() {
  LoadingPlugin(true);
  try {
    const res: any = await axios.get("/setting/dbConfig/exportData", { responseType: "blob" });
    const blob = new Blob([res], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `toonflow-backup-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    window.$message.success($t("settings.db.msg.exportSuccess"));
  } catch {
    window.$message.error($t("settings.db.msg.exportFailed"));
  } finally {
    LoadingPlugin(false);
  }
}

// 触发文件选择
function triggerImport() {
  fileInputRef.value?.click();
}

// 处理文件选择
function handleFileSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target?.result as string);
      if (!data.tables || typeof data.tables !== "object") {
        window.$message.error($t("settings.db.msg.invalidFile"));
        return;
      }
      importFileData.value = data;
      currentAction.value = "import";
      confirmInput.value = "";
      firstConfirmVisible.value = true;
    } catch {
      window.$message.error($t("settings.db.msg.invalidFile"));
    }
  };
  reader.readAsText(file);
  // 重置 input 以允许重复选择同一文件
  (e.target as HTMLInputElement).value = "";
}

// 清空指定表
async function clearTable() {
  if (!selectedTable.value) {
    window.$message.warning($t("settings.db.msg.noTableSelected"));
    return;
  }
  const confirmDlg = DialogPlugin.confirm({
    header: $t("settings.db.clearTable"),
    body: $t("settings.db.msg.clearTableConfirm", { name: selectedTable.value }),
    confirmBtn: { content: $t("settings.db.msg.confirm"), theme: "danger" },
    onConfirm: async () => {
      confirmDlg.hide();
      LoadingPlugin(true);
      try {
        await axios.post("/setting/dbConfig/clearTable", { tableName: selectedTable.value });
        window.$message.success($t("settings.db.msg.clearTableSuccess"));
        selectedTable.value = "";
        // 刷新表信息
        await refreshTableOptions();
      } catch {
        window.$message.error($t("settings.db.msg.clearTableFailed"));
      } finally {
        LoadingPlugin(false);
      }
    },
  });
}

// 刷新表选项
async function refreshTableOptions() {
  try {
    const res: any = await axios.get("/setting/dbConfig/dbInfo");
    const list = res.data || [];
    tableInfoList.value = list;
    tableOptions.value = list.map((t: any) => ({
      label: `${t.name} (${t.rowCount})`,
      value: t.name,
    }));
  } catch {
    // 静默失败
  }
}

function deleteAllData() {
  currentAction.value = "deleteAll";
  confirmInput.value = "";
  firstConfirmVisible.value = true;
}

function handleFirstConfirm() {
  firstConfirmVisible.value = false;
  secondConfirmVisible.value = true;
}

async function handleSecondConfirm() {
  if (!canConfirm.value) return;

  secondConfirmVisible.value = false;
  LoadingPlugin(true);
  try {
    if (currentAction.value === "import" && importFileData.value) {
      await axios.post("/setting/dbConfig/importData", importFileData.value);
      window.$message.success($t("settings.db.msg.importSuccess"));
      importFileData.value = null;
      router.push("/login");
    } else {
      await axios.get("/setting/dbConfig/clearData");
      window.$message.success($t("settings.db.msg.cleared"));
      router.push("/login");
    }
  } catch {
    if (currentAction.value === "import") {
      window.$message.error($t("settings.db.msg.importFailed"));
    } else {
      window.$message.error($t("settings.db.msg.operationFailed"));
    }
  } finally {
    LoadingPlugin(false);
    currentAction.value = null;
    confirmInput.value = "";
    importFileData.value = null;
  }
}

function handleCancel() {
  firstConfirmVisible.value = false;
  secondConfirmVisible.value = false;
  currentAction.value = null;
  confirmInput.value = "";
  importFileData.value = null;
  window.$message.info($t("settings.db.msg.cancelled"));
}

// 初始加载表选项
refreshTableOptions();
</script>

<style lang="scss" scoped>
.dbConfig {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

.actionItem {
  :deep(.t-card__body) {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .actionInfo {
    h4 {
      margin: 0 0 4px;
      font-size: 14px;
      font-weight: 500;
    }

    p {
      margin: 0;
      font-size: 12px;
    }
  }
}

.clearTableCard {
  :deep(.t-card__body) {
    flex-wrap: wrap;
    gap: 12px;
  }

  .clearTableAction {
    display: flex;
    gap: 8px;
    align-items: center;
  }
}

.dbInfoContent {
  .totalInfo {
    margin: 0 0 12px;
    font-size: 13px;
    color: var(--td-text-color-secondary);
  }
}

.confirmContent {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 16px 0;
  text-align: center;

  p {
    margin: 0;
    font-size: 14px;
  }

  .confirmInput {
    width: 100%;
    max-width: 280px;
  }
}
</style>
