<template>
<div class="data-center">
    <div class="content">
        <div class="page-header">
            <h2>数据中心</h2>
        </div>
        <div class="data-dashboard">
            <div class="filter-header">
            <div class="time-filter">
                <span class="filter-label">时间筛选：</span>
                <el-radio-group v-model="timeType" @change="fetchChartData">
                <el-radio-button label="day">日</el-radio-button>
                <el-radio-button label="week">周</el-radio-button>
                <el-radio-button label="month">月</el-radio-button>
                </el-radio-group>
            </div>

            <div class="novel-select">
                <el-select
                   v-if="validNovelList.length > 0"
                   v-model="selectedNovelId"
                   placeholder="请选择小说"
                   style="width: 200px"
                   @change="fetchChartData"
                   :disabled="!validNovelList.length"
                >
                <el-option
                   v-for="novel in validNovelList"
                   :key="novel.id"
                   :label="novel.title"
                   :value="novel.id"
                ></el-option>
                </el-select>
                <div v-else style="width: 200px; color: #999">暂无小说数据</div>
            </div>
            </div>

            <div class="chart-container">
            <div ref="lineChartRef" class="chart-box"></div>
            </div>

            <div class="stats-cards">
            <div class="stat-card">
                <div class="card-title">收藏</div>
                <div class="card-value">{{ stats.collectCount }}</div>
            </div>
            <div class="stat-card">
                <div class="card-title">评论</div>
                <div class="card-value">{{ stats.commentCount }}</div>
            </div>
            <div class="stat-card">
                <div class="card-title">总阅读量</div>
                <div class="card-value">{{ stats.totalReadCount }}</div>
            </div>
            </div>
        </div>
        </div>
</div>
</template>

<script setup>
import { ref, onMounted, watch, onUnmounted, computed } from 'vue';
import * as echarts from 'echarts';
import { ElMessage } from 'element-plus';
import request from '@/utils/request';

const timeType = ref('day');
const rawNovelList = ref([]);
const selectedNovelId = ref(0);
const lineChartRef = ref(null); 
let lineChart = null;

const stats = ref({
  collectCount: 0,    
  commentCount: 0,   
  totalReadCount: 0   
});

const validNovelList = computed(() => {
    return rawNovelList.value.filter(novel => {
        return novel.status === "PUBLISHED" && novel.id && novel.title;
    });
});

const initLineChart = () => {
    if (!lineChartRef.value) return;
    if (lineChart) {
        lineChart.dispose();
    }
    lineChart = echarts.init(lineChartRef.value);
    const defaultOption = {
      title: { text: '小说阅读量趋势', left: 'center' },
      tooltip: { trigger: 'axis' },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'category', data: [] },
      yAxis: { type: 'value', name: '阅读量' },
      series: [{
        name: '章节阅读量',
        type: 'line',
        smooth: true,
        data: [],
        itemStyle: { color: '#409EFF' }
      }]
  };
  lineChart.setOption(defaultOption);
};

// 改造后的 fetchNovelList（完全对齐参考代码）
const fetchNovelList = async () => {
  try {
    const token = localStorage.getItem('token');
    const res = await request.get('/novel/list', {
      params: {
        status: 'PUBLISHED',
        pageNum: 1,
        pageSize: 100
      },
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (res.data.code === '0') {
      rawNovelList.value = res.data.data?.records || [];
      
      if (validNovelList.value.length > 0) {
        selectedNovelId.value = validNovelList.value[0].id;
        fetchChartData(); // 数据加载后立即获取图表数据
      } else {
        ElMessage.warning('您暂无已发布的小说，请先发布小说');
      }
    } else {
      ElMessage.error(`获取小说列表失败：${res.data.msg}`);
    }
  } catch (err) {
    console.error('获取小说列表异常:', err);
    ElMessage.error('获取小说列表失败，请检查网络或登录状态');
  }
};

const fetchChartData = async () => {
  if (!selectedNovelId.value || selectedNovelId.value === 0) {
    ElMessage.warning('请先选择已发布小说');
    return;
  }

  // 新增：确保图表实例初始化
  if (!lineChart) {
    initLineChart();
  }

  try {
    const [trendRes,collectRes, readRes, commentRes] = await Promise.all([
        request.get('/read/trend',{
            params: { novelId: selectedNovelId.value, timeType: timeType.value }
        }),
        request.get(`/collect/count/${selectedNovelId.value}`),
        request.get(`/read/count/${selectedNovelId.value}`),
        request.get(`/comment/count/${selectedNovelId.value}`)
    ]);

    if (trendRes.data.code === '0') {
        const trendData = trendRes.data.data;
        // 修复 ECharts 报错：补全 series 配置（避免 Unknown series undefined）
        lineChart.setOption({
            xAxis: { data: trendData.xAxisData || [] },
            series: [{
              name: '章节阅读量', // 必须保留 name/type，否则 ECharts 报错
              type: 'line',
              smooth: true,
              itemStyle: { color: '#409EFF' },
              data: trendData.seriesData || []
            }]
        });
    }
    
    stats.value = {
        collectCount: collectRes.data.code === '0' ? collectRes.data.data : 0,
        totalReadCount: readRes.data.code === '0' ? readRes.data.data.totalReadCount : 0,
        commentCount: commentRes.data.code === '0' ? commentRes.data.data : 0
    }

  } catch (error) {
    ElMessage.error('网络异常，无法获取数据');
    console.error('数据接口请求失败：', error);
  }
};

onMounted(() => {
  initLineChart();
  fetchNovelList(); // 改造后 fetchNovelList 内部已调用 fetchChartData，无需 then 链式调用
  window.addEventListener('resize', handleResize)
});

onUnmounted(() => {
    window.removeEventListener('resize', handleResize);
    if (lineChart) {
        lineChart.dispose();
        lineChart = null;
    }
});

const handleResize = () => {
    if (lineChart) {
        lineChart.resize();
    }
}
</script>

<style scoped>
.data-dashboard {
  width: 95%;
  margin: 20px auto;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e6e6e6;
}

.filter-label {
  font-size: 14px;
  font-weight: 500;
  margin-right: 10px;
  color: #333;
}

.chart-container {
  width: 100%;
  margin-bottom: 30px;
}

.chart-box {
  width: 100%;
  height: 400px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  padding: 10px;
}

.stats-cards {
  display: flex;
  gap: 20px;
  justify-content: flex-start;
}

.stat-card {
  flex: 1;
  min-width: 150px;
  max-width: 200px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  padding: 20px;
  text-align: center;
}

.card-title {
  font-size: 14px;
  color: #666;
  margin-bottom: 10px;
}

.card-value {
  font-size: 28px;
  font-weight: bold;
  color: #409EFF;
}

@media (max-width: 768px) {
  .stats-cards {
    flex-wrap: wrap;
  }
  .stat-card {
    flex: 1 1 100%;
    max-width: 100%;
  }
}
</style>