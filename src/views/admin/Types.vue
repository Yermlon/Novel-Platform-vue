<template>
  <div class="category-manage-page">
    <!-- 页面标题 + 新增按钮 -->
    <div class="page-header">
      <h2>小说分类管理</h2>
      <el-button type="primary" @click="openAddDialog">新增分类</el-button>
    </div>

    <!-- 分类列表 -->
    <div class="category-list" v-loading="listLoading">
      <div
        class="category-item"
        v-for="category in categoryList"
        :key="category.typeId"
      >
        <!-- 分类基本信息 -->
        <div class="category-base-info">
          <div class="category-id">ID: {{ category.typeId }}</div>
          <div class="category-name">{{ category.typeName || '未知分类' }}</div>
        </div>

        <!-- 状态标签 -->
        <div class="category-status">
          <el-tag :type="category.status === 1 ? 'success' : 'danger'">
            {{ category.status === 1 ? '启用' : '禁用' }}
          </el-tag>
        </div>

        <!-- 时间信息 -->
        <div class="category-time">
          <div class="create-time">创建时间: {{ formatTime(category.createTime) }}</div>
          <div class="update-time">更新时间: {{ formatTime(category.updateTime) }}</div>
        </div>

        <!-- 操作按钮 -->
        <div class="category-actions">
          <el-button size="small" type="primary" @click="openEditDialog(category)">编辑</el-button>
          <el-button 
            size="small" 
            :type="category.status === 1 ? 'warning' : 'success'"
            @click="handleChangeStatus(category)"
          >
            {{ category.status === 1 ? '禁用' : '启用' }}
          </el-button>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="categoryList.length === 0 && !listLoading" class="empty-tip">
        <el-empty description="暂无分类数据" />
      </div>
    </div>

    <!-- 新增/编辑分类弹窗 -->
    <el-dialog v-model="dialogVisible" :title="isAdd ? '新增分类' : '编辑分类'" width="400px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="80px">
        <el-form-item label="分类名称" prop="typeName">
          <el-input v-model="form.typeName" placeholder="请输入分类名称" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElEmpty } from 'element-plus'
import request from '@/utils/request'

// 列表加载状态
const listLoading = ref(false)
// 分类列表数据
const categoryList = ref([])
// 弹窗相关
const dialogVisible = ref(false)
const isAdd = ref(true)
const formRef = ref(null)
const form = ref({
  typeId: '',
  typeName: '',
  status: 1 // 默认启用
})

// 表单校验规则
const rules = ref({
  typeName: [
    { required: true, message: '请输入分类名称', trigger: 'blur' }
  ]
})

// 加载分类列表
const loadCategoryList = async () => {
  listLoading.value = true
  try {
    const res = await request.get('/novelsType/listAll')
    // ✅ 关键：加 .data 解析后端返回的业务数据
    if (res.data.code === '0') {
      categoryList.value = res.data.data || []
    } else {
      ElMessage.warning(res.data.msg || '获取分类列表失败')
    }
  } catch (error) {
    console.error('获取分类列表失败', error)
    ElMessage.error('获取分类数据异常')
  } finally {
    listLoading.value = false
  }
}

// 打开新增弹窗
const openAddDialog = () => {
  isAdd.value = true
  form.value = {
    typeName: '',
    status: 1
  }
  dialogVisible.value = true
}

// 打开编辑弹窗
const openEditDialog = (category) => {
  isAdd.value = false
  form.value = {
    typeId: category.typeId,
    typeName: category.typeName,
    status: category.status
  }
  dialogVisible.value = true
}

// 提交表单（新增/编辑）
const submitForm = async () => {
  try {
    await formRef.value.validate()
    let res
    if (isAdd.value) {
      res = await request.post('/novelsType/add', form.value)
    } else {
      // ✅ 修复：复制form并删除typeId，避免参数重复
      const editForm = { ...form.value }
      delete editForm.typeId
      res = await request.post(`/novelsType/edit/${form.value.typeId}`, editForm)
    }
    // ✅ 关键：加 .data 解析
    if (res.data.code === '0') {
      ElMessage.success(res.data.msg)
      dialogVisible.value = false
      loadCategoryList()
    } else {
      ElMessage.error(res.data.msg || '操作失败')
    }
  } catch (error) {
    console.error('提交表单失败', error)
    ElMessage.error('表单校验失败，请检查输入')
  }
}

// 修改分类状态
const handleChangeStatus = async (category) => {
  try {
    const newStatus = category.status === 1 ? 0 : 1
    // ✅ 修复：把status作为URL参数传递（匹配后端@RequestParam）
    const res = await request.post(`/novelsType/changeStatus/${category.typeId}?status=${newStatus}`)
    // ✅ 关键：加 .data 解析
    if (res.data.code === '0') {
      ElMessage.success(res.data.msg)
      loadCategoryList()
    } else {
      ElMessage.error(res.data.msg || '修改状态失败')
    }
  } catch (error) {
    console.error('修改状态失败', error)
    ElMessage.error('修改分类状态异常')
  }
}

// 格式化时间（复用你搜索页的逻辑）
const formatTime = (time) => {
  if (!time) return '未知时间'
  const date = new Date(time)
  if (isNaN(date.getTime())) return '未知时间'
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

// 页面初始化加载列表
onMounted(() => {
  loadCategoryList()
})
</script>

<style scoped>
.category-manage-page {
  max-width: 1200px;
  margin: 20px auto;
  padding: 0 20px;
}

/* 页面头部 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e0e0e0;
}
.page-header h2 {
  margin: 0;
  color: #333;
}

/* 分类列表 */
.category-list {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  min-height: 400px;
}
.category-item {
  display: flex;
  align-items: center;
  padding: 15px;
  border-bottom: 1px solid #e0e0e0;
  transition: background-color 0.2s;
}
.category-item:hover {
  background-color: #f8f9fa;
}
.category-item:last-child {
  border-bottom: none;
}

/* 分类基本信息 */
.category-base-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 15px;
}
.category-id {
  font-size: 12px;
  color: #999;
  width: 80px;
}
.category-name {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

/* 状态标签 */
.category-status {
  width: 100px;
  text-align: center;
}

/* 时间信息 */
.category-time {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 12px;
  color: #999;
}

/* 操作按钮 */
.category-actions {
  display: flex;
  gap: 10px;
  width: 180px;
  justify-content: flex-end;
}

/* 空状态 */
.empty-tip {
  padding: 50px 0;
  text-align: center;
}
</style>