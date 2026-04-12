<template>
  <div class="otherConfig">
    <t-form label-align="top">
      <t-alert theme="warning">{{ $t("settings.dev.warning") }}</t-alert>
      <t-form-item :label="$t('settings.dev.devtool')" name="showTitleBar">
        <t-button theme="primary" @click="openDevTool">{{ $t("settings.dev.openDevtool") }}</t-button>
      </t-form-item>
      <t-form-item :label="$t('settings.dev.aiDevtool')" name="showTitleBar">
        <t-switch v-model="isElectron" @change="getSwitchAiDevTool" />
      </t-form-item>
      <t-form-item :label="$t('settings.dev.switchAiDevTool')" name="showTitleBar">
        <t-switch :customValue="['1', '0']" v-model="switchAiDevTool" @change="updateSwitchAiDevTool" />
        <template #tips>
          <p>{{ $t("settings.dev.devtoolsDoc") }}：https://ai-sdk.dev/docs/ai-sdk-core/devtools</p>
          <p>{{ $t("settings.dev.devtoolsDesc") }}</p>
          <p>{{ $t("settings.dev.devtoolsDesc2") }}</p>
        </template>
      </t-form-item>

      <t-form-item :label="$t('settings.dev.localStorage')" name="localStorageManager" class="localStorageFormItem">
        <t-card class="localStorageCard">
          <div class="localStorageHeader">
            <div class="localStorageCount">
              {{ $t("settings.dev.localStorageCount", { total: localStorageRows.length, filtered: filteredLocalStorageRows.length }) }}
            </div>
            <div class="localStorageToolbar">
              <t-input
                v-model="localStorageKeyword"
                :placeholder="$t('settings.dev.localStorageSearchPlaceholder')"
                clearable
                class="localStorageSearch" />
              <div class="localStorageActions">
                <t-button theme="primary" variant="outline" @click="startCreateLocalStorage">{{ $t("settings.dev.add") }}</t-button>
                <t-button variant="outline" @click="refreshLocalStorage">{{ $t("settings.dev.refresh") }}</t-button>
                <t-button theme="danger" variant="outline" @click="confirmClearLocalStorage">{{ $t("settings.dev.clearAll") }}</t-button>
              </div>
            </div>
          </div>

          <t-table :data="filteredLocalStorageRows" :columns="localStorageColumns" row-key="key" size="small">
            <template #actions="{ row }">
              <div class="tableActionButtons">
                <t-button variant="text" size="small" @click="copyLocalStorageKey(row.key)">{{ $t("settings.dev.copyKey") }}</t-button>
                <t-button variant="text" size="small" @click="copyLocalStorageValue(row.value)">{{ $t("settings.dev.copyValue") }}</t-button>
                <t-button variant="text" size="small" @click="fillLocalStorageForm(row)">{{ $t("settings.dev.edit") }}</t-button>
                <t-button theme="danger" variant="text" size="small" @click="confirmRemoveLocalStorageItem(row.key)">
                  {{ $t("settings.dev.delete") }}
                </t-button>
              </div>
            </template>
          </t-table>
        </t-card>
      </t-form-item>

      <t-dialog
        v-model:visible="localStorageDialogVisible"
        :header="editingKey ? $t('settings.dev.editing', { key: editingKey }) : $t('settings.dev.creating')"
        :confirm-btn="{ content: editingKey ? $t('settings.dev.update') : $t('settings.dev.add') }"
        :cancel-btn="$t('settings.dev.msg.cancel')"
        width="50vw"
        placement="center"
        @confirm="onLocalStorageDialogConfirm"
        @close="onLocalStorageDialogClose">
        <div class="localStorageDialogBody">
          <div class="localStorageDialogTopBar">
            <t-input v-model="localStorageForm.key" :placeholder="$t('settings.dev.localStorageKeyPlaceholder')" />
            <t-button variant="outline" @click="formatLocalStorageValue">{{ $t("settings.dev.format") }}</t-button>
          </div>
          <CodeEditor v-model:value="localStorageForm.value" language="json" theme="vs-dark" :height="500" :options="localStorageEditorOptions" />
        </div>
      </t-dialog>
    </t-form>
  </div>
</template>

<script setup lang="ts">
import { CodeEditor } from "monaco-editor-vue3";
import axios from "@/utils/axios";
import { DialogPlugin } from "tdesign-vue-next";
import settingStore from "@/stores/setting";
const { isElectron } = storeToRefs(settingStore());

const switchAiDevTool = ref("0");
const localStorageKeyword = ref("");
const editingKey = ref("");
const localStorageDialogVisible = ref(false);

interface LocalStorageRow {
  key: string;
  value: string;
}

const localStorageRows = ref<LocalStorageRow[]>([]);
const localStorageForm = ref<LocalStorageRow>({
  key: "",
  value: "",
});

const localStorageEditorOptions = {
  fontSize: 13,
  automaticLayout: true,
  minimap: { enabled: false },
  tabSize: 2,
  scrollBeyondLastLine: false,
  wordWrap: "on",
};

const localStorageColumns = [
  {
    colKey: "key",
    title: $t("settings.dev.localStorageKey"),
    width: 320,
    ellipsis: true,
  },
  {
    colKey: "value",
    title: $t("settings.dev.localStorageValue"),
    ellipsis: true,
  },
  {
    colKey: "actions",
    title: $t("settings.dev.actions"),
    width: 280,
    cell: "actions",
  },
];

const filteredLocalStorageRows = computed(() => {
  if (!localStorageKeyword.value.trim()) return localStorageRows.value;
  const keyword = localStorageKeyword.value.trim().toLowerCase();
  return localStorageRows.value.filter((item) => item.key.toLowerCase().includes(keyword) || item.value.toLowerCase().includes(keyword));
});

