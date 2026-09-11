<template>
  <div class="novel-detail-page">
    <div class="novel-header">
      <div class="cover-wrapper">
        <img 
          :src="novelDetail.coverUrl || 'https://picsum.photos/200/280?random=1'" 
          :alt="novelDetail.title" 
          class="cover-img"
          @click="goToAuthorHome"
          @error="e => e.target.src = 'https://picsum.photos/200/280?random=1'" /> 
      </div>

      <div class="info-wrapper">
        <div class="novel-title">
          {{ novelDetail.title }}
        </div>
        <div class="info-meta">
          <span class="author-name" @click="goToAuthorHome">
            {{ novelDetail.authorName || '未知作者' }}
          </span>
          <span>小说ID：{{ novelDetail.novelId || '未知'}} </span>
          <span>阅读量：{{ novelDetail.readCount || 0 }}</span>
          <span>分类：{{ novelDetail.typeName }}</span>
          <span class="novel-status" :class="statusText">
            {{ novelDetail.status === 0 ? '连载中' : novelDetail.status === 1 ? '暂停' : '已完结' }}
          </span>
        </div>
        <div class="info-chapter" @click="openChapterDialog">
          <div class="latest-chapter">
            <span>最新章节：{{ lastChapter.chapterTitle || '暂无更新' }}</span>
            <span>更新时间：{{ lastChapter.updateTime || '暂无时间' }}</span>
          </div>
          <el-icon class="chapter-icon"><ArrowRight /></el-icon>
        </div>
        <div class="info-intro">
          {{ novelDetail.intro || '暂无简介' }}
        </div>

        <div class="action-buttons">
          <el-button
            type="success"
            @click="goToReadPage"
            class="read-btn"
          >
              {{ lastReadChapterId ? '继续阅读' : '开始阅读' }}
          </el-button>
          <el-button
            :type="isCollected ? 'danger' : 'primary'"
            @click="handleCollectClick"
            class="collect-btn"
          >
            {{ isCollected ? '取消收藏' : '收藏' }}
          </el-button>
        </div>
      </div>
    </div>

    <div class="comment-section">
      <div class="comment-top-bar">
        <el-select v-model="commentFilter" placeholder="筛选评论" class="filter-select" @change="getCommentList">
          <el-option label="全部评论" value="all" />
          <el-option label="只看作者" value="author" />
          <el-option label="最新评论" value="latest" />
        </el-select>
      </div>

      <div class="comment-list-wrapper">
        <div 
          class="comment-item"
          v-for="comment in commentList"
          :key="comment.commentId"
          :id="`comment-${comment.commentId}`"  
        >
            <div class="comment-row comment-row-header">
                <div class="comment-avatar">
                    <el-avatar
                    :size="36"
                    :src="comment.userAvatar || 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png'"
                    />
                </div>
                <div class="comment-content-wrapper">
                    <div class="comment-header">
                        <span class="comment-username">
                          {{ comment.penName || comment.username || '匿名用户' }}
                          <!-- 仅本小说作者显示标签 -->
                          <span v-if="comment.isAuthor" class="author-tag">作者</span>
                          <span v-if="comment.isTop" class="top-tag">置顶</span>
                        </span>
                        <span class="comment-time">{{ formatCommentTime(comment.createTime) }}</span>
                    </div>
                </div>
            </div>
            <div class="comment-row comment-row-content">
                <div class="comment-text">
                  <template v-if="comment.status === 'PUBLISHED'">
                    {{ comment.content }}
                  </template>
                  <template v-else-if="comment.status === 'BLOCKED'">
                    <span v-if="comment.userId === userId" style="color: #f56c6c; font-size: 12px;">
                      该评论因{{ comment.reviewRemark || '内容违规' }}已被自动屏蔽
                    </span>
                    <span v-else style="color: #999; font-size: 12px;">
                      该评论已被屏蔽
                    </span>
                  </template>
                  <template v-else>
                    <span style="color: #f5a623; font-size: 12px;">
                      评论审核中...
                    </span>
                  </template>
                </div>
            </div>
            <div class="comment-row comment-row-actions">
                <div class="comment-actions">
                    <template v-if="comment.status === 'PUBLISHED'">
                      <span class="action-item" @click="toggleCommentTop(comment)" v-if="isNovelAuthor">
                        {{ comment.isTop ? '取消置顶' : '置顶' }}
                      </span>
                      <!-- 回复评论：禁用 + 拦截 -->
                      <span class="action-item" 
                        @click="isAdmin ? handleAdminForbid('回复评论') : replyComment(comment)"
                        :class="{ disabled: isAdmin }"
                      >
                        回复评论
                      </span>
                      <!-- 点赞评论：禁用 + 拦截 -->
                      <span class="action-item" 
                        :class="{ liked: comment.isLiked, disabled: isAdmin }"
                        @click="isAdmin ? handleAdminForbid('点赞') : likeComment(comment)"
                      >
                        点赞 ({{ comment.likeCount || 0}})
                      </span>
                    </template>
                    <!-- 删除评论：禁用 + 拦截 -->
                    <span class="action-item" style="color: #f56c6c;" 
                      @click="isAdmin ? handleAdminForbid('删除评论') : deleteComment(comment)"
                      :class="{ disabled: isAdmin }"
                      v-if="comment.userId === userId"
                    >
                      删除
                    </span>
                </div>
            </div>

            <div class="reply-input-wrapper" v-if="replyTargetCommentId === comment.commentId" :data-comment-id="comment.commentId">
              <el-input
                v-model="replyContent"
                placeholder="回复评论..."
                class="reply-input"
                :disabled="isAdmin"
              />
              <el-button
                type="primary"
                size="small"
                @click="isAdmin ? handleAdminForbid('发送回复') : sendReply(comment)"
                :disabled="!replyContent.trim() || isAdmin"
              >
                发送
              </el-button>
            </div>

            <div class="child-comment-list" v-if="comment.childComments && comment.childComments.length > 0">
                <div 
                  class="child-comment-item"
                  v-for="childComment in getVisibleChildComments(comment)"
                  :key="childComment.commentId"
                  :id="`comment-${childComment.commentId}`"
                >
                    <div class="child-comment-header">
                        <el-avatar
                          :size="24" 
                          :src="childComment.userAvatar || 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png'"
                          class="child-comment-avatar"
                        />
                        <span class="child-comment-username">
                          {{ childComment.penName || childComment.username || '匿名用户' }}
                          <!-- 仅本小说作者显示标签 -->
                          <span v-if="childComment.isAuthor" class="author-tag">作者</span>
                        </span>
                        <span class="child-comment-time">{{ formatCommentTime(childComment.createTime) }}</span>
                    </div>
                    <div class="child-comment-content">
                      <template v-if="childComment.status === 'PUBLISHED'">
                        {{ childComment.content }}
                      </template>
                      <template v-else-if="childComment.status === 'BLOCKED'">
                        <span v-if="childComment.userId === userId" style="color: #f56c6c; font-size: 12px;">
                          该回复因{{ childComment.reviewRemark || '内容违规' }}已被自动屏蔽
                        </span>
                        <span v-else style="color: #999; font-size: 12px;">
                          该回复已被屏蔽
                        </span>
                      </template>
                      <template v-else>
                        <span style="color: #f5a623; font-size: 12px;">
                          回复审核中...
                        </span>
                      </template>
                    </div>
                    <div class="child-comment-actions">
                        <template v-if="childComment.status === 'PUBLISHED'">
                          <!-- 子评论回复：禁用 + 拦截 -->
                          <span class="action-item" 
                            @click="isAdmin ? handleAdminForbid('回复评论') : replyComment(childComment)"
                            :class="{ disabled: isAdmin }"
                          >
                            回复评论
                          </span>
                          <!-- 子评论点赞：禁用 + 拦截 -->
                          <span
                            class="action-item"
                            :class="{ liked: childComment.isLiked, disabled: isAdmin }"
                            @click="isAdmin ? handleAdminForbid('点赞') : likeComment(childComment)"
                          >
                            点赞 ({{ childComment.likeCount || 0 }})
                          </span>
                        </template>
                        <!-- 子评论删除：禁用 + 拦截 -->
                        <span class="action-item" style="color: #f56c6c;" 
                          @click="isAdmin ? handleAdminForbid('删除评论') : deleteComment(childComment)"
                          :class="{ disabled: isAdmin }"
                          v-if="childComment.userId === userId"
                        >
                          删除
                        </span>
                    </div>

                    <div class="reply-input-wrapper" v-if="replyTargetCommentId === childComment.commentId" :data-comment-id="childComment.commentId">
                      <el-input
                        v-model="replyContent"
                        placeholder="回复评论..."
                        class="reply-input"
                        :disabled="isAdmin"
                      />
                      <el-button
                        type="primary"
                        size="small"
                        @click="isAdmin ? handleAdminForbid('发送回复') : sendReply(childComment)"
                        :disabled="!replyContent.trim() || isAdmin"
                      >
                        发送
                      </el-button>
                    </div>
                </div>

                <div 
                  v-if="comment.childComments.length > 0"
                  class="expand-toggle"
                  @click="toggleCommentExpand(comment.commentId)"
                >
                    {{comment.expanded ? '收起' : `展开 ${comment.childComments.length }条回复` }}
                </div>
            </div>
        </div>
      </div>

      <div class="comment-input-bar" v-if="isLogin">
        <el-input 
          v-model="newCommentContent" 
          placeholder="写下你的评论..." 
          class="comment-input" 
          :disabled="isAdmin"
        />
        <el-button 
          type="primary" 
          @click="sendComment"
        >
          发送
        </el-button>
      </div>
      <div class="comment-input-bar" v-else style="justify-content: center; color: #999;">
        请先登录后发表评论
      </div>
    </div>
  </div>

  <el-dialog
    v-model="chapterDialogVisible"
    title="小说目录"
    width="500px"
    destroy-on-close
  >
    <div class="chapter-list">
      <div 
        class="chapter-item"
        v-for="(chapter, index) in chapterList"
        :key="chapter.chapterId"
        :class="{ active: chapter.chapterId === currentChapterId }"
        @click="selectChapter(chapter)"
      >
          第{{ index + 1 }}章： {{ chapter.chapterTitle || chapter.title || '未命名章节' }}
          <span class="chapter-time">{{ formatChapterTime(chapter.updateTime) }}</span>
      </div>
    </div>
  </el-dialog>

  <el-dialog
    v-model="collectDialogVisible"
    title="收藏到书架"
    width="400px"
    destroy-on-close
  >
      <div class="collect-form">
          <el-select
            v-model="selectCategoryId"
            placeholder="请选择书架分组"
            class="category-select"
            @change="validateCategory"
          >
              <el-option
                v-for="category in shelfCategories"
                :key="category.id"
                :label="category.name"
                :value="category.id"
              />
          </el-select>
          <el-button type="text" @click="openAddCategoryDialog" class="add-category-btn">
              新增分组
          </el-button>
      </div>
      <template #footer>
          <el-button @click="collectDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmCollect" :disabled="!selectCategoryId">确认收藏</el-button>
      </template>
  </el-dialog>
  
  <el-dialog
    v-model="cancelCollectDialogVisible"
    title="取消收藏"
    width="300px"
    destroy-on-close
  >
      <div class="cancel-collect-tip">
          确定要取消收藏该小说吗？
      </div>
      <template #footer>
          <el-button @click="cancelCollectDialogVisible = false">取消</el-button>
          <el-button type="danger" @click="confirmCancelCollect">确认取消</el-button>
      </template>
  </el-dialog>

  <el-dialog
    v-model="addCategoryDialogVisible"
    title="新增书架分组"
    width="300px"
    destroy-on-close
  >
      <el-input 
        v-model="newCategoryName"
        placeholder="请输入分组名称"
        class="new-category-input"
        @input="validateCategoryName"
      />
      <template #footer>
          <el-button @click="addCategoryDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="addNewCategory" :disabled="!isCategoryNameValid">确认新增</el-button>
      </template>
  </el-dialog>
