<template>
    <div class="personal-info">
        <div class="user-card">
            <!-- 头像显示：适配后端返回的avatarUrl字段 -->
            <el-avatar :size="100" :src="user.avatarUrl|| 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png'" class="avatar">
                <span v-if="!user.avatarUrl">U</span>              
            </el-avatar>
            <div class="user-meta">
                <div class="user-uid">ID: {{ user.uid }}</div>
                <div class="user-uname">用户名：{{ user.uname }}</div>
                <div class="user-email">邮箱： {{ user.email }}</div>
            </div>
        </div>

        <div class="action-buttons">
            <!-- 隐藏的文件选择框：用于选择头像文件 -->
            <input 
                type="file" 
                ref="avatarFileInput" 
                style="display: none" 
                accept="image/jpg,image/png,image/jpeg,image/webp"
                @change="handleAvatarUpload"
            >
            <el-button type="primary" icon="el-icon-upload" @click="handleCAvatar">更改头像</el-button>
            <el-button @click="handleResetPwd">重置密码</el-button>
            <el-button @click="handleLogout">退出登录</el-button>
        </div>

        <!-- 重置密码弹窗 -->
        <el-dialog
          v-model="resetPwdDoalogVisible"
          title="重置密码"
          :close-on-click-modal="false"
        >
             <el-form
               :model="resetForm"
               :rules="resetRules"
               ref="resetFormRef"
               label-width="100px"
            >
                 <el-form-item label="验证码" prop="code">
                    <el-row :gutter="10">
                        <el-col :span="14">
                            <el-input
                               v-model="resetForm.code"
                               placeholder="请输入验证码"></el-input>
                        </el-col>
                        <el-col :span="10">
                            <el-button type="text" @click="sendResetCode" :disabled="sendingCode || codeCountdown > 0">
                                {{ codeCountdown > 0 ? `${codeCountdown}s后重新发送` : '获取验证码' }}
                            </el-button>
                        </el-col>
                    </el-row>  
                 </el-form-item>
                 <el-form-item label="新密码" prop="newPassword">
                    <el-input
                       v-model="resetForm.newPassword"
                       type="password"
                       placeholder="请输入新密码（至少6位）">
                    </el-input>
                 </el-form-item>
                 <el-form-item label="确认密码" prop="confirmPassword">
                    <el-input
                       v-model="resetForm.confirmPassword"
                       type="password"
                       placeholder="请再次输入新密码">
                    </el-input>
                 </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="resetPwdDoalogVisible = false">取消</el-button>
                <el-button type="primary" @click=confirmResetPwd>确认重置</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted} from 'vue';
import { UserStore } from '@/status/user';
import { ElMessage, ElMessageBox, ElLoading } from 'element-plus';
import { useRouter } from 'vue-router';
import axios from 'axios';
import request from '@/utils/request';

const userStore = UserStore();
const router = useRouter();
const user = computed(() => userStore.userInfo || {});

// 头像上传相关
const avatarFileInput = ref(null);
let uploadLoading = null;

// 重置密码相关
const resetPwdDoalogVisible = ref(false);
const resetFormRef = ref(null)
const sendingCode = ref(false);
const codeCountdown = ref(0);
let timer = null;

const resetForm = reactive({
    code: '',
    newPassword: '',
    confirmPassword: ''
});

const resetRules = {
    code:[
        { required: true, message:'请输入验证码',trigger: 'blur'},
        { min: 6, max: 6, message:'验证码必须为6位',trigger:'blur'}
    ],
    newPassword: [
        { required: true, message:'请输入新密码',trigger: 'blur'},
        { min: 6, message: '新密码长度至少6位',trigger: 'blur'}
    ],
    confirmPassword:[
        { required: true, message: '请确认密码',trigger: 'blur'},
        {
            validator: (rule, value,callback) => {
                if(value !== resetForm.newPassword){
                    callback(new Error('两次输入的密码不一致'));
                }else {
                    callback();
                }
            },
            trigger: 'blur'
        }
    ]
};

// 点击"更改头像"按钮：触发文件选择框
const handleCAvatar = () => {
    avatarFileInput.value.click();
};

