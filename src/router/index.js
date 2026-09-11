import { createRouter, createWebHistory } from "vue-router"
import UserLogin from "@/views/UserLogin.vue"
import UserRegister from "@/views/UserRegister.vue"
import { ElMessage } from "element-plus"
import PersonalInfo from "@/views/PersonalCenter/PersonalInfo.vue"
import BookStore from "@/views/home/BookStore.vue"
import Layout from '@/layout/index.vue';
import BookShelf from "@/views/home/BookShelf.vue"
import ApplyAuthor from "@/views/PersonalCenter/ApplyAuthor.vue"
import NovelList from "@/views/author/NovelList.vue"
import ChapterEditor from "@/views/author/ChapterEditor.vue"
import AuthorLayout from "@/layout/AuthorLayout.vue"
import DataCenter from "@/views/author/DataCenter.vue"
import NovelDetail from "@/views/home/NovelDetail.vue"
import AuthorHome from "@/views/author/AuthorHome.vue"
import NovelRead from "@/views/home/NovelRead.vue"
import { UserStore } from "@/status/user"; 
import NovelKinds from "@/views/home/NovelKinds.vue"
import SearchPage from "@/views/home/SearchPage.vue"
import SearchHistory from "@/views/PersonalCenter/SearchHistory.vue"
import MyComment from "@/views/PersonalCenter/MyComment.vue"
import AuthorInteract from "@/views/author/AuthorInteract.vue"
import AdminLayout from "@/layout/AdminLayout.vue"
import Dashboard from "@/views/admin/Dashboard.vue"
import Users from "@/views/admin/Users.vue"
import Types from "@/views/admin/Types.vue"
import Config from "@/views/admin/Config.vue"
import Review from "@/views/admin/Review.vue"

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {path: '/login', component: UserLogin },
        {path: '/register', component:UserRegister},
        {
            path:'/',
            component: Layout,
            redirect:'/bookStore',
            children:[
                {path: 'bookStore',component:BookStore},
                {
                    path: 'personal', 
                    meta: {requiresAuth: true},
                    children:[
                        {path:'info',component:PersonalInfo},
                        {path:'applyat',component:ApplyAuthor},
                        {path:'history',component:SearchHistory},
                        {path:'myComments',component:MyComment},
                    ]
                },
                {
                    path: 'novel',
                    children:[
                        {path: 'detail/:novelId',component:NovelDetail},
                        {path: 'authorHome/:id', component:AuthorHome},
                        {path: 'read/:novelId/:chapterId',component:NovelRead}
                    ]
                },
                {path: 'kinds',component:NovelKinds},
                {path: 'search',component:SearchPage},
                {path: 'bookshelf',component:BookShelf},
            ]
        },
        {
            path: '/author',
            component: AuthorLayout,
            meta: {requiresAuth: true, role: 'AUTHOR'},
            children: [
                { path: 'novels', component:NovelList},
                { path: 'chapters', component:ChapterEditor},
                { path: 'statistics', component:DataCenter },
                { path: 'interact', component:AuthorInteract},
            ]
        },
        {
            path: '/admin',
            component: AdminLayout,
            meta: {requiresAuth: true, role: 'ADMIN'},
            children: [
                { path: 'dashboard', component:Dashboard },
                { path: 'users', component:Users },
                { path: 'types', component:Types },
                { path: 'config', component:Config },
                { path: 'review', component:Review}

            ]
        }
    ]
});

// 修复后的导航守卫（改为async）
router.beforeEach(async (to, from, next) => {
    const userStore = UserStore(); 
    // 优化点：只有用户信息为空时才初始化，避免每次跳转都重置状态
    if (!userStore.userInfo) {
        await userStore.initUserInfo(); 
    }

    const isLogin = userStore.isLogin; 
    const userRole = userStore.role;

    // 1. 标记需要登录的页面
    const requiresAuth = to.meta.requiresAuth;
    // 2. 标记需要作者权限的页面
    const requiresAuthor = to.meta.role === 'AUTHOR';

    // 核心逻辑：仅拦截需要登录/权限的页面，公开页面直接放行
    if (requiresAuth) {
        // 情况1：需要登录但未登录 → 跳登录页
        if (!isLogin) {
            next('/login');
            ElMessage.warning('请先登录！');        
            return;
        }
        // 情况2：已登录但权限不足（如访问作者页面）
        if (requiresAuthor && userRole !== 'AUTHOR') {
            ElMessage.error('需作者权限');
            next('/bookStore'); 
            return;
        }
         if (to.path.startsWith('/admin') && userRole !== 'ADMIN') {
            ElMessage.error('无管理员权限');
            next('/bookStore');
            return;
        }
    }


    // 所有公开页面（如书城、小说详情）直接放行
    next();
});
export default router;