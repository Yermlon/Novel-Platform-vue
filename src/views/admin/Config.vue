<template>
  <div class="system-config-page">
    <!-- 标签页切换：轮播图/公告 -->
    <el-tabs v-model="activeTab" type="card">
      <!-- 轮播图配置 -->
      <el-tab-pane label="轮播图配置" name="carousel">
        <div class="carousel-config">
          <!-- 轮播图头部 -->
          <div class="config-header">
            <h3>首页轮播图管理</h3>
            <el-button type="primary" @click="openCarouselDialog">新增轮播图</el-button>
          </div>

          <!-- 轮播图列表 -->
          <div class="carousel-list" v-loading="carouselLoading">
            <div
              class="carousel-item"
              v-for="carousel in carouselList"
              :key="carousel.id"
            >
              <!-- 轮播图封面 -->
              <div class="carousel-cover">
                <el-image
                  :src="carousel.imageUrl || '/default-carousel.png'"
                  fit="cover"
                  style="width: 100%; height: 100%;"
                  fallback="https://cube.elemecdn.com/e/fd/0cfd52cf0d1dce0d32533ae06e1cd.png"
                  lazy
                />
              </div>

              <!-- 轮播图信息 -->
              <div class="carousel-info">
                <div class="carousel-title">{{ carousel.title || '无标题' }}</div>
                <div class="carousel-novel">关联小说: {{ getNovelNameById(carousel.novelId) || '无' }}</div>
                <div class="carousel-sort">排序值: {{ carousel.sort || 0 }}</div>
                <div class="carousel-status">
                  <el-tag :type="carousel.status === 'ENABLED' ? 'success' : 'info'">
                    {{ carousel.status === 'ENABLED' ? '启用' : '禁用' }}
                  </el-tag>
                </div>
              </div>

              <!-- 时间信息 -->
              <div class="carousel-time">
                <div class="create-time">创建时间: {{ formatTime(carousel.createTime) }}</div>
                <div class="update-time">更新时间: {{ formatTime(carousel.updateTime) }}</div>
              </div>

              <!-- 操作按钮 -->
              <div class="carousel-actions">
                <el-button size="small" type="primary" @click="openCarouselDialog(carousel)">编辑</el-button>
                <el-button 
                  size="small" 
                  type="danger"
                  @click="deleteCarousel(carousel.id)"
                >
                  删除
                </el-button>
              </div>
            </div>

            <!-- 空状态 -->
            <div v-if="carouselList.length === 0 && !carouselLoading" class="empty-tip">
              <el-empty description="暂无轮播图数据" />
            </div>
          </div>
        </div>
      </el-tab-pane>

      <!-- 公告配置 -->
      <el-tab-pane label="公告配置" name="announcement">
        <div class="announcement-config">
          <!-- 公告头部 -->
          <div class="config-header">
            <h3>系统公告管理</h3>
            <el-button type="primary" @click="openAnnouncementDialog">发布公告</el-button>
          </div>

          <!-- 公告列表（循环展示） -->
          <div class="announcement-list" v-loading="announcementLoading">
            <div 
              class="announcement-item"
              v-for="announcement in announcementList"
              :key="announcement.id"
            >
              <div class="announcement-content">
                {{ announcement.content || '无内容' }}
              </div>
              <div class="announcement-status">
                <el-tag :type="announcement.status === 'PUBLISHED' ? 'success' : 'warning'">
                  {{ announcement.status === 'PUBLISHED' ? '已发布' : '草稿' }}
                </el-tag>
              </div>
              <div class="announcement-time">
                发布时间: {{ formatTime(announcement.publishedTime) }}
              </div>
              <div class="announcement-actions">
                <el-button size="small" type="primary" @click="openAnnouncementDialog(announcement)">编辑</el-button>
                <el-button 
                  size="small" 
                  type="danger"
                  @click="deleteAnnouncement(announcement.id)"
                >
                  删除
                </el-button>
              </div>
            </div>

            <div v-if="announcementList.length === 0 && !announcementLoading" class="empty-tip">
              <el-empty description="暂无公告数据" />
            </div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 轮播图新增/编辑弹窗 -->
    <el-dialog v-model="carouselDialogVisible" :title="isCarouselAdd ? '新增轮播图' : '编辑轮播图'" width="500px">
      <el-form :model="carouselForm" :rules="carouselRules" ref="carouselFormRef" label-width="120px">
        <el-form-item label="轮播图标题" prop="title">
          <el-input v-model="carouselForm.title" placeholder="请输入轮播图标题" />
        </el-form-item>
        <el-form-item label="图片上传" prop="imageUrl">
          <div class="cover-upload-wrapper">
            <div v-if="carouselForm.imageUrl" class="cover-preview-item">
              <el-image
                :src="carouselForm.imageUrl"
                fit="cover"
                class="cover-preview-img"
                fallback="https://cube.elemecdn.com/e/fd/0cfd52cf0d1dce0d32533ae06e1cd.png"
              >
                <template #error>
                  <div class="image-error">
                    <el-icon><Picture /></el-icon>
                  </div>
                </template>
              </el-image>
              <div class="cover-actions">
                <el-icon class="action-icon view" @click="previewImage(carouselForm.imageUrl)"><View /></el-icon>
                <el-icon class="action-icon delete" @click="carouselForm.imageUrl = ''"><Delete /></el-icon>
              </div>
            </div>
            <el-upload
              v-else
              action="/api/upload/carousel"
              :on-success="handleCarouselUploadSuccess"
              :show-file-list="false"
              :headers="uploadHeaders"
              :before-upload="beforeUpload"
              class="cover-upload-btn"
            >
              <div class="upload-placeholder">
                <el-icon class="upload-icon"><Plus /></el-icon>
              </div>
            </el-upload>
          </div>
        </el-form-item>
        <el-form-item label="关联小说" prop="novelId">
          <el-autocomplete
            v-model="carouselForm.novelId"
            :fetch-suggestions="queryNovelSuggestions"
            placeholder="请输入小说ID或选择小说名"
            clearable
            :loading="novelLoading"
            @select="handleNovelSelect"
            value-key="id"
          >
            <template #default="{ item }">
              <div class="novel-suggestion-item">
                <span class="novel-title">{{ item.title }}</span>
                <span class="novel-id">ID: {{ item.novelId || item.id }}</span>
              </div>
            </template>
          </el-autocomplete>
          <div class="form-tip">可直接输入小说ID，或下拉选择小说名</div>
        </el-form-item>
        <el-form-item label="排序值" prop="sort">
          <el-input v-model="carouselForm.sort" type="number" min="0" placeholder="数字越小越靠前，默认0" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="carouselForm.status" placeholder="请选择状态">
            <el-option label="启用" value="ENABLED" />
            <el-option label="禁用" value="DISABLED" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="carouselDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitCarouselForm">确定</el-button>
      </template>
    </el-dialog>

    <!-- 公告新增/编辑弹窗 -->
    <el-dialog v-model="announcementDialogVisible" :title="isAnnouncementAdd ? '发布公告' : '编辑公告'" width="500px">
      <el-form :model="announcementForm" :rules="announcementRules" ref="announcementFormRef" label-width="80px">
        <el-form-item label="公告内容" prop="content">
          <el-input
            v-model="announcementForm.content"
            type="textarea"
            :rows="6"
            placeholder="请输入公告内容"
          />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="announcementForm.status" placeholder="请选择状态">
            <el-option label="已发布" value="PUBLISHED" />
            <el-option label="草稿" value="DRAFT" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="announcementDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitAnnouncementForm">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick, h } from 'vue'
