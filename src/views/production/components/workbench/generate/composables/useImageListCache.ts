import "@/views/production/components/workbench/type/type";

/**
 * 图片列表本地缓存（localStorage 持久化）
 * 结构: { [projectId]: { [scriptId]: { [trackId]: UploadItem[] } } }
 *
 * 用于在轨道切换 / 页面刷新后保留用户对 imageList 的本地编辑，
 * 避免丢失未保存到后端的修改。
 */

type CacheKey = string | number;
type ImageListCacheStore = Record<CacheKey, Record<CacheKey, Record<CacheKey, UploadItem[]>>>;

const STORAGE_KEY = "imageListCache";

/** 从 localStorage 读取整个缓存 */
function loadFromStorage(): ImageListCacheStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** 将整个缓存写入 localStorage */
function saveToStorage(store: ImageListCacheStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // localStorage 满了或被禁用时静默失败
  }
}

// 启动时从 localStorage 恢复
const cacheStore = reactive<ImageListCacheStore>(loadFromStorage());

export function useImageListCache() {
  /**
   * 获取指定 project / script / track 的缓存图片列表
   * @returns 缓存的 UploadItem[] 或 undefined（无缓存）
   */
  function getCache(projectId: CacheKey, scriptId: CacheKey, trackId: CacheKey): UploadItem[] | undefined {
    return cacheStore[projectId]?.[scriptId]?.[trackId];
  }

  /**
   * 设置缓存（深拷贝，防止引用污染）并持久化到 localStorage
   */
  function setCache(projectId: CacheKey, scriptId: CacheKey, trackId: CacheKey, imageList: UploadItem[]): void {
    if (!cacheStore[projectId]) {
      cacheStore[projectId] = {};
    }
    if (!cacheStore[projectId][scriptId]) {
      cacheStore[projectId][scriptId] = {};
    }
    // 深拷贝存储，避免外部修改影响缓存
    cacheStore[projectId][scriptId][trackId] = JSON.parse(JSON.stringify(imageList));
    saveToStorage(cacheStore);
  }

  /**
   * 删除指定轨道的缓存
   */
  function removeCache(projectId: CacheKey, scriptId: CacheKey, trackId: CacheKey): void {
    if (cacheStore[projectId]?.[scriptId]) {
      delete cacheStore[projectId][scriptId][trackId];
      saveToStorage(cacheStore);
    }
  }

  /**
   * 清空指定 project / script 下的所有轨道缓存
   */
  function clearScriptCache(projectId: CacheKey, scriptId: CacheKey): void {
    if (cacheStore[projectId]) {
      delete cacheStore[projectId][scriptId];
      saveToStorage(cacheStore);
    }
  }

  /**
   * 从后端返回的 trackList 批量初始化缓存
   * 只有当对应轨道没有缓存时才写入（保留用户本地编辑）
   */
  function initCacheFromTrackList(projectId: CacheKey, scriptId: CacheKey, trackList: TrackItem[]): void {
    trackList.forEach((track) => {
      if (track.id == null) return;
      // 如果已有缓存则保留（用户可能已经做了本地编辑）
      if (getCache(projectId, scriptId, track.id)) return;
      if (!cacheStore[projectId]) cacheStore[projectId] = {};
      if (!cacheStore[projectId][scriptId]) cacheStore[projectId][scriptId] = {};
      cacheStore[projectId][scriptId][track.id] = JSON.parse(JSON.stringify(track.medias));
    });
    saveToStorage(cacheStore);
  }

  /**
   * 从后端返回的 trackList 强制覆盖缓存
   * 用于首次加载或需要完全刷新的场景
   */
  function forceInitCacheFromTrackList(projectId: CacheKey, scriptId: CacheKey, trackList: TrackItem[]): void {
    // 先清空该 script 下所有轨道缓存
    if (cacheStore[projectId]) {
      delete cacheStore[projectId][scriptId];
    }
    if (!cacheStore[projectId]) cacheStore[projectId] = {};
    cacheStore[projectId][scriptId] = {};
    trackList.forEach((track) => {
      if (track.id == null) return;
      cacheStore[projectId][scriptId][track.id] = JSON.parse(JSON.stringify(track.medias));
    });
    saveToStorage(cacheStore);
  }

  return {
    getCache,
    setCache,
    removeCache,
    clearScriptCache,
    initCacheFromTrackList,
    forceInitCacheFromTrackList,
  };
}
