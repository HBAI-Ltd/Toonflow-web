import type { Ref } from "vue";
import { computed } from "vue";

// ==================== 固定节点 ID ====================
const NODE_IDS = {
  script: "script",
  assets: "assets",
  storyboardTable: "storyboardTable",
  storyboard: "storyboard",
  workbench: "workbench",
  poster: "poster",
} as const;

// ==================== 类型定义 ====================
interface Block {
  id: string;
  content: string;
}

interface Character {
  name: string;
  desc: string;
  bgColor: string;
}

interface Scene {
  name: string;
  desc: string;
  bgColor: string;
}

interface StoryboardItem {
  id: number;
  scene: string;
  description: string;
  camera: string;
  duration?: string;
  frameMode?: string;
  mooPurpose?: string;
  luck?: string;
  firstFrameDescribe?: string;
  endFrameDescription?: string;
  linesSoundEffects?: string;
  assets?: string[];
}

interface StoryboardTableGroup {
  name: string;
  items: StoryboardItem[];
}

interface StoryboardFrame {
  id: number;
  itemId: number; // 关联 storyboardTable 同组内的 item.id
  description: string;
  frameType: string;
  image?: string;
  gradient?: string;
}

interface StoryboardGroup {
  frames: StoryboardFrame[];
}

interface WorkbenchData {
  name: string;
  duration: string;
  resolution: string;
  fps: string;
  cover?: string;
  gradient?: string;
}

interface PosterItem {
  id: number;
  image: string;
}

export interface FlowData {
  script: {
    blocks: Block[];
  };
  assets: {
    characters: Character[];
    scenes: Scene[];
  };
  storyboardTable: {
    groups: StoryboardTableGroup[];
  };
  storyboard: {
    groups: StoryboardGroup[];
  };
  workbench: WorkbenchData;
  poster: {
    items: PosterItem[];
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

    return [
      // 1. Script 节点
      {
        id: ids.script,
        type: "script",
        dragHandle: '.dragHandle',
        position: positions[ids.script] || { x: 0, y: 0 },
        data: {
          blocks: data.script.blocks,
          handleIds: {
            assets: `${ids.script}-assets`,
            source: `${ids.script}-source`,
          },
        },
      },
      // 2. Assets 节点
      {
        id: ids.assets,
        type: "assets",
        dragHandle: '.dragHandle',
        position: positions[ids.assets] || { x: 0, y: 0 },
        data: {
          characters: data.assets.characters,
          scenes: data.assets.scenes,
          handleIds: {
            target: `${ids.assets}-target`,
          },
        },
      },
      // 3. StoryboardTable 节点
      {
        id: ids.storyboardTable,
        type: "storyboardTable",
        dragHandle: '.dragHandle',
        position: positions[ids.storyboardTable] || { x: 0, y: 0 },
        data: {
          groups: data.storyboardTable.groups.map((g, i) => ({
            ...g,
            id: `st-${i + 1}`,
          })),
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
        dragHandle: '.dragHandle',
        position: positions[ids.storyboard] || { x: 0, y: 0 },
        data: {
          groups: data.storyboard.groups.map((g, i) => ({
            ...g,
            id: `sb-${i + 1}`,
            name: data.storyboardTable.groups[i]?.name || `第${i + 1}幕`,
          })),
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
        dragHandle: '.dragHandle',
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
      {
        id: ids.poster,
        type: "poster",
        dragHandle: '.dragHandle',
        position: positions[ids.poster] || { x: 0, y: 0 },
        data: {
          items: data.poster.items,
          handleIds: {
            target: `${ids.poster}-target`,
          },
        },
      },
    ];
  });

  const edges = computed(() => {
    const ids = NODE_IDS;

    return [
      // Script -> Assets
      {
        id: `${ids.script}-${ids.assets}`,
        source: ids.script,
        target: ids.assets,
        sourceHandle: `${ids.script}-assets`,
        targetHandle: `${ids.assets}-target`,
        animated: true,
        style: edgeStyle,
      },
      // Script -> StoryboardTable
      {
        id: `${ids.script}-${ids.storyboardTable}`,
        source: ids.script,
        target: ids.storyboardTable,
        sourceHandle: `${ids.script}-source`,
        targetHandle: `${ids.storyboardTable}-target`,
        animated: true,
        style: edgeStyle,
      },
      // StoryboardTable -> Storyboard
      {
        id: `${ids.storyboardTable}-${ids.storyboard}`,
        source: ids.storyboardTable,
        target: ids.storyboard,
        sourceHandle: `${ids.storyboardTable}-source`,
        targetHandle: `${ids.storyboard}-target`,
        animated: true,
        style: edgeStyle,
      },
      // Storyboard -> Workbench
      {
        id: `${ids.storyboard}-${ids.workbench}`,
        source: ids.storyboard,
        target: ids.workbench,
        sourceHandle: `${ids.storyboard}-source`,
        targetHandle: `${ids.workbench}-target`,
        animated: true,
        style: edgeStyle,
      },
      // Workbench -> Poster
      {
        id: `${ids.workbench}-${ids.poster}`,
        source: ids.workbench,
        target: ids.poster,
        sourceHandle: `${ids.workbench}-source`,
        targetHandle: `${ids.poster}-target`,
        animated: true,
        style: edgeStyle,
      },
    ];
  });

  return { nodes, edges };
}
