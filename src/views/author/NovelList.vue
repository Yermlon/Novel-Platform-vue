<template>
    <div class="novels-list">
        <el-form class="search-form" inline @submit.prevent="handleSearch">
            <el-form-item label="作品名称">
                <el-input 
                   v-model="searchForm.name"
                   placeholder="请输入作品名称"
                   @clear="handleSearch"
                   clearable 
                   @input="handleSearchDebounce" />
            </el-form-item>
            <el-form-item label="状态">
                <el-select
                   v-model="searchForm.status"
                   placeholder="请选择状态"
                   @change="handleSearch"
                   clearable>
                   <el-option label="草稿" value="DRAFT" />
                   <el-option label="审核中" value="PENDING_REVIEW" />
                   <el-option label="审核驳回" value="REJECTED" />
                   <el-option label="已发布" value="PUBLISHED" />
                   <el-option label="下架" value="OFFLINE" />
                </el-select>
                <span class="status-label" v-if="searchForm.status">
                    (当前选择：{{ statusMap[searchForm.status] }}) 
                </span>
            </el-form-item>
            
            <el-form-item>
                <el-button @click="resetSearchForm" icon="Refresh">重置</el-button>
            </el-form-item>
            <el-form-item>
                <el-button type="success" @click="openCreateDialog" icon="Plus">新建小说</el-button>
            </el-form-item>
        </el-form>

        <el-table
           :data="novelsList"
           :border="true"
           style="width: 100%; margin-top: 16px;"
           stripe
           v-loading="loading"
        >
           <el-table-column label="封面" width="80">
            <template #default="scope">
                <el-image
                   :src="scope.row.coverUrl"
                   fit="cover"
                   style="width: 50px; height: 70px;"
                   placeholder="暂无封面"
                   :error="() => scope.row.coverUrl = ''" />
            </template>
           </el-table-column>
           <el-table-column label="小说名" prop="title" />
           <el-table-column label="类型" width="100" >
            <template #default="scope">
                {{ novelsTypeList.find(item => item.value === scope.row.typeId)?.label || '未知类型' }}
            </template>
            </el-table-column>
           <el-table-column label="状态" prop="status" width="100">
            <template #default="scope">
                <el-tag :type="getStatusTagType(scope.row.status)">
                    {{ statusMap[scope.row.status] || scope.row.status }}
                </el-tag>

                <div v-if="scope.row.pendingStatus && ['PENDING', 'REJECTED'].includes(scope.row.pendingStatus)" class="detail-review-status" style="margin-top: 4px;">
                    <el-tag
                       :type="getSReviewDetailType(scope.row.pendingStatus)"
                       size="small">
                       {{ pendingStatusMap[scope.row.pendingStatus]  || scope.row.pendingStatus}}
                    </el-tag>
                </div>

                <el-tag v-if="scope.row.status === 'PUBLISHED'" type="success" size="small" class="sub-status-tag" style="margin-left:8px;">
                    {{ subStatusMap[scope.row.updateStatus] || '连载' }}
                </el-tag>
            </template>
            </el-table-column>
           <el-table-column label="更新时间" prop="updateTime" width="180" >
            <template #default="scope">
                {{ scope.row.updateTime ? dayjs(scope.row.updateTime).format('YYYY-MM-DD HH:mm:ss') : '-' }}
            </template>
           </el-table-column>
           <el-table-column label="操作" width="120">
            <template #default="scope">
                <el-button
                   v-if="['DRAFT','PUBLISHED'].includes(scope.row.status)"
                   type="primary"
                   size="small"
                   @click="openEditDialog(scope.row)">
                   编辑
                </el-button>
                <el-button
                   v-if="['DRAFT','OFFLINE'].includes(scope.row.status)"
                   type="danger"
                   size="small"
                   @click="openDeleteConfirm(scope.row)">
                   删除
                </el-button>
                <el-button
                   v-if="['PUBLISHED'].includes(scope.row.status)"
                   type="danger"
                   size="small"
                   @click="offline(scope.row)">
                   下架
                </el-button>
                <el-button
                   v-if="['DRAFT'].includes(scope.row.status)"
                   type="primary"
                   size="small"
                   @click="submitReview(scope.row)" >
                   提交审核
                </el-button>
                <el-button
                   v-if="['REJECTED'].includes(scope.row.status)"
                   type="warning"
                   size="small"
                   @click="openEditDialog(scope.row)">
                   重新编辑
                </el-button>
                <el-button
                   v-if="['REJECTED'].includes(scope.row.status)"
                   type="primary"
                   size="small"
                   @click="submitReview(scope.row)">
                   重新提交审核
                </el-button>
            </template>
           </el-table-column>
        </el-table>

        <el-pagination 
           @size-change="handleSizeChange"
           @current-change="handleCurrentChange"
           :current-page="pagination.currentPage"
           :page-sizes="[5, 10, 20]"
           :page-size="pagination.pageSize"
           layout="total, sizes, prev, pager, next, jumper"
           :total="pagination.total"
           style="margin-top: 16px; text-align: right;  " />

        <el-dialog
           v-model="dialogVisible"
           :title="isEdit ? '编辑作品' : '新建作品'"
           width="600px"
           @close="resetForm">
           <el-form
              ref="novelsFormRef"
              :model="novelsForm"
              :rules="novelsRules"
              label-width="100px"
            >
              <el-form-item v-if="isEdit && novelsForm.originalStatus === 'PUBLISHED'" >
                <el-tag
                   v-if="pendingStatus === 'PENDING'"
                   type="warning"
                   style="width: 100%;text-align: center;">
                   详情修改审核中   
                </el-tag>
                <el-tag
                   v-if="pendingStatus === 'REJECTED'"
                   type="danger"
                   style="width: 100%;text-align: center;">
                   详情审核驳回：{{ reviewRejectReason }}
                </el-tag>
                <el-tag
                   v-if="pendingStatus === 'APPROVED'"
                   type="success"
                   style="width: 100%;text-align: center;">
                   详情修改已生效
                </el-tag>
              </el-form-item>
             
              <el-form-item label="小说名" prop="title" >
                <el-input v-model="novelsForm.title" placeholder="请输入小说名" />
              </el-form-item>
              <el-form-item label="作品类型" prop="typeId">
                <el-select v-model="novelsForm.typeId" placeholder="请选择作品类型" clearable>
                    <el-option v-for="type in novelsTypeList"
                               :key="type.value"
                               :label="type.label"
                               :value="type.value"/>
                </el-select>
              </el-form-item>
              <el-form-item label="更新状态" prop="updateStatus" v-if="isEdit && novelsForm.originalStatus == 'PUBLISHED'">
                <el-select v-model="novelsForm.updateStatus" placeholder="请选择更新状态" :disabled="novelsForm.originalStatus === 'PUBLISHED' && originalUpdateStatus === 'FINISHED'">
                    <el-option label="连载" value="SERIALIZING" />
                    <el-option label="完结" value="FINISHED" />
                    <el-option label="暂停" value="PAUSED" />
                </el-select>
              </el-form-item>
              <el-form-item label="小说简介" prop="intro">
                <el-input
                   v-model="novelsForm.intro"
                   type="textarea"
                   :rows="4"
                   placeholder="请输入小说简介（最多300字）"
                   maxlength="300"
                   show-word-limit
                   @blur="() => novelsFormRef.value?.validateField('intro')" />
              </el-form-item>
              <el-form-item label="驳回原因" v-if="novelsForm.rejectReason">
                <el-tag type="danger" style="width: 100%;">
                上次审核驳回原因：{{ novelsForm.rejectReason }}
                </el-tag>
              </el-form-item>
              <el-form-item label="驳回原因" v-if="novelsForm.reviewRejectReason">
                <el-tag type="danger" style="width: 100%;">
                上次审核驳回原因：{{ novelsForm.reviewRejectReason }}
                </el-tag>
              </el-form-item>
              <!-- 修复后的封面上传组件 -->
              <el-form-item label="作品封面" prop="coverUrl">
                <el-upload
                    list-type="picture-card"
                    :http-request="customUpload"
                    :on-success="handleCoverUpload"
                    :before-upload="beforeCoverUpload"
                    :file-list="coverFileList"
                    :on-remove="handleCoverRemove"
                    :limit="1"
                    :auto-upload="true"
                    :show-file-list="true"
                    action="javascript:void(0)">
                    <!-- ✅ 只有封面为空时才显示加号 -->
                    <el-icon v-if="coverFileList.length === 0"><Plus /></el-icon>
                </el-upload>
              </el-form-item>
           </el-form>
           <template #footer>
            <el-button @click="dialogVisible = false">取消</el-button>
            <el-button 
               type="primary" 
               @click="isEdit && novelsForm.originalStatus === 'PUBLISHED' ? submitDetailReview() : submitForm()"
               :disabled="pendingStatus === 'PENDING'">
               <template v-if="isEdit">
                <template v-if="novelsForm.originalStatus === 'PUBLISHED'">
                    {{ pendingStatus === 'REJECTED' ? '重新提交审核' : '提交审核' }}
                </template>
                <template v-else>
                    保存
                </template>
               </template>
               <template v-else>
                创建
               </template>
            </el-button>
           </template>
        </el-dialog>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { dayjs, ElMessage, ElMessageBox } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import debounce from 'lodash.debounce';
