import axios from "@/utils/axios";
import type { ApiEnvelope, SourceFoundationOverview } from "@/types/sourceFoundation";

async function request<T>(config: Parameters<typeof axios.request>[0]): Promise<T> {
  const response = (await axios.request(config)) as ApiEnvelope<T>;
  return response.data;
}

export const sourceFoundationApi = {
  overview: (projectId: number) =>
    request<SourceFoundationOverview>({ method: "GET", url: "/sourceFoundation/overview", params: { projectId } }),
  chapters: (params: Record<string, unknown>) =>
    request({ method: "GET", url: "/sourceFoundation/chapters", params }),
  importChapters: (data: Record<string, unknown>) =>
    request({ method: "POST", url: "/sourceFoundation/chapters/import", data }),
  batches: (params: Record<string, unknown>) =>
    request({ method: "GET", url: "/sourceFoundation/batches", params }),
  batch: (id: string, projectId: number) =>
    request({ method: "GET", url: `/sourceFoundation/batches/${id}`, params: { projectId } }),
  batchCommand: (id: string, command: string, projectId: number) =>
    request({ method: "POST", url: `/sourceFoundation/batches/${id}/${command}`, data: { projectId } }),
};
