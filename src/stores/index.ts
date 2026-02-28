import axios from "@/utils/axios";

export default defineStore(
  "index",
  () => {
    const version = ref('v1.0.7')

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

    return { version,activeMenu, project, projectId, currentScriptId, setProjectById };
  },
  { persist: false },
);
