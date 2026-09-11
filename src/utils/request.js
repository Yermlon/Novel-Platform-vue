// src/utils/request.js 完整修复版
import axios from "axios";
import { ElMessage } from "element-plus";
import { UserStore } from "@/status/user";

const request = axios.create({
  baseURL: "/api",
  timeout: 5000,
});

// ✅ 只保留拦截器逻辑，不再设置全局axios默认值
request.interceptors.request.use(
  (config) => {
    // 统一从localStorage读token，确保每次请求都携带最新token
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token.trim()}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

request.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const userStore = UserStore();
      userStore.logout();
      ElMessage.error("登录已过期，请重新登录");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// ✅ 删除：axios.defaults.baseURL = "/api"; 这行冗余代码
export default request;