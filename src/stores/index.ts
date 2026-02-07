import axios from "@/utils/axios";

interface TabItem {
  key: string;
  path: string;
  title: string;
  closable: boolean;
}

export default defineStore(
  "index",
  () => {
    const activeMenu = ref<string>("");

    //当前项目
    const project = ref<Project | null>(null);

    //获取前项目ID
    const projectId = computed(() => {
      return project.value ? Number(project.value.id)! : -1;
    });

    const currentScriptId = ref(<number | null>null);

    //设置当前项目
    async function setProjectById(id: number) {
      const res = await axios.post("/project/getSingleProject", { id: id });
      project.value = res.data[0];
      const scriptData = await axios.post("/script/geScriptApi", { projectId: id });
      currentScriptId.value = scriptData.data?.id || null;
    }

    // ==================== Tab 多标签页管理 ====================
    const tabTitleMap: Record<string, string> = {
      "/project": "我的项目",
      "/projectDetail": "项目详情",
      "/setting": "设置",
      "/taskList": "任务列表",
    };

    const tabs = ref<TabItem[]>([
      { key: "/project", path: "/project", title: "我的项目", closable: false },
    ]);

    const activeTab = ref<string>("/project");

    function openTab(path: string) {
      const existing = tabs.value.find((t) => t.path === path);
      if (!existing) {
        tabs.value.push({
          key: path,
          path,
          title: tabTitleMap[path] || path,
          closable: path !== "/project",
        });
      }
      activeTab.value = path;
      activeMenu.value = path;
    }

    function closeTab(path: string) {
      const idx = tabs.value.findIndex((t) => t.path === path);
      if (idx === -1 || !tabs.value[idx].closable) return;
      tabs.value.splice(idx, 1);
      // 如果关闭的是当前激活的 tab，切换到前一个
      if (activeTab.value === path) {
        const newIdx = Math.min(idx, tabs.value.length - 1);
        activeTab.value = tabs.value[newIdx].path;
        activeMenu.value = tabs.value[newIdx].path;
      }
    }

    function switchTab(path: string) {
      activeTab.value = path;
      activeMenu.value = path;
    }

    return {
      activeMenu, project, projectId, currentScriptId, setProjectById,
      tabs, activeTab, openTab, closeTab, switchTab,
    };
  },
  { persist: false },
);