// 选择头像文件后：执行上传逻辑
const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 1. 文件格式校验
    const acceptTypes = ['image/jpg', 'image/png', 'image/jpeg', 'image/webp'];
    if (!acceptTypes.includes(file.type)) {
        ElMessage.error('仅支持jpg/png/jpeg/webp格式的图片');
        avatarFileInput.value.value = '';
        return;
    }

    // 2. 文件大小校验（2MB）
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
        ElMessage.error('头像大小不能超过2MB');
        avatarFileInput.value.value = '';
        return;
    }

    // 3. 构建FormData
    const formData = new FormData();
    formData.append('file', file);

    // 4. 显示加载
    uploadLoading = ElLoading.service({
        lock: true,
        text: '头像上传中...',
        background: 'rgba(0, 0, 0, 0.7)'
    });

    try {
        // ✅ 修复1：用request工具，自动带/api前缀和token，请求路径为 /api/upload/avatar
        const uploadRes = await request.post('/upload/avatar', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });

        if (uploadRes.data.code !== "0") {
            ElMessage.error(uploadRes.data.msg || '头像上传失败');
            return;
        }

        const avatarUrl = uploadRes.data.data.url;
        ElMessage.success('头像上传成功');

        // ✅ 修复2：用request工具调用更新接口，路径为 /api/user/update-avatar
        const updateRes = await request.post('/user/update-avatar', {
            avatarUrl: avatarUrl
        });

        if (updateRes.data.code === "0") {
            // ✅ 修复3：规范更新本地状态，避免readonly报错
            await userStore.getCurrentUser(); // 从数据库拉取最新用户信息
            ElMessage.success('头像更新成功');
        } else {
            ElMessage.error(updateRes.data.msg || '头像更新失败');
        }
    } catch (error) {
        console.error('头像上传失败：', error);
        ElMessage.error(error.response?.data?.msg || '头像上传失败，请稍后重试');
    } finally {
        uploadLoading.close();
        avatarFileInput.value.value = '';
    }
};


// 打开重置密码弹窗
const handleResetPwd = () =>{
    resetPwdDoalogVisible.value=true;
}

// 发送重置密码验证码
const sendResetCode = async() => {
    if (!user.value.email) {
        ElMessage.error('获取用户邮箱失效');
        return;
    }

    sendingCode.value = true;
    try{
        const response = await axios({
            url: "/api/user/send-reset-code", // 🔴 加/api前缀
            method: "post",
            params: { email: user.value.email}
        });
        const res = response.data;

        if (res.code === "0") {
            ElMessage.success('验证码已发送到邮箱');
            codeCountdown.value = 60;
            timer = setInterval(() => {
                codeCountdown.value--;
                if (codeCountdown.value <= 0) {
                    clearInterval(timer);
                }
            },1000);
        }else {
            ElMessage.error(res.msg || '发送验证码失败');
        }
    }catch(error){
        console.error('发送验证码失败',error);
        ElMessage.error('发送验证码失败，请稍后重试');
    }finally{
        sendingCode.value=false;
    }
}

// 确认重置密码
const confirmResetPwd = async() => {
    if (!resetFormRef.value) return;
    try{
        await resetFormRef.value.validate();
    }catch(error){
        return;
    }

    if (!user.value.email) {
        ElMessage.error('获取用户信息失败');
        return;
    }

    try{
        const response = await axios.post('/api/user/reset-password',null,{ // 🔴 加/api前缀
            params:{
                email: user.value.email,
                code: resetForm.code,
                newPassword: resetForm.newPassword
            }
        });
        const res = response.data;

        if (res.code === "0") {
            ElMessage.success('密码重置成功，请重新登录');
            resetPwdDoalogVisible.value = false;
            resetFormRef.value.resetFields();
            userStore.logout();
            router.push('/login');
        }else{
            ElMessage.error(res.msg || '重置密码失败')
        }
    }catch(error){
        console.error('重置密码失败', error);
        ElMessage.error('重置密码失败，请稍后再试');
    }
};

// 关闭弹窗时重置状态
const handleDialogClose = () =>{
    resetFormRef.value?.resetFields();
    if (timer) {
        clearInterval(timer);
        codeCountdown.value = 0;
        timer = null;
    }
};

// 退出登录
const handleLogout = () => {
    userStore.logout();
    ElMessage.success('已退出登录');
    router.push('/');
}

onMounted(async() => {
    try{
        await userStore.getCurrentUser();
    }catch(error){
        console.error('获取用户信息失败',error);
        ElMessage.error('加载用户信息失败，请刷新页面重试');
        userStore.logout();
        router.push('/login');
    }
    
    return () => {
        if (timer) {
            clearInterval(timer);
        }
    };
});
</script>

<style scoped>
.personal-info {
    padding: 20px;
}
.user-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 30px;
}
.avatar {
    margin-bottom: 10px;
}
.user-meta {
    text-align: center;
}
.user-uid,.user-uname, .user-email{
    color: #909399;
    font-size: 14px;
    margin-bottom: 5px;
}
.action-buttons {
    display: flex;
    gap: 20px;
    justify-content: center;
    flex-wrap: wrap;
}
</style>