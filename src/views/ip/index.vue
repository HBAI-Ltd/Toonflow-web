<template>
  <div class="ipPage">
    <div class="toolbar f ac jb">
      <div class="fc">
        <h2 class="title">{{ $t("workbench.ip.title") }}</h2>
        <span class="sub">{{ $t("workbench.ip.subtitle") }}</span>
      </div>
      <t-button theme="primary" @click="openIpDialog()">
        <template #icon><i-plus size="18" /></template>
        {{ $t("workbench.ip.add") }}
      </t-button>
    </div>

    <t-table
      class="ipTable"
      row-key="id"
      :data="ipList"
      :columns="columns"
      :loading="loading"
      :pagination="{ pageSize: 10, total: ipList.length, showJumper: true }"
      hover>
      <template #description="{ row }">
        <span class="ellipsisText">{{ row.description || "-" }}</span>
      </template>
      <template #artStyle="{ row }">
        {{ manualName(row.artStyle) }}
      </template>
      <template #createTime="{ row }">
        {{ formatTime(row.createTime) }}
      </template>
      <template #operation="{ row }">
        <div class="actionBtns f ac">
          <t-button size="small" variant="text" theme="primary" @click="openDetail(row)">{{ $t("workbench.ip.detail") }}</t-button>
          <t-button size="small" variant="text" @click="openIpDialog(row)">{{ $t("workbench.ip.edit") }}</t-button>
          <t-button size="small" variant="text" theme="danger" @click="deleteIp(row)">{{ $t("workbench.ip.delete") }}</t-button>
        </div>
      </template>
    </t-table>

    <t-dialog
      v-model:visible="ipDialogVisible"
      :header="ipForm.id ? $t('workbench.ip.edit') : $t('workbench.ip.add')"
      :confirm-btn="$t('workbench.ip.save')"
      :cancel-btn="$t('workbench.ip.cancel')"
      width="560px"
      placement="center"
      :confirm-loading="submitting"
      @confirm="submitIp"
      @close="closeIpDialog"
      @cancel="closeIpDialog">
      <t-form label-align="top" :data="ipForm">
        <t-form-item :label="$t('workbench.ip.name')" required-mark>
          <t-input v-model="ipForm.name" :placeholder="$t('workbench.ip.namePlaceholder')" />
        </t-form-item>
        <t-form-item :label="$t('workbench.ip.description')">
          <t-textarea v-model="ipForm.description" :autosize="{ minRows: 3, maxRows: 5 }" :placeholder="$t('workbench.ip.descriptionPlaceholder')" />
        </t-form-item>
        <t-form-item :label="$t('workbench.ip.worldview')">
          <t-textarea v-model="ipForm.worldview" :autosize="{ minRows: 5, maxRows: 8 }" :placeholder="$t('workbench.ip.worldviewPlaceholder')" />
        </t-form-item>
        <t-form-item :label="$t('workbench.ip.artStyle')">
          <t-select
            v-model="ipForm.artStyle"
            clearable
            :loading="manualLoading"
            :placeholder="$t('workbench.ip.artStylePlaceholder')">
            <t-option v-for="item in manualOptions" :key="item.stylePath" :value="item.stylePath" :label="item.name" />
          </t-select>
        </t-form-item>
      </t-form>
    </t-dialog>

    <t-drawer
      v-model:visible="detailVisible"
      :header="currentIp?.name || $t('workbench.ip.title')"
      size="720px"
      :footer="false"
      destroy-on-close>
      <div class="detailBox">
        <div class="detailHeader f ac jb">
          <div class="detailInfo">
            <p v-if="currentIp?.description">{{ currentIp.description }}</p>
            <div class="metaTags f ac">
              <t-tag shape="round" variant="light" theme="primary">{{ $t("workbench.ip.roleCount", { count: currentIp?.roleCount ?? roles.length }) }}</t-tag>
              <t-tag v-if="currentIp?.artStyle" shape="round" variant="light">{{ manualName(currentIp.artStyle) }}</t-tag>
            </div>
          </div>
          <t-button theme="primary" @click="openRoleDialog">
            <template #icon><i-plus size="16" /></template>
            {{ $t("workbench.ip.addRole") }}
          </t-button>
        </div>

        <t-loading :loading="detailLoading" :text="$t('workbench.ip.loading')" class="roleListWrap">
          <div v-if="!roles.length && !detailLoading" class="emptyState">{{ $t("workbench.ip.noRoles") }}</div>
          <div v-else class="roleList">
            <div v-for="role in roles" :key="role.id" class="roleCard">
              <img v-if="role.imageId && roleImages[role.imageId]" :src="roleImages[role.imageId]" :alt="role.name" class="roleImage" loading="lazy" />
              <div class="roleContent">
                <div class="f ac jb">
                  <span class="roleName">{{ role.name }}</span>
                  <t-button size="small" variant="text" theme="danger" @click="deleteRole(role)">
                    <template #icon><i-delete size="14" /></template>
                    {{ $t("workbench.ip.deleteRole") }}
                  </t-button>
                </div>
                <p class="roleDescribe">{{ role.describe }}</p>
                <p v-if="role.remark" class="roleRemark">{{ role.remark }}</p>
              </div>
            </div>
          </div>
        </t-loading>
      </div>
    </t-drawer>

    <t-dialog
      v-model:visible="roleDialogVisible"
      :header="$t('workbench.ip.addRole')"
      :confirm-btn="$t('workbench.ip.save')"
      :cancel-btn="$t('workbench.ip.cancel')"
      width="520px"
      placement="center"
      :confirm-loading="roleSubmitting"
      @confirm="submitRole"
      @close="closeRoleDialog"
      @cancel="closeRoleDialog">
      <t-form label-align="top" :data="roleForm">
        <t-form-item :label="$t('workbench.ip.roleName')" required-mark>
          <t-input v-model="roleForm.name" :placeholder="$t('workbench.ip.roleNamePlaceholder')" />
        </t-form-item>
        <t-form-item :label="$t('workbench.ip.roleSetting')" required-mark>
          <t-textarea v-model="roleForm.describe" :autosize="{ minRows: 5, maxRows: 9 }" :placeholder="$t('workbench.ip.roleSettingPlaceholder')" />
        </t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import dayjs from "dayjs";
