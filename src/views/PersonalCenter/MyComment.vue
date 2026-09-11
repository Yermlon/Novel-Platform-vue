<template>
  <!-- 模板部分完全不变，无需修改 -->
  <div class="my-comments-page">
    <h2>我的评论</h2>
    <div class="comment-list-wrapper">
      <div 
        class="comment-item"
        v-for="comment in myCommentList"
        :key="comment.commentId || comment.id"
        @click="jumpToCommentPosition(comment)"  
        style="cursor: pointer;"  
      >
        <div class="comment-header">
          <div class="avatar-info">
            <el-avatar :size="40" :src="comment.userAvatar || defaultAvatar" />
            <div class="user-info">
              <span class="username">{{ comment.uname || '匿名用户' }}</span>
              <span class="comment-time">{{ formatCommentTime(comment.createTime) }}</span>
            </div>
          </div>
          <div class="novel-info">
            <!-- 小说不存在：显示「小说已被删除」 -->
            <span v-if="!isNovelExist(comment)" class="novel-title deleted">
              小说已被删除
            </span>
            <template v-else>
              <span class="novel-title">《{{ comment.novelTitle || '未知小说' }}》</span>
              <span v-if="comment.novelStatus === 'OFFLINE'" class="novel-tag offline">
                已下架
              </span>
            </template>
          </div>
        </div>

        <div class="comment-content">
          <template v-if="comment.status === 'PUBLISHED'">
            {{ comment.content }}
          </template>
          <template v-else-if="comment.status === 'BLOCKED'">
            <span style="color: #f56c6c; font-size: 12px;">
              该评论因{{ comment.reviewRemark || '内容违规' }}已被自动屏蔽
            </span>
          </template>
          <template v-else>
            <span style="color: #f5a623; font-size: 12px;">评论审核中...</span>
          </template>
        </div>

        <div 
          v-if="comment.parentId && comment.parentContent" 
          class="parent-comment-preview"
        >
          @{{ comment.parentUsername || '匿名用户' }}：{{ comment.parentContent }}
          <div v-if="comment.grandParentId && comment.grandParentContent" class="grand-parent-preview">
            ↳ @{{ comment.grandParentUsername || '匿名用户' }}：{{ comment.grandParentContent }}
          </div>
        </div>

        <div class="comment-actions">
          <span class="action-item" style="color: #f56c6c;" @click.stop="deleteComment(comment)">
            删除
          </span>
        </div>
      </div>
    </div>

    <div v-if="myCommentList.length === 0" class="empty-tip">
      暂无评论记录
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import request from '@/utils/request';
import { ElMessage, ElMessageBox } from 'element-plus';
import { UserStore } from '@/status/user';
import { storeToRefs } from 'pinia';

const userAvatar = computed(() => userInfo.value?.avatarUrl || defaultAvatar);

const userStore = UserStore();
const { isLogin, userInfo } = storeToRefs(userStore);
const router = useRouter();

// 数据
const myCommentList = ref([]);
const defaultAvatar = 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png';
const novelExistMap = ref(new Map());

// 辅助函数：通过novelId判断小说是否存在
const isNovelExistByNovelId = (novelId) => {
  if (!novelId) return false;
  if (!novelExistMap.value.has(novelId)) {
    return true;
  }
  return novelExistMap.value.get(novelId);
};

// 辅助函数：判断小说是否存在（优先用接口返回的标题/状态）
const isNovelExist = (comment) => {
  // 1. 接口返回了有效的 novelTitle 且不是「未知小说」 → 一定存在
  if (comment.novelTitle && comment.novelTitle !== '未知小说') {
    return true;
  }
  // 2. 否则再用 novelId 去校验
  return isNovelExistByNovelId(comment.novelId);
};

// ========== 核心修改：优化checkNovelExistBatch方法，精准识别「小说不存在」错误 ==========
const checkNovelExistBatch = async (novelIds) => {
  if (!novelIds || novelIds.length === 0) return;
  for (const id of novelIds) {
    try {
      const res = await request.get(`/novel/detail/${id}`);
      // 只有 code=0 才认为存在
      novelExistMap.value.set(id, res.data.code === "0");
    } catch (error) {
      let isNovelNotExist = false;
      // 只匹配「1031」或「小说不存在」的错误信息
      if (error.response?.data?.message || error.message) {
        const errorMsg = (error.response?.data?.message || error.message).toLowerCase();
        isNovelNotExist = errorMsg.includes('1031') || errorMsg.includes('小说不存在');
      }
      // 只有小说不存在时设为 false，其他错误暂时设为 true（避免误判）
      novelExistMap.value.set(id, !isNovelNotExist);
    }
  }
};

