import type { Ref } from "vue";
import { computed } from "vue";

// ==================== 类型定义 ====================
interface Block {
  id: string;
  content: string;
  connectTo: string | null;
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
  blocks: Block[];
}

interface AssetsData {
  id: string;
  position: { x: number; y: number };
  characters: Character[];
  scenes: Scene[];
}

interface StoryboardTableData {
  id: string;
  position: { x: number; y: number };
  connectTo: string | null;
  items: StoryboardItem[];
}

interface StoryboardData {
  id: string;
  position: { x: number; y: number };
  connectTo?: string | null;
  frames: any[];
}

interface WorkbenchData {
  id: string;
  position: { x: number; y: number };
  name: string;
  status: string;
  duration: string;
  resolution: string;
  fps: string;
  cover?: string;
  gradient?: string;
}

interface PosterItem {
  id: number;
  name: string;
  size: string;
  image?: string;
  gradient?: string;
  selected?: boolean;
}

interface PosterData {
  id: string;
  position: { x: number; y: number };
  workbenchId: string;
  posters: PosterItem[];
}

export interface FlowData {
  script: ScriptData;
  assets: AssetsData;
  storyboardTables: StoryboardTableData[];
  storyboards: StoryboardData[];
  workbenches?: WorkbenchData[];
  posters?: PosterData[];
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
          blocks: data.script.blocks.map((b) => `${data.script.id}-${b.id}`),
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

    // 3. StoryboardTable 节点
    data.storyboardTables.forEach((st) => {
      result.push({
        id: st.id,
        type: "storyboardTable",
        position: st.position,
        data: {
          items: st.items,
          handleIds: {
            target: `${st.id}-target`,
            source: `${st.id}-source`,
          },
        },
      });
    });

    // 4. Storyboard 节点
    data.storyboards.forEach((sb) => {
      result.push({
        id: sb.id,
        type: "storyboard",
        position: sb.position,
        data: {
          frames: sb.frames,
          handleIds: {
            target: `${sb.id}-target`,
            source: `${sb.id}-source`,
          },
        },
      });
    });

    // 5. Workbench 节点
    if (data.workbenches) {
      data.workbenches.forEach((wb) => {
        result.push({
          id: wb.id,
          type: "workbench",
          position: wb.position,
          data: {
            name: wb.name,
            status: wb.status,
            duration: wb.duration,
            resolution: wb.resolution,
            fps: wb.fps,
            cover: wb.cover,
            gradient: wb.gradient,
            handleIds: {
              target: `${wb.id}-target`,
            },
          },
        });
      });
    }

    // 6. Poster 节点
    if (data.posters) {
      data.posters.forEach((p) => {
        result.push({
          id: p.id,
          type: "poster",
          position: p.position,
          data: {
            workbenchId: p.workbenchId,
            posters: p.posters,
          },
        });
      });
    }

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

    // 2. Script blocks -> StoryboardTables 连线
    data.script.blocks.forEach((block) => {
      if (block.connectTo) {
        result.push({
          id: `${data.script.id}-${block.id}-${block.connectTo}`,
          source: data.script.id,
          target: block.connectTo,
          sourceHandle: `${data.script.id}-${block.id}`,
          targetHandle: `${block.connectTo}-target`,
          animated: true,
          style: edgeStyle,
        });
      }
    });

    // 3. StoryboardTables -> Storyboards 连线
    data.storyboardTables.forEach((st) => {
      if (st.connectTo) {
        result.push({
          id: `${st.id}-${st.connectTo}`,
          source: st.id,
          target: st.connectTo,
          sourceHandle: `${st.id}-source`,
          targetHandle: `${st.connectTo}-target`,
          animated: true,
          style: edgeStyle,
        });
      }
    });

    // 4. Storyboards -> Workbenches 连线
    data.storyboards.forEach((sb) => {
      if (sb.connectTo) {
        result.push({
          id: `${sb.id}-${sb.connectTo}`,
          source: sb.id,
          target: sb.connectTo,
          sourceHandle: `${sb.id}-source`,
          targetHandle: `${sb.connectTo}-target`,
          animated: true,
          style: edgeStyle,
        });
      }
    });

    return result;
  });

  return { nodes, edges };
}
