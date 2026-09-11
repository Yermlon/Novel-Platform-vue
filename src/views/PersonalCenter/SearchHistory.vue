<template>
  <div class="browse-history-page">
    <!-- 顶部标题 -->
    <div class="history-header">
      <h2>最近</h2>
    </div>

    <!-- 浏览历史列表 -->
    <div class="history-list" v-loading="loading">
      <div
        class="history-item"
        v-for="item in historyList"
        :key="item.novelId"
        @click="goToRead(item.novelId, item.chapterId)"
      >
        <!-- 封面 -->
        <div class="novel-cover">
          <el-image
            :src="item.coverUrl || '/default-cover.png'"
            fit="cover"
            style="width: 100%; height: 100%;"
            fallback="https://cube.elemecdn.com/e/fd/0cfd52cf0d1dce0d32533ae06e1cd.png"
            lazy
          />
        </div>

        <!-- 左侧信息区 -->
        <div class="novel-info-left">
          <div class="novel-title">{{ item.title || '未知小说' }}</div>
          <div class="novel-author-row">
            <span class="novel-author">{{ item.authorName || '未知作者' }}</span>
            <span class="novel-status" :class="getStatusClass(item.updateStatus)">
              {{ getStatusText(item.updateStatus) }}
            </span>
          </div>
          <div class="novel-desc">{{ item.intro || '暂无简介' }}</div>
          <div class="novel-word-count">{{ formatWordCount(item.wordCount || 0) }}</div>
        </div>

        <!-- 右侧信息区 -->
        <div class="novel-info-right">
          <div class="novel-type">{{ item.typeName || '未知分类' }}</div>
          <div class="novel-update-time">{{ formatTime(item.readTime) }}</div>
          <div class="novel-id">ID: {{ item.novelId }}</div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="historyList.length === 0 && !loading" class="empty-tip">
        <el-empty description="暂无浏览历史" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import request from '@/utils/request';
import { ElMessage } from 'element-plus';
import { UserStore } from '@/status/user';

const router = useRouter();
const userStore = UserStore();

const loading = ref(false);
const historyList = ref([]); // 浏览历史列表（已关联小说信息）

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


// 加载浏览历史
const loadBrowseHistory = async () => {
  loading.value = true;
  try {
    const res = await request.get('/read/user');
    if (res.data?.code === '0') {
      const readRecords = res.data.data || [];
      
      // 去重
      const uniqueNovelMap = new Map();
      readRecords.forEach(record => {
        if (!uniqueNovelMap.has(record.novelId)) {
          uniqueNovelMap.set(record.novelId, record);
        }
      });
      const uniqueRecords = Array.from(uniqueNovelMap.values());
      
      if (uniqueRecords.length === 0) {
        historyList.value = [];
        return;
      }
      
      // 1. 提取所有小说ID
      const novelIds = uniqueRecords.map(r => r.novelId);
      
      // 2. 一次性批量请求所有小说详情
      const batchRes = await request.post('/novel/bookStore/detail/batch', novelIds);
      const novelInfoMap = new Map();
      if (batchRes.data?.code === '0') {
        batchRes.data.data.forEach(info => {
          novelInfoMap.set(info.novelId, info);
        });
      }
      
      // 3. 合并阅读记录和小说详情
      const novelInfoList = uniqueRecords.map(record => {
        const novelInfo = novelInfoMap.get(record.novelId) || {};
        return {
          ...record,
          title: novelInfo.title,
          authorName: novelInfo.authorName,
          intro: novelInfo.intro,
          wordCount: novelInfo.wordCount,
          typeName: novelInfo.typeName,
          coverUrl: novelInfo.coverUrl,updateStatus: novelInfo.updateStatus || 0
        };
      });
      
      historyList.value = novelInfoList;
    }
  } catch (err) {
    console.error('加载浏览历史异常', err);
    ElMessage.error('加载浏览历史异常');
  } finally {
    loading.value = false;
  }
};

// 跳转到阅读页
const goToRead = (novelId, chapterId) => {
  if (!novelId || !chapterId) {
    ElMessage.warning('无法获取阅读信息');
    return;
  }
  router.push(`/novel/read/${novelId}/${chapterId}`);
};

// 格式化字数
const formatWordCount = (count) => {
  if (count < 10000) return `${count}字`;
  else if (count < 100000) return `${(count / 10000).toFixed(1)}万字`;
  else return `${Math.floor(count / 10000)}万字`;
};

// 格式化时间
const formatTime = (time) => {
  if (!time) return '未知时间';
  const date = new Date(time);
  if (isNaN(date.getTime())) return '未知时间';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

onMounted(() => {
  loadBrowseHistory();
});
</script>

<style scoped>
.browse-history-page {
  max-width: 1400px;
  margin: 20px auto;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  min-height: calc(100vh - 60px);
}

.history-header {
  padding: 15px 20px;
  border-bottom: 1px solid #e0e0e0;
}
.history-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: bold;
}

.history-list {
  padding: 10px;
}
.history-item {
  display: flex;
  align-items: flex-start;
  padding: 15px;
  border-bottom: 1px solid #e0e0e0;
  cursor: pointer;
  transition: background-color 0.2s;
}
.history-item:hover {
  background-color: #f8f9fa;
}
.history-item:last-child {
  border-bottom: none;
}

.novel-cover {
  width: 120px;
  height: 160px;
  margin-right: 20px;
  border: 1px solid #e0e0e0;
  flex-shrink: 0;
}

.novel-info-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
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
.novel-desc {
  font-size: 14px;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  /* autoprefixer: ignore next */
  -webkit-line-clamp: 2;
  line-clamp: 2;
  /* 用标准 flex 替代旧 box 语法，消除 Autoprefixer 警告 */
  display: -webkit-box;
  -webkit-box-orient: vertical;
  /* 删掉这两行旧语法：display: box; box-orient: vertical; */
}
.novel-word-count {
  font-size: 12px;
  color: #999;
}

.novel-info-right {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
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

.empty-tip {
  padding: 50px 0;
  text-align: center;
}

/* 作者名 + 状态行 */
.novel-author-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

/* 小说状态标签（和其他页面保持一致） */
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
</style>