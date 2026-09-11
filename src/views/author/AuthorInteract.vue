<template>
  <div class="interact-page">
    <!-- 顶部：作品选择器（下拉框） -->
    <div class="novel-selector">
      <h3>读者互动中心</h3>
      <div class="novel-selection-row">
        <span>当前作品：</span>
        <el-select
          v-model="currentNovelId"
          placeholder="请选择小说"
          style="width: 240px; margin-left: 10px;"
          @change="handleNovelChange"
          clearable
        >
          <el-option
            v-for="novel in authorNovelList"
            :key="novel.id"
            :label="novel.title"
            :value="novel.id"
          />
        </el-select>
        <el-button type="primary" size="small" @click="refreshComments">刷新评论</el-button>
      </div>
    </div>

    <!-- 评论区：带框容器 + 顶部筛选下拉框 -->
    <div class="comment-section">
      <!-- 顶部筛选栏（和截图样式对齐） -->
      <div class="comment-top-bar">
        <el-select v-model="commentFilter" placeholder="全部评论" class="filter-select" @change="refreshComments">
          <el-option label="全部评论" value="all" />
          <el-option label="最新评论" value="latest" />
        </el-select>
      </div>

      <!-- 评论列表区域（带滚动） -->
      <div class="comments-container" v-loading="loading">
        <!-- 父评论（一级评论） -->
        <div 
          class="comment-item parent-comment" 
          v-for="comment in sortedParentComments" 
          :key="comment.id || comment.commentId"
          :class="{ 'top-comment': comment.isTop, 'author-comment': comment.isAuthor === 1 || comment.isAuthor === true }"
        >
          <!-- 左侧头像 -->
          <el-avatar 
            class="avatar" 
            :src="getCommentAvatarUrl(comment)" 
            :fallback-src="defaultAvatar"
            @error="handleAvatarError"
          />

          <!-- 右侧内容 -->
          <div class="comment-content">
            <div class="comment-meta">
              <span class="author-name">{{ getCommentUserName(comment) }}</span>
              <!-- 强化：作者标签（兼容1/true） -->
              <span v-if="comment.isAuthor === 1 || comment.isAuthor === true" class="author-tag">作者</span>
              <!-- 置顶标签：移到作者标签右侧 -->
              <span v-if="comment.isTop" class="top-tag">置顶</span>
              <span class="time">{{ formatCommentTime(comment.createTime) }}</span>
            </div>
            
            <div class="comment-text">
              <!-- 兼容审核状态 -->
              <template v-if="comment.status === 'PUBLISHED'">
                {{ comment.content }}
              </template>
              <template v-else-if="comment.status === 'BLOCKED'">
                <span style="color: #999; font-size: 12px;">该评论已被屏蔽</span>
              </template>
              <template v-else>
                <span style="color: #f5a623; font-size: 12px;">评论审核中...</span>
              </template>
            </div>

            <!-- 子评论列表（缩进显示） -->
            <div class="child-comments" v-if="getChildren(comment.id || comment.commentId).length > 0">
              <div 
                class="comment-item child-comment" 
                v-for="child in getVisibleChildComments(comment)" 
                :key="child.id || child.commentId"
                :class="{ 'author-comment': child.isAuthor === 1 || child.isAuthor === true }"
              >
                <el-avatar class="avatar child-avatar" 
                  :src="getCommentAvatarUrl(child)" 
                  :fallback-src="defaultAvatar"
                  @error="handleAvatarError"
                />
                <div class="comment-content">
                  <div class="comment-meta">
                    <span class="author-name">{{ getCommentUserName(child) }}</span>
                    <!-- 强化：子评论作者标签 -->
                    <span v-if="child.isAuthor === 1 || child.isAuthor === true" class="author-tag">作者</span>
                    <!-- 子评论置顶标签（理论上子评论不会置顶，保留兼容） -->
                    <span v-if="child.isTop" class="top-tag">置顶</span>
                    <span class="time">{{ formatCommentTime(child.createTime) }}</span>
                  </div>
                  <div class="comment-text">
                    <span class="reply-prefix">@{{ getCommentUserName(getParentComment(child.parentId)) }}：</span>
                    <!-- 子评论审核状态 -->
                    <template v-if="child.status === 'PUBLISHED'">
                      {{ child.content }}
                    </template>
                    <template v-else-if="child.status === 'BLOCKED'">
                      <span style="color: #999; font-size: 12px;">该回复已被屏蔽</span>
                    </template>
                    <template v-else>
                      <span style="color: #f5a623; font-size: 12px;">回复审核中...</span>
                    </template>
                  </div>
                  <div class="action-buttons child-actions">
                    <el-button type="text" size="small" @click="startReply(child.id || child.commentId)">
                      回复
                    </el-button>
                    <span class="like-count">点赞 {{ child.likeCount || 0 }}</span>
                  </div>
                </div>
              </div>

              <!-- 展开/收起按钮 -->
              <div 
                v-if="getChildren(comment.id || comment.commentId).length > 0"
                class="expand-toggle"
                @click="toggleCommentExpand(comment.id || comment.commentId)"
              >
                {{ expandedCommentIds.has(comment.id || comment.commentId) 
                  ? '收起' 
                  : `展开 ${getChildren(comment.id || comment.commentId).length}条回复` }}
              </div>
            </div>

            <!-- 作者回复框 -->
            <div class="reply-box" v-if="showReplyInput(comment.id || comment.commentId)">
              <el-input
                v-model="replyContent"
                type="textarea"
                :rows="3"
                placeholder="输入作者回复..."
                style="margin-bottom: 10px;"
              />
              <div class="button-group">
                <el-button size="small" @click="cancelReply">取消</el-button>
                <el-button type="primary" size="small" @click="submitReply(comment.id || comment.commentId)">发布回复</el-button>
              </div>
            </div>

            <!-- 操作按钮组（父评论才有置顶） -->
            <div class="action-buttons">
              <el-button type="text" size="small" @click="startReply(comment.id || comment.commentId)">
                回复
              </el-button>
              <!-- 只有父评论才能置顶 -->
              <el-button 
                v-if="!comment.parentId || comment.parentId === 0"
                type="text" 
                size="small" 
                @click="toggleTop(comment.id || comment.commentId, comment.isTop)"
                :style="{ color: comment.isTop ? '#f56c6c' : '#409eff' }"
              >
                {{ comment.isTop ? '取消置顶' : '置顶' }}
              </el-button>
              <span class="like-count">点赞 {{ comment.likeCount || 0 }}</span>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="sortedParentComments.length === 0 && !loading" class="empty-state">
          <el-empty description="暂无读者评论" />
        </div>
      </div>

      <!-- 底部：发表作者评论 -->
      <div class="quick-comment">
        <el-input
          v-model="quickCommentContent"
          type="textarea"
          :rows="3"
          placeholder="或者直接在这里发表作者评论..."
          style="margin-bottom: 10px;"
        />
        <el-button 
          type="success" 
          @click="publishQuickComment"
          :disabled="!currentNovelId || !quickCommentContent.trim()"
        >
          发表作者评论
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElEmpty } from 'element-plus';
import request from '@/utils/request';
import { UserStore } from '@/status/user';
// ✅ 关键：从 pinia 导入 storeToRefs
import { storeToRefs } from 'pinia';