import request from '@/utils/request';
// 额外引入axios（兜底用）
import axios from 'axios';

const loading = ref(false);

const searchForm = ref({
    name: '',
    typeId: '',
    status: ''
});

// 封面文件列表
const coverFileList = ref([]);

const statusMap = {
    'DRAFT': '草稿',
    'PENDING_REVIEW': '审核中',
    'REJECTED': '审核驳回',
    'PUBLISHED': '已发布',
    'OFFLINE': '已下架'
}

const pendingStatusMap = {
    'PENDING': '审核中',
    'APPROVED': '审核通过',
    'REJECTED': '审核驳回'
}

const subStatusMap = {
    '0': '连载',
    '2': '完结',
    '1': '暂停'
}

const pagination = reactive({
    currentPage: 1,
    pageSize: 10,
    total: 0,
});

const novelsList = ref([]);
const novelsTypeList = ref([]);
const originalUpdateStatus = ref('');
const pendingStatus = ref('');
const reviewRejectReason = ref('');

const dialogVisible = ref(false);
const isEdit = ref(false);
const novelsFormRef = ref(null);

const novelsForm = reactive({
    id: '',
    title: '',
    typeId: '',
    originalStatus: '',
    updateStatus: '',
    status: '',
    coverUrl: '',
    intro: '',
    rejectReason: '',
    reviewRejectReason: ''
});

