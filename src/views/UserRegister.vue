<template>
    <div>
        <el-card class="box-card">
            <h2>注册</h2>
            <el-form
                :model="ruleForm"
                status-icon
                :rules="rules"
                ref="ruleFormRef"
                label-position="left"
                label-width="80px"
                class="register"
            >
                <el-form-item label="用户名" prop="uname">
                    <el-input v-model="ruleForm.uname"></el-input>
                </el-form-item>
                <el-form-item label="邮箱" prop="email">
                    <el-input v-model="ruleForm.email" type="email"></el-input>
                </el-form-item>
                <el-form-item label="验证码" prop="code">
                    <el-row :gutter="10">
                        <el-col :span="14">
                            <el-input v-model="ruleForm.code" placeholder="请输入验证码"></el-input>
                        </el-col>
                        <el-col :span="10">
                            <el-button
                                type="info"
                                @click="sendCode"
                                :disabled="countdown > 0"
                            >
                                {{ countdown > 0 ? countdown +'秒后重新发送' : '获取验证码' }}
                            </el-button>
                        </el-col>
                    </el-row>
                </el-form-item>
                <el-form-item label="密码" prop="pass">
                    <el-input 
                        type="password"
                        v-model="ruleForm.pass"
                        autocomplete="off"></el-input>
                </el-form-item>
                <el-form-item label="确认密码" prop="password">
                    <el-input
                        type="password"
                        v-model="ruleForm.password"
                        autocomplete="off">
                    </el-input>
                </el-form-item>
                <el-form-item label="用户类型" prop="roleType">
                    <!-- ✅ 修复：绑定change事件，触发类型切换逻辑 -->
                    <el-radio-group v-model="ruleForm.roleType" @change="handleUserTypeChange">
                        <el-radio label="READER">读者</el-radio>
                        <el-radio label="AUTHOR">作者</el-radio>
                    </el-radio-group>
                </el-form-item>
                <el-form-item v-if="ruleForm.roleType === 'AUTHOR'" label="笔名" prop="penName">
                    <el-input v-model="ruleForm.penName" placeholder="请输入作者笔名" maxlength="12">
                    </el-input>
                    <div class="form-hint">
                        笔名需唯一,2-12个字符,支持汉字、字母、数字和下划线
                    </div>
                </el-form-item>
                <el-form-item v-if="ruleForm.roleType === 'AUTHOR'" prop="agreeProtocol">
                    <el-checkbox v-model="ruleForm.agreeProtocol">
                        我已阅读并同意《作者规范》
                        <el-link type="primary" @click.stop="showProtocol = true">
                            查看详情
                        </el-link>
                    </el-checkbox>
                </el-form-item>
            </el-form>
            <div class="btnGroup">
                <el-button type="primary" @click="submitForm" v-loading = "loading">提交</el-button>
                <el-button @click="resetForm">重置</el-button>
                <el-button @click="goBack">返回</el-button>
            </div>
        </el-card>

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
import { reactive,ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import axios from "axios";

//1.响应式表单数据
const ruleForm = reactive({
    uname: '',
    email: '',
    pass: '',
    password: '',
    roleType: 'READER',
    code: '',
    penName: '',
    agreeProtocol: false,
});

const showProtocol = ref(false);

//加载状态
const loading = ref(false);

//倒计时
const countdown = ref(0);
let timer =null;

//2.自定义密码验证函数
const validatePass = (rule,value,callback) => {
    if(value === ''){
        callback(new Error('请输入密码'));
    }else if (value.length < 6) {
        callback(new Error('密码长度不能少于6位'));
    }else {
        if (ruleForm.password !=='') {
            ruleFormRef.value?.validateField('password'); // ✅ 可选优化：增加非空判断
        }
        callback();
    }
};

const validatePass2 = (rule,value,callback) => {
    if (value === '') {
        callback(new Error('请再次输入密码'));
    }else if (value !== ruleForm.pass) {
        callback(new Error('两次输入密码不一致!'));        
    }else {
        callback();
    }
};

const validateEmail = (rule, value, callback) => {
    const emailReg = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (value === '') {
        callback(new Error('请输入邮箱'));
    }else if (!emailReg.test(value)){
        callback(new Error('请输入有效的邮箱地址'));
    }else{
        callback();
    }
};

const validateCode = (rule, value, callback) => {
    if(value === ''){
        callback(new Error('请输入验证码'));
    }else if (value.length !== 6) {
        callback(new Error('验证码长度为6位'));
    }else {
        callback();
    }
}

const validatePenName = async (rule, value, callback) => {
    // ✅ 修复：非作者类型直接通过验证
    if (ruleForm.roleType !== 'AUTHOR') {
        callback();
        return;
    }
    if (value === '') {
        callback(new Error('请输入笔名'));
        return;
    }
    if (value.length < 2 || value.length >12) {
        callback(new Error('笔名长度为2-12个字符'));
        return;
    }
    const penNameReg = /^[\u4e00-\u9fa5a-zA-Z0-9_]+$/;
    if (!penNameReg.test(value)) {
        callback(new Error('仅支持汉字、字母、数字和下划线'));
        return;
    }
    try{
        const res = await axios.get('/user/check-penname',{
            params:{penName:value}
        });
        if (res.data.code !== '0') {
            callback(new Error(res.data.msg || '该笔名已被使用'));
        }else{
            callback();
        }
    }catch(error){
        callback(new Error('笔名验证失败，请稍后再试')); // ✅ 优化：捕获异常时提示具体错误
    }
};

const validateAgreeProtocol = (rule,value,callback) => {
    // ✅ 修复：非作者类型直接通过验证
    if (ruleForm.roleType !== 'AUTHOR') {
        callback();
        return;
    }
    if (!value) {
        callback(new Error('请阅读并同意《作者规范》'));
    }else{
        callback();
    }
};

//3.表单验证规则
const rules = reactive({
    uname: [
        {required: true,message:'用户名不能为空！',trigger:"blur"},
        { min: 2, message: '用户名至少2个字符', trigger: 'blur' }
    ],
    email: [
        {required: true,validator: validateEmail,trigger:"blur"},
    ],
    code: [
        {required: true, validator: validateCode,trigger:"blur"},
        { len: 6, message: '验证码必须为6位', trigger: 'blur' }
    ],
    pass: [
        {required:true, validator: validatePass,trigger:'blur'},
    ],
    password: [
        {required:true, validator: validatePass2, trigger:'blur'},
    ],
    roleType: [
        {required:true,message:'请选择用户类型',trigger:'change'}
    ],
    penName: [
        {required:true,validator:validatePenName, trigger:'blur'},
    ],
    agreeProtocol: [
        { required:true,validator:validateAgreeProtocol,trigger:'change'}
    ],
});

//4.表单实例引用
const ruleFormRef = ref(null);

//5.路由实例
const router = useRouter();

//发送验证码
const sendCode = async () => {
    // ✅ 优化：防止倒计时中重复点击
    if (countdown.value > 0) return;
    
    if(!ruleForm.email){
        ElMessage.warning('请输入邮箱');
        return;
    }

    const emailReg = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailReg.test(ruleForm.email)) {
        ElMessage.warning('请输入有效的邮箱地址');
        return;
    }

    try{
        const res = await axios({
            url: "/user/send-register-code",
            method: "post",
            params: { email: ruleForm.email}
        });
        if (res.data.code === '0') {
            ElMessage.success('验证码已发送到邮箱');
            countdown.value=60;
            timer = setInterval(() => {
                countdown.value--;
                if (countdown.value <= 0) {
                    clearInterval(timer);
                }
            },1000);
        }else {
            ElMessage.error(`发送失败：${res.data.msg || '未知错误'}`);
        }
    }catch (error) {
        if (error.response?.data?.msg) {
            ElMessage.error(`发送失败：${error.response.data.msg}`);
        } else {
            ElMessage.error(`网络异常：${error.message || '无法连接服务器'}`);
        }
    }
};

