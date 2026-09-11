<template>
  <div>
    <el-card class="box-card">
      <div class="header-back">
        <el-button text @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
        </el-button>
      </div>

      <h2>登录</h2>
      <el-form
        :model="ruleForm"
        status-icon
        :rules="rules"
        ref="ruleFormRef"
        label-position="left"
        label-width="70px"
        class="login-from"
      >
        <el-form-item label="用户名" prop="uname">
          <el-input v-model="ruleForm.uname"></el-input>
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            type="password"
            v-model="ruleForm.password"
            autocomplete="off"
          ></el-input>
        </el-form-item>
      </el-form>
      <div class="btnGroup">
        <el-button type="primary" @click="submitForm" v-loading="loading">登录</el-button>
        <el-button @click="resetForm">重置</el-button>
        <router-link to="/register">
          <el-button style="margin-left:10px">注册</el-button>
        </router-link>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
// 替换原生axios为封装后的request
import request from '@/utils/request'; 
import { UserStore } from '@/status/user';
import { ArrowLeft } from '@element-plus/icons-vue';

// 1. 响应式表单数据：存储用户名、密码
const ruleForm = reactive({
  uname: '',
  password: '',

});

// 2. 表单验证规则：定义用户名、密码的必填校验
const rules = reactive({
  uname: [
    { required: true, message: "用户名不能为空！", trigger: "blur" },
  ],
  password: [
    { required: true, message: "密码不能为空！", trigger: "blur" },
  ],
});

// 3.加载状态
const loading = ref(false);

// 4.路由实例
const router = useRouter();

// 5. 表单引用：用于调用Element Plus表单的验证、重置方法
const ruleFormRef = ref(null);

const userStore = UserStore();

const goBack = () => {
  try {
    // 1. 直接获取上一页的路径（从 history 里解析）
    const previousPath = window.history.state?.back || '';
    // 2. 如果上一页是创作中心（/author/ 开头），直接跳书城，不回退
    if (previousPath.startsWith('/author/')) {
      router.push('/bookStore');
      return; // 直接结束，不执行后面的回退逻辑
    }

    if (previousPath.startsWith('/admin/')) {
      router.push('/bookStore');
      return; // 直接结束，不执行后面的回退逻辑
    }
    
    // 3. 正常场景：上一页不是创作中心，就正常回退
    if (window.history.length > 1) {
      router.go(-1);
    } else {
      router.push('/bookStore');
    }
  } catch (e) {
    // 兜底：任何异常都跳书城
    router.push('/bookStore');
  }
};

// 6. 提交表单方法，登录方法：触发表单验证，验证通过则执行提交逻辑
// 登录提交方法（核心修改部分）
const submitForm = async () => {
  ruleFormRef.value.validate(async (valid) => {
    loading.value = true;
    if (valid) {
      try {
        // 1. 只传 uname 和 password，使用 params 传递
        const res = await request({
          url: "/user/login", // 或 /api/user/login，根据你的 baseURL 调整
          method: "post",
          params: { 
            uname: ruleForm.uname,
            password: ruleForm.password
          },
        });

        if (res.data.code === "0") {
          const userInfo = res.data.data;
          // 2. 调用 loginSuccess 并传入 token
          userStore.loginSuccess(
            {
              avatar: userInfo.avatar || '',
              role: userInfo.role,
              penName: userInfo.penName,
              uid: userInfo.uid
            },
            userInfo.token // 后端返回的 token 字段
          );
          
          // 3. 原有跳转逻辑不变
          if (userInfo.role === "ADMIN") {
            router.push("/admin/dashboard");
          } else if (userInfo.role === "AUTHOR") {
            router.push("/author/novels");
          } else {
            router.push("/bookStore");
          }
          
          ElMessage.success(res.data.msg);
        } else {
          ElMessage.warning(res.data.msg);
        }
      } catch (error) {
        ElMessage.error('登录请求失败：' + error.message);
      } finally {
        loading.value = false;
      }
    } else {
      loading.value = false;
    }
  });
};

// 5. 重置方法：清空表单数据并重置验证状态
const resetForm = () => {
  ruleFormRef.value.resetFields();
};
</script>

<style scoped>
.box-card {
  position: relative; /* 关键：让返回按钮相对于卡片定位 */
  width: 400px;
  padding: 40px 20px 20px; 
  margin: 0 auto;
}

.header-back {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 99;
}

h2 {
  text-align: center;
  margin-top: 0; 
}

.login-from {
  margin: auto auto;
}

.btnGroup {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 20px;
}
</style>