import { ElMessage, ElEmpty, ElMessageBox } from 'element-plus'
import request from '@/utils/request'
import { Plus, View, Delete, Picture } from '@element-plus/icons-vue'

// 标签页激活状态
const activeTab = ref('carousel')

// ===================== 轮播图相关 =====================
const carouselLoading = ref(false)
const carouselList = ref([])
const carouselDialogVisible = ref(false)
const isCarouselAdd = ref(true)
const carouselFormRef = ref(null)
const carouselForm = ref({
  id: '',
  title: '',
  imageUrl: '',
  novelId: null,
  sort: 0,
  status: 'ENABLED'
})

// 小说列表相关
const novelList = ref([])
const novelLoading = ref(false)

// 图片预览
const previewImage = (url) => {
  ElMessageBox({
    title: '图片预览',
    message: h('div', { style: 'text-align: center' }, [
      h('img', { src: url, style: 'max-width: 100%; max-height: 400px;' })
    ]),
    showCancelButton: false,
    showConfirmButton: false,
    closeOnClickModal: true,
    closeOnPressEscape: true
  }).catch(() => {
    console.log('预览弹窗已关闭')
  })
}

// 上传前校验
const beforeUpload = (file) => {
  const isImage = file.type.startsWith('image/')
  if (!isImage) {
    ElMessage.error('只能上传图片文件！')
    return false
  }
  const isLt2M = file.size / 1024 / 1024 < 2
  if (!isLt2M) {
    ElMessage.error('图片大小不能超过 2MB！')
    return false
  }
  return true
}

