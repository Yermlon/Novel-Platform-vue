<template>
  <div class="audit-center">
    <!-- 标签页切换 -->
    <el-tabs v-model="activeTab" type="card" @tab-change="handleTabChange">
      <!-- 小说审核标签页（完全保留） -->
      <el-tab-pane label="小说审核" name="novel-review">
        <el-table :data="novelReviewList" border stripe>
          <el-table-column prop="novelId" label="小说ID" />
          <el-table-column prop="title" label="小说标题" />
          <el-table-column prop="authorId" label="作者ID" />
          <!-- 整体状态 -->
          <el-table-column label="整体状态">
            <template #default="scope">
              <el-tag 
                :type="scope.row.status === 'PENDING_REVIEW' ? 'warning' : scope.row.status === 'PUBLISHED' ? 'success' : 'danger'"
              >
                {{ statusMap[scope.row.status] || '未知' }}
              </el-tag>
            </template>
          </el-table-column>
          <!-- 详情修改状态 -->
          <el-table-column label="详情修改状态">
            <template #default="scope">
              <el-tag 
                :type="scope.row.pendingStatus === 'PENDING' ? 'info' : scope.row.pendingStatus === 'APPROVED' ? 'success' : scope.row.pendingStatus === 'REJECTED' ? 'danger' : 'info'"
              >
                {{ pendingStatusMap[scope.row.pendingStatus] || '无修改' }}
              </el-tag>
            </template>
          </el-table-column>
          <!-- 操作列 -->
          <el-table-column label="操作">
            <template #default="scope">
              <el-button 
                type="primary" 
                size="small" 
                @click="openNovelAuditDialog(scope.row)"
                :disabled="!scope.row.status && !scope.row.pendingStatus"
              >
                {{ 
                  scope.row.status === 'PENDING_REVIEW' ? '整体审核' : 
                  (scope.row.pendingStatus === 'PENDING') ? '详情审核' : '无审核项' 
                }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <!-- 分页 -->
        <el-pagination
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
          :current-page="pageNum"
          :page-sizes="[10, 20, 50]"
          :page-size="pageSize"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          style="margin-top: 20px; text-align: right;"
        >
        </el-pagination>
      </el-tab-pane>

      <!-- 敏感词管理标签页（适配现有接口，无新增） -->
      <el-tab-pane label="敏感词管理" name="sensitive-word">
        <div class="sensitive-word-add" style="margin-bottom: 20px;">
          <el-input v-model="newSensitiveWord" placeholder="请输入敏感词" style="width: 300px; margin-right: 10px;"></el-input>
          <el-button type="primary" @click="addSensitiveWord">添加敏感词</el-button>
        </div>
        <el-table :data="sensitiveWordList" border stripe style="margin-top: 20px;">
          <el-table-column prop="word" label="敏感词" />
          <!-- 操作列 -->
          <el-table-column label="操作">
            <template #default="scope">
              <el-button 
                type="danger" 
                size="small" 
                @click="deleteSensitiveWord(scope.row.word)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <!-- 小说审核弹窗（完全保留） -->
    <el-dialog 
      v-model="novelAuditDialogVisible" 
      :title="auditType === 'status' ? '小说整体发布审核' : '小说详情修改审核'" 
      width="60%" 
      :close-on-click-modal="false"
    >
      <el-form :model="novelAuditForm" label-width="120px">
        <el-form-item label="小说ID">
          <el-input v-model="novelAuditForm.novelId" disabled />
        </el-form-item>
        <el-form-item label="小说标题">
          <el-input v-model="novelAuditForm.title" disabled />
        </el-form-item>

        <!-- 整体审核专属字段：封面URL + 简介 + 类型ID -->
        <template v-if="auditType === 'status'">
          <el-form-item label="小说封面">
            <el-image
              :src="novelAuditForm.coverUrl"
              :preview-src-list="[novelAuditForm.coverUrl]" 
              style="width: 120px; height: 160px; object-fit: cover;"
              fit="cover"
              :preview-teleported="true"
            >
              <template #error>
                <div class="image-slot">
                  <el-icon><Picture /></el-icon>
                  <span>暂无封面</span>
                </div>
              </template>
            </el-image>
            <!-- 可选：保留URL文本展示，方便复制查看 -->
            <div class="url-tip" style="margin-top: 8px; color: #999; font-size: 12px;">
              URL: {{ novelAuditForm.coverUrl || '无' }}
            </div>
          </el-form-item>
          <el-form-item label="小说简介">
            <el-input 
              v-model="novelAuditForm.intro" 
              disabled 
              type="textarea" 
              :rows="3" 
              placeholder="小说简介" 
            />
          </el-form-item>
          <el-form-item label="小说类型ID">
            <el-input v-model="novelAuditForm.typeId" disabled placeholder="当前小说分类ID" />
          </el-form-item>
        </template>

        <!-- 详情审核专属字段：待审核封面URL + 标题 + 简介 + 类型ID -->
        <template v-if="auditType === 'pendingStatus'">
          <el-form-item label="待审核封面">
            <el-image
              :src="novelAuditForm.pendingCoverUrl"
              :preview-src-list="[novelAuditForm.pendingCoverUrl]"
              style="width: 120px; height: 160px; object-fit: cover;"
              fit="cover"
              :preview-teleported="true"
            >
              <template #error>
                <div class="image-slot">
                  <el-icon><Picture /></el-icon>
                  <span>暂无封面</span>
                </div>
              </template>
            </el-image>
            <div class="url-tip" style="margin-top: 8px; color: #999; font-size: 12px;">
              URL: {{ novelAuditForm.pendingCoverUrl || '无' }}
            </div>
          </el-form-item>
          <el-form-item label="待审核标题">
            <el-input v-model="novelAuditForm.pendingTitle" disabled placeholder="待审核标题" />
          </el-form-item>
          <el-form-item label="待审核简介">
            <el-input 
              v-model="novelAuditForm.pendingIntro" 
              disabled 
              type="textarea" 
              :rows="3" 
              placeholder="待审核简介" 
            />
          </el-form-item>
          <el-form-item label="待审核类型ID">
            <el-input v-model="novelAuditForm.pendingTypeId" disabled placeholder="待修改分类ID" />
          </el-form-item>
        </template>

        <!-- 当前状态 -->
        <el-form-item label="当前状态">
          <el-tag 
            :type="auditType === 'status' 
                ? (novelAuditForm.currentStatus === 'PENDING_REVIEW' ? 'warning' : novelAuditForm.currentStatus === 'PUBLISHED' ? 'success' : 'danger')
                : (novelAuditForm.pendingStatus === 'PENDING' ? 'info' : novelAuditForm.pendingStatus === 'APPROVED' ? 'success' : novelAuditForm.pendingStatus === 'REJECTED' ? 'danger' : 'info')"
          >
            {{ auditType === 'status' 
                ? statusMap[novelAuditForm.currentStatus] 
                : pendingStatusMap[novelAuditForm.pendingStatus] }}
          </el-tag>
        </el-form-item>

        <!-- 审核结果 -->
        <el-form-item label="审核结果" required>
          <el-radio-group v-model="novelAuditForm.result" @change="handleResultChange">
            <el-radio label="approve">通过</el-radio>
            <el-radio label="reject">驳回</el-radio>
          </el-radio-group>
        </el-form-item>

        <!-- 驳回原因 -->
        <el-form-item label="驳回原因" v-if="novelAuditForm.result === 'reject'" required>
          <el-input v-model="novelAuditForm.rejectReason" type="textarea" :rows="3" placeholder="请输入驳回原因（必填）" />
        </el-form-item>

        <!-- 审核备注 -->
        <el-form-item label="审核备注（选填）">
          <el-input v-model="novelAuditForm.remark" type="textarea" :rows="2" placeholder="管理员审核备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="novelAuditDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitNovelAudit" :loading="auditLoading">
          {{ auditLoading ? '审核中...' : '提交审核' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '@/utils/request';
import { Picture } from '@element-plus/icons-vue';

// 响应式数据
const activeTab = ref('novel-review');
const novelReviewList = ref([]);
const pageNum = ref(1);
const pageSize = ref(10);
const total = ref(0);
const auditLoading = ref(false);
const auditType = ref('');

// 状态映射（后端枚举转中文）
const statusMap = ref({
  'PENDING_REVIEW': '待审核（整体）',
  'PUBLISHED': '已发布',
  'REJECTED': '已驳回（整体）',
  'OFFLINE': '已下架'
});
const pendingStatusMap = ref({
  'PENDING': '待审核（详情）',
  'APPROVED': '详情已通过',
  'REJECTED': '详情已驳回'
});

// 小说审核弹窗表单
const novelAuditForm = ref({
  novelId: '',
  title: '',
  intro: '',
  typeId: '',          // 整体审核：小说类型ID
  coverUrl: '',        // 整体审核：小说封面URL
  pendingTypeId: '',   // 详情审核：待审核类型ID
  pendingCoverUrl: '', // 详情审核：待审核封面URL
  pendingTitle: '',    // 详情审核：待审核标题
  pendingIntro: '',    // 详情审核：待审核简介
  currentStatus: '',
  pendingStatus: '',
  result: '',
  rejectReason: '',
  remark: ''
});
const novelAuditDialogVisible = ref(false);

// 敏感词管理（仅适配现有接口）
const sensitiveWordList = ref([]);
const newSensitiveWord = ref('');

// 生命周期
onMounted(() => {
  if (activeTab.value === 'novel-review') {
    getNovelReviewList();
  } else if (activeTab.value === 'sensitive-word') {
    getSensitiveWordList();
  }
});

// 标签页切换事件
const handleTabChange = (tabName) => {
  if (tabName === 'novel-review') {
    getNovelReviewList();
  } else if (tabName === 'sensitive-word') {
    getSensitiveWordList();
  }
};

// 审核结果切换事件
const handleResultChange = () => {
  if (novelAuditForm.value.result !== 'reject') {
    novelAuditForm.value.rejectReason = '';
  }
};

// 获取小说审核列表
const getNovelReviewList = async () => {
  try {
    const res = await request({
      url: '/novel/admin/review/list',
      method: 'get',
      params: {
        pageNum: pageNum.value,
        pageSize: pageSize.value,
        status: '' // 传空，获取所有待审核数据
      }
    });
    novelReviewList.value = res.data?.data?.records || [];
    total.value = res.data?.data?.total || 0;
  } catch (error) {
    console.error("获取小说审核列表失败：", error);
    ElMessage.error('获取审核列表失败');
  }
};

// 打开小说审核弹窗
const openNovelAuditDialog = (row) => {
  // 判断审核类型
  if (row.pendingStatus === 'PENDING') {
    auditType.value = 'pendingStatus';
  } else if (row.status === 'PENDING_REVIEW') {
    auditType.value = 'status';
  } else {
    ElMessage.warning('该小说暂无待审核项');
    return;
  }
  
  // 赋值表单（包含封面URL）
  novelAuditForm.value = {
    novelId: row.novelId || '',
    title: row.title || '',
    intro: row.intro || '无',
    typeId: row.typeId || '',
    coverUrl: row.coverUrl || '', // 整体审核封面URL
    pendingTypeId: row.pendingTypeId || '',
    pendingCoverUrl: row.pendingCoverUrl || '', // 详情审核封面URL
    pendingTitle: row.pendingTitle || row.title || '',
    pendingIntro: row.pendingIntro || '无',
    currentStatus: row.status || 'PENDING_REVIEW',
    pendingStatus: row.pendingStatus || '',
    result: '',
    rejectReason: '',
    remark: ''
  };
  novelAuditDialogVisible.value = true;
};

// 提交小说审核
const submitNovelAudit = async () => {
  // 基础校验
  if (!novelAuditForm.value.result) {
    ElMessage.warning('请选择审核结果（通过/驳回）');
    return;
  }
  if (novelAuditForm.value.result === 'reject' && !novelAuditForm.value.rejectReason) {
    ElMessage.warning('驳回原因不能为空');
    return;
  }
  if (!novelAuditForm.value.novelId) {
    ElMessage.warning('小说ID不能为空');
    return;
  }

  auditLoading.value = true;
  try {
    let url = '';
    let params = {};
    
    // 区分审核类型调用接口
    if (auditType.value === 'status') {
      // 整体审核
      if (novelAuditForm.value.result === 'approve') {
        url = `/novel/review/approve/${novelAuditForm.value.novelId}`;
      } else {
        url = `/novel/review/reject/${novelAuditForm.value.novelId}`;
        params = { rejectReason: novelAuditForm.value.rejectReason };
      }
    } else {
      // 详情审核
      if (novelAuditForm.value.result === 'approve') {
        url = `/novel/review/detail/approve/${novelAuditForm.value.novelId}`;
      } else {
        url = `/novel/review/detail/reject/${novelAuditForm.value.novelId}`;
        params = { reason: novelAuditForm.value.rejectReason };
      }
    }

    // 调用接口
    const res = await request({
      url: url,
      method: 'post',
      params: params
    });

    if (res.data?.code === '0') {
      const successMsg = auditType.value === 'status' 
        ? (novelAuditForm.value.result === 'approve' ? '整体审核通过' : '整体审核驳回')
        : (novelAuditForm.value.result === 'approve' ? '详情审核通过' : '详情审核驳回');
      ElMessage.success(successMsg);
      novelAuditDialogVisible.value = false;
      await getNovelReviewList(); // 刷新列表
    } else {
      ElMessage.error(res.data?.msg || '审核失败');
    }
  } catch (error) {
    console.error("提交小说审核失败：", error);
    ElMessage.error('审核失败：' + (error.message || '网络异常'));
  } finally {
    auditLoading.value = false;
  }
};

// ========== 敏感词管理核心逻辑（仅适配现有3个接口） ==========
// 获取敏感词列表
const getSensitiveWordList = async () => {
  try {
    const res = await request({
      url: '/admin/sensitive/list',
      method: 'get'
    });
    // 适配后端返回格式：Result.success(敏感词List) → res.data.data 是敏感词数组
    if (res.data?.code === '0' && Array.isArray(res.data.data)) {
      sensitiveWordList.value = res.data.data.map(word => ({ word: word.trim() }));
    } else {
      sensitiveWordList.value = [];
    }
  } catch (error) {
    console.error("获取敏感词列表失败：", error);
    ElMessage.error('获取敏感词列表失败：' + (error.message || '网络异常'));
    sensitiveWordList.value = [];
  }
};

// 添加敏感词（调用现有/add接口）
const addSensitiveWord = async () => {
  if (!newSensitiveWord.value) {
    ElMessage.warning('请输入敏感词');
    return;
  }
  try {
    const res = await request({
      url: '/admin/sensitive/add',
      method: 'post',
      params: { word: newSensitiveWord.value.trim() }
    });
    if (res.data?.code === '0') {
      ElMessage.success('敏感词添加成功');
      newSensitiveWord.value = '';
      getSensitiveWordList(); // 刷新列表
    } else {
      // 兼容后端返回的重复/权限等提示
      ElMessage.warning(res.data?.msg || '添加失败');
    }
  } catch (error) {
    console.error("添加敏感词失败：", error);
    // 捕获后端返回的"已存在"提示
    if (error.response?.data?.msg?.includes('已存在')) {
      ElMessage.warning('该敏感词已存在');
    } else {
      ElMessage.error('添加敏感词失败：' + (error.message || '网络异常'));
    }
  }
};

// 删除敏感词（调用现有/delete接口，增加确认弹窗）
const deleteSensitiveWord = async (word) => {
  if (!word) {
    ElMessage.warning('敏感词不能为空');
    return;
  }
  try {
    // 增加确认弹窗，防止误删
    await ElMessageBox.confirm(
      `确定要删除敏感词「${word}」吗？`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    const res = await request({
      url: '/admin/sensitive/delete',
      method: 'delete',
      params: { word: word }
    });
    if (res.data?.code === '0') {
      ElMessage.success('敏感词删除成功');
      getSensitiveWordList(); // 刷新列表
    } else {
      ElMessage.error(res.data?.msg || '删除失败');
    }
  } catch (error) {
    // 排除用户取消操作的异常
    if (error !== 'cancel') {
      console.error("删除敏感词失败：", error);
      ElMessage.error('删除敏感词失败：' + (error.message || '网络异常'));
    }
  }
};

// 分页相关方法
const handleSizeChange = (val) => {
  pageSize.value = val;
  if (activeTab.value === 'novel-review') {
    getNovelReviewList();
  }
};

const handleCurrentChange = (val) => {
  pageNum.value = val;
  if (activeTab.value === 'novel-review') {
    getNovelReviewList();
  }
};
</script>

<style scoped>
.audit-center {
  padding: 20px;
}
.sensitive-word-add {
  margin-bottom: 10px;
}
.image-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: #999;
}
</style>