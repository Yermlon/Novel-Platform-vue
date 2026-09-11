<template>
    <div class="home-page">
        <el-carousel height="300px" indicator-position="none" class="carousel" v-if="carouselList.length > 0">
            <el-carousel-item v-for="item in carouselList" :key="item.id">
                <div class="carousel-item" @click="goToDetail(item.novelId)">
                    <img :src="item.imageUrl" :alt="item.title" class="carousel-img" />
                    <div class="carousel-title">{{ item.title }}</div>
                </div>
            </el-carousel-item>
        </el-carousel>
        <div class="carousel-placeholder" v-else>
            暂无轮播图配置
        </div>

        <div class="content-grid">
            <el-card class="card announcement-card" shadow="hover">
                <template #header>
                    <span>公告信息</span>
                </template>
                <div class="announcement-wrapper">
                    <div class="announcement-content">
                        {{ announcement.content || '暂无公告' }}
                    </div>
                    <div class="announcement-time">
                        {{ formatTime(announcement.publishedTime) || '' }}
                    </div>
                </div>
            </el-card>

            <el-card class="card new-books-card" shadow="hover">
                <template #header>
                    <span>新文推荐</span>
                </template>
                <div class="new-books-list">
                    <div class="book-item"
                      v-for="book in newBooks"
                      :key="book.novelId"
                      @click="goToDetail(book.novelId)"
                    >
                    {{ book.title }}                    
                    </div>
                </div>
            </el-card>

            <el-card class="card ranking-card" shadow="hover">
                <template #header>
                    <span>综合热度榜单</span>
                </template>
                <div class="ranking-list">
                    <div class="ranking-item"
                      v-for="(book, index) in hotRanking"
                      :key="book.novelId"
                      @click="goToDetail(book.novelId)"
                    >
                        <div class="rank-num" :class="{ top3: index < 3 }">
                            {{ index + 1 }}
                        </div>
                        <div class="rank-info">
                            <div class="rank-title">{{ book.title }}</div>
                            <div class="rank-author">{{ book.authorName }}</div>
                        </div>
                    </div>
                </div>
            </el-card>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import request from '@/utils/request';

const router = useRouter();

const carouselList = ref([]);
const announcement = ref({});
const newBooks = ref([]);
const hotRanking = ref([]);

const goToDetail = (novelId) => {
    if(!novelId) return;
    router.push(`/novel/detail/${novelId}`);
}

// 格式化时间
const formatTime = (time) => {
  if (!time) return ''
  const date = new Date(time)
  if (isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

onMounted(async () => {
    try {
        const carouselRes = await request.get('/carousel/list');
        carouselList.value = carouselRes.data.data || []

        const hotRes = await request.get('/novel/bookStore/list', {
            params: {
                pageNum: 1,
                pageSize: 10,
                typeId: 0,
                sortType: 'hot'
            }
        })
        console.log('后端返回的热度列表:', hotRes?.data?.data?.novelList);
        let hotList = hotRes?.data?.data?.novelList || [];
        hotList.sort((a, b) => {
            const aRead = a.readCount || 0;
            const bRead = b.readCount || 0;
            const aCollect = a.collectCount || 0;
            const bCollect = b.collectCount || 0;

            if (bRead !== aRead) {
                return bRead - aRead; 
            } 
            else {
                return bCollect - aCollect; 
            }
        });
        hotRanking.value = hotList.slice(0, 10);

        const newBookRes = await request.get('/novel/bookStore/list', {
          params: {
            pageNum: 1,
            pageSize: 10,
            typeId: 0,
            sortType: 'update'
          }
        })
        newBooks.value = newBookRes?.data?.data?.novelList.slice(0,10) || [];

        const announcementRes = await request.get('/announcement/latest');
        announcement.value = announcementRes.data.data || {
            content: '暂无公告',
            publishedTime: ''
        }
  } catch (error) {
    console.error('首页数据加载失败：', error)
    // 兜底模拟数据
    carouselList.value = [
      { id: 1, title: '管理员配置轮播1', imageUrl: 'https://picsum.photos/800/200?random=1', novelId: 1 },
      { id: 2, title: '管理员配置轮播2', imageUrl: 'https://picsum.photos/800/200?random=2', novelId: 2 }
    ]
    newBooks.value = [
      { novelId: 3, title: '新书上线1', coverUrl: 'https://picsum.photos/120/160?random=3' },
      { novelId: 4, title: '新书上线2', coverUrl: 'https://picsum.photos/120/160?random=4' }
    ]
    hotRanking.value = [
      { novelId: 5, title: '霸榜神作', authorName: '大神' },
      { novelId: 6, title: '次席佳作', authorName: '中神' }
    ]
  }
})
</script>

<style scoped>
.carousel-placeholder {
  height: 200px;
  line-height: 200px;
  text-align: center;
  background: #f5f5f5;
  border-radius: 8px;
  color: #999;
  margin-bottom: 20px;
}

.home-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}
.carousel {
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 20px;
  cursor: pointer;
  height: 300px; /* 保持你原来的高度 */
}
.carousel-item {
  position: relative;
  width: 100%;
  height: 100%;
  background: #000; /* 防止留白难看 */
}
.carousel-img {
  width: 100%;
  height: 100%;
  object-fit: cover; /* 图片完整显示，自适应大小 ✅ 核心 */
  object-position: center;
}
.carousel-title {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  font-size: 16px;
}
.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 20px;
}
.card {
  border-radius: 20px;
  height: 500px;
}
.announcement-card {
  display: flex;
  flex-direction: column;
}
.announcement-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.announcement-content {
  font-size: 14px;
  line-height: 1.6;
}
.announcement-time {
  font-size: 12px;
  color: #999;
  text-align: right;
  padding-top: 10px;
}

.new-books-card {
  display: flex;
  flex-direction: column;
}
.new-books-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 10px;
}
.book-item {
  font-size: 16px;
  padding: 12px 16px;
  background: #f8f9fa;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.book-item:hover {
  background: #e9ecef;
}

.ranking-card {
  display: flex;
  flex-direction: column;
}
.ranking-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 10px;
}
.ranking-item {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}
.rank-num {
  width: 28px;
  height: 28px;
  line-height: 28px;
  text-align: center;
  background: #f5f5f5;
  border-radius: 4px;
  font-size: 14px;
}
.rank-num.top3 {
  background: #f06060;
  color: white;
}
.rank-title {
  font-size: 14px;
  font-weight: 500;
}
.rank-author {
  font-size: 12px;
  color: #999;
}
</style>