// 路由初始化
const route = useRoute();
const router = useRouter();
const userStore = UserStore();
// ✅ 现在可以正常解构 userInfo 了
const { isLogin, userInfo } = storeToRefs(userStore);

const userAvatar = computed(() => userInfo.value?.avatarUrl || 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png');
const defaultAvatar = 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png';

// 响应式数据
const currentNovelId = ref(null);
const currentNovel = ref({ title: '请选择小说' });
const authorNovelList = ref([]);
const commentList = ref([]);
const loading = ref(false);
const replyContent = ref('');
const quickCommentContent = ref('');
const replyingToId = ref(null);
const commentFilter = ref('all'); 
const expandedCommentIds = ref(new Set()); 

// ========== 核心：获取评论显示名称（作者优先penName） ==========
const getCommentUserName = (comment) => {
  // 作者评论：优先显示penName，兜底uname/username
  if (comment.isAuthor === 1 || comment.isAuthor === true) {
    return comment.penName || '匿名作者';
  }
  // 普通用户：显示uname/username
  return comment.uname || comment.username || '匿名用户';
};

// ========== 辅助：获取评论头像 URL ==========
const getCommentAvatarUrl = (comment) => {
  // 如果是当前登录用户，强制用自己的头像
  if (String(comment.userId) === String(userInfo.value?.uid)) {
    return userAvatar.value;
  }
  // 其他用户：优先用接口返回的 avatarUrl，没有则用默认
  return comment.avatarUrl || defaultAvatar;
};

// ✅ 头像加载失败时，自动 fallback 到默认头像
const handleAvatarError = (e) => {
  e.target.src = defaultAvatar;
};

// ========== 辅助：获取父评论对象（用于显示penName） ==========
const getParentComment = (parentId) => {
  return commentList.value.find(comment => (comment.id === parentId) || (comment.commentId === parentId)) || {};
};

// ========== 计算属性：拆分父子评论 ==========
const parentComments = computed(() => {
  return commentList.value.filter(comment => !comment.parentId || comment.parentId === 0);
});

// ========== 计算属性：排序后的父评论 ==========
const sortedParentComments = computed(() => {
  const parents = parentComments.value;
  // 第一步：拆分置顶评论和普通评论
  const topComments = parents.filter(comment => comment.isTop === true || comment.isTop === 1);
  const normalComments = parents.filter(comment => comment.isTop !== true && comment.isTop !== 1);

  // 第二步：只对普通评论进行筛选排序
  let sortedNormalComments = [];
  if (commentFilter.value === 'latest') {
    // 最新评论：按创建时间降序
    sortedNormalComments = [...normalComments].sort((a, b) => {
      const timeA = new Date(a.createTime || 0).getTime();
      const timeB = new Date(b.createTime || 0).getTime();
      return timeB - timeA;
    });
  } else {
    // 默认：按点赞数降序，点赞数相同则按时间降序
    sortedNormalComments = [...normalComments].sort((a, b) => {
      const likeDiff = (b.likeCount || 0) - (a.likeCount || 0);
      if (likeDiff !== 0) return likeDiff;
      return new Date(b.createTime || 0) - new Date(a.createTime || 0);
    });
  }

  // 第三步：最终列表 = 置顶评论 + 排序后的普通评论
  return [...topComments, ...sortedNormalComments];
});

// ========== 辅助方法：获取可见子评论 ==========
const getVisibleChildComments = (comment) => {
  const children = getChildren(comment.id || comment.commentId);
  if (!children.length) return [];
  // 先按时间倒序，保证最新的在最前面
  const sortedChildren = [...children].sort((a, b) => 
    new Date(b.createTime || 0) - new Date(a.createTime || 0)
  );
  // 未展开时只显示最新1条
  if (!expandedCommentIds.value.has(comment.id || comment.commentId)) {
    return sortedChildren.slice(0, 1);
  }
  return sortedChildren;
};

// ========== 辅助方法：切换评论展开/收起 ==========
const toggleCommentExpand = (commentId) => {
  const newSet = new Set(expandedCommentIds.value);
  if (newSet.has(commentId)) {
    newSet.delete(commentId);
  } else {
    newSet.add(commentId);
  }
  expandedCommentIds.value = newSet;
};

// ========== 辅助方法：获取子评论 ==========
const getChildren = (parentId) => {
  return commentList.value.filter(comment => comment.parentId === parentId);
};

// ========== 时间格式化函数 ==========
const formatCommentTime = (time) => {
  if (!time) return '未知时间';
  
  let date;
  if (typeof time === 'string') {
      const timeStr = time.replace('T', ' ').split('.')[0]; 
      date = new Date(timeStr);
      if (isNaN(date.getTime())) {
          date = new Date(time);
      }
  } else {
      date = new Date(time);
  }

  if (isNaN(date.getTime())) {
      const timeStr = typeof time === 'string' ? time.replace('T', ' ').split('.')[0] : '';
      return timeStr || '未知时间';
  }

  const now = new Date();
  const diff = now - date;

  if (diff < 60 * 1000) return '刚刚';
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}分钟前`;
  if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000));
      return hours === 0 ? `${Math.floor(diff / (60 * 1000))}分钟前` : `${hours}小时前`;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

// ========== 1. 获取作者已发布小说列表 ==========
const getAuthorNovelList = async () => {
  try {
    const res = await request.get('/novel/list', {
      params: {
        status: 'PUBLISHED',
        pageNum: 1,
        pageSize: 100
      },
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (res.data.code === '0') {
      authorNovelList.value = res.data.data?.records || [];
      
      if (authorNovelList.value.length > 0) {
        currentNovelId.value = authorNovelList.value[0].id;
        currentNovel.value = authorNovelList.value[0];
        getNovelComments();
      } else {
        ElMessage.warning('您暂无已发布的小说，请先发布小说');
      }
    } else {
      ElMessage.error(`获取小说列表失败：${res.data.msg}`);
    }
  } catch (err) {
    console.error('获取小说列表异常:', err);
    ElMessage.error('获取小说列表失败，请检查网络或登录状态');
  }
};

// ========== 2. 切换小说触发 ==========
const handleNovelChange = () => {
  if (!currentNovelId.value) return;
  
  const novel = authorNovelList.value.find(item => item.id === currentNovelId.value);
  if (novel) {
    currentNovel.value = novel;
    getNovelComments();
  }
};

// ========== 3. 获取小说评论 ==========
const getNovelComments = async () => {
  if (!currentNovelId.value) {
    ElMessage.warning('请先选择小说');
    return;
  }
  
  loading.value = true;
  try {
    const res = await request.get(`/comment/list/${currentNovelId.value}`, {
      params: { filter: commentFilter.value || "all" },
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    console.log('后端原始评论数据：', res.data.data);
    
    if (res.data.code === '0') {
      let rawComments = res.data.data || [];
      
      // 扁平化处理子评论
      let flatComments = [];
      rawComments.forEach(parent => {
        // 添加父评论（确保isAuthor字段正确）
        flatComments.push({
          id: parent.id || parent.commentId,
          commentId: parent.id || parent.commentId,
          penName: parent.penName, // 保留penName字段
          uname: parent.uname || parent.username,
          username: parent.uname || parent.username,
          content: parent.content,
          createTime: parent.createTime,
          isTop: parent.isTop === 1 || parent.isTop === true,
          isAuthor: parent.isAuthor || 0, // 强制赋值，避免undefined
          parentId: parent.parentId || 0,
          status: parent.status || 'PUBLISHED',
          likeCount: parent.likeCount || 0,
          userId: parent.userId,
          avatarUrl: parent.avatarUrl || defaultAvatar
        });
        
        // 添加子评论
        if (parent.childComments && parent.childComments.length > 0) {
          parent.childComments.forEach(child => {
            flatComments.push({
              id: child.id || child.commentId,
              commentId: child.id || child.commentId,
              penName: child.penName, // 保留penName字段
              uname: child.uname || child.username,
              username: child.uname || child.username,
              content: child.content,
              createTime: child.createTime,
              isTop: false,
              isAuthor: child.isAuthor || 0, // 强制赋值
              parentId: parent.id || parent.commentId,
              status: child.status || 'PUBLISHED',
              likeCount: child.likeCount || 0,
              userId: parent.userId,
              avatarUrl: parent.avatarUrl || defaultAvatar
            });
            
            // 处理三级评论
            if (child.childComments && child.childComments.length > 0) {
              child.childComments.forEach(grand => {
                flatComments.push({
                  id: grand.id || grand.commentId,
                  commentId: grand.id || grand.commentId,
                  penName: grand.penName, // 保留penName字段
                  uname: grand.uname || grand.username,
                  username: grand.uname || grand.username,
                  content: grand.content,
                  createTime: grand.createTime,
                  isTop: false,
                  isAuthor: grand.isAuthor || 0, // 强制赋值
                  parentId: child.id || child.commentId,
                  status: grand.status || 'PUBLISHED',
                  likeCount: grand.likeCount || 0,
                  userId: parent.userId,
                  avatarUrl: parent.avatarUrl || defaultAvatar
                });
              });
            }
          });
        }
      });
      
      commentList.value = flatComments;
      expandedCommentIds.value.clear();
    } else {
      ElMessage.error(`获取评论失败：${res.data.msg}`);
    }
  } catch (err) {
    console.error('获取评论异常:', err);
    ElMessage.error('获取评论失败，请重试');
  } finally {
    loading.value = false;
  }
};

// ========== 4. 置顶/取消置顶（仅父评论） ==========
const toggleTop = async (commentId, isTop) => {
  if (!currentNovelId.value) {
    ElMessage.warning('请先选择小说');
    return;
  }
  
  const comment = commentList.value.find(c => (c.id === commentId) || (c.commentId === commentId));
  if (comment?.parentId && comment.parentId !== 0) {
    ElMessage.warning('只能置顶父评论');
    return;
  }
  
  try {
    // 先更新前端状态（优化体验）
    const newIsTop = !(isTop === true || isTop === 1);
    commentList.value = commentList.value.map(c => {
      if ((c.id === commentId) || (c.commentId === commentId)) {
        return { ...c, isTop: newIsTop };
      }
      return c;
    });

    const res = await request.post(`/author/interact/top/${commentId}`, {}, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (res.data.code === '0') {
      ElMessage.success(res.data.msg);
      // 可选：如果后端返回新状态，用后端数据覆盖
      // refreshComments(); 
    } else {
      // 后端失败，回滚前端状态
      commentList.value = commentList.value.map(c => {
        if ((c.id === commentId) || (c.commentId === commentId)) {
          return { ...c, isTop: isTop };
        }
        return c;
      });
      ElMessage.error(res.data.msg || '操作失败');
    }
  } catch (err) {
    // 异常回滚前端状态
    commentList.value = commentList.value.map(c => {
      if ((c.id === commentId) || (c.commentId === commentId)) {
        return { ...c, isTop: isTop };
      }
      return c;
    });
    console.error('置顶操作异常:', err);
    ElMessage.error('操作失败，请重试');
  }
};

// ========== 5. 回复读者评论 ==========
const startReply = (commentId) => {
  if (!currentNovelId.value) {
    ElMessage.warning('请先选择小说');
    return;
  }
  replyingToId.value = commentId;
  replyContent.value = '';
};

const cancelReply = () => {
  replyingToId.value = null;
  replyContent.value = '';
};

const submitReply = async (parentId) => {
  if (!currentNovelId.value || !replyContent.value.trim()) {
    ElMessage.warning('请选择小说并输入回复内容');
    return;
  }
  
  try {
    const res = await request.post('/author/interact/reply', null, {
      params: {
        novelId: currentNovelId.value,
        parentId: parentId,
        content: replyContent.value
      },
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (res.data.code === '0') {
      ElMessage.success('回复成功');
      refreshComments();
      cancelReply();
    } else {
      ElMessage.error(res.data.msg || '回复失败');
    }
  } catch (err) {
    console.error('回复异常:', err);
    ElMessage.error('回复失败，请重试');
  }
};

// ========== 6. 发表作者评论 ==========
const publishQuickComment = async () => {
  if (!currentNovelId.value || !quickCommentContent.value.trim()) {
    ElMessage.warning('请选择小说并输入评论内容');
    return;
  }
  
  try {
    const res = await request.post('/author/interact/comment', {
      novelId: currentNovelId.value,
      content: quickCommentContent.value.trim()
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}` // 补充token
      }
    });
    
    if (res.data.code === '0') {
      ElMessage.success('评论发表成功');
      refreshComments();
      quickCommentContent.value = '';
    } else {
      ElMessage.error(res.data.msg || '发表失败');
    }
  } catch (err) {
    console.error('发表评论异常:', err);
    ElMessage.error('发表失败，请重试');
  }
};

