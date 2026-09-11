<template>
  <div class="search-page">
    <!-- 顶部搜索框 -->
    <div class="search-bar">
      <el-input
        v-model="searchKeyword"
        placeholder="请输入小说名/作者进行搜索"
        clearable
        @keyup.enter="handleSearch"
      >
        <template #append>
          <el-button @click="handleSearch" type="primary">搜索</el-button>
        </template>
      </el-input>
    </div>

    <!-- 小说列表 -->
    <div class="novel-list" v-loading="listLoading">
      <div
        class="novel-item"
        v-for="novel in novelList"
        :key="novel.novelId"
        @click="goToDetail(novel.novelId)"
      >
        <!-- 封面：和截图一致 120×160 -->
        <div class="novel-cover">
          <el-image
            :src="novel.coverUrl || '/default-cover.png'"
            fit="cover"
            style="width: 100%; height: 100%;"
            fallback="https://cube.elemecdn.com/e/fd/0cfd52cf0d1dce0d32533ae06e1cd.png"
            lazy
          />
        </div>

        <!-- 左侧信息区：小说名 + 作者 + 简介 + 字数 -->
        <div class="novel-left-info">
          <div class="novel-title">{{ novel.title || '未知小说' }}</div>
          <div class="novel-author-row">
            <span class="novel-author">{{ novel.authorName || '未知作者' }}</span>
            <span class="novel-status" :class="getStatusClass(novel.updateStatus)">
              {{ getStatusText(novel.updateStatus) }}
            </span>
          </div>
          <div class="novel-desc">{{ novel.intro || '暂无简介' }}</div>
          <div class="novel-word-count">{{ formatWordCount(novel.wordCount || 0) }}</div>
        </div>

        <!-- 右侧信息区：类型 + 更新时间 + ID -->
        <div class="novel-right-info">
          <div class="novel-type">{{ novel.typeName || '未知分类' }}</div>
          <div class="novel-update-time">{{ formatTime(novel.updateTime) }}</div>
          <div class="novel-id">ID: {{ novel.novelId }}</div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="novelList.length === 0 && !listLoading" class="empty-tip">
        <el-empty description="暂无搜索结果" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import request from '@/utils/request'
import { ElMessage, ElEmpty } from 'element-plus'

const router = useRouter()

// 搜索关键词
const searchKeyword = ref('')
// 小说列表数据
const novelList = ref([])
// 加载状态
const listLoading = ref(false)

// 核心新增：状态文本和样式方法
const getStatusText = (status) => {
  switch (status) {
    case 0: return '连载中';
    case 1: return '暂停';
    case 2: return '已完结';
    default: return '未知';
  }
};

const getStatusClass = (status) => {
  switch (status) {
    case 0: return 'serial';
    case 1: return 'paused';
    case 2: return 'finished';
    default: return 'unknown';
  }
};


// 搜索方法
const handleSearch = async () => {
  listLoading.value = true
  try {
    const res = await request.get('/novel/search', {
      params: { keyword: searchKeyword.value }
    })
    if (res.data.code === '0') {
      novelList.value = res.data.data.novelList || []
    } else {
      ElMessage.warning(res.data.msg || '搜索失败')
    }
  } catch (error) {
    console.error('搜索接口调用失败', error)
    ElMessage.error('搜索请求异常')
  } finally {
    listLoading.value = false
  }
}

// 跳转到小说详情页
const goToDetail = (novelId) => {
  router.push(`/novel/detail/${novelId}`)
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
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

// 格式化字数显示
const formatWordCount = (count) => {
  if (count < 10000) {
    return `${count}字`
  } else if (count < 100000) {
    return `${(count / 10000).toFixed(1)}万字`
  } else {
    return `${Math.floor(count / 10000)}万字`
  }
}

// 页面初始化：默认加载热门/全部小说
onMounted(() => {
  novelList.value = [];
})
</script>

<style scoped>
.search-page {
  max-width: 1200px;
  margin: 20px auto;
  padding: 0 20px;
}

/* 搜索框样式 */
.search-bar {
  margin-bottom: 20px;
}

/* 小说列表样式 */
.novel-list {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  min-height: 400px;
}
.novel-item {
  display: flex;
  align-items: flex-start; /* 顶部对齐 */
  padding: 15px;
  border-bottom: 1px solid #e0e0e0;
  cursor: pointer;
  transition: background-color 0.2s;
}
.novel-item:hover {
  background-color: #f8f9fa;
}
.novel-item:last-child {
  border-bottom: none;
}

/* 封面样式：和截图一致 120×160 */
.novel-cover {
  width: 120px;
  height: 160px;
  margin-right: 20px;
  border: 1px solid #e0e0e0;
  flex-shrink: 0; /* 不被压缩 */
}

/* 左侧信息区：紧贴封面，左对齐 */
.novel-left-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
  text-align: left;
  justify-content: flex-start;
  min-width: 0;
}
.novel-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}
.novel-author {
  font-size: 14px;
  color: #666;
}
/* 小说状态标签样式 */
.novel-status {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}
.novel-status.serial {
  background-color: #e6f7ff;
  color: #1890ff;
}
.novel-status.paused {
  background-color: #fff7e6;
  color: #fa8c16;
}
.novel-status.finished {
  background-color: #f6ffed;
  color: #52c41a;
}
.novel-status.unknown {
  background-color: #f5f5f5;
  color: #999;
}
.novel-desc {
  font-size: 14px;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}
.novel-word-count {
  font-size: 12px;
  color: #999;
  margin-top: 5px;
}

/* 右侧信息区：右对齐 */
.novel-right-info {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  justify-content: flex-start;
  margin-left: 20px;
  min-width: 120px;
}
.novel-type {
  font-size: 14px;
  color: #666;
  background-color: #f0f9ff;
  padding: 2px 8px;
  border-radius: 4px;
}
.novel-update-time {
  font-size: 12px;
  color: #999;
}
.novel-id {
  font-size: 12px;
  color: #999;
}

/* 空状态 */
.empty-tip {
  padding: 50px 0;
  text-align: center;
}
</style>