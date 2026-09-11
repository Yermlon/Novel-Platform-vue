<template>
    <div class="author-home-page">
        <div class="header-back">
            <el-button text @click="goBack">
                <el-icon><ArrowLeft /></el-icon>
            </el-button>
        </div>

        <div class="author-info-section">
            <el-avatar
              :size="100"
              :src=" authorInfo.avatar || 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png'"
              class="author-avatar"
            />
            <div class="author-text-info">
                <h2 class="author-penname">{{ authorInfo.penName || '未设置笔名'}}</h2>
                <p class="author-id">ID: {{ authorInfo.uid || '未知ID' }}</p>
            </div>
        </div>

        <div class="author-works-section">
            <h3 class="section-title">作者作品</h3>
            <el-empty v-if="novelList.length === 0" description="该作者暂无作品" />
            <div class="novel-list" v-else>
                <div 
                  v-for="novel in novelList"
                  :key="novel.novelId"
                  class="novel-item"
                  @click="goToNovelDetail(novel.novelId)"
                >
                    <div class="novel-cover">
                        <img
                          :src="novel.coverUrl || 'https://picsum.photos/120/160?random=1'"
                          :alt="novel.title"
                          @error="e => e.target.src = 'https://picsum.photos/120/160?random=1'"
                        />
                    </div>
                    <div class="novel-info">
                        <p class="novel-title">{{ novel.title }}</p>
                        <p class="novel-author">作者：{{ authorInfo.penName || '未知作者' }}</p>
                        <p class="novel-intro">{{ novel.intro || '暂无简介' }}</p>
                        <div class="novel-meta">
                            <span>创建时间：{{ formatTime(novel.createTime) }}</span>
                            <span class="novel-status" :class="getStatusClass(novel.updateStatus)">
                              {{ getStatusText(novel.updateStatus) }}
                            </span>
                            <span>小说ID: {{ novel.novelId }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft } from '@element-plus/icons-vue';
import { ElMessage, ElEmpty } from 'element-plus';
import { UserStore } from '@/status/user';
import request from '@/utils/request';

const route = useRoute();
const router = useRouter();
const userStore = UserStore();

const authorId = route.params.id;

// 获取状态文本
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

const authorInfo = ref({
  uid: authorId,
  penName: "",
  avatar: ""
});

const novelList = ref([]);

const goBack = () => {
    router.back();
};

const goToNovelDetail = (novelId) => {
    if (!novelId) {
        ElMessage.warning('小说ID异常，无法跳转');
        return;
    }
    router.push(`/novel/detail/${novelId}`);
};


const getAuthorNovels = async () => {
    try {
        const res = await request.get(`/novel/author/works`, {
            params: { authorId: authorId }
        });
        if (res.data.code === '0') {
            const data = res.data.data;
            
            authorInfo.value = data.authorInfo || {};
            authorInfo.value.avatar = data.authorInfo?.avatarUrl || "";

            novelList.value = data.novelList || [];
        } else {
            ElMessage.warning(`获取作者作品失败：${res.data.msg}`);
        }
    } catch (error) {
        console.error('获取作者作品失败:', error);
        novelList.value = [];
    }
};

const formatTime = (time) => {
  if (!time) return '未知时间'
  const date = new Date(time)
  if (isNaN(date.getTime())) return time
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

onMounted(async () => {
    await userStore.initUserInfo();

    await getAuthorNovels();
});

</script>

<style scoped>
.author-home-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  position: relative;
}

/* 返回按钮在左上角 */
.header-back {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 99;
  margin-bottom: 0;
}

/* 作者信息区 */
.author-info-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 40px;
}

.author-avatar {
  margin-bottom: 16px;
}

.author-text-info {
  text-align: center;
}

.author-penname {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
}

.author-id {
  margin: 0;
  color: #666;
  font-size: 14px;
}

/* 作者作品区 */
.author-works-section {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.section-title {
  margin: 0;
  padding: 12px 16px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #e5e7eb;
  font-size: 18px;
  font-weight: 500;
  text-align: center;
}

.novel-list {
  padding: 16px;
}

.novel-item {
  display: flex;
  gap: 16px;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background-color 0.2s;
  align-items: center;
}

.novel-item:last-child {
  border-bottom: none;
}

.novel-item:hover {
  background-color: #f9fafb;
}

.novel-cover {
  width: 120px;
  height: 160px;
  flex-shrink: 0;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
  background-color: #e5e7eb; /* 封面占位背景色 */
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
}

.novel-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.novel-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
}

.novel-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  line-height: 1.4;
  text-align: left; /* 小说名居左 */
}

.novel-author {
  margin: 0;
  font-size: 14px;
  color: #666;
  text-align: left; /* 作者名居左 */
}

.novel-intro {
  margin: 0;
  color: #666;
  font-size: 14px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: left; /* 简介居左 */
}

.novel-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  color: #999;
  font-size: 13px;
  margin-top: 4px;
  align-items: center;
}

/* 让小说ID靠最右边 */
.novel-meta span:last-child {
  margin-left: auto;
}

/* 小说状态标签 */
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