// 表单校验规则
const novelsRules = reactive({
    title: [
        { required: true, message: '请输入小说名', trigger: 'blur' },
        { min: 2, max: 15, message: '长度在2到15个字符间', trigger: 'blur' },
    ],
    typeId: [
        { required: true, message: '请选择作品类型', trigger: 'change' },
    ],
    intro: [
        { required: true, message: '请输入小说简介', trigger: 'blur' },
        { max: 300, message: '简介长度不能超过300字', trigger: 'blur' }
    ],
    updateStatus: [
        { required: true, message: '请选择更新状态', trigger: 'change' }
    ],
    coverUrl: [
        { required: true, message: '请上传作品封面', trigger: 'change' }
    ]
});

// ========== 核心修复：自定义上传方法 ==========
const customUpload = async (options) => {
  const { file, onSuccess, onError } = options;
  const formData = new FormData();
  formData.append('file', file);

  const token = localStorage.getItem('token');
  console.log('【上传调试】当前Token:', token);

  try {
    const res = await request.post('/upload/novelCover', formData);
    console.log('【上传调试】接口返回:', res.data);
    
    // ✅ 修复：只传递真正的响应体，且保证 fileList 格式正确
    onSuccess(res.data, file, [{
      uid: file.uid,
      name: file.name,
      status: 'success',
      url: res.data.data?.url || ''
    }]); 
    
  } catch (err) {
    console.error('【上传调试】失败详情:', err);
    onError(err);
    const errMsg = err.response?.data?.msg || err.message || '封面上传失败，请检查登录状态';
    ElMessage.error(`上传失败：${errMsg}`);
  }
};

