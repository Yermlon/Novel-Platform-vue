<template>
    <div class="AT-layout">
        <el-header class="AT-header">
            <div class="logo">
                <span class="logo-text">创作中心</span>
            </div>

            <div class="penName">
                {{ userStore?.penName || '未设置笔名' }}
            </div>

            <div class="buttons">
                <el-button type="primary" size="small" @click="goToBookStore">
                    返回书城
                </el-button>
                <el-button type="danger" size="small" @click="logout">
                    退出登录
                </el-button>
            </div>
        </el-header>

        <div class="AT-body">
            <el-aside width="200px" class="AT-sidebar">
                <el-menu
                   :default-active="$route.fullPath"
                   class="sidebar-menu"
                   background-color="#fff"
                   text-color="#333"
                   active-text-color="#409eff"
                   router
                >
                   <!-- <el-menu-item index="/author/overview">
                    <span>作品总览</span>
                   </el-menu-item> -->
                   <el-menu-item index="/author/novels">
                    <span>作品管理</span>
                   </el-menu-item>
                   <el-menu-item index="/author/chapters">
                    <span>章节创作</span>
                   </el-menu-item>
                   <el-menu-item index="/author/statistics">
                    <span>数据中心</span>
                   </el-menu-item>
                   <el-menu-item index="/author/interact">
                    <span>读者互动</span>
                   </el-menu-item>
                </el-menu>
            </el-aside>

            <el-main class="AT-content">
                <router-view />
            </el-main>
        </div>
    </div>
</template>

<script setup>
import { useRoute, useRouter } from 'vue-router';
import { UserStore } from '@/status/user';
import { storeToRefs } from 'pinia';
import { onMounted } from 'vue';

const userStore = UserStore();
const { penName } = storeToRefs(userStore);
const router = useRouter();
const route = useRoute();

onMounted(() => {
    userStore.getCurrentUser();
});

const goToBookStore = () => {
    router.push('/bookStore');
};

const logout = () => {
    userStore.logout();
    router.push('/login');
};

</script>

<style scoped>
.AT-layout {
    /* min-height: 100vh; */
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    border: 1px solid #ccc;
    box-sizing: border-box;
}

.AT-header {
    height: 60px;
    display: flex;
    align-items: center;
    padding: 0 20px;
    border-bottom: 1px solid #ccc;
    flex-shrink: 0;
}

.logo {
    width: 100px;
    height: 40px;
    border: 1px solid #000;
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.penName {
    flex: 1;
    text-align: center;
    font-size: 16px;
}

.buttons {
    display: flex;
    gap: 10px;
}

.AT-body {
    display: flex;
    flex: 1;
    overflow: hidden;
}

.AT-sidebar {
    width: 120px;
    border-right: 1px solid #ccc;
}

.sidebar-menu .el-menu-item {
    height: 50px;
    line-height: 50px;
    padding-left: 10px !important;
}

.sidebar-menu .el-menu-item.is-active {
    background-color: #f5f7fa;
}

.AT-content {
    flex: 1;
    padding: 20px;
    padding-bottom: 30px;
    background-color: #fff;
    overflow-y: auto;
    box-sizing: border-box;
    
}

:deep(.el-aside) {
    padding: 0 !important;
}
:deep(.el-main) {
    padding: 0 !important;
}

</style>