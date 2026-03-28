import axios from "@/utils/axios";
import projectStore from "@/stores/project";
import settingStore from "@/stores/setting";
import { useChat } from "@/utils/useChat";

interface PlanData {
  storySkeleton: string;
  adaptationStrategy: string;
  script: { name: string; content: string }[];
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
          const newItems = children.map((child) => ({
            name: child.attrs.name ?? "",
            content: child.value,
          }));
          // 流式累加：按 name 更新已有项，新增不存在的项
          for (const item of newItems) {
            const existing = planData.value.script.find((s) => s.name === item.name);
            if (existing) {
              existing.content = item.content;
            } else {
              planData.value.script.push(item);
            }
          }
        }
        if (status === "complete") {
          setPlanData();
        }
      },
      autoConnect: true,
    });
    
    async function setPlanData() {
      await axios.post("/scriptAgent/setPlanData", { projectId: projectStore().project?.id, agentType: "scriptAgent", data: planData.value });
    }

    return { connected, messages, chat, stopGenerate, socket, status, planData };
  },
  { persist: false },
);