</template>

<script setup>
import { ref, onMounted, computed, watch, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import request from '@/utils/request';
import { ArrowRight } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { UserStore } from '@/status/user';
import { storeToRefs } from 'pinia';

// 核心变量定义
const route = useRoute();
const router = useRouter();
const novelId = route.params.novelId;

const userStore = UserStore();
const { isLogin, userInfo } = storeToRefs(userStore);
const userId = computed(() => userInfo.value?.uid || '');
const userAvatar = computed(() => userInfo.value?.avatarUrl || 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png');

// 新增：判断是否为管理员（数据库中 role 是 ADMIN 大写）
const isAdmin = computed(() => {
  return isLogin.value && userInfo.value?.role === 'ADMIN';
});

// 管理员操作拦截提示
const handleAdminForbid = (action) => {
  ElMessage.warning(`管理员模式禁止${action}操作，仅用于预览`);
};

const isNovelAuthor = computed(() => {
  // 必须登录 + 用户ID等于小说作者ID
  return isLogin.value && userId.value && novelDetail.value.authorId && 
         userId.value.toString() === novelDetail.value.authorId.toString();
});

// 弹窗控制
const cancelCollectDialogVisible = ref(false);
const chapterDialogVisible = ref(false);
const collectDialogVisible = ref(false);
const addCategoryDialogVisible = ref(false);

// 表单验证相关
const isCategoryNameValid = ref(false);

// 核心数据
const novelDetail = ref({
    novelId: '',
    title: '',
    coverUrl: '',
    authorName: '',
    authorId: '',
    intro: '',
    readCount: 0,
    collectCount: 0,
    typeName: '',
    status: 0
});
const isCollected = ref(false);
const chapterList = ref([]);
const currentChapterId = ref('');
const lastChapter = ref({
  chapterTitle: '暂无更新',
  updateTime: '暂无时间'
});
const lastReadChapterId = ref('');
const shelfCategories = ref([]);
const selectCategoryId = ref('');
const newCategoryName = ref('');

// 评论相关
const commentFilter = ref('all');
const commentList = ref([]);
const newCommentContent = ref('');
const replyTargetCommentId = ref(null);
const replyContent = ref('');

const statusText = computed(() => {
  const status = novelDetail.value.status;
  if (status === 0) return 'serial';
  if (status === 1) return 'paused';
  return 'finished';
});

// 登录校验（核心修复版）
const checkLogin = async (needRedirect = true, showTip = true) => {
  // 🔥 强制等待用户状态初始化完成（解决状态 false 问题）
  await userStore.initUserInfo();

  console.log("最终登录状态：", isLogin.value, "用户ID：", userId.value);

  if (!isLogin.value || !userId.value) {
    if (showTip) ElMessage.warning("请先登录后再操作");
    if (needRedirect) {
      router.push({
        path: "/login",
        query: { redirect: route.fullPath },
      });
    }
    return false;
  }
  return true;
};

const toggleCommentTop = async (comment) => {
  // 安全校验
  if (!await checkLogin()) return;
  if (!isNovelAuthor.value) {
    ElMessage.error('无权限操作该评论（非本人小说）');
    return;
  }
  if (!comment.commentId) {
    ElMessage.warning('评论ID异常，无法操作');
    return;
  }
  if (comment.parentId) {
    ElMessage.warning('仅父评论可以置顶');
    return;
  }

  try {
    const res = await request.post(`/author/interact/top/${comment.commentId}`, {}, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    if (res.data.code === "0" || res.data.code === 0) {
      // 更新本地评论状态
      comment.isTop = !comment.isTop;
      ElMessage.success(res.data.msg || (comment.isTop ? '置顶成功' : '取消置顶成功'));
      
      // 重新获取评论列表，保证排序正确
      await getCommentList();
    } else {
      ElMessage.warning(res.data.msg || '操作失败');
    }
  } catch (error) {
    console.error('置顶/取消置顶评论失败：', error);
    const errorMsg = error.response?.data?.msg || '操作失败，请重试';
    ElMessage.error(errorMsg);
  }
};

// 最后阅读章节索引（计算属性）
const lastReadChapterIndex = computed(() => {
  if (!lastReadChapterId.value || chapterList.value.length === 0) return -1;
  return chapterList.value.findIndex(item => item.chapterId === lastReadChapterId.value);
});

let isReading = false;

// 新增：统计阅读量（游客/登录用户都调用）
const recordReadCount = async (novelId, chapterId) => {
  if (isReading) return;
  try {
    isReading = true;
    // 直接调用 /read 接口，userId 由后端从 JWT 解析（游客就是 null）
    await request.post('/read', null, {
      params: {
        novelId: novelId,
        chapterId: chapterId
      }
    });
    console.log('阅读量统计成功');
    novelDetail.value.readCount = (novelDetail.value.readCount || 0) + 1;
  } catch (error) {
    console.error('统计阅读量失败:', error);
    // 不阻塞页面跳转，即使统计失败也能正常阅读
  } finally {
    setTimeout(() => {
      isReading = false;
    }, 1500);
  }
};

// ===================== 核心业务方法 =====================
// 1. 阅读按钮核心逻辑：未登录也能看章节
const goToReadPage = () => {
  if (chapterList.value.length === 0) {
    ElMessage.warning('暂无章节可阅读');
    return;
  }
  let targetChapterId;
  if (isLogin.value && lastReadChapterId.value) {
    targetChapterId = lastReadChapterId.value;
  } else {
    targetChapterId = chapterList.value[0].chapterId;
  }
  // // 关键：无论是否登录，先统计阅读量
  // recordReadCount(novelId, targetChapterId);
  router.push(`/novel/read/${novelId}/${targetChapterId}`);
};

// 2. 作者主页跳转
const goToAuthorHome = () => {
    if (!novelDetail.value.authorId || novelDetail.value.authorId <= 0) {
        ElMessage.warning('暂无作者信息，无法跳转');
        return;
    }
    router.push(`/novel/authorHome/${novelDetail.value.authorId}`);
};

// 3. 目录弹窗
const openChapterDialog = () => {
    chapterDialogVisible.value = true;
    if (chapterList.value.length === 0) {
        getChapterList();
    }
};

// 新增：查询阅读进度
const getReadingProgress = async () => {
  if (!isLogin.value) {
    lastReadChapterId.value = '';
    return;
  }
  try {
    const res = await request.get(`/read/progress`, {
      params: { novelId: novelId } // 后端@RequestParam需要的格式
    });
    if (res.data.code === 0 && res.data.data) {
      lastReadChapterId.value = res.data.data.chapterId;
    } else {
      lastReadChapterId.value = '';
    }
  } catch (error) {
    console.error('获取阅读进度失败:', error);
    lastReadChapterId.value = '';
  }
};

// 修改：selectChapter 保存进度
const selectChapter = async (chapter) => {
  currentChapterId.value = chapter.chapterId;
  if (isLogin.value) {
    try {
      await request.post(`/read/progress`, {
        novelId: novelId,
        chapterId: chapter.chapterId,
        progress: 0
      });
      lastReadChapterId.value = chapter.chapterId;
    } catch (error) {
      console.error('保存阅读进度失败:', error);
      ElMessage.error('保存阅读进度失败');
    }
  }
  router.push(`/novel/read/${novelId}/${chapter.chapterId}`);
};

// 5. 收藏/取消收藏逻辑
const handleCollectClick = async () => {
  if (isAdmin.value) {
    handleAdminForbid('收藏');
    return;
  }
  
    if (!await checkLogin()) return;
    isCollected.value ? cancelCollectDialogVisible.value = true : openCollectDialog();
};

const openCollectDialog = () => {
    collectDialogVisible.value = true;
    selectCategoryId.value = '';
    // 只有登录后才获取书架分类
    if (isLogin.value) {
        getShelfCategories();
    } else {
        shelfCategories.value = [];
    }
};

// 新增：验证分类选择
const validateCategory = () => {
  if (!selectCategoryId.value) {
    ElMessage.warning('请选择有效的书架分组');
  }
};

const confirmCollect = async () => {
    if(!await checkLogin()) return;
    if (!selectCategoryId.value) {
        ElMessage.warning('请先选择书架分组');
        return;
    }
    try {
        const novelIdNum = Number(novelId);
        const res = await request.post(`/collect/${novelIdNum}`,{},{
            params: { categoryId: Number(selectCategoryId.value) || 1 }
        });

        const { code, msg } = res.data;
        if (code === "0" || code === 0) {
            ElMessage.success('收藏成功');
            isCollected.value = true; 
            collectDialogVisible.value = false;
        } else if (msg && msg.includes('已收藏')) {
            ElMessage.warning(msg);
            isCollected.value = true; 
            collectDialogVisible.value = false;
        } else {
            ElMessage.warning(msg || '收藏失败：业务异常');
        }
    } catch (error) {
        console.error('收藏失败：', error);
        const errorMsg = error.response?.data?.msg;
        if (errorMsg && errorMsg.includes('已收藏')) {
            ElMessage.warning(errorMsg);
            isCollected.value = true; 
            collectDialogVisible.value = false;
        } else {
            ElMessage.error(errorMsg || '收藏失败，请重试');
        }
    }
};

const confirmCancelCollect = async () => {
    if(!await checkLogin()) return;
    try {
        const novelIdNum = Number(novelId);
        const res = await request.delete(`/collect/${novelIdNum}`);

        if (res.data.code === "0") {
            ElMessage.success('取消收藏成功');
            isCollected.value = false; 
            cancelCollectDialogVisible.value = false;
        } else {
            ElMessage.warning(res.data.msg || '取消收藏失败');
        }
    } catch (error) {
        console.error('取消收藏失败：', error);
        const errorMsg = error.response?.data?.msg;
        ElMessage.error(errorMsg || '取消收藏失败，请重试');
    }
};

// 6. 书架分组相关
const openAddCategoryDialog = () => {
    addCategoryDialogVisible.value = true;
    newCategoryName.value = '';
    isCategoryNameValid.value = false;
};

// 新增：验证分类名称
const validateCategoryName = () => {
  const name = newCategoryName.value.trim();
  isCategoryNameValid.value = name.length >= 2 && name.length <= 10;
  if (!isCategoryNameValid.value && name) {
    ElMessage.warning('分组名称长度需在2-10个字符之间');
  }
};

const addNewCategory = async () => {
    if(!await checkLogin()) return;
    const name = newCategoryName.value.trim();
    if (!name) {
        ElMessage.warning('请输入分组名称');
        return;
    }
    if (name.length < 2 || name.length > 10) {
      ElMessage.warning('分组名称长度需在2-10个字符之间');
      return;
    }
    try {
        const res = await request.post('/shelf/category/add',{ name });
        if (res.data.code === "0") {
            const newCategory = res.data.data;
            if (newCategory && newCategory.id) {
                shelfCategories.value.push({
                    id: newCategory.id,
                    name: newCategory.name || name
                });
            }
            ElMessage.success('分组新增成功');
            addCategoryDialogVisible.value = false;
            newCategoryName.value = '';
            isCategoryNameValid.value = false;
            await getShelfCategories();
        } else {
            ElMessage.error(res.data.msg || '新增分组失败');
        }
    } catch (error) {
        console.error('新增分组失败：', error);
        await getShelfCategories();
        ElMessage.error('新增分组失败，请重试');
    }
};

// 7. 评论相关核心方法
const getVisibleChildComments = (comment) => {
  if (!comment.childComments || comment.childComments.length === 0) return [];
  // 未展开时不显示任何子评论
  if (!comment.expanded) {
    return [];
  }
  // 展开时显示全部子评论
  return comment.childComments;
};

const toggleCommentExpand = (commentId) => {
  commentList.value = commentList.value.map(comment => {
    if (comment.commentId === commentId) {
      return { ...comment, expanded: !comment.expanded };
    }
    return comment;
  });
};

const replyComment = async (comment) => {
    if (!await checkLogin(true,true)) {
      return;      
    }
    if (!comment.commentId) {
        ElMessage.warning('评论ID异常，无法回复');
        return;
    }
    replyTargetCommentId.value = comment.commentId;
    replyContent.value = `@${comment.username || '匿名用户'}：`; // 优化@格式
    setTimeout(() => {
        const replyInput = document.querySelector(`.reply-input-wrapper[data-comment-id="${comment.commentId}"] input`);
        if (replyInput) {
            replyInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            replyInput.focus(); 
            // 光标定位到@用户后
            replyInput.selectionStart = replyInput.selectionEnd = replyContent.value.length;
        }
    }, 100);
};

const getLikedCommentIds = async () => {
    // 未登录时直接返回空集合，不发起请求
    if (!isLogin.value) return new Set();
    try {
        const res = await request.get(`/comment/liked/list/${novelId}`);
        return new Set(res.data.data || []);
    } catch (error) {
        console.error('获取点赞列表失败：',error);
        return new Set();
    }
};

const likeComment = async (comment) => {
    if(!await checkLogin()) return;    
    try {
        if (comment.isLiked) {
            const res = await request.delete(`/comment/like/${comment.commentId}`);
            if (res.data.code === "0") {
                comment.likeCount = Math.max(0, (comment.likeCount || 1) - 1); 
                comment.isLiked = false;
                ElMessage.success('取消点赞成功');
            }
        } else {
            const res = await request.post(`/comment/like/${comment.commentId}`);
            if (res.data.code === "0") {    
                comment.likeCount = (comment.likeCount || 0) + 1; 
                comment.isLiked = true;
                ElMessage.success('点赞成功');
            }
        }
        await getCommentList();
    } catch (error) {
        console.error('点赞失败:', error);
        ElMessage.error('点赞失败');
    }
};

const deleteComment = async (comment) => {
    if (!await checkLogin()) return;
    try {
        await ElMessageBox.confirm('确定要删除这条评论吗？','提示',{
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
        });

        const params = { novelId: novelId ? Number(novelId) : '' };
        Object.keys(params).forEach(key => params[key] === '' && delete params[key]);

        const res = await request.delete(`/comment/${comment.commentId}`,{ params });

        if (res.data.code === "0") {
            ElMessage.success('删除成功');
            await getCommentList();
        } else {
            ElMessage.warning(res.data.msg || '删除失败');
        }
    } catch (error) {
        if (error !== 'cancel') {
            console.error('删除失败:', error);
            ElMessage.error('删除失败，请重试');
        }
    }
};

const sendComment = async () => {
    if (!newCommentContent.value.trim()) {
        ElMessage.warning('请输入评论内容');
        return;
    }
    try {
        const res = await request.post(`/comment/novel/${novelId}`,{},{
            params: { content: newCommentContent.value.trim() }
        });
        if (res.data.code === "0") {
            const commentData = res.data.data;
            if (commentData.status === 'BLOCKED') {
                ElMessage.warning(commentData.reviewRemark || '评论内容违规，已被自动屏蔽');
            } else {
                ElMessage.success('评论成功');
            }
            
            const newComment = {
                ...commentData,
                commentId: commentData.id || commentData.commentId,
                username: userInfo.value?.uname || commentData.uname || '匿名用户', 
                userAvatar: userAvatar.value,
                isLiked: false,
                likeCount: commentData.likeCount || 0,
                createTime: commentData.createTime || new Date().toISOString(),
                status: commentData.status || 'PUBLISHED',
                reviewRemark: commentData.reviewRemark || '',
                isAuthor: userInfo.value?.uid === novelDetail.value.authorId,
                isTop: commentData.isTop || false, // 关键：保留置顶状态
                childComments: [],
                expanded: false
            };

            // 关键修改：把新评论加入列表后，重新执行「置顶+排序」逻辑
            const tempList = [...commentList.value, newComment];
            const topComments = tempList.filter(c => c.isTop === true);
            const normalComments = tempList.filter(c => c.isTop !== true);
            let sortedNormalComments = [];
            if (commentFilter.value === 'latest') {
                sortedNormalComments = normalComments.sort((a,b) => new Date(b.createTime||0) - new Date(a.createTime||0));
            } else {
                sortedNormalComments = sortCommentsByLikes(normalComments);
            }
            commentList.value = [...topComments, ...sortedNormalComments];

            newCommentContent.value = '';
        } else {
            ElMessage.warning(res.data.msg || '评论失败');
        }
    } catch (error) {
        console.error('发送评论失败:', error);
        ElMessage.error('发送失败，请重试');
    }
};

const sendReply = async (parentComment) => {
  const content = replyContent.value.trim();
  if (!content) {
    ElMessage.warning('请输入回复内容');
    return;
  }

  try {
    // 确保 parentId 是数字类型（后端要求 Long）
    const topParentId = Number(parentComment.parentId || parentComment.commentId);
    const targetCommentId = Number(parentComment.commentId); // 要回复的目标评论ID
    const res = await request.post(`/comment/novel/${Number(novelId)}`, {}, {
      params: {
        content: content,
        parentId: topParentId
      }
    });

    if (res.data.code === '0') {
      const replyData = res.data.data;
      // 审核状态提示逻辑
      if (replyData.status === 'BLOCKED') {
          ElMessage.warning(replyData.reviewRemark || '回复内容违规，已被自动屏蔽');
      } else {
          ElMessage.success('回复成功');
      }
      
      replyContent.value = '';
      replyTargetCommentId.value = null;

      // 统一作者ID为字符串
      const targetAuthorId = String(novelDetail.value.authorId || '');
      
      const newReply = {
        ...replyData,
        commentId: String(replyData.id || replyData.commentId), // 统一转为字符串
        username: userInfo.value?.uname || replyData.uname || '匿名用户',
        userAvatar: userAvatar.value,
        isLiked: false,
        likeCount: replyData.likeCount || 0,
        createTime: replyData.createTime || new Date().toISOString(),
        status: replyData.status || 'PUBLISHED',
        reviewRemark: replyData.reviewRemark || '',
        // 修复：统一转为字符串对比
        isAuthor: String(userInfo.value?.uid || '') === targetAuthorId,
        parentId: topParentId,
        parentUsername: parentComment.username || '匿名用户'
      };

      // 核心修改：递归查找并更新评论
      const updateCommentsRecursive = (comments, targetId, newReply) => {
        return comments.map(comment => {
          const newComment = { ...comment };
          // 情况1：当前是一级评论，且是目标评论的直接父级
          if (String(newComment.commentId) === String(topParentId)) {
            newComment.expanded = true; // 强制展开父评论
            newComment.childComments = [newReply, ...(newComment.childComments || [])];
            return newComment;
          }
          
          // 情况2：当前评论有子评论，递归查找
          if (newComment.childComments && newComment.childComments.length > 0) {
            // 检查子评论中是否有目标评论
            const hasTarget = newComment.childComments.some(
              child => String(child.commentId) === String(targetCommentId)
            );
            
            // 如果子评论包含目标，先展开当前父评论
            if (hasTarget) {
              newComment.expanded = true;
            }
            
            // 递归处理子评论
            newComment.childComments = newComment.childComments.map(child => {
              // 找到要回复的目标子评论
              if (String(child.commentId) === String(targetCommentId)) {
                return {
                  ...child,
                  childComments: [newReply, ...(child.childComments || [])],
                  expanded: true
                };
              }
              // 继续递归处理更深层级的子评论
              if (child.childComments && child.childComments.length > 0) {
                return updateCommentsRecursive([child], targetCommentId, newReply)[0];
              }
              return child;
            });
          }
          
          return newComment;
        });
      };

      // 执行递归更新
      commentList.value = updateCommentsRecursive(commentList.value, targetCommentId, newReply);
      
      // 滚动到新回复位置（增强体验）
      setTimeout(() => {
        const newReplyElement = document.getElementById(`comment-${newReply.commentId}`);
        if (newReplyElement) {
          newReplyElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // 高亮新回复
          newReplyElement.style.backgroundColor = '#fff8e1';
          setTimeout(() => {
            newReplyElement.style.backgroundColor = '';
          }, 2000);
        }
      }, 100);
      
    } else {
      ElMessage.warning(res.data.msg || '回复失败');
    }
  } catch (error) {
    console.error('回复失败：', error);
    ElMessage.error('回复失败，请重试');
  }
};

// 新增：锚点定位方法（优化版，支持多级子评论）
const scrollToCommentAnchor = () => {
  // 获取路由参数中的评论锚点ID
  const commentAnchor = route.query.commentAnchor;
  if (!commentAnchor) return;
  
  // 统一转换为字符串（避免类型问题）
  const targetId = String(commentAnchor);
  
  // 先展开所有父级评论（关键：先展开再滚动）
  expandParentComment(targetId);
  
  // 延迟确保DOM更新后再滚动
  setTimeout(() => {
    // 找到对应评论的DOM元素（兼容所有层级）
    const commentElement = document.getElementById(`comment-${targetId}`);
    if (commentElement) {
      // 平滑滚动到评论位置，偏移避免导航栏遮挡
      commentElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
      
      // 高亮提示（增强用户体验）
      commentElement.style.backgroundColor = '#fff8e1';
      setTimeout(() => {
        commentElement.style.backgroundColor = '';
      }, 2000);
    } else {
      console.log(`未找到ID为 ${targetId} 的评论DOM元素`);
    }
  }, 200);
};

// 新增：展开目标评论的所有父级评论（支持多级子评论）
const expandParentComment = (targetCommentId) => {
  // 统一转换为字符串，避免类型不匹配
  const targetId = String(targetCommentId);
  
  // 递归查找并展开父级
  const findAndExpand = (comments) => {
    let found = false;
    
    for (let i = 0; i < comments.length; i++) {
      const comment = comments[i];
      
      // 找到目标评论
      if (String(comment.commentId) === targetId) {
        return true;
      }
      
      // 递归查找子评论
      if (comment.childComments && comment.childComments.length > 0) {
        const childFound = findAndExpand(comment.childComments);
        if (childFound) {
          comment.expanded = true;
          found = true;
        }
      }
    }
    
    return found;
  };
  
  const found = findAndExpand(commentList.value);
  
  // 调试提示
  if (!found) {
    console.log(`未找到评论ID: ${targetId}，无法展开父级`);
  }
};

// 8. 数据请求核心方法
const getNovelDetail = async () => {
    try {
        const res = await request.get(`/novel/bookStore/detail/${novelId}`);
        if (res.data.code == 0) {
            const responseData = res.data.data || {};
            const novelInfo = responseData.novelInfo || {};
            
            novelDetail.value = {
                novelId: novelInfo.novelId || '未知',
                title: novelInfo.title || '未知小说',
                coverUrl: novelInfo.coverUrl || 'https://picsum.photos/200/280?random=1',
                authorName: novelInfo.authorName || '未知作者',
                authorId: novelInfo.authorId || '', // 关键：保存作者ID
                intro: novelInfo.intro || '暂无简介',
                readCount: novelInfo.readCount || 0,
                typeName: novelInfo.typeName || '未知分类',
                collectCount: novelInfo.collectCount || 0,
                status: novelInfo.updateStatus || 0 
            };

            let chapterListData = responseData.chapterList || [];
            chapterListData = chapterListData.sort((a,b) => (a.publishSort || 0) - (b.publishSort || 0));
            chapterList.value = chapterListData;

            const latestChapterData = chapterListData.length > 0 ? chapterListData[chapterListData.length - 1] : {};
            const latestChapterNum = chapterListData.length;
            const chapterTitle = latestChapterData.chapterTitle || '未知章节';
            const chapterTime = latestChapterData.publishTime || '暂无时间';
            
            lastChapter.value = {
                chapterTitle: chapterListData.length > 0 ? `第${latestChapterNum}章：${chapterTitle}` : '暂无更新',
                updateTime: chapterTime
            };
            
            if (chapterList.value.length > 0) {
                currentChapterId.value = chapterList.value[0].chapterId;
            }
        } else {
            ElMessage.warning('获取小说详情失败：' + res.data.msg);
        }
    } catch (error) {
        console.error('获取小说详情失败：', error);
        ElMessage.error('小说详情加载失败');
    }
};

const getCollectStatus = async () => {
    if (!isLogin.value) {
      isCollected.value = false;
      return;
    }

    try {
        const novelIdNum = Number(novelId);
        const res = await request.get(`/collect/status/${novelIdNum}`);
        isCollected.value = Boolean(res.data.data);
    } catch (error) {
        console.error('获取收藏状态失败：',error);
        isCollected.value = false;
    }
};

const getChapterList = async () => {
    try {
        const res = await request.get(`/chapter/list`,{ params: { novelId: novelId } });
        if (res.data.code == 0) {
            let data = res.data.data || [];
            data = data.filter(chapter => chapter.status === 'PUBLISHED');
            data = data.sort((a,b) => (a.publishSort || 0) - (b.publishSort || 0));

            chapterList.value = data.map(chapter => ({
                chapterId: chapter.chapterId || chapter.id || '',
                chapterTitle: chapter.chapterTitle || chapter.title || '未知章节',
                title: chapter.chapterTitle || chapter.title || '未知章节',
                updateTime: chapter.publishTime || chapter.updateTime || '暂无时间'
            }));
            if (chapterList.value.length > 0) {
                currentChapterId.value = chapterList.value[0].chapterId;
            }
        } else {
            ElMessage.warning('获取章节列表失败：' + res.data.msg);
        }
    } catch (error) {
        console.error('获取章节列表失败：', error);
        ElMessage.error('目录加载失败');
    }
};

const getShelfCategories = async () => {
    // 未登录时直接返回空数组，不发起请求
    if (!isLogin.value) {
      shelfCategories.value = [];
      return;
    }
    try {
        const res = await request.get('/shelf/category/list');
        if (res.data.code === "0") {
            shelfCategories.value = res.data.data || [];

            // 自动选中默认分组
            const defaultCategory = shelfCategories.value.find(item => item.name === '默认分组');
            if (defaultCategory) {
                selectCategoryId.value = defaultCategory.id;
            }
        } else {
            shelfCategories.value = [];
            console.error('获取书架分类失败：', res.data.msg);
        }
    } catch (error) {
        shelfCategories.value = [];
        console.error("获取书架分类失败：", error);
    }
};

const getLastReadChapter = async () => {
  if (!isLogin.value) {
    lastReadChapterId.value = '';
    return;
  }
  try {
    // 关键修改：路径改成 /last-progress，参数用 query
    const res = await request.get(`/read/last-progress`, {
      params: { novelId: novelId }
    });
    lastReadChapterId.value = res.data.data?.chapterId || '';
  } catch (error) {
    console.error('获取最后阅读章节失败：', error);
    lastReadChapterId.value = '';
  }
};

const sortCommentsByLikes = (comments) => {
    return [...comments].sort((a,b) => {
        const likeDiff = (b.likeCount || 0) - (a.likeCount || 0);
        if (likeDiff !== 0) return likeDiff;
        return new Date(b.createTime || 0) - new Date(a.createTime || 0);
    });
};

const getCommentList = async () => {
  try {
    const res = await request.get(`/comment/list/${novelId}`, { params: { filter: commentFilter.value || "all" } });
    const likedCommentIds = await getLikedCommentIds();

    // 统一作者ID为字符串，避免类型问题
    const targetAuthorId = String(novelDetail.value.authorId || '');
    const currentUserId = String(userId.value); // 当前登录用户ID
    const currentUserAvatar = userInfo.value?.avatarUrl; // ✅ 明确读取 avatarUrl

    let rawComments = (res.data.data || []).map(item => {
      // ✅ 核心修改：优先使用当前用户的 avatarUrl
      const commentAvatar = 
        String(item.userId) === currentUserId && currentUserAvatar
          ? currentUserAvatar 
          : (item.avatarUrl || 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png');
      
      const baseParent = {
        ...item,
        commentId: item.id || item.commentId,
        penName: item.penName || '',
        username: item.uname || '匿名用户',
        userAvatar: commentAvatar, // ✅ 覆盖为正确的头像地址
        isLiked: likedCommentIds.has(item.id || item.commentId),
        likeCount: item.likeCount || 0,
        createTime: item.createTime || new Date().toISOString(),
        status: item.status || 'PUBLISHED',
        reviewRemark: item.reviewRemark || '',
        isAuthor: String(item.userId || '') === targetAuthorId,
        isTop: item.isTop || item.top || false
      };

      // 处理子评论（也要做同样的覆盖）
      const childComments = (item.childComments || []).map(child => {
        const childAvatar = 
          String(child.userId) === currentUserId && currentUserAvatar
            ? currentUserAvatar 
            : (child.avatarUrl || 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png');
        
        const currentChild = {
          ...child,
          commentId: child.id || child.commentId,
          penName: child.penName || '',
          username: child.uname || '匿名用户',
          userAvatar: childAvatar, // ✅ 子评论也覆盖
          isLiked: likedCommentIds.has(child.id || child.commentId),
          likeCount: child.likeCount || 0,
          createTime: child.createTime || new Date().toISOString(),
          status: child.status || 'PUBLISHED',
          reviewRemark: child.reviewRemark || '',
          isAuthor: String(child.userId || '') === targetAuthorId,
          parentUsername: baseParent.username,
          parentId: baseParent.commentId
        };

        // 处理三级评论（同样覆盖）
        const grandChildComments = (child.childComments || []).map(gc => ({
          ...gc,
          commentId: gc.id || gc.commentId,
          penName: gc.penName || '',
          username: gc.uname || '匿名用户',
          userAvatar: String(gc.userId) === currentUserId && currentUserAvatar ? currentUserAvatar : (gc.userAvatar || 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png'),
          isLiked: likedCommentIds.has(gc.id || gc.commentId),
          likeCount: gc.likeCount || 0,
          createTime: gc.createTime || new Date().toISOString(),
          status: gc.status || 'PUBLISHED',
          reviewRemark: gc.reviewRemark || '',
          isAuthor: String(gc.userId || '') === targetAuthorId,
          parentUsername: currentChild.username,
          parentId: currentChild.commentId
        }));

        return [currentChild, ...grandChildComments];
      }).flat();

      const sortedChildComments = childComments.sort((a, b) => new Date(b.createTime || 0) - new Date(a.createTime || 0));

      return {
        ...baseParent,
        childComments: sortedChildComments,
        expanded: baseParent.isAuthor ? true : false
      };
    });

    // 后续排序逻辑不变
    const topComments = rawComments.filter(comment => comment.isTop === true);
    const normalComments = rawComments.filter(comment => comment.isTop !== true);
    let sortedNormalComments = [];
    if (commentFilter.value === 'latest') {
      sortedNormalComments = normalComments.sort((a, b) => new Date(b.createTime||0) - new Date(a.createTime||0));
    } else {
      sortedNormalComments = sortCommentsByLikes(normalComments);
    }
    commentList.value = [...topComments, ...sortedNormalComments];

  } catch (error) {
    console.error('获取评论列表失败：', error);
    ElMessage.error('评论列表加载失败');
  }
};

// 时间格式化工具方法
const formatCommentTime = (time) => {
    if (!time) return '未知时间';
    
    let date;
    try {
      // 兼容多种时间格式
      if (typeof time === 'string') {
        // 处理 ISO 格式和普通格式
        const timeStr = time.includes('T') ? time : time.replace(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1-$2-$3 $4:$5:$6');
        date = new Date(timeStr);
      } else {
        date = new Date(time);
      }
      
      // 检查日期是否有效
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date');
      }
    } catch (e) {
      console.error('时间格式化失败:', time, e);
      return '未知时间';
    }

    const now = new Date();
    const diff = now - date;

    if (diff < 60 * 1000) return '刚刚';
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}分钟前`;
    if (diff < 24 * 60 * 60 * 1000) {
        const hours = Math.floor(diff / (60 * 60 * 1000));
        return `${hours}小时前`;
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
};

// 章节更新时间格式化
const formatChapterTime = (time) => {
  if (!time) return '暂无更新';
  try {
    let date;
    if (typeof time === 'string') {
      const timeStr = time.includes('T') ? time : time.replace(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1-$2-$3 $4:$5:$6');
      date = new Date(timeStr);
    } else {
      date = new Date(time);
    }
    
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date');
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  } catch (e) {
    console.error('章节时间格式化失败:', time, e);
    return '暂无更新';
  }
};

// 页面初始化
onMounted(async () => {
    await userStore.initUserInfo();
    await Promise.all([
        getNovelDetail(),
        getChapterList(),
        getCommentList(),
        getReadingProgress()
    ]);

    if (isLogin.value) {
        await Promise.all([
            getLastReadChapter(),
            getCollectStatus(),
            getShelfCategories()
        ]);
    } else {
        isCollected.value = false;
        lastReadChapterId.value = '';
        shelfCategories.value = [];
    }

    // 评论列表加载完成后，执行锚点定位
    setTimeout(() => {
      scrollToCommentAnchor();
    }, 500);
});

// 监听路由参数变化（比如从其他评论跳转过来）
watch(
  () => route.query.commentAnchor,
  (newVal) => {
    if (newVal) {
      scrollToCommentAnchor();
    }
  },
  { immediate: false }
);

watch(
  () => route.path,
  (newPath, oldPath) => {
    // 判定条件：从阅读页返回详情页时
    if (oldPath.startsWith('/novel/read/') && newPath === `/novel/detail/${novelId}`) {
      getNovelDetail(); // 重新拉取小说详情，刷新阅读量/评论数
    }
  },
  { immediate: false }
);

// 登录状态监听
watch(isLogin, async (newVal, oldVal) => {
  console.log('登录状态变化：', newVal, '旧值：', oldVal);
  // 只有从 true → false 时才重置状态（登出场景）
  if (oldVal === true && newVal === false) {
    isCollected.value = false;
    lastReadChapterId.value = '';
    replyTargetCommentId.value = null;
    replyContent.value = '';
    newCommentContent.value = '';
    shelfCategories.value = [];
    selectCategoryId.value = '';
  }
  // 登录时只加载和用户相关的数据，避免重置评论列表
  if (newVal === true) {
    await Promise.all([
      getCollectStatus(),
      getLastReadChapter(),
      getShelfCategories()
    ]);
  }
}, { immediate: false });

// 组件卸载时清理定时器和监听
onUnmounted(() => {
  // 清理所有未完成的异步操作和定时器
  // 这里可以根据需要添加清理逻辑
});
</script>

<style scoped>
/* 全局页面样式 */
.novel-detail-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-size: 14px;
}

/* 上半部分：小说信息区 */
.novel-header {
  display: flex;
  gap: 24px;
  margin-bottom: 30px;
  align-items: flex-start;
}

/* 封面容器 */
.cover-wrapper {
  width: 200px;
  height: 280px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
}
.cover-wrapper:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 右侧信息容器 */
.info-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.novel-title {
  padding: 8px 12px;
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 10px;
  width: 100%;
  color: #333;
}
.author-name {
  color: #409eff;
  cursor: pointer;
  margin-right: 10px;
  font-weight: 500;
}
.author-name:hover {
  text-decoration: underline;
}
/* 阅读量+小说ID */
.info-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  color: #666;
  padding: 8px 0;
}

/* 简介区域 */
.info-intro {
  min-height: 120px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  line-height: 1.8;
  color: #333;
  background-color: #f9fafb;
}

/* 目录区域（最新章节） */
.info-chapter {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background-color: #fff;
}
.info-chapter:hover {
  background-color: #f9fafb;
  border-color: #409eff;
}
.latest-chapter {
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: #333;
}
.chapter-icon {
  color: #409eff;
  font-size: 16px;
}
.chapter-list {
  max-height: 400px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
}
.chapter-item {
  padding: 8px 12px;
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s;
}
.chapter-item:hover {
  background-color: #e6f7ff;
}
.chapter-item.active {
  background-color: #409eff;
  color: white;
}
.chapter-time {
  font-size: 12px;
  color: #999;
  margin-left: auto;
  white-space: nowrap;
  margin-left: 10px;
}
.chapter-item.active .chapter-time {
  color: rgba(255,255,255,0.8);
}

/* 收藏弹窗样式 */
.collect-form {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.category-select {
  width: 70%;
}
.add-category-btn {
  color: #409eff;
}
.new-category-input {
  width: 100%;
  margin-bottom: 10px;
}
/* 按钮区：阅读 + 收藏并排 */
.action-buttons {
  display: flex;
  gap: 16px;
  align-items: center;
}
.read-btn {
  width: 130px;
  height: 40px;
  font-size: 16px;
}
.collect-btn {
  width: 130px;
  height: 40px;
  font-size: 16px;
}

/* 评论区样式 */
.comment-section {
  width: 100%;
  border: 1px solid #e5e7eb;
  margin-top: 30px;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0,0,0,0.05);
}

/* 顶部：下拉筛选框 */
.comment-top-bar {
  border-bottom: 1px solid #e5e7eb;
  padding: 12px 16px;
  background-color: #f9fafb;
}
.filter-select {
  width: 180px;
}

/* 评论列表区 */
.comment-list-wrapper {
  flex: 1;
  padding: 16px;
  max-height: 600px;
  overflow-y: auto;
}
/* 评论项整体 */
.comment-item {
  display: flex;
  flex-direction: column;
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;
}

/* 统一行样式 */
.comment-row {
  width: 100%;
  display: flex;
  align-items: center;
}

/* 第一层：头部信息 */
.comment-row-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}
.comment-avatar {
  flex-shrink: 0;
}
.comment-username {
  color: #333;
  font-weight: 500;
  margin-right: 12px;
}
/* 新增：作者标签样式 */
.author-tag {
  display: inline-block;
  background-color: #f56c6c;
  color: #fff;
  font-size: 10px;
  padding: 1px 4px;
  border-radius: 2px;
  margin-left: 4px;
}
/* 新增：置顶标签样式 */
.top-tag {
  display: inline-block;
  background-color: #409eff;
  color: #fff;
  font-size: 10px;
  padding: 1px 4px;
  border-radius: 2px;
  margin-left: 4px;
}
.comment-time {
  margin-left: auto;
  color: #999;
  font-size: 13px;
}

/* 第二层：评论内容 */
.comment-row-content {
  color: #333;
  line-height: 1.8;
  font-size: 14px;
  padding-left: 48px;
  margin-bottom: 8px;
}

/* 子评论列表 */
.child-comment-list {
  margin-top: 12px;
  padding-left: 48px;
  border-left: 2px solid #e5e7eb;
}

/* 子评论项 */
.child-comment-item {
  padding: 12px 8px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}
.child-comment-item:last-child {
  border-bottom: none;
}

/* 子评论头部：头像 + 用户名 */
.child-comment-header {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}
.child-comment-avatar {
  flex-shrink: 0;
}
.child-comment-username {
  color: #333;
  font-weight: 500;
}

/* 子评论时间靠右 */
.child-comment-time {
  color: #999;
  font-size: 12px;
  margin-left: auto;
}

/* 子评论内容 */
.child-comment-content {
  color: #666;
  line-height: 1.6;
  font-size: 13px;
  margin-left: 32px;
  width: calc(100% - 32px);
  text-align: left;
}

/* 子评论操作栏 */
.child-comment-actions {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #666;
  width: 100%;
  justify-content: flex-end;
  padding-right: 0;
}

/* 第三层：操作栏 */
.comment-row-actions {
  justify-content: flex-end;
  padding-right: 8px;
}
.comment-actions {
  display: flex;
  gap: 20px;
  font-size: 13px;
  color: #666;
}
.action-item {
  cursor: pointer;
  transition: color 0.2s;
}
.action-item:hover {
  color: #409eff;
}
.action-item.liked {
  color: #0ddb48;
}

/* 回复输入框 */
.reply-input-wrapper {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  padding-left: 48px;
}
.reply-input {
  flex: 1;
}

/* 展开/收起按钮样式 */
.expand-toggle {
  color: #409eff;
  cursor: pointer;
  padding: 8px 0;
  font-size: 12px;
  text-align: right;
  margin-top: 8px;
  margin-right: 8px;
}
.expand-toggle:hover {
  text-decoration: underline;
}

/* 评论输入栏 */
.comment-input-bar {
  display: flex;
  gap: 8px;
  padding: 16px;
  border-top: 1px solid #e5e7eb;
  background-color: #f9fafb;
}
.comment-input {
  flex: 1;
}

/* 审核状态样式优化 */
.comment-text span {
  display: block;
  line-height: 1.8;
}
.child-comment-content span {
  display: block;
  line-height: 1.6;
}
/* 审核中样式 */
.comment-text span[style*="color: #f5a623"],
.child-comment-content span[style*="color: #f5a623"] {
  font-style: italic;
}
/* 自己的屏蔽提示样式 */
.comment-text span[style*="color: #f56c6c"],
.child-comment-content span[style*="color: #f56c6c"] {
  background-color: #fef0f0;
  padding: 4px 8px;
  border-radius: 4px;
  display: inline-block;
}
/* 他人的屏蔽提示样式 */
.comment-text span[style*="color: #999"],
.child-comment-content span[style*="color: #999"] {
  color: #999 !important;
  font-size: 12px !important;
}

/* 小说状态样式 */
.novel-status {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}
.novel-status.serial {
  background-color: #e6f7ff;
  color: #1890ff;
}
.novel-status.paused {
  background-color: #fff7e6;
  color: #fa8c16;
}
.novel-status.finished {
  background-color: #f6ffed;
  color: #52c41a;
}

/* 管理员禁用样式：灰显 + 禁止鼠标指针 */
.action-item.disabled {
  color: #ccc !important;
  cursor: not-allowed !important;
  text-decoration: none !important;
}

/* 按钮禁用样式增强（覆盖Element UI默认） */
.el-button:disabled {
  background-color: #f5f5f5 !important;
  border-color: #e5e5e5 !important;
  color: #ccc !important;
  cursor: not-allowed !important;
}

/* 输入框禁用样式 */
.el-input.is-disabled .el-input__inner {
  background-color: #fafafa !important;
  color: #999 !important;
}
</style>