<template>
  <div class="novel-read-page" :style="readStyle">
    <!-- 左侧可折叠目录栏（仅展示已发布章节） -->
    <div class="sidebar" :class="{ collapsed: isSidebarCollapsed }">
      <div class="sidebar-header">
        <el-button text @click="toggleSidebar">
          <el-icon><Menu /></el-icon>
        </el-button>
        <span v-show="!isSidebarCollapsed">目录</span>
      </div>
      <div class="chapter-list" v-show="!isSidebarCollapsed">
        <!-- 空状态提示 -->
        <div v-if="publishedChapterList.length === 0" class="empty-tip">
          暂无已发布章节
        </div>
        <div 
          class="chapter-item" 
          v-for="(item, index) in publishedChapterList" 
          :key="item.chapterId"
          :class="{ active: Number(item.chapterId) === Number(currentChapter.chapterId) }"
          @click="selectChapter(item.chapterId)"
        >
          <!-- 章节信息+进度条容器 -->
          <div class="chapter-info-wrapper">
            <!-- 章节名居左显示 -->
            <span class="chapter-name">第{{ index + 1 }}章：{{ item.title || '未命名章节' }}</span>
            <div class="chapter-intro-container">
              <div 
                class="chapter-intro" 
                :class="{ 'scroll': item.brief && item.brief.length > 15 }"
              >
                {{ item.brief || '暂无章节简介' }}
              </div>
            </div>
          </div>
            <!-- 只有进度>0的章节才显示进度条 -->
            <el-progress 
              v-if="item.readProgress > 0 && isLogin"  
              :percentage="item.readProgress" 
              :show-text="false" 
              class="chapter-progress-bar"
            />
          
          <!-- 进度>0时才显示百分比 -->
          <span class="progress-text" v-if="item.readProgress > 0 && isLogin">
            {{ item.readProgress }}%
          </span>
        </div>
      </div>
    </div>

    <!-- 右侧阅读主区域（固定大小：减去导航栏60px） -->
    <div class="main-content">
      <!-- 顶部操作栏（调整为左右分布，阅读设置在右上角） -->
      <div class="top-bar">
        <div class="top-bar-left">
          <el-button @click="goToNovelDail" icon="el-icon-arrow-left">返回</el-button>
          <el-button 
            @click="goPrevChapter" 
            icon="el-icon-arrow-up"
            :disabled="!hasPrevChapter"
          >上一章</el-button>
          <el-button 
            @click="goNextChapter" 
            icon="el-icon-arrow-down"
            :disabled="!hasNextChapter"
          >下一章</el-button>
        </div>
        <div class="top-bar-right">
          <el-button @click="openSettingDialog = true" icon="el-icon-setting">阅读设置</el-button>
        </div>
      </div>

      <!-- 核心阅读区（仅这里可滚动，固定高度） -->
      <div class="read-content" @scroll="handleScroll">
        <div class="chapter-title">
          {{ currentChapterIndex === -1 ? currentChapter.title : `第${currentChapterIndex + 1}章：${currentChapter.title}` }}
        </div>
        <div class="content-wrapper" v-html="formatContent(currentChapter.content)"></div>
      </div>
    </div>

    <!-- 阅读设置弹窗（✅ 未登录时保存按钮置灰+文字提示） -->
    <el-dialog 
      v-model="openSettingDialog" 
      title="阅读设置" 
      width="400px"
      destroy-on-close
    >
      <div class="setting-form">
        <div class="setting-item">
          <label>字体大小：</label>
          <el-slider 
            v-model="fontSize" 
            :min="12" 
            :max="30" 
            :step="1"
            show-input
          />
        </div>
        <div class="setting-item">
          <label>行高：</label>
          <el-slider 
            v-model="lineHeight" 
            :min="1.2" 
            :max="3.0" 
            :step="0.1"
            show-input
          />
        </div>
        <div class="setting-item">
          <label>背景色：</label>
          <div class="color-options">
            <div 
              v-for="color in bgColorOptions" 
              :key="color.value"
              class="color-item"
              :style="{ backgroundColor: color.value }"
              :class="{ active: bgColor === color.value }"
              @click="bgColor = color.value"
            ></div>
          </div>
        </div>
        <div class="setting-item">
          <label>文字色：</label>
          <div class="color-options">
            <div 
              v-for="color in textColorOptions" 
              :key="color.value"
              class="color-item"
              :style="{ backgroundColor: color.value }"
              :class="{ active: textColor === color.value }"
              @click="textColor = color.value"
            ></div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="openSettingDialog = false">取消</el-button>
        <!-- ✅ 未登录时按钮置灰，文字动态显示 -->
        <el-button 
          type="primary" 
          @click="saveReadSetting"
          :disabled="!isLogin"
        >
          {{ isLogin ? '保存设置' : '登录后可保存' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, onUnmounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElDialog, ElProgress } from 'element-plus';
import { Menu } from '@element-plus/icons-vue';
import request from '@/utils/request';
import { UserStore } from '@/status/user';
import { storeToRefs } from 'pinia';

const route = useRoute();
const router = useRouter();
const novelId = route.params.novelId;
const chapterId = route.params.chapterId;

const userStore = UserStore();
const { isLogin } = storeToRefs(userStore);

// ✅ 新增：登录状态调试日志（实时监听）
watch(isLogin, (newVal, oldVal) => {
  console.log(`🔐 登录状态变化：${oldVal} → ${newVal}`);
  console.log(`📦 当前userInfo：`, userStore.userInfo);
  console.log(`🔑 本地token：`, localStorage.getItem('token'));
}, { immediate: true });

const DEFAULT_SETTINGS = {
  fontSize: 17,
  bgColor: '#f8f6f2',
  textColor: '#333333',
  lineHeight: 1.8
};

const chapterList = ref([]);
const publishedChapterList = ref([]);
const currentChapter = ref({ 
  chapterId: '', 
  title: '', 
  content: '', 
  novelId: '', 
  novelTitle: '' 
});
const readProgress = ref(0);

const isSidebarCollapsed = ref(false);
const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;
};

