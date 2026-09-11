<template>
  <el-card class="dashboard-card">
    <h2>数据统计看板</h2>
    <el-row :gutter="20">
      <!-- 总用户数：绑定点击事件 -->
      <el-col :span="6">
        <el-statistic 
          title="总用户数" 
          :value="stats.totalUserCount || 0" 
          @click="openRoleDialog"
          style="cursor: pointer;"
        />
      </el-col>
      <!-- 小说总数 -->
      <el-col :span="6">
        <el-statistic title="小说总数" :value="stats.totalNovelCount || 0" />
      </el-col>
      <!-- 今日日活 -->
      <el-col :span="6">
        <el-statistic title="今日日活" :value="todayDau || 0" />
      </el-col>
      <!-- 本月月活 -->
      <el-col :span="6">
        <el-statistic title="本月月活" :value="thisMonthMau || 0" />
      </el-col>
    </el-row>

    <!-- 日活趋势图表 -->
    <div ref="chartRef" class="chart-container" style="height: 400px; margin-top: 20px"></div>

    <!-- 访问量表格 -->
    <el-card title="平台访问量（含游客）" style="margin-top: 20px">
      <el-table :data="visitList" border>
        <el-table-column prop="date" label="日期" />
        <el-table-column prop="visitCount" label="访问次数" />
      </el-table>
    </el-card>

    <!-- 新增：角色统计弹窗 -->
    <el-dialog v-model="roleDialogVisible" title="用户角色分布" width="400px">
      <el-row :gutter="20">
        <el-col :span="8">
          <el-statistic title="管理员" :value="roleStats.ADMIN || 0" />
        </el-col>
        <el-col :span="8">
          <el-statistic title="作者" :value="roleStats.AUTHOR || 0" />
        </el-col>
        <el-col :span="8">
          <el-statistic title="读者" :value="roleStats.READER || 0" />
        </el-col>
      </el-row>
      <template #footer>
        <el-button @click="roleDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { ref, onMounted, nextTick, computed } from 'vue';
import * as echarts from 'echarts';
import request from '@/utils/request';
import { ElMessage } from 'element-plus';

// 原有响应式数据
const stats = ref({
  totalUserCount: 0,
  totalNovelCount: 0,
  dauData: {},
  mauData: {},
  visitData: {}
});
// 角色统计数据
const roleStats = ref({ ADMIN: 0, AUTHOR: 0, READER: 0 });
// 弹窗控制
const roleDialogVisible = ref(false);

const chartRef = ref(null);
let chartInstance = null;

// 原有计算属性（todayDau、thisMonthMau、visitList）不变
const todayDau = computed(() => {
  const dauData = stats.value.dauData || {};
  const dates = Object.keys(dauData).sort();
  return dates.length ? dauData[dates[dates.length - 1]] : 0;
});

const thisMonthMau = computed(() => {
  const mauData = stats.value.mauData || {};
  const months = Object.keys(mauData).sort();
  return months.length ? mauData[months[months.length - 1]] : 0;
});

const visitList = computed(() => {
  const visitData = stats.value.visitData || {};
  return Object.entries(visitData)
    .map(([date, count]) => ({ 
      date: date, 
      visitCount: Number(count) 
    }))
    .sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      // 降序：最新日期在最上面
      return dateB - dateA;
    });
});

// 新增：打开弹窗时获取角色统计
const openRoleDialog = async () => {
  try {
    const res = await request({
      url: '/admin/statistics/user/role',
      method: 'get'
    });
    roleStats.value = res.data.data || { ADMIN: 0, AUTHOR: 0, READER: 0 };
    roleDialogVisible.value = true;
  } catch (error) {
    ElMessage.warning('获取角色统计数据失败：' + (error.msg || error.message));
  }
};

// 原有：获取平台统计数据
const getStats = async () => {
  try {
    const res = await request({ 
      url: '/admin/statistics/platform', 
      method: 'get' 
    });
    stats.value = res.data.data || {
      totalUserCount: 0,
      totalNovelCount: 0,
      dauData: {},
      mauData: {},
      visitData: {}
    };
    renderChart();
  } catch (error) {
    ElMessage.error('获取统计数据失败：' + (error.msg || error.message));
    stats.value = {
      totalUserCount: 0,
      totalNovelCount: 0,
      dauData: {},
      mauData: {},
      visitData: {}
    };
  }
};

// 原有：渲染图表逻辑不变
const renderChart = () => {
  nextTick(() => {
    if (!chartRef.value) return;
    if (!chartInstance) {
      chartInstance = echarts.init(chartRef.value);
      window.addEventListener('resize', () => chartInstance.resize());
    }
    const dauData = stats.value.dauData || {};
    const dauEntries = Object.entries(dauData).sort((a, b) => new Date(a[0]) - new Date(b[0]));
    const xAxisData = dauEntries.map(item => item[0]);
    const yAxisData = dauEntries.map(item => item[1]);
    chartInstance.setOption({
      title: { text: '近30天日活趋势' },
      tooltip: { trigger: 'axis' },
      xAxis: { 
        type: 'category', 
        data: xAxisData,
        axisLabel: { rotate: 30 }
      },
      yAxis: { type: 'value', min: 0 },
      series: [{
        name: '日活用户数',
        type: 'line',
        data: yAxisData,
        smooth: true,
        itemStyle: { color: '#409eff' }
      }]
    });
  });
};

// 页面挂载时只加载平台统计（角色统计在点击时才加载）
onMounted(() => {
  getStats();
  // 可选：5分钟刷新一次
  setInterval(getStats, 5 * 60 * 1000);
});
</script>

<style scoped>
.dashboard-card {
  height: 100%;
}
.chart-container {
  width: 100%;
}
</style>