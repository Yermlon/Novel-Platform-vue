// src/status/user.js 完整修复版
import { defineStore } from "pinia";
import request from "@/utils/request"; 
import { ElMessage } from "element-plus";

export const UserStore = defineStore('user',{
    state: () =>({
        isLogin: false,
        userInfo: null,
        _initPromise: null // 初始化锁
    }),
    getters: {
        role: (state) => state.userInfo?.role || 'READER',
        avatar: (state) => state.userInfo?.avatarUrl || '',
        penName: (state) => state.userInfo?.penName || '未设置笔名',
    },
    actions: {
        // ✅ 修复1：initUserInfo 不再强制重置isLogin，只做状态恢复
        async initUserInfo() {
            // 锁逻辑保留，防止重复执行
            if (this._initPromise) return this._initPromise;

            this._initPromise = (async () => {
                // 🔴 移除：this.isLogin = false; this.userInfo = null; 这两行！
                // 🔴 移除：delete request.defaults.headers.common['Authorization'];

                // 步骤1：从localStorage恢复状态（优先用本地缓存，避免不必要的请求）
                const token = localStorage.getItem('token');
                const localUserInfo = localStorage.getItem('userInfo');
                
                // ✅ 有本地缓存，先恢复状态，再异步校验
                if (token && localUserInfo) {
                    try {
                        this.userInfo = JSON.parse(localUserInfo);
                        this.isLogin = true; // 先恢复登录状态，避免页面闪烁
                        request.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                    } catch (e) {
                        console.error("本地用户信息解析失败", e);
                        this.logout(); // 解析失败直接登出
                        return;
                    }
                }

                // 步骤2：异步校验token有效性（不阻塞页面渲染）
                if (token) {
                    try {
                        await this.getCurrentUser(); // 校验成功会更新userInfo，失败会自动登出
                    } catch (err) {
                        console.error("token校验失败", err);
                        this.logout();
                    }
                }

                this._initPromise = null;
            })();

            return this._initPromise;
        },

        // ✅ 修复2：getCurrentUser 只做校验，不做状态重置
        async getCurrentUser() {
            try{
                const response = await request.get('/user/current'); 
                const res = response.data;

                if (res.code === '0') {
                    // ✅ 只更新userInfo，不重复设置isLogin（避免触发不必要的watch）
                    this.userInfo = res.data;
                    // 同步本地缓存
                    localStorage.setItem('userInfo', JSON.stringify(res.data));
                    // 确保isLogin为true（兼容极端情况）
                    if (!this.isLogin) this.isLogin = true;
                }else{
                    ElMessage.error(res.msg || '获取用户信息失败');
                    // 接口返回失败，才登出
                    this.logout();
                }           
            }catch(error){
                console.error("获取用户信息失败", error);
                // 401直接登出
                if (error.response?.status === 401) {
                    this.logout();
                    ElMessage.error('登录已过期，请重新登录');
                }
            }
        },

        // ✅ 登录成功逻辑不变
        loginSuccess(userInfo, token) { 
            this.isLogin = true;
            this.userInfo = userInfo;
            localStorage.setItem('userInfo', JSON.stringify(userInfo));
            localStorage.setItem('token', token);
            request.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        },

        // ✅ 登出逻辑不变（只在登出时清空状态）
        async logout(){
            try {
                const response = await request.post('/user/logout');
                const res = response.data;
                if (res.code === '0') {
                    ElMessage.success('退出登录成功');
                } else {
                    ElMessage.error(res.msg || '退出登录失败');
                }
            } catch (error) {
                console.error('调用后端登出接口失败', error);
                ElMessage.warning('退出登录请求异常，已强制退出本地状态');
            } finally {
                // 只有登出时才清空状态
                this.isLogin = false;
                this.userInfo = null;
                localStorage.removeItem('userInfo');
                localStorage.removeItem('token');
                delete request.defaults.headers.common['Authorization'];
                this._initPromise = null;
            }
        }
    },
});