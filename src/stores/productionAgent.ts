import axios from "@/utils/axios";
import projectStore from "@/stores/project";
import settingStore from "@/stores/setting";
import { useChat } from "@/utils/useChat";
import type { FlowData } from "@/views/production/utils/flowBuilder";

export default defineStore(
  "productionAgent",
  () => {
    const flowData = ref<FlowData>({
      script: "", // 剧本
      scriptPlan: "", //拍摄计划
      storyboardTable: "", //分镜表
      assets: [], // 衍生资产
      storyboard: [], //分镜面板
      workbench: { name: "", duration: "", resolution: "", fps: "" }, // 工作台数据
    });

    const episodesId = ref<number>(-1);

    const { connected, messages, chat, stopGenerate, socket, status } = useChat({
      url: `${settingStore().baseUrl}/socket/productionAgent`,
      auth: {
        isolationKey: `${projectStore().project?.id}:productionAgent:${episodesId.value}`,
        projectId: projectStore().project?.id,
        scriptId: episodesId.value,
      },
      manageLifecycle: false,
      autoConnect: true,
      xmlTags: [
        { tag: "script", keepInMessage: false },
        { tag: "scriptPlan", keepInMessage: false },
        { tag: "storyboardTable", keepInMessage: false },
      ],
      onXmlTag: (data) => {
        const { tag, value, children, attrs, status } = data;
        if (tag === "script") {
          flowData.value.script = value ?? "";
        } else if (tag === "scriptPlan") {
          flowData.value.scriptPlan = value ?? "";
        } else if (tag === "storyboardTable") {
          flowData.value.storyboardTable = value ?? "";
        }
      },
    });
    // 注册 getPlanData 事件（无需依赖组件生命周期）
    watch(
      socket,
      (s) => {
        if (s) {
          s.on("getFlowData", (_, callback) => {
            callback(flowData.value);
          });
          s.on("addDeriveAsset", async (data, callback) => {
            const assets = flowData.value.assets.find((a) => a.id === data.assetsId);
            if (!assets) return callback({ success: false, message: "资产不存在" });
            const deriveAssetList = assets.derive || [];
            const item = deriveAssetList.find((d) => d.id === data.id);
            if (item) {
              if (!item) return callback({ success: false, message: "衍生资产不存在" });
              item.name = data.name;
              item.type = assets.type;
              callback({ success: true, message: "更新成功" });
            } else {
              deriveAssetList.push({
                assetsId: data.assetsId,
                id: data.id,
                name: data.name,
                type: assets.type,
                desc: data.describe,
                prompt: "",
                state: "未生成",
                src: "",
              });
              callback({ success: true, message: "添加成功" });
            }
          });
          s.on("delDeriveAsset", async (data, callback) => {
            const assets = flowData.value.assets.find((a) => a.id === data.assetsId);
            if (!assets) return callback({ success: false, message: "资产不存在" });
            const deriveAssetList = assets.derive || [];
            const index = deriveAssetList.findIndex((d) => d.id === data.id);
            if (index === -1) return callback({ success: false, message: "衍生资产不存在" });
            deriveAssetList.splice(index, 1);
            callback({ success: true, message: "删除成功" });
          });
          s.on("addStoryboard", async (data, callback) => {
            const storyboard = flowData.value.storyboard.find((a) => a.id === data.id);
            if (storyboard) {
              storyboard.title = data.title;
              storyboard.description = data.description;
              callback({ success: true, message: "更新成功" });
            } else {
              flowData.value.storyboard.push({
                id: data.id ?? undefined,
                title: data.title,
                description: data.description,
                prompt: "",
                state: "未生成",
                src: "",
              });
              callback({ success: true, message: "添加成功" });
            }
          });
          s.on("generateDeriveAsset", async (data, callback) => {
            console.log("%c Line:106 🍢 data", "background:#f5ce50", data);
            batchGenerateAssets(data.id);
          });
          s.on("generateStoryboard", async (data, callback) => {
            console.log("%c Line:109 🌮 data", "background:#7f2b82", data);
            batchGenerateStoryboard(data.storyboardIds);
          });
        }
      },
      { immediate: true },
    );

    async function setFlowData() {
      await axios.post("/productionAgent/setFlowData", { projectId: projectStore().project?.id, agentType: "productionAgent", data: flowData.value });
    }

    async function getFlowData() {
      const { data } = await axios.post("/production/getFlowData", {
        projectId: projectStore().project?.id,
        episodesId: episodesId.value,
      });
      flowData.value = data;
    }
    async function batchGenerateStoryboard(allIds: number[]) {
      flowData.value.storyboard.forEach((item) => {
        if (allIds.includes(item.id!)) {
          item.state = "生成中";
        }
      });
      await axios.post("/production/storyboard/batchGenerateImage", {
        scriptId: episodesId.value,
        projectId: projectStore().project?.id,
        storyboardIds: allIds,
      });
    }
    async function batchGenerateAssets(allIds: number[]) {
      flowData.value.assets.forEach((asset) => {
        if (asset.derive) {
          asset.derive.forEach((derive) => {
            if (allIds.includes(derive.id)) {
              derive.state = "生成中";
            }
          });
        }
      });
      try {
        await axios.post("/production/assets/batchGenerateAssetsImage", {
          assetIds: allIds,
          projectId: projectStore().project?.id,
          scriptId: episodesId.value,
        });
      } catch (e) {
        console.log("%c Line:152 🥝 e", "background:#b03734", e);
      }
    }
    const assetsNotStateImageIds = computed(() => {
      const ids: number[] = [];
      flowData.value.assets.forEach((asset) => {
        if (asset.derive) {
          asset.derive.forEach((derive) => {
            if (derive.state == "生成中") {
              ids.push(derive.id);
            }
          });
        }
      });
      return ids;
    });
    const storyboardNotStateImageIds = computed(() => {
      const ids: number[] = [];
      flowData.value.storyboard.forEach((asset) => {
        if (asset.state == "生成中" && asset.id) {
          ids.push(asset.id);
        }
      });
      return ids;
    });
    // ---- 资产图片轮询 ----
    let assetsPollingTimer: number | null = null;
    let assetsPollingInFlight = false;

    async function pollAssetsImages() {
      const ids = assetsNotStateImageIds.value;
      if (ids.length === 0 || assetsPollingInFlight) return;
      assetsPollingInFlight = true;
      try {
        const { data } = await axios.post("/production/assets/pollingImage", {
          ids: ids,
        });
        if (!data || data.length === 0) return;
        const records = data as Array<{ id: number; state: string; src?: string }>;
        records.forEach((record) => {
          flowData.value.assets.forEach((asset) => {
            if (!asset.derive) return;
            asset.derive.forEach((derive) => {
              if (derive.id === record.id) {
                derive.state = record.state as "未生成" | "生成中" | "已完成" | "生成失败";
                if (record.src) derive.src = record.src;
              }
            });
          });
        });
      } catch (e) {
        console.error("[assetsPolling] error", e);
      } finally {
        assetsPollingInFlight = false;
      }
    }

    function startAssetsPolling() {
      if (assetsPollingTimer) return;
      assetsPollingTimer = window.setInterval(async () => {
        if (assetsNotStateImageIds.value.length === 0) {
          stopAssetsPolling();
          return;
        }
        await pollAssetsImages();
      }, 5000);
      // 立即执行一次
      pollAssetsImages();
    }

    function stopAssetsPolling() {
      if (assetsPollingTimer) {
        clearInterval(assetsPollingTimer);
        assetsPollingTimer = null;
      }
    }

    watch(
      () => assetsNotStateImageIds.value,
      (ids) => {
        if (ids.length > 0) {
          startAssetsPolling();
        } else {
          stopAssetsPolling();
        }
      },
    );

    // ---- 分镜图片轮询 ----
    let storyboardPollingTimer: number | null = null;
    let storyboardPollingInFlight = false;

    async function pollStoryboardImages() {
      const ids = storyboardNotStateImageIds.value;
      if (ids.length === 0 || storyboardPollingInFlight) return;
      storyboardPollingInFlight = true;
      try {
        const { data } = await axios.post("/production/storyboard/pollingImage", {
          ids: ids,
        });
        if (!data || data.length === 0) return;
        const records = data as Array<{ id: number; state: string; src?: string }>;
        records.forEach((record) => {
          const item = flowData.value.storyboard.find((s) => s.id === record.id);
          if (item) {
            item.state = record.state as "未生成" | "生成中" | "已完成" | "生成失败";
            if (record.src) item.src = record.src;
          }
        });
      } catch (e) {
        console.error("[storyboardPolling] error", e);
      } finally {
        storyboardPollingInFlight = false;
      }
    }

    function startStoryboardPolling() {
      if (storyboardPollingTimer) return;
      storyboardPollingTimer = window.setInterval(async () => {
        if (storyboardNotStateImageIds.value.length === 0) {
          stopStoryboardPolling();
          return;
        }
        await pollStoryboardImages();
      }, 5000);
      // 立即执行一次
      pollStoryboardImages();
    }

    function stopStoryboardPolling() {
      if (storyboardPollingTimer) {
        clearInterval(storyboardPollingTimer);
        storyboardPollingTimer = null;
      }
    }

    watch(
      () => storyboardNotStateImageIds.value,
      (ids) => {
        if (ids.length > 0) {
          startStoryboardPolling();
        } else {
          stopStoryboardPolling();
        }
      },
    );
    return {
      connected,
      messages,
      chat,
      stopGenerate,
      socket,
      status,
      flowData,
      setFlowData,
      getFlowData,
      episodesId,
      stopAssetsPolling,
      stopStoryboardPolling,
    };
  },
  { persist: false },
);