import axios from "@/utils/axios";
import { DialogPlugin } from "tdesign-vue-next";
import type { PrimaryTableCol, TableRowData } from "tdesign-vue-next";

interface IpItem {
  id: number;
  name: string;
  description?: string;
  worldview?: string;
  artStyle?: string;
  roleCount: number;
  createTime?: string | number;
}

interface IpRole {
  id: number;
  name: string;
  describe: string;
  remark?: string;
  imageId?: number;
  roleMeta?: Record<string, any>;
  createTime?: string | number;
}

interface VisualManualOption {
  name: string;
  stylePath: string;
}

const ipList = ref<IpItem[]>([]);
const loading = ref(false);
const ipDialogVisible = ref(false);
const submitting = ref(false);
const manualLoading = ref(false);
const manualOptions = ref<VisualManualOption[]>([]);
const ipForm = ref({
  id: 0,
  name: "",
  description: "",
  worldview: "",
  artStyle: "",
});

const columns: PrimaryTableCol<TableRowData>[] = [
  { colKey: "name", title: $t("workbench.ip.name"), width: 180, ellipsis: true },
  { colKey: "description", title: $t("workbench.ip.description"), ellipsis: true },
  { colKey: "artStyle", title: $t("workbench.ip.artStyle"), width: 170 },
  { colKey: "roleCount", title: $t("workbench.ip.roleCountColumn"), width: 110, align: "center" },
  { colKey: "createTime", title: $t("workbench.ip.createTime"), width: 180 },
  { colKey: "operation", title: $t("workbench.ip.operation"), width: 200 },
];

const detailVisible = ref(false);
const detailLoading = ref(false);
const currentIp = ref<IpItem>();
const roles = ref<IpRole[]>([]);
const roleImages = ref<Record<number, string>>({});
const roleDialogVisible = ref(false);
const roleSubmitting = ref(false);
const roleForm = ref({
  name: "",
  describe: "",
});

function formatTime(time?: string | number) {
  return time ? dayjs(time).format("YYYY-MM-DD HH:mm:ss") : "-";
}

function manualName(stylePath?: string) {
  if (!stylePath) return "-";
  return manualOptions.value.find((item) => item.stylePath === stylePath)?.name || stylePath;
}