const openSettingDialog = ref(false);
const fontSize = ref(DEFAULT_SETTINGS.fontSize);
const bgColor = ref(DEFAULT_SETTINGS.bgColor);
const textColor = ref(DEFAULT_SETTINGS.textColor);
const lineHeight = ref(DEFAULT_SETTINGS.lineHeight);

const bgColorOptions = ref([
  { value: '#f8f6f2', name: '米白' },
  { value: '#ffffff', name: '纯白' },
  { value: '#e8e8e8', name: '浅灰' },
  { value: '#f5f0e1', name: '暖黄' },
  { value: '#c5e1a5', name: '护眼绿' },
]);
const textColorOptions = ref([
  { value: '#333333', name: '深灰' },
  { value: '#000000', name: '黑色' },
  { value: '#666666', name: '中灰' },
]);

const readStyle = computed(() => ({
  '--font-size': `${fontSize.value}px`,
  '--bg-color': bgColor.value,
  '--text-color': textColor.value,
  '--line-height': lineHeight.value,
}));

const currentChapterIndex = computed(() => {
  if (publishedChapterList.value.length === 0) return -1;
  return publishedChapterList.value.findIndex(
    item => Number(item.chapterId) === Number(currentChapter.value.chapterId)
  );
});

const hasPrevChapter = computed(() => currentChapterIndex.value > 0);
const hasNextChapter = computed(() => currentChapterIndex.value < publishedChapterList.value.length - 1);

// ✅ 修改后的格式化逻辑：支持段落空行
const formatContent = (content) => {
  if (!content) return '暂无章节内容';
  if (content.includes('未携带Token') || content.includes('请先登录')) {
    return '章节内容加载中...';
  }
  const html = content
    .replace(/\n+/g, '</p><p>')
    .replace(/<br><\/p><p>/g, '</p><p>');
  
  return `<p>${html}</p>`;
};

// ===================== 统计阅读量核心方法 =====================
let hasRecordedRead = false;

