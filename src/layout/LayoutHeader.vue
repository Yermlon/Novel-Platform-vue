<template>
<el-header class="header">
  <div class="logo">小说书城</div>
  <el-menu
    mode="horizontal"
    background-color="#fff"
    text-color="#333"
    active-text-color="#409eff"
    router
    :default-active="currentRoute"
  >
    <el-menu-item index="/bookStore">首页</el-menu-item>
    <el-menu-item index="/kinds">分类</el-menu-item>
    <el-menu-item index="/search">搜索</el-menu-item>
    <el-menu-item index="/bookshelf" v-if="!isAdmin">书架</el-menu-item>
    <el-menu-item index="/personal/info" v-if="!isAdmin" >我的</el-menu-item>
  </el-menu>

  <div v-if="isAdmin" class="admin-tag">
    <el-tag type="warning" size="small" effect="dark">
      <el-icon><UserFilled /></el-icon>
      管理员模式
    </el-tag>
  </div>

  <el-button  
    class="write-btn" 
    v-if="isAuthor" 
    type="primary" 
    size="small" 
    @click="goToWrite"
  >
    创作中心
  </el-button>

  <el-button  
    class="admin-btn" 
    v-if="isAdmin" 
    type="warning" 
    size="small" 
    @click="goToAdmin"
  >
    返回数据后台
  </el-button>

  <el-dropdown class="user-info" trigger="click" placement="bottom">
    <span style="cursor: pointer; display: inline-block;">  
      <!-- ✅ 修改：替换默认头像 + 增加加载失败处理 -->
      <el-avatar 
        size="small" 
        :src="user.avatar || defaultAvatar"
        @error="handleAvatarError"
      >
          <span v-if="!user.avatar && !defaultAvatar">U</span>
      </el-avatar>
    </span>
    <template #dropdown>
      <el-dropdown-menu>
        <template v-if="user.isLogin">
          <el-dropdown-item divided @click="handleLogout">退出登录</el-dropdown-item>
        </template>
        <template v-else>
          <el-dropdown-item @click="handleLogin">登录</el-dropdown-item>
        </template>
          
      </el-dropdown-menu>
    </template>
  </el-dropdown>
  
</el-header>

</template>

<script setup>
import { UserStore } from '@/status/user';
import { useRoute, useRouter } from 'vue-router';
import { ref, watch, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { UserFilled } from '@element-plus/icons-vue';

// ✅ 新增：定义默认头像地址（和评论区保持一致）
const defaultAvatar = 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png';

const route = useRoute();
const currentRoute = computed(() => {
  // 如果是个人中心子路由，统一返回 /personal/info
  if (route.path.startsWith('/personal')) {
    return '/personal/info';
  }
  // 其他路由正常返回当前路径
  return route.path;
});


watch(() => route.path, (newPath) => {
  currentRoute.value = newPath;
});

const user = UserStore();

const isAdmin = computed(() => {
  return user.isLogin && user.userInfo?.role === 'ADMIN';
});


const isAuthor = computed(() => {
  return user.isLogin && (user.userInfo?.isAuthor || user.userInfo?.role === 'AUTHOR');
});

const router = useRouter();

// ✅ 新增：头像加载失败时的兜底处理
const handleAvatarError = (e) => {
  e.target.src = defaultAvatar;
};

// 登录跳转
const handleLogin = () => {
  console.log('跳转到登录页面');
  router.push('/login');
};

// 退出登录
const handleLogout = () => {
  // 1. 清空用户状态
  user.logout();
  ElMessage.success('已退出登录');

  // 2. 跳转到书城（替换历史记录）
  router.replace({ path: '/bookStore' });

  // 3. 兜底处理 history 警告
  setTimeout(() => {
    window.history.replaceState(history.state, '', '/bookStore');
  }, 0);
};

const goToAdmin = () => {
  console.log('跳转到数据后台');

  // 新窗口打开
  window.open('/admin/dashboard', '_blank');
 };


// 跳转到创作中心
const goToWrite = () => {
  console.log('跳转到创作中心');
  router.push('/author/novels');
};

</script>

<style scoped>
:deep(.el-menu--horizontal) {
  flex:1;
  min-width: 0;
  margin: 0 20px;
}
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 99;
  display: flex;
  height: 60px; 
  justify-content: space-between;
  align-items: center;
  padding: 0 15px !important;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  background-color: #fff;
}

.logo {
  font-size: 18px;
  font-weight: bold;
  color: #165dff;
  width: 120px; 
}

.user-info {
  display: flex;
  align-items: center;
}
.write-btn {
  margin-right: 15px;
  height: 32px; /* 统一按钮高度 */
}

.admin-btn {
  margin-right: 15px;
  height: 32px; /* 和创作中心按钮统一高度 */
}

.admin-tag {
  margin-right: 10px;
}

/* 页面主体适配顶部固定导航 */
body {
  padding-top: 60px;
}
</style>