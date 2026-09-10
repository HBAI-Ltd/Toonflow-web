import axios from "@/utils/axios";
import projectStore from "@/stores/project";
import settingStore from "@/stores/setting";
import { useChat } from "@/utils/useChat";
import type { PreflightState, PreflightUpdate } from "@/utils/preflight";
import router from "@/router";

interface PlanData {
  preflightReport: string;
  preflight?: PreflightState;
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
          preflightReport: "",
          storySkeleton: "",
          adaptationStrategy: "",
          script: [],
        });
        let preflightRevision = 0;
        let planRequest = 0;

        const { connected, messages, chat, stopGenerate, socket, status, disconnect, connect, reconnect, emit, removeMessagesAfter, isGenerating, restoreHistory, loadingHistory, clearMessages } = useChat({
          url: `${settingStore().baseUrl}/socket/scriptAgent`,
          auth: () => ({
            isolationKey: importId ? `${projectId}:scriptAgent:b${importId}` : scriptId !== undefined ? `${projectId}:scriptAgent:${scriptId}` : `${projectId}:scriptAgent`,
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
            { tag: "correctedBlock", keepInMessage: false },
          ],
          onXmlTag: (data) => {
            const { tag, value, children, status, attrs } = data;
            // Candidate repairs are owned by the backend workflow and shown only in the diff panel.
            if (tag === 'correctedBlock') return;
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

          },
          autoConnect: false,
          onError: (error) => {
            window.$message.error(error.message);
            void getPlanData().catch(() => {});
          },
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
              s.on("preflight:update", (update: PreflightUpdate) => {
                preflightRevision++;
                planData.value.preflight = update.preflight;
                if (update.preflightReport !== undefined) planData.value.preflightReport = update.preflightReport;
              });
              const refreshPlan = () => void getPlanData().catch((error) => {
                console.error("预审状态同步失败", error);
                window.$message.error("预审状态同步失败，请重新连接后重试");
              });
              const refreshHistory = () => void getHistory().catch(error => { console.error("对话恢复失败", error); window.$message.error("对话恢复失败，请重新连接后重试"); });
              s.on("connect", refreshHistory);
              if (s.connected) refreshHistory();
              s.on("chat:state", (state: { running: boolean }) => { if (!state.running) refreshPlan(); });
              s.on("connect", refreshPlan);
              if (s.connected) refreshPlan();
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

        async function getHistory() {
          return restoreHistory(async () => {
            const { data } = await axios.post('/agents/getMemory', {
              projectId, agentType: 'scriptAgent',
              ...(importId !== undefined ? { importId } : {}),
              ...(scriptId !== undefined ? { episodesId: scriptId } : {}),
            });
            return data;
          });
        }

        async function getPlanData() {
          const revision = preflightRevision;
          const request = ++planRequest;
          const { data } = await axios.post("/scriptAgent/getPlanData", {
            projectId,
            agentType: "scriptAgent",
            ...(importId !== undefined ? { importId, merge: !!merge } : {}),
            ...(scriptId !== undefined ? { scriptId } : {}),
          });
          if (request === planRequest) {
            const snapshot = data.data ?? {};
            // A socket result received after this request began is more recent.
            if (revision === preflightRevision) {
              planData.value.preflight = snapshot.preflight;
              planData.value.preflightReport = snapshot.preflightReport || "";
            }
            planData.value.storySkeleton = snapshot.storySkeleton || "";
            planData.value.adaptationStrategy = snapshot.adaptationStrategy || "";
            planData.value.script = snapshot.script || [];
          }
          return data.id as number | undefined;
        }

        async function setPlanData() {
          const { preflight, ...editablePlan } = planData.value;
          await axios.post("/scriptAgent/setPlanData", {
            projectId: projectId,
            agentType: "scriptAgent",
            data: editablePlan,
            ...(importId !== undefined ? { importId } : {}),
            ...(scriptId !== undefined ? { scriptId } : {}),
          });
        }

        /**
         * 重试 = 先撤销该轮及其之后的一切，再用（可编辑的）原输入重发。
         * 不能只 chat() 追加：旧轮和新轮会同时留在记忆里，后端 readChatContext 取最近若干条，
         * 模型随后会同时看到两份互相矛盾的产出。撤销走的就是回退那条链路（discard 语义）。
         */
        async function retryFrom(userMessageId: string, text: string): Promise<{ ok: boolean; message?: string }> {
          if (isGenerating.value) return { ok: false, message: "generating" };
          if (!socket.value?.connected) return { ok: false, message: "socketNotConnected" };
          const rolledBack = await rollbackTo(userMessageId, "discard");
          if (!rolledBack.ok) return rolledBack;
          // 撤销已落到库里：先与库对齐再重发，避免本地残留被删掉的轮次
          await getHistory().catch(() => {});
          return chat(text) ? { ok: true } : { ok: false, message: "sendFailed" };
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

        return { getHistory, loadingHistory, clearMessages, connected, messages, chat, stopGenerate, socket, status, planData, getPlanData, setPlanData, connect, disconnect, reconnect, thinkLevel, updateThinkConfig, retryFrom, rollbackTo, autoAdvance, updateAutoAdvance, autoAdvanceContinue, isGenerating };
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