const addReadRecord = async () => {
  if (hasRecordedRead) return;

  try {
    console.log(`📊 发起阅读量统计，当前登录状态：${isLogin.value}`);
    await request.post('/read', null, {
      params: { 
        novelId: novelId, 
        chapterId: currentChapter.value.chapterId 
      }    
    });
    console.log('✅ 阅读量统计成功');
    hasRecordedRead = true;
  } catch (error) {
    console.error('❌ 统计阅读量失败：', error);
  }
};

const resetReadSettings = () => {
  fontSize.value = DEFAULT_SETTINGS.fontSize;
  bgColor.value = DEFAULT_SETTINGS.bgColor;
  textColor.value = DEFAULT_SETTINGS.textColor;
  lineHeight.value = DEFAULT_SETTINGS.lineHeight;
};

const goToNovelDail = () => {
  resetReadSettings();
  router.push(`/novel/detail/${novelId}`);
};

const selectChapter = async (targetChapterId) => {
  if (Number(targetChapterId) === Number(currentChapter.value.chapterId)) return;
  await router.push(`/novel/read/${novelId}/${targetChapterId}`);
};

const goPrevChapter = () => {
  if (hasPrevChapter.value) {
    const prevChapter = publishedChapterList.value[currentChapterIndex.value - 1];
    selectChapter(prevChapter.chapterId);
  }
};

const goNextChapter = () => {
  if (hasNextChapter.value) {
    const nextChapter = publishedChapterList.value[currentChapterIndex.value + 1];
    selectChapter(nextChapter.chapterId);
  }
};

// ✅ 修复：computed只读警告 + 未登录拦截
const handleScroll = (e) => {
  console.log(`📜 滚动触发，当前登录状态：${isLogin.value}`);
  // 未登录直接拦截
  if (!isLogin.value) return;

  const { scrollTop, scrollHeight, clientHeight } = e.target;
  if (scrollHeight === clientHeight) {
    readProgress.value = 100;
  } else {
    const progress = Math.floor((scrollTop / (scrollHeight - clientHeight)) * 100);
    readProgress.value = Math.max(0, Math.min(100, progress));
  }

  // ✅ 修复：用 ref 数组的 .value 访问，避免直接修改响应式对象触发只读警告
  if (currentChapter.value.chapterId) {
    const index = publishedChapterList.value.findIndex(
      item => Number(item.chapterId) === Number(currentChapter.value.chapterId)
    );
    if (index !== -1) {
      // 用数组下标赋值，Vue 3 会正确处理响应式
      publishedChapterList.value[index].readProgress = readProgress.value;
    }
  }

  // 防抖保存
  if (window.progressTimer) clearTimeout(window.progressTimer);
  window.progressTimer = setTimeout(() => {
    saveReadProgress();
  }, 1000);
};

const getChapterList = async () => {
  try {
    console.log(`📋 获取章节列表，当前登录状态：${isLogin.value}`);
    const res = await request.get(`/chapter/list`, { params: { novelId } });
    if (res.data.code === "0" && res.data.data) {
      chapterList.value = res.data.data;
      publishedChapterList.value = res.data.data
        .filter(item => String(item.status).toUpperCase() === 'PUBLISHED')
        .sort((a, b) => (a.publishSort || 0) - (b.publishSort || 0))
        .map(item => ({ ...item, readProgress: 0, brief: item.brief || '' }));
      console.log(`✅ 章节列表加载完成，共${publishedChapterList.value.length}个已发布章节`);
    } else {
      ElMessage.warning('章节列表获取为空：' + res.data.msg);
    }
  } catch (error) {
    if (!error.message.includes('未携带Token') && !error.message.includes('401')) {
      ElMessage.error('目录加载失败：' + error.message);
    }
    console.error(`❌ 获取章节列表失败：`, error);
  }
};