async function getIpList() {
  loading.value = true;
  try {
    const { data } = await axios.post("/ip/getIpList", {});
    ipList.value = data || [];
  } catch (e) {
    window.$message.error((e as Error).message || $t("workbench.ip.msg.loadFailed"));
  } finally {
    loading.value = false;
  }
}

async function getManualOptions() {
  manualLoading.value = true;
  try {
    const { data } = await axios.post("/project/getVisualManual");
    manualOptions.value = data || [];
  } catch (e) {
    console.error($t("workbench.ip.msg.manualLoadFailed"), e);
  } finally {
    manualLoading.value = false;
  }
}

function openIpDialog(item?: IpItem) {
  ipForm.value = {
    id: item?.id || 0,
    name: item?.name || "",
    description: item?.description || "",
    worldview: item?.worldview || "",
    artStyle: item?.artStyle || "",
  };
  ipDialogVisible.value = true;
}

function closeIpDialog() {
  ipDialogVisible.value = false;
  ipForm.value = { id: 0, name: "", description: "", worldview: "", artStyle: "" };
}

async function submitIp() {
  if (!ipForm.value.name.trim()) return window.$message.warning($t("workbench.ip.msg.nameRequired"));
  submitting.value = true;
  try {
    if (ipForm.value.id) {
      await axios.post("/ip/editIp", {
        id: ipForm.value.id,
        name: ipForm.value.name,
        description: ipForm.value.description,
        worldview: ipForm.value.worldview,
        artStyle: ipForm.value.artStyle,
      });
      window.$message.success($t("workbench.ip.msg.updateSuccess"));
    } else {
      await axios.post("/ip/addIp", {
        name: ipForm.value.name,
        description: ipForm.value.description,
        worldview: ipForm.value.worldview,
        artStyle: ipForm.value.artStyle,
      });
      window.$message.success($t("workbench.ip.msg.addSuccess"));
    }
    closeIpDialog();
    getIpList();
  } catch (e) {
    window.$message.error((e as Error).message || $t("workbench.ip.msg.operationFailed"));
  } finally {
    submitting.value = false;
  }
}

function deleteIp(item: IpItem) {
  const dialog = DialogPlugin.confirm({
    header: $t("workbench.ip.delete"),
    body: $t("workbench.ip.msg.deleteBody", { name: item.name }),
    confirmBtn: $t("workbench.ip.delete"),
    cancelBtn: $t("workbench.ip.cancel"),
    theme: "danger",
    onConfirm: async () => {
      try {
        await axios.post("/ip/deleteIp", { id: item.id });
        window.$message.success($t("workbench.ip.msg.deleteSuccess"));
        getIpList();
      } catch (e) {
        window.$message.error((e as Error).message || $t("workbench.ip.msg.operationFailed"));
      } finally {
        dialog.destroy();
      }
    },
  });
}

async function openDetail(item: IpItem) {
  currentIp.value = { ...item };
  detailVisible.value = true;
  detailLoading.value = true;
  roles.value = [];
  roleImages.value = {};
  try {
    const { data } = await axios.post("/ip/getIpDetail", { id: item.id });
    currentIp.value = { ...item, ...data };
    roles.value = data.roles || [];
    resolveRoleImages(roles.value);
  } catch (e) {
    window.$message.error((e as Error).message || $t("workbench.ip.msg.detailFailed"));
  } finally {
    detailLoading.value = false;
  }
}

async function resolveRoleImages(list: IpRole[]) {
  const imageRoles = list.filter((item) => item.imageId != null);
  if (!imageRoles.length) return;
  try {
    const { data } = await axios.post("/production/workbench/getFileUrl", {
      items: imageRoles.map((item) => ({ id: item.imageId, sources: "assets" })),
    });
    const payload = data?.data ?? data;
    const nextImages: Record<number, string> = {};
    if (Array.isArray(payload)) {
      payload.forEach((item: { id?: number; url?: string }) => {
        if (item?.id != null && item.url) nextImages[item.id] = item.url;
      });
    } else if (payload && typeof payload === "object") {
      Object.entries(payload).forEach(([key, url]) => {
        const id = Number(key.split(":")[0]);
        if (Number.isFinite(id) && typeof url === "string" && url) nextImages[id] = url;
      });
    }
    roleImages.value = nextImages;
  } catch (e) {
    console.warn($t("workbench.ip.msg.imageLoadFailed"), e);
  }
}