//用户类型切换
const handleUserTypeChange = () => {
    // ✅ 修复：将userType改为roleType，匹配表单字段
    if (ruleForm.roleType !== 'AUTHOR') {
        ruleForm.penName = '';
        ruleForm.agreeProtocol = false;
        // ✅ 修复：增加非空判断，避免初始化时ruleFormRef为空报错
        if (ruleFormRef.value) {
            ruleFormRef.value.clearValidate(['penName','agreeProtocol']);
        }
    }
};

//6.提交表单方法
const submitForm = async () => {
    try {
        loading.value = true;
        
        if (ruleForm.pass !== ruleForm.password) {
            ElMessage.error('两次输入密码不一致！');
            return;
        }
        
        // 等待验证结果
        await ruleFormRef.value.validate();
        
        // 验证通过后再发送请求
        const res = await axios({
            url: "/user/register",
            method: "post",
            headers: { "Content-Type": "application/json"},
            data: {
                newUser: {
                    uname: ruleForm.uname,
                    email: ruleForm.email,
                    password: ruleForm.pass,
                    ...(ruleForm.roleType === 'AUTHOR' && { penName: ruleForm.penName })
                },
                roleType: ruleForm.roleType,
                code: ruleForm.code
            },
        });

        if (res.data.code === '0') {
            ElMessage.success(res.data.msg || '注册成功！');
            setTimeout(() => router.push('/login'), 1500);
        } else {
            ElMessage.error(`注册失败：${res.data.msg || '未知错误'}`);
        }
    } catch (error) {
        // ✅ 关键：判断是否为表单验证错误
        if (typeof error === 'object' && error !== null && 'password' in error) {
            // 表单验证错误：页面已显示红色提示，控制台静默处理，无需弹窗
            console.log('表单验证提示：', error.password[0].message);
        } else if (error.response) {
            // 后端接口错误
            const errorMsg = error.response.data?.msg || '服务器返回错误';
            ElMessage.error(`请求失败：${errorMsg}`);
        } else if (error.message) {
            // 网络错误
            ElMessage.error(`网络异常：${error.message}`);
        } else {
            // 其他未知错误
            ElMessage.error('操作失败，请稍后再试');
        }
    } finally {
        loading.value = false;
    }
};

//7.重置表单方法
const resetForm = () => {
    ruleFormRef.value?.resetFields(); // ✅ 可选优化：增加非空判断
    ruleForm.roleType = 'READER';
    ruleForm.agreeProtocol = false;
    showProtocol.value = false;
    countdown.value = 0;
    if(timer) clearInterval(timer);
};

//8.返回上一页方法
const goBack = () => {
    router.go(-1);
};
</script>

<style scoped>
.box-card{
    margin:auto auto;
    width: 400px;
    height: auto;
}
.login-form{
    margin: auto auto;
}
.form-hint {
    color: #666;
    font-size: 12px;
    margin-top: 5px;
}
.protocol-content {
    line-height: 1.8;
    color: #333;
    max-height: 300px;
    overflow-y: auto; 
    padding-right: 10px;
}
.protocol-content p {
    margin: 8px 0;
    font-size: 14px;
}
/* 可选优化：调整按钮组样式 */
.btnGroup {
    margin-top: 20px;
    display: flex;
    gap: 10px;
    justify-content: center;
}
</style>