onMounted(() => {
    getNovelsTypeList();
    getNovelsList();
});

// 获取小说类型列表
const getNovelsTypeList = async () => {
    try {
        const res = await request.get('/novel/novelsType');
        if (res.data.code === '0') {
            novelsTypeList.value = res.data.data;
        } else {
            ElMessage.error(res.data.msg || '获取作品类型失败');
            novelsTypeList.value = [
                { label: '玄幻', value: '玄幻' },
                { label: '都市', value: '都市' },
                { label: '言情', value: '言情' },
                { label: '科幻', value: '科幻' },
            ];
        }
    } catch (error) {
        console.error('获取作品类型失败：', error);
        ElMessage.error('网络异常，获取作品类型失败');
    }
};

// 获取小说列表
const getNovelsList = async () => {
    loading.value = true;
    try {
        const params = {
            pageNum: pagination.currentPage,
            pageSize: pagination.pageSize,
        };
        if (searchForm.value.name?.trim()) {
            params.name = searchForm.value.name.trim();
        }
        if (searchForm.value.status?.trim()) {
            params.status = searchForm.value.status.trim();
        }
        const res = await request.get('/novel/list', { params });

        if (res.data.code === '0') {
            novelsList.value = res.data.data.records || [];
            pagination.total = res.data.data.total || 0;
            
            const hasFilter = !!searchForm.value.name || !!searchForm.value.status;
            if (novelsList.value.length === 0) {
                ElMessage.info(hasFilter ? '未找到符合条件的小说，请调整筛选条件' : '当前暂无小说数据');
            }
        } else {
            ElMessage.error(res.data.msg || '获取作品列表失败');
            novelsList.value = [];
            pagination.total = 0;
        }
    } catch (error) {
        console.error('获取作品列表失败：', error);
        ElMessage.error('网络异常，获取作品列表失败');
        novelsList.value = [];
        pagination.total = 0;
    } finally {
        loading.value = false;
    }
};

// 搜索防抖
const handleSearchDebounce = debounce(() => {
    pagination.currentPage = 1;
    getNovelsList();
}, 300);

// 处理搜索
const handleSearch = () => {
    pagination.currentPage = 1;
    getNovelsList();
    const filterDesc = [];
    if (searchForm.value.name) filterDesc.push(`作品名称: ${searchForm.value.name}`);
    if (searchForm.value.status) filterDesc.push(`作品状态: ${statusMap[searchForm.value.status] || searchForm.value.status}`);
    const filterText = filterDesc.length > 0 ? filterDesc.join(' | ') : '全部';
};

// 重置搜索表单
const resetSearchForm = () => {
    searchForm.value = {
        name: '',
        status: ''
    };
    pagination.currentPage = 1;
    getNovelsList();
};

// 打开创建弹窗
const openCreateDialog = () => {
    isEdit.value = false;
    dialogVisible.value = true;
    resetForm();
};