// 加载小说列表
const loadNovelList = async () => {
  novelLoading.value = true
  try {
    const res = await request.get('/novel/admin/list', {
      params: {
        pageNum: 1,
        pageSize: 100
      }
    })
    if (res.data.code === '0') {
      novelList.value = res.data.data?.novelList || []
    } else {
      ElMessage.warning(res.data.msg || '获取小说列表失败')
    }
  } catch (error) {
    console.error('获取小说列表失败:', error)
    ElMessage.error('获取小说数据异常，请检查权限或接口')
  } finally {
    novelLoading.value = false
  }
}

// 根据小说ID获取小说名
const getNovelNameById = (novelId) => {
  if (!novelId) return ''
  const novel = novelList.value.find(item => {
    return item.novelId === novelId || item.id === novelId
  })
  return novel ? novel.title : '未知小说'
}

// 小说联想搜索
const queryNovelSuggestions = (queryString, cb) => {
  if (!queryString) {
    cb(novelList.value.map(item => ({
      value: item.title,
      id: item.novelId || item.id,
      ...item
    })))
    return
  }
  const results = novelList.value.filter(item => {
    const novelId = item.novelId || item.id
    const idMatch = novelId.toString().includes(queryString)
    const nameMatch = item.title.includes(queryString)
    return idMatch || nameMatch
  }).map(item => ({
    value: item.title,
    id: item.novelId || item.id,
    ...item
  }))
  cb(results)
}

// 选择小说后赋值
const handleNovelSelect = (item) => {
  carouselForm.value.novelId = item.id
}

// 上传请求头
const uploadHeaders = computed(() => {
  const token = localStorage.getItem('token') || ''
  return {
    Authorization: `Bearer ${token}`
  }
})

// 轮播图表单校验规则
const carouselRules = ref({
  title: [
    { required: true, message: '请输入轮播图标题', trigger: 'blur' },
    { max: 100, message: '标题长度不能超过100个字符', trigger: 'blur' }
  ],
  imageUrl: [
    { required: true, message: '请上传轮播图图片', trigger: 'change' }
  ]
})

// 加载轮播图列表
const loadCarouselList = async () => {
  carouselLoading.value = true
  try {
    const res = await request.get('/carousel/list')
    if (res.data.code === '0') {
      carouselList.value = res.data.data || []
    } else {
      ElMessage.warning(res.data.msg || '获取轮播图列表失败')
    }
  } catch (error) {
    console.error('获取轮播图失败:', error)
    ElMessage.error('获取轮播图数据异常')
  } finally {
    carouselLoading.value = false
  }
}

// 打开轮播图弹窗
const openCarouselDialog = (carousel = {}) => {
  isCarouselAdd.value = !carousel.id
  carouselForm.value = {
    id: carousel.id || '',
    title: carousel.title || '',
    imageUrl: carousel.imageUrl || '',
    novelId: carousel.novelId || null,
    sort: carousel.sort || 0,
    status: carousel.status || 'ENABLED'
  }
  carouselDialogVisible.value = true
}

