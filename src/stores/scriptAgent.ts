import axios from "@/utils/axios";
import projectStore from "@/stores/project";
import settingStore from "@/stores/setting";
import { useChat } from "@/utils/useChat";

interface PlanData {
  storySkeleton: string;
  adaptationStrategy: string;
  script: { id?: number; name: string; content: string }[];
}

function makeScriptAgentStore(projectId: string) {
  return defineStore(`scriptAgent-${projectId}`, () => {
        const planData = ref<PlanData>({
          storySkeleton: "",
          adaptationStrategy: "",
          script: [],
        });

        const { connected, messages, chat, stopGenerate, socket, status, disconnect, connect, emit, removeMessagesAfter, isGenerating } = useChat({
          url: `${settingStore().baseUrl}/socket/scriptAgent`,
          auth: () => ({
            isolationKey: `${projectId}:scriptAgent`,
            projectId: projectId,
          }),
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
          await axios.post("/scriptAgent/setPlanData", { projectId: projectId, agentType: "scriptAgent", data: planData.value });
        }

        const thinkLevel = ref(1);

        /** 重试某一轮对话：截断该用户消息之后的所有回复，并原样重发 */
        function retryFrom(userMessageId: string, text: string) {
          if (!socket.value?.connected) return false;
          if (isGenerating.value) stopGenerate();
          removeMessagesAfter(userMessageId);
          return emit("chat", { content: text });
        }

        /**
         * 回退到某条消息对应时刻的工作区状态
         * @param mode keep=保留该AI回复完成时的成果，撤销其后轮次；discard=撤销该用户消息及其后轮次
         * @returns 后端回退结果；ok=false 时 message 为失败原因
         */
        function rollbackTo(messageId: string, mode: "keep" | "discard"): Promise<{ ok: boolean; message?: string; restoredTo?: string }> {
          return new Promise((resolve) => {
            if (!socket.value?.connected) {
              resolve({ ok: false, message: "socketNotConnected" });
              return;
            }
            if (isGenerating.value) {
              resolve({ ok: false, message: "generating" });
              return;
            }
            const target = messages.value.find((m) => m.id === messageId);
            if (!target?.datetime) {
              resolve({ ok: false, message: "messageNotFound" });
              return;
            }
            const messageTime = new Date(target.datetime).getTime();
            if (!Number.isFinite(messageTime)) {
              resolve({ ok: false, message: "invalidMessageTime" });
              return;
            }
            socket.value.emit("rollback", { messageTime, mode }, (res: { ok: boolean; message?: string; restoredTo?: string }) => {
              if (res?.ok) removeMessagesAfter(messageId);
              resolve(res ?? { ok: false, message: "noResponse" });
            });
          });
        }

        function updateThinkConfig(value: number) {
          thinkLevel.value = value;
          if (socket.value) {
            socket.value.emit("updateThinkConfig", { think: value > 0, thinlLevel: value });
          }
        }

        return { connected, messages, chat, stopGenerate, socket, status, planData, setPlanData, connect, disconnect, thinkLevel, updateThinkConfig, retryFrom, rollbackTo };
      });
}

const storeMap = new Map<string, ReturnType<typeof makeScriptAgentStore>>();

function createScriptAgentStore(projectId: string) {
  if (!storeMap.has(projectId)) {
    storeMap.set(projectId, makeScriptAgentStore(projectId));
  }
  return storeMap.get(projectId)!;
}

export default function useScriptAgentStore() {
  const id = projectStore().project?.id;
  if (!id) throw new Error("No project selected");
  return createScriptAgentStore(id)();
}
