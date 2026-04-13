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

        /** URL 解析缓存: filePath -> 后端返回的完整 URL，避免重复请求 */
        const urlMap = ref<Record<string, string>>({});

        /**
         * ========== TODO: 后端接口 ==========
         * 批量通过文件路径获取当前可用的完整 URL
         *
         * 请求示例:
         *   POST /file/resolveUrls
         *   Body: { paths: ["/uploads/images/xxx.png", "/uploads/images/yyy.png"] }
         *
         * 期望响应:
         *   { data: { "/uploads/images/xxx.png": "http://localhost:12345/uploads/images/xxx.png", ... } }
         *
         * 你需要在后端实现这个接口，根据文件路径返回当前可访问的完整 URL。
         * =====================================
         */
        async function resolveUrls(paths: string[]): Promise<Record<string, string>> {
            if (!paths.length) return {};
            // 过滤掉已经解析过的、空路径、以及特殊协议
            const needResolve = paths.filter((p) => p && !urlMap.value[p] && !p.startsWith("data:") && !p.startsWith("blob:"));
            if (needResolve.length) {
                try {
                    const { data } = await axios.post("/production/workbench/getFileUrl", { paths: needResolve });
                    // axios 拦截器已返回 response.data，后端可能再包一层 { data: { ... } }
                    const rawData = data.data;

                    // 兼容多种后端响应格式
                    let resolved: Record<string, string> = {};
                    if (rawData && typeof rawData === "object" && !Array.isArray(rawData)) {
                        // 格式: { [path]: fullUrl }
                        resolved = rawData;
                    } else if (Array.isArray(rawData)) {
                        // 格式: [{ path: "...", url: "..." }, ...]
                        rawData.forEach((item: any) => {
                            if (item.path && item.url) resolved[item.path] = item.url;
                        });
                    }

                    // 替换整个对象以触发 Vue 响应式更新
                    urlMap.value = { ...urlMap.value, ...resolved };
                } catch (e) {
                    console.warn("[imageListCache] resolveUrls 请求失败，降级使用路径", e);
                }
            }
            // 返回所有请求路径的映射（含之前缓存的）
            const result: Record<string, string> = {};
            paths.forEach((p) => {
                result[p] = urlMap.value[p] || p;
            });
            return result;
        }

        /** 将单个路径解析为完整 URL（优先走内存缓存） */
        function resolveUrlSync(path: string | undefined): string {
            if (!path) return "";
            if (path.startsWith("data:") || path.startsWith("blob:")) return path;
            // 直接命中
            if (urlMap.value[path]) return urlMap.value[path];
            // 如果传入的是完整 URL，尝试用提取后的路径匹配
            const extracted = extractPath(path);
            if (extracted !== path && urlMap.value[extracted]) return urlMap.value[extracted];
            return path;
        }

        /** 将缓存项还原为带完整 URL 的 UploadItem[]（同步版，需先调用 resolveUrls） */
        function toFullItems(items: CachedUploadItem[]): UploadItem[] {
            return items.map((item) => ({
                ...item,
                src: resolveUrlSync(item.src),
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
            // 收集所有需要解析的路径
            const paths = cached.map((item) => item.src).filter(Boolean) as string[];
            await resolveUrls(paths);
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
            // 将带完整 URL 的 src 写入 urlMap（path → fullUrl）
            let urlMapDirty = false;
            imageList.forEach((item) => {
                if (!item.src) return;
                const path = extractPath(item.src);
                // src 本身是完整 URL 且和提取的路径不同，说明可以建立映射
                if (path !== item.src && !urlMap.value[path]) {
                    urlMap.value[path] = item.src;
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
         * 清空指定 project / script 下的所有轨道缓存
         */
        function clearScriptCache(projectId: CacheKey, scriptId: CacheKey): void {
            if (cacheData.value[projectId]) {
                delete cacheData.value[projectId][scriptId];
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
            const allPaths: string[] = [];
            Object.values(scriptCache).forEach((items) => {
                items.forEach((item) => {
                    if (item.src && !item.src.startsWith("data:") && !item.src.startsWith("blob:")) {
                        allPaths.push(item.src);
                    }
                });
            });
            // 去重
            const uniquePaths = [...new Set(allPaths)];
            await resolveUrls(uniquePaths);
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
            clearScriptCache,
            initCacheFromTrackList,
            forceInitCacheFromTrackList,
            resolveUrls,
            resolveUrlSync,
            warmUpUrls,
            clearUrlMap,
        };
    },
    { persist: { pick: ["cacheData"] } },
);