// 提交轮播图表单
const submitCarouselForm = async () => {
  try {
    await carouselFormRef.value.validate()
    let res
    if (isCarouselAdd.value) {
      res = await request.post('/carousel/add', carouselForm.value)
    } else {
      res = await request.post(`/carousel/edit/${carouselForm.value.id}`, carouselForm.value)
    }
    if (res.data.code === '0') {
      ElMessage.success(res.data.msg)
      carouselDialogVisible.value = false
      loadCarouselList()
    } else {
      ElMessage.error(res.data.msg || '操作失败')
    }
  } catch (error) {
    console.error('提交轮播图失败:', error)
    ElMessage.error('表单校验失败，请检查输入')
  }
}

// 删除轮播图
const deleteCarousel = async (id) => {
  try {
    const res = await request.delete(`/carousel/delete/${id}`)
    if (res.data.code === '0') {
      ElMessage.success(res.data.msg)
      loadCarouselList()
    } else {
      ElMessage.error(res.data.msg || '删除失败')
    }
  } catch (error) {
    console.error('删除轮播图失败:', error)
    ElMessage.error('删除轮播图异常')
  }
}

// 轮播图上传成功处理
const handleCarouselUploadSuccess = (response) => {
  console.log("上传返回数据:", response)
  if (response.code === '0') {
    carouselForm.value.imageUrl = response.data.url
    ElMessage.success('图片上传成功')
    nextTick(() => {
      carouselFormRef.value?.clearValidate('imageUrl')
    })
  } else {
    ElMessage.error(response.msg || '图片上传失败')
  }
}

// ===================== 公告相关 =====================
const announcementLoading = ref(false)
const announcementList = ref([]) // 公告列表（核心修改）
const announcementDialogVisible = ref(false)
const isAnnouncementAdd = ref(true)
const announcementFormRef = ref(null)
const announcementForm = ref({
  id: '',
  content: '',
  status: 'PUBLISHED'
})

// 公告表单校验规则
const announcementRules = ref({
  content: [
    { required: true, message: '请输入公告内容', trigger: 'blur' },
    { max: 1000, message: '公告内容长度不能超过1000个字符', trigger: 'blur' }
  ]
})

// 加载所有公告列表（核心修改）
const loadAnnouncementList = async () => {
  announcementLoading.value = true
  try {
    const res = await request.get('/announcement/list')
    if (res.data.code === '0') {
      announcementList.value = res.data.data || []
    } else {
      ElMessage.warning(res.data.msg || '获取公告列表失败')
    }
  } catch (error) {
    console.error('获取公告列表失败:', error)
    ElMessage.error('获取公告数据异常')
  } finally {
    announcementLoading.value = false
  }
}

// 打开公告弹窗
const openAnnouncementDialog = (announce = {}) => {
  isAnnouncementAdd.value = !announce.id
  announcementForm.value = {
    id: announce.id || '',
    content: announce.content || '',
    status: announce.status || 'PUBLISHED'
  }
  announcementDialogVisible.value = true
}

// 提交公告表单（核心修改：刷新列表）
const submitAnnouncementForm = async () => {
  try {
    await announcementFormRef.value.validate()
    let res
    if (isAnnouncementAdd.value) {
      res = await request.post('/announcement/publish', announcementForm.value)
    } else {
      res = await request.post(`/announcement/edit/${announcementForm.value.id}`, announcementForm.value)
    }
    if (res.data.code === '0') {
      ElMessage.success(res.data.msg)
      announcementDialogVisible.value = false
      loadAnnouncementList() // 刷新公告列表
    } else {
      ElMessage.error(res.data.msg || '操作失败')
    }
  } catch (error) {
    console.error('提交公告失败:', error)
    ElMessage.error('表单校验失败，请检查输入')
  }
}

