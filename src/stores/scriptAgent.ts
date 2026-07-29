import axios from "@/utils/axios";
import projectStore from "@/stores/project";
import settingStore from "@/stores/setting";
import { useChat } from "@/utils/useChat";

interface PlanData {
  storySkeleton: string;
  adaptationStrategy: string;
  script: { id?: number; name: string; content: string }[];
}

function makeScriptAgentStore(projectId: string, sourcePackageId: string | null) {
  return defineStore(`scriptAgent-${projectId}-${sourcePackageId ?? "legacy"}`, () => {
        const planData = ref<PlanData>({
          storySkeleton: "",
          adaptationStrategy: "",
          script: [],
        });

        const { connected, messages, chat, stopGenerate, socket, status, disconnect, connect } = useChat({
          url: `${settingStore().baseUrl}/socket/scriptAgent`,
          auth: () => ({
            isolationKey: sourcePackageId ? `${projectId}:scriptAgent:${sourcePackageId}` : `${projectId}:scriptAgent`,
            projectId: projectId,
            sourcePackageId: sourcePackageId ?? undefined,
          }),
          manageLifecycle: false,
          xmlTags: [
            { tag: "storySkeleton", keepInMessage: false },
            { tag: "adaptationStrategy", keepInMessage: false },
            { tag: "scriptItem", keepInMessage: false },
          ],
          onXmlTag: (data) => {
            const { tag, value, attrs, status } = data;
            if (tag === "storySkeleton") {
              planData.value.storySkeleton = value;
            } else if (tag === "adaptationStrategy") {
              planData.value.adaptationStrategy = value;
            } else if (tag === "scriptItem") {
              const name = attrs.name ?? "";
              const content = value;
              if (name) {
                const existingIndex = planData.value.script.findIndex((s) => s.name === name);
                if (existingIndex !== -1) {
                  planData.value.script[existingIndex].content = content;
                } else {
                  planData.value.script.push({ name, content });
                }
              }
            }
            if (status === "complete") {
              setPlanData();
            }
          },
          autoConnect: false,
        });

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
          await axios.post("/scriptAgent/setPlanData", {
            projectId: projectId,
            sourcePackageId: sourcePackageId ?? undefined,
            agentType: "scriptAgent",
            data: planData.value,
          });
        }

        const thinkLevel = ref(0);

        function updateThinkConfig(value: number) {
          thinkLevel.value = value;
          if (socket.value) {
            socket.value.emit("updateThinkConfig", { think: value > 0, thinlLevel: value });
          }
        }

        return { connected, messages, chat, stopGenerate, socket, status, planData, setPlanData, connect, disconnect, thinkLevel, updateThinkConfig };
      });
}

const storeMap = new Map<string, ReturnType<typeof makeScriptAgentStore>>();

function createScriptAgentStore(projectId: string, sourcePackageId: string | null) {
  const key = `${projectId}:${sourcePackageId ?? "legacy"}`;
  if (!storeMap.has(key)) {
    storeMap.set(key, makeScriptAgentStore(projectId, sourcePackageId));
  }
  return storeMap.get(key)!;
}

export default function useScriptAgentStore(sourcePackageId: string | null = null) {
  const id = projectStore().project?.id;
  if (!id) throw new Error("No project selected");
  return createScriptAgentStore(String(id), sourcePackageId)();
}
