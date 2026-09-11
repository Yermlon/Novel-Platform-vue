<template>
  <div class="novel-list-page">
    <!-- 筛选栏 -->
    <div class="filter-bar">
      <div class="filter-item">
        <span class="filter-label">类型：</span>
        <!-- 类型按钮组（替换下拉框） -->
        <el-button-group>
          <el-button 
            :type="filter.type === '' ? 'primary' : 'default'" 
            @click="selectType('')"
          >
            全部
          </el-button>
          <el-button 
            v-for="type in typeList" 
            :key="type.typeId"
            :type="filter.type === type.typeId ? 'primary' : 'default'"
            @click="selectType(type.typeId)"
          >
            {{ type.typeName }}
          </el-button>
        </el-button-group>
      </div>

      <div class="filter-item">
        <span class="filter-label">状态：</span>
        <el-button-group>
          <el-button :type="filter.updateStatus === '' ? 'primary' : 'default'" @click="selectUpdateStatus('')">全部</el-button>
          <el-button :type="filter.updateStatus === '0' ? 'primary' : 'default'" @click="selectUpdateStatus('0')">连载中</el-button>
          <el-button :type="filter.updateStatus === '1' ? 'primary' : 'default'" @click="selectUpdateStatus('1')">暂停</el-button>
          <el-button :type="filter.updateStatus === '2' ? 'primary' : 'default'" @click="selectUpdateStatus('2')">已完结</el-button>
        </el-button-group>
      </div>

      <div class="filter-item">
        <span class="filter-label">字数：</span>
        <!-- 字数按钮组（替换下拉框） -->
        <el-button-group>
          <el-button 
            :type="filter.wordCount === '' ? 'primary' : 'default'" 
            @click="selectWordCount('')"
          >
            不限
          </el-button>
          <el-button 
            :type="filter.wordCount === '100000' ? 'primary' : 'default'"
            @click="selectWordCount('100000')"
          >
            10万以下
          </el-button>
          <el-button 
            :type="filter.wordCount === '500000' ? 'primary' : 'default'"
            @click="selectWordCount('500000')"
          >
            10-50万
          </el-button>
          <el-button 
            :type="filter.wordCount === '1000000' ? 'primary' : 'default'"
            @click="selectWordCount('1000000')"
          >
            50-100万
          </el-button>
          <el-button 
            :type="filter.wordCount === '1000001' ? 'primary' : 'default'"
            @click="selectWordCount('1000001')"
          >
            100万以上
          </el-button>
        </el-button-group>
      </div>
    </div>

    <!-- 小说列表 -->
    <div class="novel-list" v-loading="listLoading">
      <!-- 空状态 -->
      <div v-if="novelList.length === 0 && !listLoading" class="empty-tip">
        <el-empty description="暂无符合条件的小说" />
      </div>
      
      <div 
        v-for="novel in novelList" 
        :key="novel.novelId" 
        class="novel-item"
        @click="goToNovelDetail(novel.novelId)"
      >
        <!-- 小说封面 -->
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
            <div class="novel-type">{{ getTypeName(novel.typeId) }}</div>
            <div class="novel-update-time">{{ formatTime(novel.updateTime) }}</div>
            <div class="novel-id">ID: {{ novel.novelId }}</div>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div class="pagination-bar" v-if="pagination.total > 0">
    <el-pagination
        v-model:current-page="pagination.current"
        v-model:page-size="pagination.size"
        :total="pagination.total"
        layout="total, prev, pager, next, jumper"
        @size-change="handlePageChange"
        @current-change="handlePageChange"
    />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import request from '@/utils/request';
import { ElMessage, ElEmpty } from 'element-plus';

const router = useRouter();

// 加载状态
const typeLoading = ref(false); // 类型列表加载中
const listLoading = ref(false); // 小说列表加载中

// 筛选条件
const filter = reactive({
  type: '',        // 选中的类型ID
  updateStatus: '',// 新增：选中的更新状态（''=全部，0=连载中，1=暂停，2=已完结）
  wordCount: ''    // 字数筛选
});

// 分页信息
const pagination = reactive({
  current: 1,      // 当前页
  size: 10,        // 每页条数
  total: 0         // 总条数
});

// 获取状态文本
const getStatusText = (status) => {
  switch (status) {
    case 0: return '连载中';
    case 1: return '暂停';
    case 2: return '已完结';
    default: return '未知';
  }
};

// 获取状态样式类
const getStatusClass = (status) => {
  switch (status) {
    case 0: return 'serial';
    case 1: return 'paused';
    case 2: return 'finished';
    default: return 'unknown';
  }
};

// ========== 核心新增：状态筛选方法 ==========
const selectUpdateStatus = (status) => {
  filter.updateStatus = status;
  handleSearch();
};

// 数据列表
const typeList = ref([]);      // 小说类型列表（从后端获取）
const novelList = ref([]);     // 小说列表

// ========== 核心方法 ==========
// 1. 获取小说类型列表（对接 /novelsType 接口）
const getNovelsType = async () => {
  typeLoading.value = true;
  try {
    const res = await request.get('/novel/novelsType');
    if (res.data.code === '0') {
      // 映射后端返回的 label/value 为前端需要的 typeId/typeName
      typeList.value = res.data.data.map(item => ({
        typeId: item.value,      
        typeName: item.label    
      })) || [];
    } else {
      ElMessage.warning(res.data.msg || '获取小说类型失败');
    }
  } catch (error) {
    console.error('获取小说类型失败：', error);
    ElMessage.error('获取小说类型失败，请重试');
  } finally {
    typeLoading.value = false;
  }
};

