<template>
  <div class="script">
    <div class="actionBar">
      <div class="actionBar-left f ac">
        <t-input placeholder="搜索剧本名称..." v-model="searchQuery" class="searchInput" clearable style="width: 300px" />
        <t-button theme="primary" @click="onChange">
          <template #icon><i-search /></template>
          搜索
        </t-button>
        <t-button theme="primary" @click="handleAddScript">
          <template #icon><i-plus /></template>
          新建剧本
        </t-button>
      </div>
      <div class="actionBar-right f ac" v-if="scripts.length">
        <t-button :theme="isAllSelected ? 'default' : 'primary'" variant="outline" @click="toggleSelectAll(!isAllSelected)">
          {{ isAllSelected ? "取消全选" : "全选" }}
        </t-button>
        <t-button theme="primary" @click="handleExportScript" :disabled="selectedIds.length === 0">
          <template #icon><i-export /></template>
          导出剧本{{ selectedIds.length ? `(${selectedIds.length})` : "" }}
        </t-button>
      </div>
    </div>
    <div class="contentArea">
      <div v-if="scripts.length === 0" class="emptyState">
        <t-empty />
      </div>
      <div v-else class="scriptsList f w">
        <div v-for="(item, index) in scripts" :key="index" @click="handleScriptClick(item)">
          <t-card shadow :title="item.name" hover-shadow :style="{ width: '400px', cursor: 'pointer' }">
            <template #header>
              <div class="cardHeader f ac">
                <t-checkbox :checked="selectedIds.includes(item.id)" @click.stop @change="toggleSelect(item.id)" />
                <span class="cardTitle">{{ item.name }}</span>
              </div>
            </template>
            <span class="content">{{ item.content }}</span>
            <template #actions>
              <i-delete theme="outline" @click.stop="handleDeleteScript(item.id)" style="cursor: pointer" />
            </template>
          </t-card>
        </div>
      </div>
    </div>
    <Details v-model="detailsShow" :item="selectedScript" @searchScripts="searchScripts" />
    <AddScript v-model="addScriptShow" @searchScripts="searchScripts" />
  </div>
</template>

<script setup lang="ts">
import axios from "@/utils/axios";
import Details from "./components/details.vue";
import AddScript from "./components/addScript.vue";
import projectStore from "@/stores/project";

const { project } = storeToRefs(projectStore());
interface Script {
  id: number;
  name: string;
  content: string;
  createTime?: number;
}
const scripts = ref<Script[]>([]);
const searchQuery = ref("");
const addScriptShow = ref(false);
const selectedIds = ref<number[]>([]);

const isAllSelected = computed(() => scripts.value.length > 0 && selectedIds.value.length === scripts.value.length);
const isIndeterminate = computed(() => selectedIds.value.length > 0 && selectedIds.value.length < scripts.value.length);

function toggleSelect(id: number) {
  const idx = selectedIds.value.indexOf(id);
  if (idx === -1) {
    selectedIds.value.push(id);
  } else {
    selectedIds.value.splice(idx, 1);
  }
}

function toggleSelectAll(checked: boolean) {
  if (checked) {
    selectedIds.value = scripts.value.map((s) => s.id);
  } else {
    selectedIds.value = [];
  }
}
// 搜索剧本
async function searchScripts() {
  try {
    const res = await axios.post("/script/getScrptApi", {
      projectId: project.value?.id,
      name: searchQuery.value,
    });
    scripts.value = res.data;
  } catch (error) {
    console.error("搜索剧本失败:", error);
    MessagePlugin.error("搜索剧本失败");
  }
}
onMounted(searchScripts);
// 搜索输入变化
function onChange() {
  searchScripts();
}
// 新增剧本
function handleAddScript() {
  addScriptShow.value = true;
}
//导出剧本
async function handleExportScript() {
  if (!selectedIds.value.length) {
    MessagePlugin.warning("请先选择要导出的剧本");
    return;
  }
  try {
    const res = await axios.post("/script/exportScript", { id: selectedIds.value }, { responseType: "blob" });
    const blob = new Blob([res as any], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `剧本_${new Date().toISOString().slice(0, 10)}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    MessagePlugin.success("导出成功");
  } catch (error) {
    console.error("导出剧本失败:", error);
    MessagePlugin.error("导出剧本失败");
  }
}
const selectedScript = ref<Script>({
  id: 0,
  name: "",
  content: "",
});
const detailsShow = ref(false);
// 点击剧本卡片
function handleScriptClick(item: Script) {
  selectedScript.value = { ...item };
  detailsShow.value = true;
}
// 删除剧本
async function handleDeleteScript(scriptId: number) {
  const dialog = DialogPlugin.confirm({
    header: "确认删除",
    body: "确定要删除这个剧本吗？此操作无法撤销。",
    confirmBtn: "删除",
    cancelBtn: "取消",
    theme: "warning",
    onConfirm: async () => {
      try {
        await axios.post("/script/delScript", { id: scriptId });
        MessagePlugin.success("删除成功");
        searchScripts();
        dialog.destroy();
      } catch (error) {
        console.error("删除剧本失败:", error);
        MessagePlugin.error("删除失败");
        dialog.destroy();
      }
    },
    onClose: () => {
      dialog.destroy();
    },
  });
}
</script>

<style lang="scss" scoped>
.script {
  .smHead {
    margin-bottom: 32px;
  }
  .actionBar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
    .actionBar-left {
      gap: 10px;
    }
    .actionBar-right {
      gap: 12px;
    }
  }
  .contentArea {
    .scriptsList {
      gap: 20px;
      .content {
        display: -webkit-box;
        -webkit-box-orient: vertical;
        overflow: hidden;
        -webkit-line-clamp: 1;
      }
      .cardHeader {
        gap: 8px;
        .cardTitle {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }
    }
    .emptyState {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 600px;
    }
  }
}
</style>
