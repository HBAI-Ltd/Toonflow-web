import axios from "@/utils/axios";
import projectStore from "@/stores/project";
import settingStore from "@/stores/setting";
import { useChat } from "@/utils/useChat";
import router from "@/router";

interface PlanData {
  storySkeleton: string;
  adaptationStrategy: string;
  script: { id?: number; name: string; content: string }[];
}

export interface ScriptAgentSession {
  projectId: string;
  importId?: number;
  scriptId?: number;
  merge?: boolean;
}

function makeScriptAgentStore(session: ScriptAgentSession) {
  const { projectId, importId, scriptId, merge } = session;
  return defineStore(`scriptAgent-${projectId}${importId ? `-i${importId}` : ""}${scriptId ? `-s${scriptId}` : ""}${merge ? "-m1" : ""}`, () => {
        const planData = ref<PlanData>({
          storySkeleton: "",
          adaptationStrategy: "",
          script: [],
        });

        const { connected, messages, chat, stopGenerate, socket, status, disconnect, connect, reconnect, emit, removeMessagesAfter, isGenerating } = useChat({
          url: `${settingStore().baseUrl}/socket/scriptAgent`,
          auth: () => ({
            isolationKey: importId ? `${projectId}:scriptAgent:b${importId}` : `${projectId}:scriptAgent`,
            projectId: projectId,
            ...(importId !== undefined ? { importId } : {}),
            ...(scriptId !== undefined ? { scriptId } : {}),
            ...(importId !== undefined ? { merge: !!merge } : {}),
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

        /** 智能推进开关：开启后决策层代替用户确认并自动推进；按项目持久化，重连后自动同步到后端 */
        const autoAdvance = ref(localStorage.getItem(`scriptAgent-autoAdvance-${projectId}`) === "1");

        /** 思考档位：前端默认轻量思考；连接建立与重连时同步到后端，避免连接级状态回退为关闭 */
        const thinkLevel = ref(1);

        function updateAutoAdvance(value: boolean) {
          autoAdvance.value = value;
          localStorage.setItem(`scriptAgent-autoAdvance-${projectId}`, value ? "1" : "0");
          if (socket.value) {
            socket.value.emit("setAutoAdvance", { enabled: value });
          }
        }

        /** 智能推进续跑：走专用控制事件，不产生用户消息气泡、不写入对话记忆 */
        function autoAdvanceContinue() {
          if (!socket.value?.connected) return false;
          return emit("autoAdvanceContinue");
        }

        watch(
          socket,
          (s) => {
            if (s) {
              s.on("getPlanData", (_, callback) => {
                callback(planData.value);
              });
              const syncAutoAdvance = () => s.emit("setAutoAdvance", { enabled: autoAdvance.value });
              // socket 建立与每次重连都同步本地开关，避免后端连接级状态丢失后静默退回人工模式
              syncAutoAdvance();
              s.on("connect", syncAutoAdvance);
              const syncThinkLevel = () => s.emit("updateThinkConfig", { think: thinkLevel.value > 0, thinlLevel: thinkLevel.value });
              syncThinkLevel();
              s.on("connect", syncThinkLevel);
            }
          },
          { immediate: true },
        );

        async function setPlanData() {
          await axios.post("/scriptAgent/setPlanData", {
            projectId: projectId,
            agentType: "scriptAgent",
            data: planData.value,
            ...(importId !== undefined ? { importId } : {}),
            ...(scriptId !== undefined ? { scriptId } : {}),
          });
        }

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
              if (res?.ok) {
                removeMessagesAfter(messageId);
                // discard：目标用户消息本身也移除（其原文已回填输入框待编辑重发，
                // 避免消息留在对话里 + 输入框同文，看起来像重复发送）
                if (mode === "discard") {
                  const idx = messages.value.findIndex((m) => m.id === messageId);
                  if (idx > -1) messages.value.splice(idx, 1);
                }
              }
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

        return { connected, messages, chat, stopGenerate, socket, status, planData, setPlanData, connect, disconnect, reconnect, thinkLevel, updateThinkConfig, retryFrom, rollbackTo, autoAdvance, updateAutoAdvance, autoAdvanceContinue, isGenerating };
      });
}

const storeMap = new Map<string, ReturnType<ReturnType<typeof makeScriptAgentStore>>>();

function createScriptAgentStore(session: ScriptAgentSession) {
  const key = `${session.projectId}${session.importId ? `-i${session.importId}` : ""}${session.scriptId ? `-s${session.scriptId}` : ""}${session.merge ? "-m1" : ""}`;
  if (!storeMap.has(key)) {
    storeMap.set(key, makeScriptAgentStore(session)());
  }
  return storeMap.get(key)!;
}

function getSessionFromRoute(): ScriptAgentSession {
  const id = projectStore().project?.id;
  if (!id) throw new Error("No project selected");
  const query = router.currentRoute.value.query;
  const toNumber = (value: unknown) => {
    const num = Number(value);
    return Number.isFinite(num) && num > 0 ? num : undefined;
  };
  const importId = toNumber(query.importId);
  return {
    projectId: id,
    importId,
    scriptId: toNumber(query.scriptId),
    merge: importId !== undefined && query.merge === "1",
  };
}

export default function useScriptAgentStore(session?: ScriptAgentSession) {
  return createScriptAgentStore(session ?? getSessionFromRoute());
}