// 打开编辑弹窗
const openEditDialog = async (row) => {
    isEdit.value = true;
    dialogVisible.value = true;
    novelsForm.id = row.id;
    novelsForm.title = row.title;
    novelsForm.typeId = row.typeId;
    novelsForm.originalStatus = row.status;
    novelsForm.rejectReason = row.rejectReason || '';
    novelsForm.reviewRejectReason = row.reviewRejectReason || '';
    novelsForm.coverUrl = row.coverUrl;
    novelsForm.intro = row.intro;

    // 处理更新状态
    const updateStatusInt = row.updateStatus;
    if (updateStatusInt === 0) {
        originalUpdateStatus.value = 'SERIALIZING';
        novelsForm.updateStatus = 'SERIALIZING';
    } else if (updateStatusInt === 1) {
        originalUpdateStatus.value = 'PAUSED';
        novelsForm.updateStatus = 'PAUSED';
    } else if (updateStatusInt === 2) {
        originalUpdateStatus.value = 'FINISHED';
        novelsForm.updateStatus = 'FINISHED';
    } else {
        originalUpdateStatus.value = 'SERIALIZING';
        novelsForm.updateStatus = 'SERIALIZING';
    }
    
    // 回显封面
    if (row.coverUrl) {
        coverFileList.value = [{ url: row.coverUrl, name: 'cover.png', status: 'success' }];
    } else {
        coverFileList.value = [];
    }

    // 获取审核详情
    if (row.status === 'PUBLISHED') {
        try {
            const res = await request.get(`/novel/review/detail/${row.id}`);
            console.log('审核详情接口返回:', res.data);
            if (res.data.code === '0') {
                pendingStatus.value = res.data.data.PendingStatus;
                reviewRejectReason.value = res.data.data.reviewRejectReason;
                if (['PENDING','REJECTED'].includes(pendingStatus.value)) {
                    novelsForm.title = res.data.data.pendingTitle || row.title;
                    novelsForm.intro = res.data.data.pendingIntro || row.intro;
                    novelsForm.coverUrl = res.data.data.pendingCoverUrl || row.coverUrl;
                    novelsForm.typeId = res.data.data.pendingTypeId || row.typeId;
                }
            }
        } catch (error) {
            console.error('获取详情审核状态失败', error);
        }
    }
};

// 分页大小改变
const handleSizeChange = (val) => {
    pagination.pageSize = val;
    getNovelsList();
};

// 当前页改变
const handleCurrentChange = (val) => {
    pagination.currentPage = val;
    getNovelsList();
};

// 重置表单
const resetForm = () => {
    if (novelsFormRef.value) {
        novelsFormRef.value.resetFields();
    }
    Object.assign(novelsForm, {
        id: '',
        title: '',
        typeId: '',
        originalStatus: '',
        updateStatus: '',
        rejectReason: '',
        reviewRejectReason: '',
        coverUrl: '',
        intro: ''
    });
    pendingStatus.value = '';
    reviewRejectReason.value = '';
    originalUpdateStatus.value = '';
    coverFileList.value = [];
};

// 提交表单
const submitForm = async () => {
    if (!novelsFormRef.value) return;

    // 已完结作品禁止修改简介
    if (isEdit.value && novelsForm.originalStatus === 'PUBLISHED' && originalUpdateStatus.value === 'FINISHED') {
        ElMessage.warning('该作品已完结，无法修改简介');
        return;
    }

    try {
        // 动态调整校验规则：编辑时有封面则移除封面必填
        let validateFields = ['title', 'typeId', 'intro'];
        if (isEdit.value && novelsForm.originalStatus === 'PUBLISHED') {
            validateFields = ['title', 'typeId', 'intro', 'updateStatus'];
        }
        // 新建小说或编辑时无封面，需要校验封面
        if (!isEdit.value || (isEdit.value && !novelsForm.coverUrl)) {
            validateFields.push('coverUrl');
        }

        await novelsFormRef.value.validateField(validateFields);
        loading.value = true;

        // 完结确认
        if (isEdit.value && novelsForm.originalStatus === 'PUBLISHED' && novelsForm.updateStatus === 'FINISHED') {
            try {
                await ElMessageBox.confirm(
                    '确定要将该作品设置为[完结]吗？完结后将无法修改为其他更新状态',
                    {
                        confirmButtonText: '确定',
                        cancelButtonText: '取消',
                        type: 'warning'
                    }
                );
            } catch (error) {
                loading.value = false;
                return;
            }
        }
        
        // 构造提交数据
        let submitData = {
            title: novelsForm.title,
            typeId: novelsForm.typeId,
            intro: novelsForm.intro,
            coverUrl: novelsForm.coverUrl || 'https://placeholder.pics/svg/120x160/暂无封面',
        };
        
        if (isEdit.value && novelsForm.originalStatus === 'REJECTED') {
            submitData.rejectReason = '';
        } 
        
        if (isEdit.value && novelsForm.originalStatus === 'PUBLISHED') {
            submitData.updateStatus = novelsForm.updateStatus;
        }

        console.log('提交数据：', submitData);

        // 发送请求
        let res;
        if (isEdit.value) {
            res = await request.post(`/novel/edit/${novelsForm.id}`, submitData);
        } else {
            res = await request.post('/novel/create', submitData);
        }

        if (res.data.code === '0') {
            const successMsg = isEdit.value 
                ? (novelsForm.originalStatus === 'REJECTED' ? '修改作品成功，请重新提交审核' : '编辑作品成功') 
                : '新建作品成功';
            ElMessage.success(successMsg);
            dialogVisible.value = false;
            getNovelsList();
        } else {
            const errorMsg = res.data.msg || (isEdit.value ? '编辑失败' : '创建失败');
            ElMessage.error(errorMsg);
        }
    } catch (error) {
        console.error('提交作品失败', error);
        ElMessage.error(error.name === 'ValidationError' ? '表单填写不完整，请完善必填项' : '网络异常，提交失败');
    } finally {
        loading.value = false;
    }
};

