<template>
  <div class="script">
    <h2>{{ project?.name }}</h2>
    <div class="actionBar">
      <div class="searchWrapper">
        <t-input placeholder="搜索剧本名称..." v-model="searchQuery" @change="onChange" class="searchInput">
          <template #suffixIcon>
            <i-search :size="18" class="searchIcon" />
          </template>
        </t-input>
      </div>
      <t-button theme="primary" @click="handleAddScript">
        <template #icon><i-plus :size="18" /></template>
        新建剧本
      </t-button>
      <t-button theme="primary" @click="handleExportScript">
        <template #icon><i-plus :size="18" /></template>
        导出剧本
      </t-button>
    </div>
    <div class="contentArea">
      <div v-if="scripts.length === 0" class="emptyState">
        <t-empty />
      </div>
      <div v-else class="scriptsList f w">
        <div v-for="(item, index) in scripts" :key="index" @click="handleScriptClick(item)">
          <t-card :title="item.name" hover-shadow :style="{ width: '400px', cursor: 'pointer' }">
            <span class="content">{{ item.content }}</span>
            <template #actions>
              <i-delete theme="outline" size="20" @click.stop="handleDeleteScript(item.id)" style="cursor: pointer" />
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
function handleExportScript() {
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
    gap: 16px;
    margin-bottom: 32px;
    .searchWrapper {
      flex: 1;
      max-width: 500px;
      .searchInput {
        .searchIcon {
        }
      }
    }
  }
  .contentArea {
    .scriptsList {
      gap: 20px;
      .content {
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 1;
        overflow: hidden;
        color: var(--td-text-color-secondary);
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
