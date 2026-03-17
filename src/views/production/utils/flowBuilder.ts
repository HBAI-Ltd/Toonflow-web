import type { Ref } from "vue";
import { computed } from "vue";

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
  act?: string;
  prompt?: string;
}

interface ScriptData {
  id: string;
  position: { x: number; y: number };
  connectTo: string | null;
  blocks: Block[];
}

interface AssetsData {
  id: string;
  position: { x: number; y: number };
  characters: Character[];
  scenes: Scene[];
}

// 分镜表分组
interface StoryboardTableGroup {
  id: string;
  name: string;
  blockId: string;
  items: StoryboardItem[];
}

// 合并后的分镜表数据（单个 node）
interface StoryboardTableData {
  id: string;
  position: { x: number; y: number };
  connectTo: string | null;
  groups: StoryboardTableGroup[];
}

// 分镜分组
interface StoryboardGroup {
  id: string;
  name: string;
  frames: any[];
}

// 合并后的分镜数据（单个 node）
interface StoryboardData {
  id: string;
  position: { x: number; y: number };
  connectTo: string | null;
  groups: StoryboardGroup[];
}

interface WorkbenchData {
  id: string;
  position: { x: number; y: number };
  connectTo?: string | null;
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

interface PosterData {
  id: string;
  position: { x: number; y: number };
  items: PosterItem[];
}

export interface FlowData {
  script: ScriptData;
  assets: AssetsData;
  storyboardTable: StoryboardTableData;
  storyboard: StoryboardData;
  workbench: WorkbenchData;
  poster: PosterData;
}

// 边样式
const edgeStyle = {
  stroke: "#00000",
  strokeWidth: 4,
};

// ==================== 构建函数 ====================
export function useFlowBuilder(flowData: Ref<FlowData>) {
  const nodes = computed(() => {
    const result: any[] = [];
    const data = flowData.value;

    // 1. Script 节点
    result.push({
      id: data.script.id,
      type: "script",
      position: data.script.position,
      data: {
        blocks: data.script.blocks,
        handleIds: {
          assets: `${data.script.id}-assets`,
          source: `${data.script.id}-source`,
        },
      },
    });

    // 2. Assets 节点
    result.push({
      id: data.assets.id,
      type: "assets",
      position: data.assets.position,
      data: {
        characters: data.assets.characters,
        scenes: data.assets.scenes,
        handleIds: {
          target: `${data.assets.id}-target`,
        },
      },
    });

    // 3. StoryboardTable 节点（单个合并节点）
    result.push({
      id: data.storyboardTable.id,
      type: "storyboardTable",
      position: data.storyboardTable.position,
      data: {
        groups: data.storyboardTable.groups,
        handleIds: {
          target: `${data.storyboardTable.id}-target`,
          source: `${data.storyboardTable.id}-source`,
        },
      },
    });

    // 4. Storyboard 节点（单个合并节点）
    result.push({
      id: data.storyboard.id,
      type: "storyboard",
      position: data.storyboard.position,
      data: {
        groups: data.storyboard.groups,
        handleIds: {
          target: `${data.storyboard.id}-target`,
          source: `${data.storyboard.id}-source`,
        },
      },
    });

    // 5. Workbench 节点（单个）
    result.push({
      id: data.workbench.id,
      type: "workbench",
      position: data.workbench.position,
      data: {
        name: data.workbench.name,
        duration: data.workbench.duration,
        resolution: data.workbench.resolution,
        fps: data.workbench.fps,
        cover: data.workbench.cover,
        gradient: data.workbench.gradient,
        handleIds: {
          target: `${data.workbench.id}-target`,
          source: `${data.workbench.id}-source`,
        },
      },
    });

    // 6. Poster 节点（单个）
    result.push({
      id: data.poster.id,
      type: "poster",
      position: data.poster.position,
      data: {
        items: data.poster.items,
        handleIds: {
          target: `${data.poster.id}-target`,
        },
      },
    });

    return result;
  });

  const edges = computed(() => {
    const result: any[] = [];
    const data = flowData.value;

    // 1. Script -> Assets 连线
    result.push({
      id: `${data.script.id}-${data.assets.id}`,
      source: data.script.id,
      target: data.assets.id,
      sourceHandle: `${data.script.id}-assets`,
      targetHandle: `${data.assets.id}-target`,
      animated: true,
      style: edgeStyle,
    });

    // 2. Script -> StoryboardTable 连线（单条连线）
    if (data.script.connectTo) {
      result.push({
        id: `${data.script.id}-${data.script.connectTo}`,
        source: data.script.id,
        target: data.script.connectTo,
        sourceHandle: `${data.script.id}-source`,
        targetHandle: `${data.script.connectTo}-target`,
        animated: true,
        style: edgeStyle,
      });
    }

    // 3. StoryboardTable -> Storyboard 连线（单条连线）
    if (data.storyboardTable.connectTo) {
      result.push({
        id: `${data.storyboardTable.id}-${data.storyboardTable.connectTo}`,
        source: data.storyboardTable.id,
        target: data.storyboardTable.connectTo,
        sourceHandle: `${data.storyboardTable.id}-source`,
        targetHandle: `${data.storyboardTable.connectTo}-target`,
        animated: true,
        style: edgeStyle,
      });
    }

    // 4. Storyboard -> Workbench 连线（单条连线）
    if (data.storyboard.connectTo) {
      result.push({
        id: `${data.storyboard.id}-${data.storyboard.connectTo}`,
        source: data.storyboard.id,
        target: data.storyboard.connectTo,
        sourceHandle: `${data.storyboard.id}-source`,
        targetHandle: `${data.storyboard.connectTo}-target`,
        animated: true,
        style: edgeStyle,
      });
    }

    // 5. Workbench -> Poster 连线（单条连线）
    if (data.workbench.connectTo) {
      result.push({
        id: `${data.workbench.id}-${data.workbench.connectTo}`,
        source: data.workbench.id,
        target: data.workbench.connectTo,
        sourceHandle: `${data.workbench.id}-source`,
        targetHandle: `${data.workbench.connectTo}-target`,
        animated: true,
        style: edgeStyle,
      });
    }

    return result;
  });

  return { nodes, edges };
}