// 删除公告（核心修改：刷新列表）
const deleteAnnouncement = async (id) => {
  try {
    const res = await request.delete(`/announcement/delete/${id}`)
    if (res.data.code === '0') {
      ElMessage.success(res.data.msg)
      loadAnnouncementList() // 刷新公告列表
    } else {
      ElMessage.error(res.data.msg || '删除失败')
    }
  } catch (error) {
    console.error('删除公告失败:', error)
    ElMessage.error('删除公告异常')
  }
}

// 格式化时间
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

// 初始化加载数据
onMounted(() => {
  loadCarouselList()
  loadAnnouncementList() // 加载公告列表
  loadNovelList()
})
</script>

<style scoped>
.system-config-page {
  max-width: 1200px;
  margin: 20px auto;
  padding: 0 20px;
}

.config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e0e0e0;
}
.config-header h3 {
  margin: 0;
  color: #333;
}

.carousel-list {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  min-height: 400px;
}
.carousel-item {
  display: flex;
  align-items: center;
  padding: 15px;
  border-bottom: 1px solid #e0e0e0;
  gap: 20px;
  transition: background-color 0.2s;
}
.carousel-item:hover {
  background-color: #f8f9fa;
}
.carousel-item:last-child {
  border-bottom: none;
}
/* 轮播图列表预览图 */
.carousel-cover {
  width: 120px;
  height: 80px;
  border: 1px solid #e0e0e0;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
}
.carousel-cover .el-image {
  width: 100%;
  height: 100%;
  object-fit: contain; /* 自适应不变形 ✅ */
}

/* 弹窗内预览图 */
.cover-preview-item {
  position: relative;
  width: 160px;
  height: 120px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
}
.cover-preview-img {
  width: 100%;
  height: 100%;
  object-fit: contain; /* 自适应不变形 ✅ */
}
.carousel-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.carousel-title {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}
.carousel-novel, .carousel-sort {
  font-size: 12px;
  color: #999;
}
.carousel-time {
  width: 280px;
  font-size: 12px;
  color: #999;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.carousel-actions {
  display: flex;
  gap: 10px;
  width: 180px;
  justify-content: flex-end;
}

.announcement-list {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  min-height: 400px;
}
.announcement-item {
  display: flex;
  align-items: center;
  padding: 15px;
  border-bottom: 1px solid #e0e0e0;
  gap: 20px;
  transition: background-color 0.2s;
}
.announcement-item:hover {
  background-color: #f8f9fa;
}
.announcement-item:last-child {
  border-bottom: none;
}
.announcement-content {
  flex: 1;
  font-size: 14px;
  color: #333;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}
.announcement-status {
  width: 100px;
  text-align: center;
}
.announcement-time {
  width: 200px;
  font-size: 12px;
  color: #999;
}
.announcement-actions {
  display: flex;
  gap: 10px;
  width: 180px;
  justify-content: flex-end;
}

.empty-tip {
  padding: 50px 0;
  text-align: center;
}

.novel-suggestion-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
}
.novel-title {
  font-weight: 500;
  color: #333;
}
.novel-id {
  font-size: 12px;
  color: #999;
}
.form-tip {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.cover-upload-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cover-preview-item {
  position: relative;
  width: 160px;
  height: 120px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}
.cover-preview-img {
  width: 100%;
  height: 100%;
}
.cover-actions {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  opacity: 0;
  transition: opacity 0.2s;
}
.cover-preview-item:hover .cover-actions {
  opacity: 1;
}
.action-icon {
  font-size: 20px;
  color: #fff;
  cursor: pointer;
}
.action-icon.view:hover {
  color: #409eff;
}
.action-icon.delete:hover {
  color: #f56c6c;
}

.cover-upload-btn {
  width: 160px;
  height: 120px;
  border: 1px dashed #d9d9d9;
  border-radius: 4px;
  display: flex;
}
.upload-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.upload-icon {
  font-size: 24px;
  color: #999;
  transform: translateY(1px);
}

.image-error {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  color: #999;
}
</style>