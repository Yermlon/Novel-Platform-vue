<template>
    <div class="author-application">
        <el-button
           v-if="!isAuthor"
           type="primary"
           @click="dialogVisible = true"
        >
           成为作者
        </el-button>
        <el-tag v-if="isAuthor" type="success">已认证作者</el-tag>
        <span class="tip-text" v-if="isAuthor">您已是作者身份，可前往创作中心进行创作</span>

        <el-dialog
           v-model="dialogVisible"
           title="成为作者"
           :width="500"
           :close-on-click-modal="false"
        >
           <el-form
              ref="formRef"
              :model="form"
              :rules="rules"
              label-width="120px"
              status-icon
            >
              <el-form-item label="作者名称" prop="penName">
                <el-input
                   v-model="form.penName"
                   placeholder="请输入您的作者名称（将用于作品展示）"
                   maxlength="12">
                </el-input>
                <div class="form-hint">作者名称需唯一,2-12个字符,支持汉字、字母、数字和下划线</div>
              </el-form-item>

              <el-form-item prop="agreeProtocol">
                <el-checkbox v-model="form.agreeProtocol">
                    我已阅读并同意《作者规范》
                    <el-link type="primary" @click.stop="showProtocol = true">
                        查看详情
                    </el-link> 
                </el-checkbox>
              </el-form-item>
            </el-form>

            <template #footer>
                <el-button @click="dialogVisible = false">取消</el-button> 
                <el-button type="primary" @click="submitApplication">确认提交</el-button>
            </template>
        </el-dialog>

        <el-dialog
           v-model="showProtocol"
           title="作者规范"
           :width="400"
           :close-on-click-modal="false"
        >
           <div class="protocol-content">
            <p>1. 禁止发布违反国家法律法规的内容（包括但不限于政治敏感、违法犯罪相关）；</p>
            <p>2. 禁止发布色情、暴力、低俗、歧视性等不良信息，维护网络环境健康；</p>
            <p>3. 保证作品原创性，禁止抄袭、搬运他人作品，引用需注明来源；</p>
            <p>4. 不得发布侵犯他人知识产权、肖像权、隐私权等合法权益的内容；</p>
            <p>5. 积极响应平台管理，配合内容审核，对违规内容及时整改；</p>
            <p>6. 作品内容需符合公序良俗，不得传播虚假信息或误导他人。</p>
           </div>
           <template #footer>
            <el-button @click="showProtocol = false">我已阅读</el-button>
           </template>
        </el-dialog>
    </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { UserStore } from '@/status/user';
// 替换为封装的 request 实例
import request from '@/utils/request';

const userStore = UserStore();
const username = computed(() => userStore.userInfo?.username || '');
const isAuthor = computed(() => {
    return userStore.userInfo?.isAuthor || userStore.userInfo?.role === 'AUTHOR';
});

const dialogVisible = ref(false);
const showProtocol = ref(false);

const form = reactive({
    penName: '',
    agreeProtocol: false
});

const rules = {
    penName: [
        { required: true, message: '请输入作者名称', trigger: 'blur' },
        { min: 2, max: 12, message: '作者名称长度为2-12个字符', trigger: 'blur' },
        {
            pattern: /^[\u4e00-\u9fa5a-zA-Z0-9_]+$/,
            message: '仅支持汉字、字母、数字和下划线',
            trigger: 'blur'
        }
    ],
    agreeProtocol: [
        {
            required: true,
            validator: (rule, value, callback) => {
                if (!value) {
                    callback(new Error('请阅读并同意《作者规范》'));
                } else {
                    callback();
                }
            },
            trigger: 'change'
        }
    ]
};

const formRef = ref(null);

const submitApplication = async () => {
    try {
        await formRef.value.validate();
    } catch (error) {
        ElMessage.error('表单验证失败，请检查填写内容');
        return;
    }

    try {
        // 使用封装的 request 发起请求，自动携带 Token
        const response = await request.post('/user/apply-author', {
            penName: form.penName
        });

        if (response.data.code === '0') {
            ElMessage.success('恭喜，已成为作者！');

            // 使用 $patch 更新 Pinia 状态，确保响应式
            userStore.$patch({
                userInfo: {
                    ...userStore.userInfo,
                    role: 'AUTHOR',
                    penName: form.penName
                }
            });

            dialogVisible.value = false;
        } else {
            ElMessage.error(response.data.msg || '申请失败');
        }
    } catch (error) {
        console.error('成为作者失败', error);
        ElMessage.error('系统异常，请稍后重试');
    }
};

</script>

<style scoped>
.form-hint {
    color: #666;
    font-size: 12px;
    margin-top: 5px;
}
.protocol-content {
    line-height: 1.8;
    max-height: 300px;
    overflow-y: auto;
    padding-right: 10px;
}
.protocol-content p {
    margin: 10px 0;
}
.el-form-item__error {
    color: #f56c6c;
    font-size: 12px;
}
.author-tip {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    color: #666;
}
.tip-text {
    margin-top: 4px;
}
</style>