// 提交详情审核
const submitDetailReview = async () => {
    if (!novelsFormRef.value) return;

    try {
        const validateFields = ['title', 'typeId', 'intro', 'updateStatus'];
        // 无封面时校验封面
        if (!novelsForm.coverUrl) {
            validateFields.push('coverUrl');
        }
        
        await novelsFormRef.value.validateField(validateFields);

        try {
            await ElMessageBox.confirm(
                '确定提交详情修改审核吗？审核期间读者端将显示旧简介，审核通过后新简介生效',
                {
                    confirmButtonText: '确定',
                    cancelButtonText: '取消',
                    type: 'info'
                }
            );
        } catch (cancelError) {
            // 用户点击取消，直接返回，不打印任何错误
            console.log('用户取消了详情审核提交');
            return;
        }

        loading.value = true;
        const submitData = {
            title: novelsForm.title,
            typeId: novelsForm.typeId,
            intro: novelsForm.intro,
            coverUrl: novelsForm.coverUrl || 'https://placeholder.pics/svg/120x160/暂无封面',
            updateStatus: novelsForm.updateStatus
        };

        const res = await request.post(`/novel/edit/${novelsForm.id}`, submitData);
        if (res.data.code === '0') {
            ElMessage.success('详情修改已提交审核，请等待平台审核');
            dialogVisible.value = false;
            getNovelsList();
        } else {
            ElMessage.error(res.data.msg || '提交审核失败');
        }
    } catch (error) {
        console.error('提交详情审核失败', error);
        if (error.name !== 'CanceledError') {
            ElMessage.error('提交审核失败，请稍后重试');
        }
    } finally {
        loading.value = false;
    }
};

// 删除确认
const openDeleteConfirm = async (row) => {
    try {
        await ElMessageBox.confirm(
            `确定要删除作品 《${row.title}》吗？删除后不可恢复！`,
            {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning',
            }
        );
        const res = await request.delete(`/novel/delete/${row.id}`);
        if (res.data.code === '0') {
            ElMessage.success('删除作品成功');
            getNovelsList();
        } else {
            ElMessage.error(res.data.msg || '删除作品失败');
        }
    } catch (error) {
        console.error('删除作品失败: ', error);
        ElMessage.error('删除作品失败');
    }
};

// 下架小说
const offline = async (row) => {
    try {
        await ElMessageBox.confirm(
            `确定要下架作品《${row.title}》吗？下架后将无法显示在书城`,
            {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning',
            }
        );
        const res = await request.post(`/novel/offline/${row.id}`);
        if (res.data.code === '0') {
            ElMessage.success('下架作品成功');
            getNovelsList();
        } else {
            ElMessage.error(res.data.msg || '下架作品失败');
        }
    } catch (error) {
        console.error('下架作品失败：', error);
        ElMessage.error('下架作品失败');
    }
};