// 2. 获取小说列表（对接 /novel/bookStore/list 接口）
const getNovelList = async () => {
  listLoading.value = true;
  try {
    const params = {};
    // 仅当类型不为空时传递 typeId（解决400错误）
    if (filter.type) {
      params.typeId = Number(filter.type);
    }
    // 新增：传递状态参数
    if (filter.updateStatus) {
      params.updateStatus = Number(filter.updateStatus);
    }
    // 字数参数传递
    if (filter.wordCount) {
      params.wordCount = Number(filter.wordCount);
    }
    // 分页和排序参数
    params.pageNum = pagination.current;
    params.pageSize = pagination.size;
    params.sortType = "hot"; // 默认按热度排序

    console.log("最终请求参数：", params);
    const res = await request.get('/novel/bookStore/list', { params });
    
    if (res.data.code === '0') {
      novelList.value = res.data.data.novelList || res.data.data || [];
      pagination.total = res.data.data.total || novelList.value.length;
    } else {
      ElMessage.warning(res.data.msg || '获取小说列表失败');
      novelList.value = [];
    }
  } catch (error) {
    console.error('获取小说列表失败：', error);
    if (error.response?.data?.msg) {
      ElMessage.error(`后端错误：${error.response.data.msg}`);
    }
    novelList.value = [];
  } finally {
    listLoading.value = false;
  }
};

// 3. 辅助方法：根据类型ID获取类型名称
const getTypeName = (typeId) => {
  if (!typeId) return '';
  const type = typeList.value.find(item => item.typeId == typeId); 
  return type ? type.typeName : '';
};

// 4. 辅助方法：格式化字数显示
const formatWordCount = (count) => {
  if (count < 10000) {
    return `${count}字`;
  } else if (count < 100000) {
    return `${(count / 10000).toFixed(1)}万字`;
  } else {
    return `${Math.floor(count / 10000)}万字`;
  }
};

// 5. 辅助方法：格式化时间为YYYY-MM-DD HH:mm:ss
const formatTime = (timeStr) => {
  if (!timeStr) return '未知时间';
  const date = new Date(timeStr);
  if (isNaN(date.getTime())) return '未知时间';
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

// ========== 交互方法 ==========
// 选择类型
const selectType = (typeId) => {
  filter.type = typeId;
  handleSearch();
};

// 选择字数
const selectWordCount = (wordCount) => {
  filter.wordCount = wordCount;
  handleSearch();
};

// 搜索
const handleSearch = () => {
  pagination.current = 1;
  getNovelList();
};

// 分页变化
const handlePageChange = () => {
  getNovelList();
};

// 跳转到小说详情页
const goToNovelDetail = (novelId) => {
  router.push(`/novel/detail/${novelId}`);
};

// ========== 初始化 ==========
onMounted(async () => {
  await getNovelsType();
  await getNovelList();
});
</script>

<style scoped>
.novel-list-page {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

/* 筛选栏样式 */
.filter-bar {
  border: 1px solid #e0e0e0;
  padding: 15px;
  margin-bottom: 20px;
  border-radius: 4px;
}
.filter-item {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}
.filter-label {
  width: 50px;
  font-size: 16px;
}

/* 按钮组样式 */
:deep(.el-button-group) .el-button {
  border-radius: 4px;
  margin-right: 5px;
}
:deep(.el-button-group) .el-button:last-child {
  margin-right: 0;
}

/* 小说列表样式 */
.novel-list {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  min-height: 400px;
}
.novel-item {
  display: flex;
  /* 移除垂直居中，改为顶部对齐 */
  align-items: flex-start; 
  padding: 15px;
  border-bottom: 1px solid #e0e0e0;
  cursor: pointer;
  transition: background-color 0.2s;
  justify-content: flex-start;
}
.novel-item:hover {
  background-color: #f8f9fa;
}
.novel-item:last-child {
  border-bottom: none;
}

/* 封面样式 */
.novel-cover {
  width: 120px;
  height: 160px;
  margin-right: 20px;
  border: 1px solid #e0e0e0;
  flex-shrink: 0;
}

/* 左侧信息区：关键修改 */
.novel-left-info {
  flex: 1; /* 让左侧占满除封面和右侧外的空间 */
  display: flex;
  flex-direction: column;
  gap: 8px;
  /* 强制左对齐 */
  align-items: flex-start;
  text-align: left;
  /* 移除垂直居中，改为顶部对齐 */
  justify-content: flex-start;
  /* 确保内容不会溢出 */
  width: 100%;
}
.novel-title {
  font-size: 18px;
  font-weight: bold;
  /* 确保标题左对齐 */
  text-align: left;
  width: 100%;
}
/* 作者名 + 状态行 */
.novel-author-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
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
.novel-desc {
  font-size: 14px;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  text-align: left;
  width: 100%;
}
.novel-word-count {
  font-size: 12px;
  color: #999;
  margin-top: 5px;
  text-align: left;
  width: 100%;
}

/* 右侧信息区 */
.novel-right-info {
  flex: 0 0 auto; /* 改为固定宽度，不占满剩余空间 */
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  /* 右侧也改为顶部对齐，和左侧保持一致 */
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

/* 分页样式 */
.pagination-bar {
  margin-top: 20px;
  text-align: center;
}
</style>