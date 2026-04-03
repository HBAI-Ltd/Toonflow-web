// ===== 节点数据类型 =====
export interface UploadNodeData {
  image: string;
}

export interface GeneratedNodeData {
  generatedImage?: string;
  references: { image: string }[];
  prompt: string;
  model?: string;
  ratio?: string;
  quality?: string;
  steps: number;
}

export interface NodeUploadData {
  type: "upload";
  id: string;
  position: { x: number; y: number };
  data: UploadNodeData;
}

export interface NodeGeneratedData {
  type: "generated";
  id: string;
  position: { x: number; y: number };
  data: GeneratedNodeData;
}

export type NodeType = NodeUploadData | NodeGeneratedData;

// ===== 精简后用于传输的类型 =====
export interface CleanNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: UploadNodeData | Omit<GeneratedNodeData, "steps">;
}

export interface CleanEdge {
  id: string;
  source: string;
  target: string;
}

// ===== 默认边样式 =====
export const DEFAULT_EDGE_OPTIONS = {
  type: "removeLine" as const,
  animated: true,
  style: { stroke: "#00000" },
};

// ===== 默认生成节点数据 =====
export function createGeneratedData(image = "", prompt = ""): GeneratedNodeData {
  return {
    generatedImage: image,
    references: [],
    prompt,
    model: "",
    ratio: "",
    quality: "",
    steps: 49,
  };
}

// ===== 数据精简工具函数 =====
export function cleanNodes(nodes: NodeType[]): CleanNode[] {
  return nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data:
      n.type === "upload"
        ? { image: n.data.image }
        : {
            generatedImage: n.data.generatedImage,
            references: n.data.references?.map((r) => ({ image: r.image })) ?? [],
            prompt: n.data.prompt,
            model: n.data.model,
            ratio: n.data.ratio,
            quality: n.data.quality,
          },
  }));
}

export function cleanEdges(edges: { id: string; source: string; target: string }[]): CleanEdge[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
  }));
}
