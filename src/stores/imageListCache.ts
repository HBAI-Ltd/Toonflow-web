import "@/views/production/components/workbench/type/type";
import axios from "@/utils/axios";

/**
 * 图片列表缓存 Pinia Store
 * 结构: { [projectId]: { [scriptId]: { [trackId]: CachedUploadItem[] } } }
 *
 * 缓存中的 src 只存储文件路径（不含 origin/host:port），
 * 显示时通过后端接口批量获取当前可用的完整 URL，
 * 解决后端端口变化导致缓存失效的问题。
 */

type CacheKey = string | number;

/** 缓存中存储的项，src 为纯文件路径（不含 origin） */
type CachedUploadItem = Omit<UploadItem, "src"> & { src?: string };

type ImageListCacheData = Record<CacheKey, Record<CacheKey, Record<CacheKey, CachedUploadItem[]>>>;

/** 用于向后端请求 URL 的标识信息 */
interface ResolveUrlItem {
  id: number | null | undefined;
  sources: string | undefined;
}

/** 生成 urlMap 的复合键: "id:sources" */
function makeUrlKey(id: number | null | undefined, sources: string | undefined): string {
  return `${id ?? ""}:${sources ?? ""}`;
}

/** 从完整 URL 中提取路径部分（去掉 origin） */
function extractPath(url: string | undefined): string {
  if (!url) return "";
  // data: / blob: 等特殊协议直接保留
  if (url.startsWith("data:") || url.startsWith("blob:")) return url;
  try {
    const u = new URL(url);
    return u.pathname + u.search + u.hash;
  } catch {
    // 如果已经是路径或者解析失败，直接返回
    return url;
  }
}

/** 将 UploadItem[] 转为缓存格式（src 只保留路径） */
function toCachedItems(items: (UploadItem | TrackMedia)[]): CachedUploadItem[] {
  return items.map((item) => ({
    ...JSON.parse(JSON.stringify(item)),
    src: extractPath(item.src),
  }));
}