// 提交审核
const submitReview = async (row) => {
    try {
        const confirmText = row.status === 'REJECTED'
            ? `确定重新提交作品《${row.title}》审核吗？请确认已修改驳回问题`
            : `确定要提交作品《${row.title}》吗？提交后将进入平台审核队列，不可随意修改`;

        await ElMessageBox.confirm(confirmText,
            {
                confirmButtonText: '确定提交',
                cancelButtonText: '取消',
                type: 'info'
            }
        );
        const res = await request.post(`/novel/submit-review/${row.id}`);
        if (res.data.code === '0') {
            ElMessage.success(row.status === 'REJECTED' ? '重新提交审核成功' : '成功提交审核');
            getNovelsList();
        } else {
            ElMessage.error(res.data.msg || '提交审核失败');
        }
    } catch (error) {
        console.error('提交审核失败：', error);
        ElMessage.error('提交审核失败');
    }
};

// 封面上传成功处理
const handleCoverUpload = (response, file, fileList) => {
  console.log('上传回调响应:', response);
  
  if (response === undefined) return;
  if (!response || typeof response !== 'object') {
    ElMessage.error('上传数据异常');
    return;
  }
  
  if (response.code === '0') {
    const coverUrl = response.data?.url || '';
    if (!coverUrl) {
      ElMessage.error('封面URL为空');
      return;
    }
    novelsForm.coverUrl = coverUrl;
    // 上传成功后，列表里只有这一张封面
    coverFileList.value = [{
      name: file.name,
      url: coverUrl,
      status: 'success',
      uid: file.uid
    }];
    ElMessage.success('封面上传成功');
  } else {
    ElMessage.error(`封面上传失败：${response.msg || '未知错误'}`);
    coverFileList.value = [];
    novelsForm.coverUrl = '';
  }
};

// 移除封面
const handleCoverRemove = () => {
  novelsForm.coverUrl = '';
  coverFileList.value = []; // 清空后，组件恢复可点击
};

// 上传前校验
const beforeCoverUpload = (file) => {
    const isImage = file.type.startsWith('image/');
    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isImage) {
        ElMessage.error('只能上传图片格式！');
    }
    if (!isLt2M) {
        ElMessage.error('封面图片大小不能超过 2MB！');
    }
    return isImage && isLt2M;
};

// 状态标签类型
const getStatusTagType = computed(() => (status) => {
    switch (status) {
        case 'PENDING_REVIEW':
            return 'primary';
        case 'PUBLISHED':
            return 'success';
        case 'DRAFT':
            return 'warning';
        case 'REJECTED':
            return 'danger';
        case 'OFFLINE':
            return 'danger';
        default:
            return 'info';
    }
});

// 详情审核状态标签类型
const getSReviewDetailType = computed(() => (status) => {
    switch (status) {
        case 'PENDING':
            return 'primary';
        case 'APPROVED':
            return 'success';
        case 'REJECTED':
            return 'danger';
        default:
            return 'info';
    }
});
</script>

<style scoped>
.novels-list {
    padding: 20px;
    background-color: #fff;
    min-height: calc(100% - 40px);
    box-sizing: border-box;
}

.search-form {
    padding: 10px;
    background-color: #f5f7fa;
    border-radius: 4px;
}

.el-upload--picture-card {
    width: 120px;
    height: 160px;
}

.el-upload_text {
    margin-top: 8px;
    font-size: 12px;
}

.reject-reason {
    font-size: 11px;
    color: #f56c6c;
    margin-top: 4px;
    padding: 2px 4px;
    background-color: #fef0f0;
    border-radius: 2px;
}

.detail-review-status {
    margin-top: 4px;
}

.sub-status-tag {
    margin-left: 8px !important;
}
/* 当有封面时，禁用上传区域的点击 */
:deep(.el-upload--picture-card:last-child) {
  pointer-events: none; /* 禁止点击 */
  opacity: 0.6; /* 视觉上变灰，提示不可用 */
}
/* 当封面为空时，恢复上传区域的点击 */
:deep(.el-upload--picture-card:last-child:only-child) {
  pointer-events: auto;
  opacity: 1;
}
</style>