function openDevTool() {
  if (isElectron.value) {
    try {
      fetch("toonflow://openDevTool");
    } catch (error) {
      window.$message?.warning($t("settings.dev.openDevtoolFailed"));
    }
  } else {
    window.$message?.warning($t("settings.dev.notInElectron"));
  }
}

async function getSwitchAiDevTool() {
  const { data } = await axios.get("/setting/dev/getSwitchAiDevTool");
  switchAiDevTool.value = data || "0";
}

function updateSwitchAiDevTool() {
  axios.post("/setting/dev/updateSwitchAiDevTool", { switchAiDevTool: switchAiDevTool.value });
}

function refreshLocalStorage() {
  const rows: LocalStorageRow[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    rows.push({
      key,
      value: localStorage.getItem(key) ?? "",
    });
  }
  localStorageRows.value = rows.sort((a, b) => a.key.localeCompare(b.key));
}

function startCreateLocalStorage() {
  resetLocalStorageForm();
  localStorageDialogVisible.value = true;
}

function fillLocalStorageForm(row: LocalStorageRow) {
  localStorageForm.value = { ...row };
  editingKey.value = row.key;
  localStorageDialogVisible.value = true;
}

function resetLocalStorageForm() {
  localStorageForm.value = { key: "", value: "" };
  editingKey.value = "";
}

function saveLocalStorageItem() {
  const nextKey = localStorageForm.value.key.trim();
  if (!nextKey) {
    window.$message.warning($t("settings.dev.msg.localStorageKeyRequired"));
    return;
  }

  const isRename = !!editingKey.value && editingKey.value !== nextKey;
  if (isRename && localStorage.getItem(nextKey) !== null) {
    window.$message.warning($t("settings.dev.msg.localStorageKeyExists"));
    return;
  }

  if (isRename) {
    localStorage.removeItem(editingKey.value);
  }
  localStorage.setItem(nextKey, localStorageForm.value.value ?? "");
  refreshLocalStorage();
  editingKey.value = nextKey;
  localStorageDialogVisible.value = false;
  window.$message.success($t("settings.dev.msg.localStorageSaved"));
}

function formatLocalStorageValue() {
  const currentValue = localStorageForm.value.value ?? "";
  if (!currentValue.trim()) {
    window.$message.warning($t("settings.dev.msg.localStorageValueEmpty"));
    return;
  }
  try {
    const parsed = JSON.parse(currentValue);
    localStorageForm.value.value = JSON.stringify(parsed, null, 2);
    window.$message.success($t("settings.dev.msg.localStorageFormatted"));
  } catch {
    window.$message.warning($t("settings.dev.msg.localStorageFormatFailed"));
  }
}

function onLocalStorageDialogConfirm() {
  saveLocalStorageItem();
}

function onLocalStorageDialogClose() {
  localStorageDialogVisible.value = false;
  resetLocalStorageForm();
}

async function copyToClipboard(content: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(content);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = content;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

async function copyLocalStorageKey(key: string) {
  try {
    await copyToClipboard(key);
    window.$message.success($t("settings.dev.msg.localStorageKeyCopied"));
  } catch {
    window.$message.warning($t("settings.dev.msg.copyFailed"));
  }
}

async function copyLocalStorageValue(value: string) {
  try {
    await copyToClipboard(value);
    window.$message.success($t("settings.dev.msg.localStorageValueCopied"));
  } catch {
    window.$message.warning($t("settings.dev.msg.copyFailed"));
  }
}

function removeLocalStorageItem(key: string) {
  localStorage.removeItem(key);
  if (editingKey.value === key) {
    resetLocalStorageForm();
  }
  refreshLocalStorage();
  window.$message.success($t("settings.dev.msg.localStorageDeleted"));
}

function confirmRemoveLocalStorageItem(key: string) {
  const dialog = DialogPlugin.confirm({
    header: $t("settings.dev.msg.deleteConfirmTitle"),
    body: $t("settings.dev.msg.deleteConfirmBody", { key }),
    confirmBtn: $t("settings.dev.msg.confirmDelete"),
    cancelBtn: $t("settings.dev.msg.cancel"),
    onConfirm: () => {
      removeLocalStorageItem(key);
      dialog.hide();
    },
  });
}

function confirmClearLocalStorage() {
  const dialog = DialogPlugin.confirm({
    header: $t("settings.dev.msg.clearConfirmTitle"),
    body: $t("settings.dev.msg.clearConfirmBody"),
    confirmBtn: $t("settings.dev.msg.confirmClear"),
    cancelBtn: $t("settings.dev.msg.cancel"),
    onConfirm: () => {
      localStorage.clear();
      resetLocalStorageForm();
      refreshLocalStorage();
      window.$message.success($t("settings.dev.msg.localStorageCleared"));
      dialog.hide();
    },
  });
}

onMounted(() => {
  getSwitchAiDevTool();
  refreshLocalStorage();
});
</script>

<style lang="scss" scoped>
.otherConfig {
  width: 100%;

  :deep(.localStorageFormItem .t-form__controls-content) {
    width: 100%;
  }

  .localStorageCard {
    width: 100%;
  }

  .localStorageHeader {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 12px;
  }

  .localStorageToolbar {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
  }

  .localStorageSearch {
    flex: 1;
    min-width: 320px;
  }

  .localStorageActions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .localStorageCount {
    font-size: 12px;
    opacity: 0.7;
  }

  .tableActionButtons {
    display: flex;
    align-items: center;
    white-space: nowrap;
    gap: 2px;
  }

  .localStorageDialogBody {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .localStorageDialogTopBar {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  @media (max-width: 900px) {
    .localStorageSearch {
      min-width: 220px;
    }
  }
}
</style>