export default defineStore(
  "imageListCache",
  () => {
    const cacheData = ref<ImageListCacheData>({});

    /** URL 解析缓存: "id:sources" -> 后端返回的完整 URL，避免重复请求 */
    const urlMap = ref<Record<string, string>>({});

    /**
     * 批量通过 id + sources 获取当前可用的完整 URL
     *
     * 请求示例:
     *   POST /production/workbench/getFileUrl
     *   Body: { items: [{ id: 1, sources: "storyboard" }, { id: 2, sources: "assets" }] }
     *
     * 期望响应:
     *   { data: [{ id: 1, sources: "storyboard", url: "http://..." }, ...] }
     *   或 { data: { "1:storyboard": "http://...", ... } }
     */
    async function resolveUrls(items: ResolveUrlItem[]): Promise<Record<string, string>> {
      if (!items.length) return {};
      // 过滤掉已经解析过的、id 无效的项
      const needResolve = items.filter((item) => {
        if (item.id == null) return false;
        const key = makeUrlKey(item.id, item.sources);
        return true;
      });
      if (needResolve.length) {
        try {
          const { data } = await axios.post("/production/workbench/getFileUrl", {
            items: needResolve.map((item) => ({ id: item.id, sources: item.sources })),
          });
          // axios 拦截器已返回 response.data，后端可能再包一层 { data: { ... } }
          const rawData = data.data;

          // 兼容多种后端响应格式
          const resolved: Record<string, string> = {};
          if (Array.isArray(rawData)) {
            // 格式: [{ id: 1, sources: "storyboard", url: "http://..." }, ...]
            rawData.forEach((item: any) => {
              if (item.id != null && item.url) {
                const key = makeUrlKey(item.id, item.sources);
                resolved[key] = item.url;
              }
            });
          } else if (rawData && typeof rawData === "object" && !Array.isArray(rawData)) {
            // 格式: { "id:sources": fullUrl } 或 { [compositeKey]: fullUrl }
            Object.entries(rawData).forEach(([key, url]) => {
              resolved[key] = url as string;
            });
          }

          // 替换整个对象以触发 Vue 响应式更新
          urlMap.value = { ...urlMap.value, ...resolved };
        } catch (e) {
          console.warn("[imageListCache] resolveUrls 请求失败，降级使用路径", e);
        }
      }
      // 返回所有请求项的映射（含之前缓存的）
      const result: Record<string, string> = {};
      items.forEach((item) => {
        const key = makeUrlKey(item.id, item.sources);
        result[key] = urlMap.value[key] || item.id?.toString() || "";
      });
      return result;
    }

    /** 通过 id + sources 同步解析为完整 URL（优先走内存缓存） */
    function resolveUrlSync(id: number | null | undefined, sources: string | undefined, fallbackPath?: string): string {
      if (id != null) {
        const key = makeUrlKey(id, sources);
        if (urlMap.value[key]) return urlMap.value[key];
      }
      // 降级返回原始路径
      return fallbackPath || "";
    }

    /** 将缓存项还原为带完整 URL 的 UploadItem[]（同步版，需先调用 resolveUrls） */
    function toFullItems(items: CachedUploadItem[]): UploadItem[] {
      return items.map((item) => ({
        ...item,
        src: resolveUrlSync(item.id, (item as any).sources, item.src),
      })) as UploadItem[];
    }

    /**
     * 获取指定 project / script / track 的缓存图片列表
     * 返回的 src 为已解析的完整 URL（需先调用 resolveUrls 预热）
     */
    function getCache(projectId: CacheKey, scriptId: CacheKey, trackId: CacheKey): UploadItem[] | undefined {
      const cached = cacheData.value[projectId]?.[scriptId]?.[trackId];
      if (!cached) return undefined;
      return toFullItems(cached);
    }

    /**
     * 获取缓存并异步解析 URL（推荐使用）
     * 自动向后端请求路径对应的完整 URL，返回解析后的列表
     */
    async function getCacheWithResolve(projectId: CacheKey, scriptId: CacheKey, trackId: CacheKey): Promise<UploadItem[] | undefined> {
      const cached = cacheData.value[projectId]?.[scriptId]?.[trackId];
      if (!cached) return undefined;
      // 收集所有需要解析的 id + sources
      const resolveItems: ResolveUrlItem[] = cached
        .filter((item) => item.id != null)
        .map((item) => ({ id: item.id, sources: (item as any).sources }));
      await resolveUrls(resolveItems);
      return toFullItems(cached);
    }

    /**
     * 获取原始缓存数据（src 为路径，不解析 URL）
     */
    function getRawCache(projectId: CacheKey, scriptId: CacheKey, trackId: CacheKey): CachedUploadItem[] | undefined {
      return cacheData.value[projectId]?.[scriptId]?.[trackId];
    }

    /**
     * 设置缓存（自动提取 src 路径部分）
     * 同时将完整 URL 写入 urlMap，避免新增图片后裂图
     */
    function setCache(projectId: CacheKey, scriptId: CacheKey, trackId: CacheKey, imageList: (UploadItem | TrackMedia)[]): void {
      if (!cacheData.value[projectId]) {
        cacheData.value[projectId] = {};
      }
      if (!cacheData.value[projectId][scriptId]) {
        cacheData.value[projectId][scriptId] = {};
      }
      // 将带完整 URL 的 src 通过 id:sources 写入 urlMap
      let urlMapDirty = false;
      imageList.forEach((item) => {
        if (!item.src || item.id == null) return;
        const key = makeUrlKey(item.id, (item as any).sources);
        if (!urlMap.value[key]) {
          urlMap.value[key] = item.src;
          urlMapDirty = true;
        }
      });
      if (urlMapDirty) {
        urlMap.value = { ...urlMap.value };
      }
      cacheData.value[projectId][scriptId][trackId] = toCachedItems(imageList);
    }

    /**
     * 删除指定轨道的缓存
     */
    function removeCache(projectId: CacheKey, scriptId: CacheKey, trackId: CacheKey): void {
      if (cacheData.value[projectId]?.[scriptId]) {
        delete cacheData.value[projectId][scriptId][trackId];
      }
    }

    /**
     * 在指定 project / script 下所有轨道中，删除匹配指定图片 id 的图片项
     * @param projectId 项目 ID
     * @param scriptId  脚本 ID
     * @param imageId   要删除的图片 id
     */
    function removeImageById(projectId: CacheKey, scriptId: CacheKey, imageId: number): void {
      const scriptCache = cacheData.value[projectId]?.[scriptId];
      if (!scriptCache) return;
      Object.keys(scriptCache).forEach((trackId) => {
        scriptCache[trackId] = scriptCache[trackId].filter((item) => item.id !== imageId);
      });
    }

    /**
     * 清空指定 project / script 下的所有轨道缓存
     */
    function clearScriptCache(projectId: CacheKey, scriptId: CacheKey): void {
      if (cacheData.value[projectId]) {
        delete cacheData.value[projectId][scriptId];
      }
    }
    function clearProjectCache(projectId: CacheKey): void {
      if (cacheData.value && cacheData.value?.[projectId]) {
        delete cacheData.value[projectId];
      }
    }
    /**
     * 从后端返回的 trackList 批量初始化缓存
     * 只有当对应轨道没有缓存时才写入（保留用户本地编辑）
     */
    function initCacheFromTrackList(projectId: CacheKey, scriptId: CacheKey, trackList: TrackItem[]): void {
      trackList.forEach((track) => {
        if (track.id == null) return;
        if (cacheData.value[projectId]?.[scriptId]?.[track.id]) return;
        if (!cacheData.value[projectId]) cacheData.value[projectId] = {};
        if (!cacheData.value[projectId][scriptId]) cacheData.value[projectId][scriptId] = {};
        cacheData.value[projectId][scriptId][track.id] = toCachedItems(track.medias);
      });
    }

    /**
     * 从后端返回的 trackList 强制覆盖缓存
     */
    function forceInitCacheFromTrackList(projectId: CacheKey, scriptId: CacheKey, trackList: TrackItem[]): void {
      if (cacheData.value[projectId]) {
        delete cacheData.value[projectId][scriptId];
      }
      if (!cacheData.value[projectId]) cacheData.value[projectId] = {};
      cacheData.value[projectId][scriptId] = {};
      trackList.forEach((track) => {
        if (track.id == null) return;
        cacheData.value[projectId][scriptId][track.id] = toCachedItems(track.medias);
      });
    }

    /**
     * 批量预热：收集指定 script 下所有轨道的文件路径，一次性向后端请求 URL
     * 建议在 getGenerateData 拿到数据后调用一次
     */
    async function warmUpUrls(projectId: CacheKey, scriptId: CacheKey): Promise<void> {
      const scriptCache = cacheData.value[projectId]?.[scriptId];
      if (!scriptCache) return;
      const allItems: ResolveUrlItem[] = [];
      const seen = new Set<string>();
      Object.values(scriptCache).forEach((items) => {
        items.forEach((item) => {
          if (item.id == null) return;
          const key = makeUrlKey(item.id, (item as any).sources);
          if (!seen.has(key)) {
            seen.add(key);
            allItems.push({ id: item.id, sources: (item as any).sources });
          }
        });
      });
      await resolveUrls(allItems);
    }

    /**
     * 清除 URL 解析缓存（当后端地址/端口变更时调用）
     */
    function clearUrlMap(): void {
      urlMap.value = {};
    }

    return {
      cacheData,
      urlMap,
      getCache,
      getCacheWithResolve,
      getRawCache,
      setCache,
      removeCache,
      removeImageById,
      clearScriptCache,
      initCacheFromTrackList,
      forceInitCacheFromTrackList,
      resolveUrls,
      resolveUrlSync,
      warmUpUrls,
      clearUrlMap,
      clearProjectCache,
    };
  },
  { persist: { pick: ["cacheData"] } },
);