const getChapterContent = async () => {
  try {
    const currentChapterId = route.params.chapterId;
    console.log(`📖 获取章节${currentChapterId}内容，当前登录状态：${isLogin.value}`);
    const res = await request.get(`/chapter/content/${currentChapterId}`);

    if (res.data.code === "0" && res.data.data) {
      const data = res.data.data;
      currentChapter.value = {
        chapterId: data.chapterId,
        title: data.title || '未命名章节',
        content: data.content || '暂无章节内容',
        novelId: data.novelId,
        novelTitle: data.novelTitle || '未知小说'
      };
      console.log(`✅ 章节内容加载完成：${data.title}`);
      addReadRecord();
    } else {
      const msg = res.data.msg || '接口返回空：章节内容获取失败';
      if (msg.includes('未携带Token') || msg.includes('请先登录')) {
        currentChapter.value.content = '章节内容加载中...';
      } else {
        currentChapter.value.content = msg;
        ElMessage.warning(msg);
      }
      console.warn(`⚠️ 获取章节内容接口返回异常：${msg}`);
    }
  } catch (error) {
    console.error('❌ 获取章节内容失败：', error);
    if (error.message.includes('未携带Token') || error.message.includes('401')) {
      currentChapter.value.content = '章节内容加载中...';
    } else {
      currentChapter.value.content = '加载失败：' + error.message;
      ElMessage.error('章节内容加载失败，请重试');
    }
  }
};

// 获取阅读设置
const getReadSetting = async () => {
  console.log(`⚙️ 尝试获取阅读设置，当前登录状态：${isLogin.value}`);
  if (!isLogin.value) {
    console.log(`⚠️ 未登录，跳过获取阅读设置`);
    return;
  }
  try {
    const res = await request.get(`/read/setting`);
    if (res.data.code === "0" && res.data.data) {
      const setting = res.data.data;
      fontSize.value = setting.fontSize || DEFAULT_SETTINGS.fontSize;
      bgColor.value = setting.bgColor || DEFAULT_SETTINGS.bgColor;
      textColor.value = setting.textColor || DEFAULT_SETTINGS.textColor;
      lineHeight.value = setting.lineHeight ? Number(setting.lineHeight) : DEFAULT_SETTINGS.lineHeight;
      console.log(`✅ 阅读设置加载成功：`, setting);
    }
  } catch (error) {
    console.error('❌ 获取阅读设置失败：', error);
  }
};

// 保存阅读设置
const saveReadSetting = async () => {
  if (!isLogin.value) { 
    ElMessage.warning('登录后可永久保存阅读设置，是否立即登录？');
    router.push({ path: '/login', query: { redirect: `/novel/read/${novelId}/${chapterId}` } });
    openSettingDialog.value = false;
    return; 
  }
  try {
    const dto = { 
      fontSize: fontSize.value, 
      bgColor: bgColor.value, 
      textColor: textColor.value, 
      lineHeight: lineHeight.value 
    };
    const res = await request.post(`/read/setting`, dto);
    if (res.data.code === "0") { 
      ElMessage.success('设置保存成功'); 
      openSettingDialog.value = false; 
    }
  } catch (error) { 
    ElMessage.error('设置保存失败，请重试'); 
    console.error('❌ 保存阅读设置失败：', error);
  }
};

// 获取阅读进度
const getReadProgress = async () => {
  console.log(`📈 尝试获取阅读进度，当前登录状态：${isLogin.value}`);
  if (!isLogin.value) {
    console.log(`⚠️ 未登录，跳过获取阅读进度`);
    return;
  }
  
  try {
    const res = await request.get(`/read/progress`, { 
      params: { 
        novelId: Number(novelId),
        chapterId: Number(chapterId) 
      } 
    });
    
    console.log("✅ 获取进度接口返回：", res.data);
    if (res.data.code === "0" && res.data.data?.progress != null) {
      readProgress.value = res.data.data.progress;
      
      setTimeout(() => {
        const contentEl = document.querySelector('.read-content');
        if (contentEl) {
          const scrollHeight = contentEl.scrollHeight - contentEl.clientHeight;
          const targetScroll = (scrollHeight * readProgress.value) / 100;
          contentEl.scrollTop = targetScroll;
          console.log("✅ 滚动到上次进度位置：", targetScroll);
        }
      }, 500);
    }
  } catch (error) { 
    console.error("❌ 获取阅读进度失败：", error);
  }
};