function openRoleDialog() {
  roleForm.value = { name: "", describe: "" };
  roleDialogVisible.value = true;
}

function closeRoleDialog() {
  roleDialogVisible.value = false;
  roleForm.value = { name: "", describe: "" };
}

async function submitRole() {
  if (!currentIp.value) return;
  if (!roleForm.value.name.trim()) return window.$message.warning($t("workbench.ip.msg.roleNameRequired"));
  if (!roleForm.value.describe.trim()) return window.$message.warning($t("workbench.ip.msg.roleSettingRequired"));
  roleSubmitting.value = true;
  try {
    await axios.post("/ip/addIpAsset", {
      ipId: currentIp.value.id,
      name: roleForm.value.name,
      describe: roleForm.value.describe,
    });
    window.$message.success($t("workbench.ip.msg.roleAddSuccess"));
    closeRoleDialog();
    await openDetail(currentIp.value);
  } catch (e) {
    window.$message.error((e as Error).message || $t("workbench.ip.msg.operationFailed"));
  } finally {
    roleSubmitting.value = false;
  }
}

function deleteRole(item: IpRole) {
  const dialog = DialogPlugin.confirm({
    header: $t("workbench.ip.deleteRole"),
    body: $t("workbench.ip.msg.deleteRoleBody", { name: item.name }),
    confirmBtn: $t("workbench.ip.deleteRole"),
    cancelBtn: $t("workbench.ip.cancel"),
    theme: "danger",
    onConfirm: async () => {
      if (!currentIp.value) return;
      try {
        await axios.post("/ip/delIpAsset", { id: item.id });
        window.$message.success($t("workbench.ip.msg.roleDeleteSuccess"));
        await openDetail(currentIp.value);
      } catch (e) {
        window.$message.error((e as Error).message || $t("workbench.ip.msg.operationFailed"));
      } finally {
        dialog.destroy();
      }
    },
  });
}

onMounted(() => {
  getIpList();
  getManualOptions();
});
</script>

<style lang="scss" scoped>
.ipPage {
  padding-top: 32px;
  height: 100%;

  .toolbar {
    margin-bottom: 24px;

    .title {
      margin: 0;
      font-size: 32px;
      font-weight: 600;
      color: var(--td-text-color-primary);
    }

    .sub {
      margin-top: 4px;
      opacity: 0.5;
      color: var(--td-text-color-secondary);
    }
  }

  .ipTable {
    border-radius: 12px;
    overflow: hidden;

    .actionBtns {
      justify-content: flex-end;
    }
  }

  .detailBox {
    height: 100%;
    display: flex;
    flex-direction: column;

    .detailHeader {
      align-items: flex-start;
      margin-bottom: 16px;

      .detailInfo {
        flex: 1;
        min-width: 0;

        p {
          margin: 0 0 10px;
          color: var(--td-text-color-secondary);
        }

        .metaTags {
          gap: 8px;
        }
      }
    }

    .roleListWrap {
      flex: 1;
      overflow-y: auto;
    }

    .emptyState {
      padding: 48px 0;
      text-align: center;
      color: var(--td-text-color-placeholder);
    }

    .roleList {
      display: flex;
      flex-direction: column;
      gap: 12px;

      .roleCard {
        display: flex;
        gap: 14px;
        padding: 14px;
        border: 1px solid var(--td-border-level-1-color);
        border-radius: 12px;
        background: var(--td-bg-color-container);

        .roleImage {
          width: 78px;
          height: 78px;
          border-radius: 10px;
          object-fit: cover;
          flex-shrink: 0;
        }

        .roleContent {
          flex: 1;
          min-width: 0;

          .roleName {
            font-weight: 600;
            color: var(--td-text-color-primary);
          }

          .roleDescribe {
            margin: 8px 0 0;
            white-space: pre-wrap;
            word-break: break-word;
            color: var(--td-text-color-secondary);
          }

          .roleRemark {
            margin: 8px 0 0;
            font-size: 12px;
            color: var(--td-text-color-placeholder);
          }
        }
      }
    }
  }
}
</style>