// ========== 辅助方法 ==========
const refreshComments = () => {
  getNovelComments();
};

const showReplyInput = (id) => {
  return replyingToId.value === id;
};

// ========== 生命周期 ==========
onMounted(() => {
  getAuthorNovelList();
  
  const { novelId } = route.params;
  if (novelId) {
    currentNovelId.value = Number(novelId);
  }
});

watch(() => route.params.novelId, (newNovelId) => {
  if (newNovelId) {
    currentNovelId.value = Number(newNovelId);
  }
});
</script>

<style scoped>
.interact-page {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.novel-selector {
  margin-bottom: 20px;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 10px;
  text-align: center;
}

.novel-selection-row {
  margin-top: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
}

/* 评论区容器 */
.comment-section {
  width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

/* 顶部筛选栏 */
.comment-top-bar {
  border-bottom: 1px solid #e5e7eb;
  padding: 12px 16px;
  display: flex;
  justify-content: center;
  align-items: center;
}
.filter-select {
  width: 200px;
}

.comments-container {
  padding: 15px;
  min-height: 400px;
  max-height: 500px;
  overflow-y: auto;
}

/* 评论基础样式 */
.comment-item {
  display: flex;
  gap: 12px;
  padding: 15px 0;
  border-bottom: 1px solid #f0f0f0;
  position: relative;
  transition: background-color 0.2s;
}

/* 作者评论高亮样式 */
.author-comment {
  background-color: #fff5f5;
  border-left: 3px solid #ff6b6b;
  padding-left: 12px;
}

/* 子评论样式 */
.child-comments {
  margin-top: 12px;
  padding-left: 40px;
  border-left: 2px solid #e5e7eb;
}
.child-comment {
  padding: 10px 0;
  border-bottom: none;
}
.child-avatar {
  width: 32px;
  height: 32px;
}
.child-actions {
  margin-top: 4px;
}

/* 展开/收起按钮 */
.expand-toggle {
  color: #409eff;
  cursor: pointer;
  padding: 4px 0;
  font-size: 12px;
  text-align: right;
  margin-top: 8px;
  margin-right: 8px;
}
.expand-toggle:hover {
  text-decoration: underline;
}

/* 置顶评论样式 */
.top-comment {
  background-color: #fef7f7;
  border-left: 3px solid #f56c6c;
  padding-left: 10px;
}

/* 置顶标签样式：移到作者标签右侧 */
.top-tag {
  background-color: #f56c6c;
  color: white;
  font-size: 11px;
  font-weight: bold;
  padding: 2px 8px;
  border-radius: 12px;
  margin-left: 8px;
  display: inline-block;
  vertical-align: middle;
  box-shadow: 0 1px 2px rgba(245, 108, 108, 0.3);
}

/* 作者标签样式（醒目印记） */
.author-tag {
  background: linear-gradient(135deg, #ff6b6b, #ff8e8e);
  color: #fff;
  font-size: 11px;
  font-weight: bold;
  padding: 2px 8px;
  border-radius: 12px;
  margin-left: 8px;
  box-shadow: 0 1px 2px rgba(255, 107, 107, 0.3);
}

.avatar {
  flex-shrink: 0;
}

.comment-content {
  flex: 1;
}

/* 评论元信息：支持换行 + 间距 */
.comment-meta {
  display: flex;
  align-items: center;
  margin-bottom: 5px;
  flex-wrap: wrap;
  gap: 5px;
}
.author-name {
  font-weight: bold;
  color: #1f2937;
  margin-right: 0;
}
.time {
  color: #9ca3af;
  font-size: 12px;
  margin-left: auto;
}

.comment-text {
  color: #374151;
  line-height: 1.5;
  margin-bottom: 8px;
  text-align: left;
}
.reply-prefix {
  color: #409eff;
  margin-right: 4px;
}

.reply-box {
  margin-top: 10px;
}

.button-group {
  display: flex;
  justify-content: flex-end;
}

.action-buttons {
  display: flex;
  gap: 15px;
  margin-top: 8px;
  align-items: center;
}

/* 点赞数样式 */
.like-count {
  font-size: 12px;
  color: #666;
  margin-left: 8px;
}

.empty-state {
  padding: 50px 0;
  text-align: center;
  color: #9ca3af;
}

.quick-comment {
  margin-top: 20px;
  padding: 15px;
  border-top: 1px solid #e5e7eb;
}
</style>