// 保存阅读进度
const saveReadProgress = async () => {
  console.log(`💾 尝试保存阅读进度，当前登录状态：${isLogin.value}`);
  if (!isLogin.value || !currentChapter.value.chapterId) {
    console.log(`⚠️ 未登录或无章节ID，跳过保存进度`);
    return;
  }
  
  try {
    const dto = { 
      novelId: Number(novelId), 
      chapterId: Number(currentChapter.value.chapterId), 
      progress: readProgress.value 
    };
    
    console.log("✅ 保存进度请求参数：", dto);
    const res = await request.post(`/read/progress`, dto);
    console.log("✅ 保存进度接口返回：", res.data);
    
    if (res.data.code === "0") {
      console.log(`进度保存成功：${readProgress.value}%`);
    } else {
      ElMessage.warning(`进度保存失败：${res.data.msg}`);
    }
  } catch (error) { 
    console.error("❌ 保存阅读进度失败：", error);
    ElMessage.error("进度保存失败，请重试");
  }
};

watch(isLogin, async (newVal) => {
  if (newVal) {
    console.log(`🔐 登录状态变为true，执行：获取设置+获取进度`);
    await getReadSetting();
    await getReadProgress();
  } else {
    console.log(`🔐 登录状态变为false，重置进度`);
    readProgress.value = 0;
    publishedChapterList.value.forEach(item => item.readProgress = 0);
  }
}, { immediate: false });

watch(() => route.fullPath, (newPath) => {
  if (!newPath.startsWith(`/novel/read/${novelId}`)) {
    resetReadSettings();
  }
});

onUnmounted(() => {
  resetReadSettings();
});

// ✅ 修复：等待initUserInfo完成后再发起接口请求，解决异步时序问题
onMounted(async () => {
  console.log(`🚀 页面onMounted，当前登录状态：${isLogin.value}`);
  await userStore.initUserInfo();
  console.log(`✅ initUserInfo执行完成，最终登录状态：${isLogin.value}`);
  
  if (!novelId || !chapterId) {
    ElMessage.error('缺少小说/章节ID');
    return;
  }
  
  // ✅ 等待登录状态稳定后再加载数据
  await nextTick();
  await getChapterList();
  await getChapterContent();
  
  if (isLogin.value) {
    await getReadSetting();
    await getReadProgress();
  }
});

// 监听章节变化
watch(
  () => route.params.chapterId,
  async (newChapterId) => {
    hasRecordedRead = false;
    if (!newChapterId) return;
    console.log(`🔄 章节切换为：${newChapterId}，当前登录状态：${isLogin.value}`);
    
    if (publishedChapterList.value.length === 0) {
      await getChapterList();
    }
    await getChapterContent();
    readProgress.value = 0;
    
    setTimeout(() => {
      const currentItem = publishedChapterList.value.find(
        item => Number(item.chapterId) === Number(newChapterId)
      );
      if (currentItem) currentItem.readProgress = readProgress.value;
    }, 0);

    if (isLogin.value) {
      await getReadProgress();
    }
  },
  { immediate: false }
);
</script>

<style scoped>
/* 全局样式：固定页面大小 = 视口 - 导航栏60px，页面整体不可滚动 */
.novel-read-page {
  display: flex;
  width: 100vw;
  height: calc(100vh - 60px); /* 减去顶部导航栏高度 */
  overflow: hidden; /* 页面整体不可滚动 */
  --font-size: 17px;
  --bg-color: #f8f6f2;
  --text-color: #333333;
  --line-height: 1.8;
}

