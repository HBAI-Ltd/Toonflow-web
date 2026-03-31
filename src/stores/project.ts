interface Project {
  id: string;
  name: string;
  intro: string;
  type: string;
  artStyle: string | null;
  videoRatio: string | null;
  createTime: number;
  updatedAt: number;
  imageModel: string;
  videoModel: string;
  projectType: string;
  imageQuality: "1K" | "2K" | "4K" | "";
  mode: string;
}

export default defineStore(
  "project",
  () => {
    const allProject = ref<Project[]>([]);

    const project = ref<Project | null>(null);

    return { allProject, project };
  },
  { persist: true },
);
