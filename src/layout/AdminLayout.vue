<template>
  <div class="admin-layout">
    <!-- 顶部导航 -->
    <el-header class="admin-header">
      <!-- 左侧：菜单（居左） -->
      <div class="nav-left">
        <el-menu 
          mode="horizontal" 
          :ellipsis="false" 
          class="custom-tab-menu"
          :default-active="route.path"
          @select="handleMenuSelect"
        >
          <el-menu-item index="/bookStore">返回书城</el-menu-item>
          <el-menu-item index="/admin/dashboard">数据看板</el-menu-item>
          <el-menu-item index="/admin/users">用户管理</el-menu-item>
          <el-menu-item index="/admin/types">分类管理</el-menu-item>
          <el-menu-item index="/admin/review">内容管理</el-menu-item>
          <el-menu-item index="/admin/config">系统配置</el-menu-item>
        </el-menu>
      </div>

      <!-- 中间：标题（真正居中） -->
      <div class="nav-center">
        <span class="logo">小说书城 - 管理后台</span>
      </div>

      <!-- 右侧：管理员信息（核心修改：直接用响应式 uname） -->
      <div class="nav-right">
        <span>管理员：{{ uname || '加载中...' }}</span>
        <el-button text @click="logout">退出登录</el-button>
      </div>
    </el-header>

    <!-- 主内容区 -->
    <el-main class="admin-main">
      <router-view />
    </el-main>
  </div>
</template>

<script setup>
import { UserStore } from '@/status/user';
import { useRouter, useRoute } from 'vue-router';
import { ElMessageBox } from 'element-plus';
import { onMounted, computed } from 'vue';
import { storeToRefs } from 'pinia'; // 新增：和创作中心一样引入

// 初始化状态（和创作中心完全一致）
const userStore = UserStore();
const { userInfo } = storeToRefs(userStore); // 拿到响应式的 userInfo
const uname = computed(() => userInfo.value?.uname); // 计算出 uname
const router = useRouter();
const route = useRoute();

// 退出登录逻辑
const logout = () => {
  ElMessageBox.confirm('确定要退出管理员后台吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    userStore.logout();
    router.push('/login');
  });
};

// 菜单点击跳转
const handleMenuSelect = (path) => {
  router.push(path);
};

// 页面挂载后只调用 getCurrentUser()，不清空数据（和创作中心一样）
onMounted(() => {
  userStore.getCurrentUser();
  console.log("=== 调试信息 ===");
  console.log("userInfo 对象:", userInfo.value);
  console.log("uname 字段:", uname.value);
});
</script>

<style scoped>
/* 样式部分完全保留，和之前一样 */
.admin-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  border: none;
}

.admin-header {
  background: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  height: 60px;
  border-bottom: 1px solid #e6e6e6;
}

.nav-left {
  flex: 1;
  display: flex;
  align-items: center;
}

.nav-center {
  flex: 1;
  text-align: center;
}

.nav-right {
  flex: 1;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 15px;
  font-family: "KaiTi", "STKaiti", serif;
  font-size: 18px;
  height: 100%;
}

.logo {
  font-size: 24px;
  font-weight: bold;
  font-family: "KaiTi", "STKaiti", serif;
}

.custom-tab-menu {
  border: 2px solid #000 !important;
  border-radius: 0 !important;
  background-color: #fff !important;
  height: 40px !important;
  line-height: 40px !important;
}

.custom-tab-menu .el-menu-item {
  border-right: 2px solid #000 !important;
  margin: 0 !important;
  padding: 0 25px !important;
  height: 40px !important;
  line-height: 40px !important;
  font-size: 18px !important;
  font-family: "KaiTi", "STKaiti", serif;
}

.custom-tab-menu .el-menu-item:last-child {
  border-right: none !important;
}

.custom-tab-menu .el-menu-item.is-active {
  background-color: #e6f7ff !important;
  color: #409eff !important;
}

.custom-tab-menu .el-menu-item:hover {
  background-color: #f5f7fa !important;
}

.admin-main {
  padding: 20px;
  background: #f5f7fa;
  flex: 1;
  border: none;
}
</style>