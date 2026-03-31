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
        { tag: "scriptItem", keepInMessage: false },
      ],
      onXmlTag: (data) => {
        const { tag, value, children, status, attrs } = data;
        if (tag === "storySkeleton") {
          planData.value.storySkeleton = value;
        } else if (tag === "adaptationStrategy") {
          planData.value.adaptationStrategy = value;
        } else if (tag === "scriptItem") {
          // 流式场景：合并 children 到现有数据，保留已有项的 id，不删除 children 中不存在的条目
          const name = attrs.name ?? "";
          const content = value;
          if (name) {
            const existingIndex = planData.value.script.findIndex((s) => s.name === name);
            if (existingIndex !== -1) {
              // 已存在则更新 content，保留 id
              planData.value.script[existingIndex].content = content;
            } else {
              // 不存在则追加新条目
              planData.value.script.push({ name, content });
            }
          }
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