/* 左侧侧边栏（固定高度，内部可滚动） */
.sidebar {
  width: 280px;
  height: 100%;
  background-color: #f5f5f5;
  border-right: 1px solid #eee;
  transition: width 0.3s ease;
  overflow-y: auto; /* 目录内部可滚动 */
}
.sidebar.collapsed {
  width: 60px;
}
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 10px 12px;
  border-bottom: 1px solid #eee;
}
.chapter-list {
  padding: 10px;
}
.empty-tip {
  padding: 20px;
  text-align: center;
  color: #999;
  font-size: 14px;
}
.chapter-item {
  padding: 8px 12px;
  margin-bottom: 4px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.chapter-info-wrapper {
  flex: 1;
  display: flex;
  align-items: center; /* 垂直居中 */
  gap: 8px;
  position: relative;
}

/* 章节名：正常大小，左侧固定宽度 */
.chapter-name {
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: left;
  flex-shrink: 0; /* 不压缩 */
  width: 120px; /* 固定宽度，避免挤压简介 */
}

/* 简介容器：限制宽度，超出隐藏 */
.chapter-intro-container {
  flex: 1;
  max-width: 100px; /* 简介最大宽度，可根据需求调整 */
  overflow: hidden;
  height: 16px; /* 和简介行高一致 */
}

/* 章节简介：小字体，默认不滚动 */
.chapter-intro {
  font-size: 11px; /* 小字体 */
  color: #666;
  white-space: nowrap;
  text-align: left;
  line-height: 16px;
  transition: transform 0.3s ease;
}

/* 激活状态下简介文字变白 */
.chapter-item.active .chapter-intro {
  color: #fff;
}

/* 超长简介：自动滚动（跑马灯） */
.chapter-intro.scroll {
  animation: scrollText 8s linear infinite; /* 8秒滚动一次，可调整 */
}

/* 滚动动画关键帧 */
@keyframes scrollText {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-100%);
  }
}

/* 鼠标悬浮暂停滚动（体验优化） */
.chapter-intro-container:hover .chapter-intro.scroll {
  animation-play-state: paused;
}

/* 进度条位置调整 */
.chapter-progress-bar {
  height: 4px;
  width: 100%;
  margin-top: 4px;
}
.progress-text {
  font-size: 12px;
  color: #666;
  white-space: nowrap;
}
.chapter-item:hover {
  background-color: #e6f7ff;
}
.chapter-item.active {
  background-color: #1890ff;
  color: white;
}
.chapter-item.active .progress-text {
  color: white;
}
.chapter-item.active .chapter-progress-bar :deep(.el-progress-bar__inner) {
  background-color: white;
}

/* 右侧主内容区（固定大小，不可滚动） */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-color);
  color: var(--text-color);
  overflow: hidden; /* 主区域不可滚动 */
}
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  background-color: rgba(255, 255, 255, 0.8);
  border-bottom: 1px solid #eee;
  gap: 10px;
  flex-shrink: 0; /* 固定高度，不被压缩 */
}
.top-bar-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.top-bar-right {
  display: flex;
  align-items: center;
}

/* 核心阅读区（仅这里可滚动，固定高度） */
.read-content {
  flex: 1;
  padding: 30px;
  overflow-y: auto; /* 只有内容区可滚动 */
  -ms-overflow-style: none;  /* IE和Edge隐藏滚动条 */
  scrollbar-width: none;     /* Firefox隐藏滚动条 */
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}
.content-wrapper {
  font-size: var(--font-size);
  line-height: var(--line-height);
  text-align: justify;
}
.content-wrapper p {
  margin-bottom: 1.5em; /* 这里控制段落之间的空行高度 */
}
.content-wrapper p:last-child {
  margin-bottom: 0;
}
/* Chrome/Safari隐藏阅读区滚动条 */
.read-content::-webkit-scrollbar {
  display: none;
}
.chapter-title {
  text-align: center;
  font-size: calc(var(--font-size) + 4px);
  font-weight: 600;
  margin-bottom: 24px;
  padding-bottom: 8px;
  border-bottom: 1px solid #eee;
}

/* 设置弹窗样式 */
.setting-form {
  padding: 10px 0;
}
.setting-item {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.color-options {
  display: flex;
  gap: 8px;
}
.color-item {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
}
.color-item.active {
  border-color: #1890ff;
}

/* ✅ 新增：置灰按钮样式 */
:deep(.el-button.is-disabled) {
  cursor: not-allowed;
  background-color: #f5f5f5 !important;
  border-color: #d9d9d9 !important;
  color: #999 !important;
}


</style>