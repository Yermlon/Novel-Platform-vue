<template>
  <div class="user-management">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>用户管理</h2>
    </div>

    <!-- 用户列表 -->
    <el-card shadow="hover" class="user-card">
      <el-table 
        :data="displayList" 
        border 
        stripe 
        v-loading="loading"
        style="width: 100%"
      >
        <!-- 表格列配置 -->
        <el-table-column prop="uid" label="用户ID" width="80" align="center" />
        <el-table-column prop="uname" label="用户名" width="150" align="center" />
        <el-table-column prop="email" label="邮箱" min-width="200" align="center" />
        <el-table-column prop="role" label="用户角色" width="120" align="center">
          <template #default="scope">
            <el-tag :type="scope.row.role === 'ADMIN' ? 'danger' : (scope.row.role === 'AUTHOR' ? 'warning' : 'success')">
              {{ scope.row.role === 'ADMIN' ? '管理员' : (scope.row.role === 'AUTHOR' ? '作者' : '读者') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="penName" label="笔名" width="150" align="center">
          <template #default="scope">
            {{ scope.row.penName || '无' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" align="center">
          <template #default="scope">
            <el-button 
              type="text" 
              size="small" 
              @click="viewUserDetail(scope.row)"
            >
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页（可选，若用户量大） -->
      <el-pagination
        v-if="userList.length > 0"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
        :current-page="currentPage"
        :page-sizes="[10, 20, 50]"
        :page-size="pageSize"
        layout="total, sizes, prev, pager, next, jumper"
        :total="total"
        style="margin-top: 20px; text-align: right"
      >
      </el-pagination>
    </el-card>

    <!-- 用户详情弹窗 -->
    <el-dialog 
      v-model="detailDialogVisible" 
      title="用户详情" 
      width="500px"
      destroy-on-close
    >
      <el-descriptions :column="2" border>
        <el-descriptions-item label="用户ID">{{ currentUser.uid }}</el-descriptions-item>
        <el-descriptions-item label="用户名">{{ currentUser.uname }}</el-descriptions-item>
        <el-descriptions-item label="邮箱">{{ currentUser.email }}</el-descriptions-item>
        <el-descriptions-item label="角色">
          {{ currentUser.role === 'ADMIN' ? '管理员' : (currentUser.role === 'AUTHOR' ? '作者' : '读者') }}
        </el-descriptions-item>
        <el-descriptions-item label="笔名">{{ currentUser.penName || '无' }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import request from '@/utils/request';
import { ElMessage } from 'element-plus';

// 响应式数据
const loading = ref(false); // 加载状态
const userList = ref([]); // 用户列表
const total = ref(0); // 总条数
const currentPage = ref(1); // 当前页
const pageSize = ref(10); // 每页条数

// 详情弹窗相关
const detailDialogVisible = ref(false);
const currentUser = ref({});

// 页面挂载后加载所有用户
onMounted(() => {
  getAllUsers();
});

const displayList = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return userList.value.slice(start,end);
});

// 核心方法：查询所有用户
const getAllUsers = async () => {
  loading.value = true;
  try {
    const res = await request.get('/user/all');
    console.log('=== 完整响应 ===', res);
    console.log('res.data.code:', res.data.code);  // 改这里
    console.log('res.data.data:', res.data.data);  // 改这里
    console.log('res.data.msg:', res.data.msg);    // 改这里
    
    // ✅ 关键修复：从 res.data 里取 code
    if (res.data.code === '0') {
      userList.value = res.data.data || [];  // 改这里
      total.value = userList.value.length;
      ElMessage.success('查询用户列表成功');
    } else {
      ElMessage.error(res.data.msg || '查询用户列表失败');  // 改这里
    }
  } catch (error) {
    console.error('=== catch 里的完整错误 ===', error);
    const errorMsg = error.response?.data?.msg || '网络异常';
    ElMessage.error(errorMsg);
  } finally {
    loading.value = false;
  }
};

// 分页相关方法（简单前端分页）
const handleSizeChange = (val) => {
  pageSize.value = val;
  currentPage.value = 1;
};

const handleCurrentChange = (val) => {
  currentPage.value = val;
};

// 查看用户详情
const viewUserDetail = (user) => {
  currentUser.value = { ...user }; // 深拷贝，避免修改原数据
  detailDialogVisible.value = true;
};
</script>

<style scoped>
.user-management {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: calc(100vh - 60px);
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  color: #333;
  font-weight: 600;
}

.user-card {
  background-color: #fff;
}
</style>