import { createRouter, createWebHashHistory } from "vue-router";
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: "/:catchAll(.*)",
      name: "404",
      meta: {
        title: "404",
      },
      component: () => import("@/pages/error/404.vue"),
    },
    {
      path: "/",
      redirect: "/workbench",
    },
    {
      path: "/workbench",
      component: () => import("@/pages/workbench/index.vue"),
      redirect: "/project",
      children: [
        {
          path: "/project",
          component: () => import("@/views/project/index.vue"),
        },
        {
          path: "/projectDetail",
          component: () => import("@/views/projectDetail/index.vue"),
        },
        {
          path: "/setting",
          component: () => import("@/views/setting/index.vue"),
        },
        {
          path: "/taskList",
          component: () => import("@/views/taskList/index.vue"),
        },
      ],
    },
    {
      path: "/login",
      component: () => import("@/pages/login/index.vue"),
    },
  ],
});
router.beforeEach((to, from, next) => {
  if (to.path === "/login") {
    next();
  } else {
    if (localStorage.getItem("token")) {
      next();
    } else {
      next("/login");
    }
  }
});
export default router;
