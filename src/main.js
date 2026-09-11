import { createApp } from 'vue'
import App from './App.vue'
import ElementPlus from "element-plus"
import 'element-plus/dist/index.css'
import { ElMessage } from "element-plus";
import router from './router'
import axios from 'axios'
import  VueAxios  from "vue-axios";
import { createPinia } from 'pinia';


const app = createApp(App) //创建应用实例

app.use(ElementPlus) //注册组件库
app.use(router) //注册路由
app.use(VueAxios,axios) //注册axios
app.use(createPinia()); //注册Pinia插件

app.mount('#app') //挂载到#app元素

//设置全局请求头
axios.defaults.headers.common['Content-Type'] = 'application/json'

//添加请求拦截器
axios.interceptors.request.use(
  config => {
    const userInfo = sessionStorage.getItem('userInfo')
    if (userInfo) {
      const { token } = JSON.parse(userInfo)
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }

    return config
  },
  error => {
    return Promise.reject(error)
  }
)




// main.js 中修改全局异常监听，仅处理未被局部捕获的异常
window.addEventListener('unhandledrejection', (event) => {
  event.preventDefault(); // 阻止默认红色界面
  console.error('未处理的异常：', event.reason);
  // 仅在未被局部处理时显示通用提示
  ElMessage.error('操作异常，请稍后再试');
});