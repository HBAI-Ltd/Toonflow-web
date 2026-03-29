import axios from "@/utils/axios";
import projectStore from "@/stores/project";
import settingStore from "@/stores/setting";
import { useChat } from "@/utils/useChat";
import sax from "sax";
import type { FlowData, DeriveAsset, Storyboard } from "@/views/production/utils/flowBuilder";

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
        { tag: "assets", keepInMessage: false },
        { tag: "storyboards", keepInMessage: false },
        { tag: "workbench", keepInMessage: false },
        { tag: "delete", keepInMessage: false },
        { tag: "deleteList", keepInMessage: false },
      ],
      onXmlTag: (data) => {
        const { tag, value, children, attrs, status } = data;
        if (tag === "script") {
          flowData.value.script = value ?? "";
        } else if (tag === "scriptPlan") {
          flowData.value.scriptPlan = value ?? "";
        } else if (tag === "storyboardTable") {
          flowData.value.storyboardTable = value ?? "";
        } else if (tag === "assets" && children) {
          for (const assetItem of children) {
            if (assetItem.tag !== "assetItem") continue;
            const targetId = Number(assetItem.attrs?.id);
            const existing = flowData.value.assets.find((a) => Number(a.id) === targetId);
            if (!existing) continue;
            // 流式场景：先清除之前流式写入的 id=0 派生项，再重新解析
            existing.derive = existing.derive.filter((d) => d.id !== 0);
            // 用 sax 从 assetItem.value 中解析 deriveAsset 子项
            const saxParser = sax.parser(true, { trim: false });
            saxParser.onerror = () => {
              saxParser.error = null as any;
              saxParser.resume();
            };
            saxParser.onopentag = (node) => {
              if (node.name !== "deriveAsset") return;
              const da = node.attributes as Record<string, string>;
              const deriveId = Number(da.id);
              if (deriveId === 0) {
                existing.derive.push({
                  id: 0,
                  assetsId: Number(da.assetsId) || null,
                  name: da.name ?? "",
                  desc: da.desc ?? "",
                  prompt: da.prompt ?? "",
                  src: "",
                  state: (da.state as DeriveAsset["state"]) ?? "未生成",
                  type: (da.type as DeriveAsset["type"]) ?? "role",
                });
              } else {
                const existingDerive = existing.derive.find((ed) => ed.id === deriveId);
                if (existingDerive) {
                  if (da.name != null) existingDerive.name = da.name;
                  if (da.desc != null) existingDerive.desc = da.desc;
                  if (da.prompt != null) existingDerive.prompt = da.prompt;
                  if (da.state != null) existingDerive.state = da.state as DeriveAsset["state"];
                  if (da.type != null) existingDerive.type = da.type as DeriveAsset["type"];
                }
              }
            };
            try {
              saxParser.write(`<r>${assetItem.value}</r>`).close();
            } catch {
              /* ignore */
            }
          }
        } else if (tag === "storyboards" && children) {
          for (const sb of children) {
            if (sb.tag !== "storyboard") continue;
            const sa = sb.attrs ?? {};
            const sbId = Number(sa.id);
            if (!sbId || isNaN(sbId)) continue;
            const existing = flowData.value.storyboard.find((s) => Number(s.id) === sbId);
            if (existing) {
              if (sa.title != null) existing.title = sa.title;
              if (sa.description != null) existing.description = sa.description;
              if (sa.camera != null) existing.camera = sa.camera;
              if (sa.duration != null) existing.duration = Number(sa.duration);
              if (sa.frameMode != null) existing.frameMode = sa.frameMode as Storyboard["frameMode"];
              if (sa.prompt != null) existing.prompt = sa.prompt;
              if (sa.lines != null) existing.lines = sa.lines;
              if (sa.sound != null) existing.sound = sa.sound;
              if (sa.associateAssetsIds != null) existing.associateAssetsIds = sa.associateAssetsIds.split(",").map(Number).filter(Boolean);
              if (sa.state != null) existing.state = sa.state as Storyboard["state"];
              if (sa.referenceIds != null) existing.referenceIds = sa.referenceIds.split(",").map(Number).filter(Boolean);
            } else {
              flowData.value.storyboard.push({
                id: sbId,
                title: sa.title ?? "",
                description: sa.description ?? "",
                camera: sa.camera ?? "",
                duration: Number(sa.duration) || 0,
                frameMode: (sa.frameMode as Storyboard["frameMode"]) ?? "firstFrame",
                prompt: sa.prompt ?? "",
                lines: sa.lines ?? null,
                sound: sa.sound ?? null,
                associateAssetsIds: sa.associateAssetsIds ? sa.associateAssetsIds.split(",").map(Number).filter(Boolean) : [],
                src: null,
                state: (sa.state as Storyboard["state"]) ?? "未生成",
                referenceIds: sa.referenceIds ? sa.referenceIds.split(",").map(Number).filter(Boolean) : [],
              });
            }
          }
        } else if (tag === "workbench") {
          const wa = attrs ?? {};
          if (wa.name != null) flowData.value.workbench.name = wa.name;
          if (wa.duration != null) flowData.value.workbench.duration = wa.duration;
          if (wa.resolution != null) flowData.value.workbench.resolution = wa.resolution;
          if (wa.fps != null) flowData.value.workbench.fps = wa.fps;
        } else if (tag === "delete" || tag === "deleteList") {
          const applyDelete = (da: Record<string, string>) => {
            const type = da.type;
            const id = Number(da.id);
            if (type === "script") flowData.value.script = "";
            else if (type === "scriptPlan") flowData.value.scriptPlan = "";
            else if (type === "storyboardTable") flowData.value.storyboardTable = "";
            else if (type === "storyboard" && id) {
              flowData.value.storyboard = flowData.value.storyboard.filter((s) => Number(s.id) !== id);
            } else if (type === "deriveAsset" && id) {
              for (const asset of flowData.value.assets) {
                asset.derive = asset.derive.filter((d) => d.id !== id);
              }
            }
          };
          if (tag === "delete") {
            applyDelete(attrs ?? {});
          } else if (children) {
            for (const child of children) {
              if (child.tag === "delete") applyDelete(child.attrs ?? {});
            }
          }
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
        }
      },
      { immediate: true },
    );

    async function setFlowData() {
      await axios.post("/productionAgent/setFlowData", { projectId: projectStore().project?.id, agentType: "productionAgent", data: flowData.value });
    }

    return { connected, messages, chat, stopGenerate, socket, status, flowData, setFlowData, episodesId };
  },
  { persist: false },
);
