import axios from "@/utils/axios";
import projectStore from "@/stores/project";
import settingStore from "@/stores/setting";
import { useChat } from "@/utils/useChat";

interface PlanData {
  storySkeleton: string;
  adaptationStrategy: string;
  script: { id?: number; name: string; content: string }[];
}

export default defineStore(
  "scriptAgent",
  () => {
    const planData = ref<PlanData>({
      storySkeleton: "",
      adaptationStrategy: "",
      script: [],
    });

    const { connected, messages, chat, stopGenerate, socket, status } = useChat({
      url: `${settingStore().baseUrl}/socket/scriptAgent`,
      auth: {
        isolationKey: `${projectStore().project?.id}:scriptAgent`,
        projectId: projectStore().project?.id,
      },
      manageLifecycle: false,
      xmlTags: [
        { tag: "storySkeleton", keepInMessage: false },
        { tag: "adaptationStrategy", keepInMessage: false },
        { tag: "script", keepInMessage: false },
      ],
      onXmlTag: (data) => {
        const { tag, value, children, status } = data;
        if (tag === "storySkeleton") {
          planData.value.storySkeleton = value;
        } else if (tag === "adaptationStrategy") {
          planData.value.adaptationStrategy = value;
        } else if (tag === "script") {
          // 流式场景：用 children 完整重建，保留已有项的 id
          const newItems = children.map((child) => {
            const existing = planData.value.script.find((s) => s.name === (child.attrs.name ?? ""));
            return {
              id: existing?.id,
              name: child.attrs.name ?? "",
              content: child.value,
            };
          });
          planData.value.script = newItems;
        }
        if (status === "complete") {
          setPlanData();
        }
      },
      autoConnect: true,
    });
    // 注册 getPlanData 事件（无需依赖组件生命周期）
    watch(
      socket,
      (s) => {
        if (s) {
          s.on("getPlanData", (_, callback) => {
            callback(planData.value);
          });
        }
      },
      { immediate: true },
    );

    async function setPlanData() {
      await axios.post("/scriptAgent/setPlanData", { projectId: projectStore().project?.id, agentType: "scriptAgent", data: planData.value });
    }

    return { connected, messages, chat, stopGenerate, socket, status, planData, setPlanData };
  },
  { persist: false },
);