// 获取我的评论列表（无修改）
const getMyCommentList = async () => {
  if (!isLogin.value) {
    ElMessage.warning('请先登录');
    router.push('/login');
    return;
  }
  try {
    const res = await request.get('/comment/my/list');
    console.log('我的评论接口返回：', res);
    if (res.data.code === "0" || res.data.code === 0) {
      // ✅ 核心修复：先获取当前用户ID，避免空指针
      const currentUid = userInfo.value?.uid;
      myCommentList.value = (res.data.data || []).map(item => ({
        ...item,
        commentId: item.id || item.commentId,
        // ✅ 安全判断：如果是当前用户且userInfo存在，才用自己的头像
        userAvatar: currentUid && String(item.userId) === String(currentUid)
          ? userAvatar.value
          : (item.userAvatar || defaultAvatar),
        parentId: item.parentId || item.parentCommentId,
        grandParentId: item.grandParentId || item.parentComment?.parentId,
        grandParentContent: item.grandParentContent || item.parentComment?.content,
        grandParentUsername: item.grandParentUsername || item.parentComment?.uname,
        novelStatus: item.novelStatus || 'OFFLINE',
        novelTitle: item.novelTitle || '未知小说',
        novelId: item.novelId ? Number(item.novelId) : null
      }));
      console.log('格式化后的我的评论：', myCommentList.value);

      // 提取所有唯一的novelId，批量校验是否存在
      const uniqueNovelIds = [...new Set(myCommentList.value.map(item => item.novelId).filter(id => id))];
      await checkNovelExistBatch(uniqueNovelIds);
    } else {
      ElMessage.warning(res.data.msg || '获取评论失败');
    }
  } catch (error) {
    console.error('获取我的评论失败：', error);
    ElMessage.error('获取评论失败，请重试');
  }
};
// 跳转到评论所在位置（无修改）
const jumpToCommentPosition = (comment) => {
  // ✅ 优先用 isNovelExist 判断，和页面显示保持一致
  if (!isNovelExist(comment)) {
    ElMessage.warning('该小说已被删除，无法跳转');
    return;
  }
  if (comment.novelStatus === 'OFFLINE') {
    ElMessage.warning('该小说已被下架，无法跳转');
    return;
  }

  const commentId = comment.commentId || comment.id;
  if (!commentId) {
    ElMessage.warning('评论信息不完整，无法跳转');
    console.log('缺失字段：', { novelId: comment.novelId, commentId, parentId: comment.parentId });
    return;
  }
  
  const novelIdNum = Number(comment.novelId);
  if (isNaN(novelIdNum)) {
    ElMessage.warning('小说ID格式错误，无法跳转');
    return;
  }
  
  router.push({
    path: `/novel/detail/${novelIdNum}`,
    query: {
      commentAnchor: commentId,
      parentCommentId: comment.parentId,
      rootCommentId: comment.rootCommentId || comment.parentId || commentId
    }
  });
};

// 删除评论（无修改）
const deleteComment = async (comment) => {
  try {
    await ElMessageBox.confirm('确定要删除这条评论吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    });
    
    const commentId = comment.commentId || comment.id;
    const res = await request.delete(`/comment/${commentId}`, {
      params: { novelId: comment.novelId }
    });
    
    if (res.data.code === "0") {
      ElMessage.success('删除成功');
      getMyCommentList();
    } else {
      ElMessage.warning(res.data.msg || '删除失败');
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败：', error);
      ElMessage.error('删除失败，请重试');
    }
  }
};

// 时间格式化（无修改）
const formatCommentTime = (time) => {
  if (!time) return '未知时间';
  const date = new Date(time);
  if (isNaN(date.getTime())) return '未知时间';
  
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60 * 1000) return '刚刚';
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}分钟前`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}小时前`;
  
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

onMounted(() => {
  getMyCommentList();
});
</script>

<style scoped>
/* 样式部分完全不变 */
.my-comments-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

h2 {
  margin-bottom: 20px;
  font-size: 20px;
  font-weight: 600;
}

.comment-list-wrapper {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.comment-item {
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.comment-item:last-child {
  border-bottom: none;
}

.comment-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.avatar-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.username {
  font-weight: 500;
  color: #333;
}

.comment-time {
  font-size: 12px;
  color: #999;
}

.novel-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.novel-title.deleted {
  color: #999;
  font-size: 14px;
}

.novel-tag.offline {
  font-size: 12px;
  color: #f56c6c;
  background-color: #fef0f0;
  padding: 2px 6px;
  border-radius: 4px;
}

.comment-content {
  margin-bottom: 8px;
  line-height: 1.6;
  color: #333;
  text-align: left !important;
}

.parent-comment-preview {
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  padding: 6px 10px;
  margin-bottom: 8px;
  background-color: #f9fafb;
  font-size: 13px;
  color: #666;
  line-height: 1.4;
  text-align: left !important;
}

.grand-parent-preview {
  margin-top: 4px;
  padding-left: 16px;
  font-size: 12px;
  color: #999;
}

.comment-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  font-size: 13px;
}

.action-item {
  cursor: pointer;
}

.empty-tip {
  text-align: center;
  padding: 40px 0;
  color: #999;
}

.comment-item:hover {
  background-color: #f8f9fa;
}
</style>