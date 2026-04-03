import dagre from "@dagrejs/dagre";
import { Position, useVueFlow, type Node, type Edge } from "@vue-flow/core";

/**
 * 用于对流程图节点进行自动布局的组合式函数。
 * 通过 dagre 库计算节点和边的布局位置。
 */
export function useLayout(flowId?: string) {
  const { findNode, fitView } = useVueFlow(flowId ? { id: flowId } : undefined);

  const graph = ref(new dagre.graphlib.Graph());
  const previousDirection = ref("LR"); // 上一次布局方向

  function layout(nodes: Node<any, any, string>[], edges: Edge[], direction: "LR" | "TB", nodesep: number = 250, ranksep?: number) {
    // 每次都新建 Graph，避免遗留节点和边影响布局
    const dagreGraph = new dagre.graphlib.Graph();
    graph.value = dagreGraph;

    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({
      rankdir: direction,
      nodesep,
      ranksep: ranksep ?? nodesep,
    });
    previousDirection.value = direction;

    const isHorizontal = direction === "LR";

    // 设置节点尺寸
    for (const node of nodes) {
      const graphNode = findNode(node.id);
      dagreGraph.setNode(node.id, {
        width: graphNode?.dimensions.width || 150,
        height: graphNode?.dimensions.height || 50,
      });
    }

    // 设置边
    for (const edge of edges) {
      dagreGraph.setEdge(edge.source, edge.target);
    }

    // 执行布局计算
    dagre.layout(dagreGraph);
    // 返回带有新位置的节点
    return nodes.map((node) => {
      const pos = dagreGraph.node(node.id);
      return {
        ...node,
        targetPosition: isHorizontal ? Position.Left : Position.Top,
        sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
        position: { x: pos.x, y: pos.y },
      };
    });
  }

  return { graph, layout, previousDirection };
}
