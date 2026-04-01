import type { Ref } from "vue";
import { computed } from "vue";

// ==================== 固定节点 ID ====================
const NODE_IDS = {
  script: "script",
  scriptPlan: "scriptPlan",
  assets: "assets",
  storyboardTable: "storyboardTable",
  storyboard: "storyboard",
  workbench: "workbench",
  poster: "poster",
} as const;

type NodeId = (typeof NODE_IDS)[keyof typeof NODE_IDS];

// ==================== 类型定义 ====================
export interface DeriveAsset {
  id: number;
  assetsId: number | null;
  name: string;
  prompt: string;
  desc: string;
  src: string;
  flowId?: number;
  state: "未生成" | "生成中" | "已完成" | "生成失败";
  type: "role" | "tool" | "scene" | "clip";
  errorReason?: string;
}

export interface AssetItem {
  id: number;
  name: string;
  desc: string;
  prompt: string;
  src: string;
  state: "未生成" | "生成中" | "已完成" | "生成失败";
  type: "role" | "tool" | "scene" | "clip";
  flowId?: number;
  derive: DeriveAsset[];
  errorReason?: string;
}

export interface Storyboard {
  id?: number;
  duration?: number;
  prompt: string;
  trackId?: number;
  associateAssetsIds?: number[];
  src: string | null;
  state: "未生成" | "生成中" | "已完成" | "生成失败";
  flowId?: number;
  reason?: string;
  videoDesc: string;
  shouldGenerateImage: number;
}

interface VideoList {
  id: number;
  prompt: string;
  duration: number;
  storyboardId: number;
  trackId: number;
}

export interface FlowData {
  script: string;
  scriptPlan: string;
  assets: AssetItem[];
  storyboardTable: string;
  storyboard: Storyboard[];
  workbench: {
    videoList: VideoList[];
  };
}

export type NodePositions = Record<string, { x: number; y: number }>;

// 边样式
const edgeStyle = {
  stroke: "#00000",
  strokeWidth: 4,
};

// ==================== 构建函数 ====================
export function useFlowBuilder(flowData: Ref<FlowData>, nodePositions: Ref<NodePositions>) {
  const nodes = computed(() => {
    const data = flowData.value;
    const positions = nodePositions.value;
    const ids = NODE_IDS;

    const allNodes = [
      // 1. Script 节点
      {
        id: ids.script,
        type: "script",
        dragHandle: ".dragHandle",
        position: positions[ids.script] || { x: 0, y: 0 },
        data: {
          script: data.script,
          handleIds: {
            assets: `${ids.script}-assets`,
            source: `${ids.script}-source`,
          },
        },
      },
      // 1.5 ScriptPlan 节点
      {
        id: ids.scriptPlan,
        type: "scriptPlan",
        dragHandle: ".dragHandle",
        position: positions[ids.scriptPlan] || { x: 0, y: 0 },
        data: {
          scriptPlan: data.scriptPlan,
          handleIds: {
            target: `${ids.scriptPlan}-target`,
            source: `${ids.scriptPlan}-source`,
          },
        },
      },
      // 2. Assets 节点
      {
        id: ids.assets,
        type: "assets",
        dragHandle: ".dragHandle",
        position: positions[ids.assets] || { x: 0, y: 0 },
        data: {
          assets: data.assets,
          handleIds: {
            target: `${ids.assets}-target`,
          },
        },
      },
      // 3. StoryboardTable 节点
      {
        id: ids.storyboardTable,
        type: "storyboardTable",
        dragHandle: ".dragHandle",
        position: positions[ids.storyboardTable] || { x: 0, y: 0 },
        data: {
          storyboardTable: data.storyboardTable,
          handleIds: {
            target: `${ids.storyboardTable}-target`,
            source: `${ids.storyboardTable}-source`,
          },
        },
      },
      // 4. Storyboard 节点
      {
        id: ids.storyboard,
        type: "storyboard",
        dragHandle: ".dragHandle",
        position: positions[ids.storyboard] || { x: 0, y: 0 },
        data: {
          storyboard: data.storyboard,
          handleIds: {
            target: `${ids.storyboard}-target`,
            source: `${ids.storyboard}-source`,
          },
        },
      },
      // 5. Workbench 节点
      {
        id: ids.workbench,
        type: "workbench",
        dragHandle: ".dragHandle",
        position: positions[ids.workbench] || { x: 0, y: 0 },
        data: {
          ...data.workbench,
          handleIds: {
            target: `${ids.workbench}-target`,
            source: `${ids.workbench}-source`,
          },
        },
      },
      // 6. Poster 节点
      // {
      //   id: ids.poster,
      //   type: "poster",
      //   dragHandle: ".dragHandle",
      //   position: positions[ids.poster] || { x: 0, y: 0 },
      //   data: {
      //     items: data.poster?.items ?? [],
      //     handleIds: {
      //       target: `${ids.poster}-target`,
      //     },
      //   },
      // },
    ];

    return allNodes;
  });

  const edges = computed(() => {
    const ids = NODE_IDS;

    const allEdges = [
      // Script -> Assets
      {
        id: `${ids.script}-${ids.assets}`,
        source: ids.script,
        target: ids.assets,
        sourceHandle: `${ids.script}-assets`,
        targetHandle: `${ids.assets}-target`,
        animated: false,
        style: edgeStyle,
      },
      // Script -> StoryboardTable
      {
        id: `${ids.script}-${ids.scriptPlan}`,
        source: ids.script,
        target: ids.scriptPlan,
        sourceHandle: `${ids.script}-source`,
        targetHandle: `${ids.scriptPlan}-target`,
        animated: false,
        style: edgeStyle,
      },
      // ScriptPlan -> StoryboardTable
      {
        id: `${ids.scriptPlan}-${ids.storyboardTable}`,
        source: ids.scriptPlan,
        target: ids.storyboardTable,
        sourceHandle: `${ids.scriptPlan}-source`,
        targetHandle: `${ids.storyboardTable}-target`,
        animated: false,
        style: edgeStyle,
      },
      // StoryboardTable -> Storyboard
      {
        id: `${ids.storyboardTable}-${ids.storyboard}`,
        source: ids.storyboardTable,
        target: ids.storyboard,
        sourceHandle: `${ids.storyboardTable}-source`,
        targetHandle: `${ids.storyboard}-target`,
        animated: false,
        style: edgeStyle,
      },
      // Storyboard -> Workbench
      {
        id: `${ids.storyboard}-${ids.workbench}`,
        source: ids.storyboard,
        target: ids.workbench,
        sourceHandle: `${ids.storyboard}-source`,
        targetHandle: `${ids.workbench}-target`,
        animated: false,
        style: edgeStyle,
      },
      // Workbench -> Poster
      {
        id: `${ids.workbench}-${ids.poster}`,
        source: ids.workbench,
        target: ids.poster,
        sourceHandle: `${ids.workbench}-source`,
        targetHandle: `${ids.poster}-target`,
        animated: false,
        style: edgeStyle,
      },
    ];

    return allEdges;
  });

  return { nodes, edges };
}
