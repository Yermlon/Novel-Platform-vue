<template>
  <div class="bookshelf-page">
    <!-- 左侧分组栏 -->
    <div class="group-sidebar">
      <div class="sidebar-header">小说书架</div>
      <div class="group-list">
        <div
          class="group-item"
          :class="{ active: currentGroupId === group.id }"
          v-for="group in groupList"
          :key="group.id"
          @click="switchGroup(group.id)"
          @contextmenu.prevent="handleGroupContextMenu($event, group)"
        >
          {{ group.name }}
        </div>
      </div>
      <div class="add-group-btn">
        <el-button type="primary" plain @click="handleAddGroup">新增分组</el-button>
      </div>
    </div>

    <!-- 右侧内容区 -->
    <div class="content-area">
      <!-- 顶部排序下拉框 -->
      <div class="sort-bar">
        <el-select v-model="sortType" @change="handleSortChange" size="default">
          <el-option label="按收藏顺序" value="collect" />
          <el-option label="按字数排序" value="wordCount" />
          <el-option label="按阅读量排序" value="readCount" />
        </el-select>
      </div>

      <!-- 小说列表 -->
      <div class="novel-list" v-loading="listLoading">
        <div
          class="novel-item"
          v-for="novel in novelList"
          :key="novel.novelId"
          @click="goToRead(novel.novelId)"
        >
          <!-- 封面 -->
          <div class="novel-cover">
            <el-image
              :src="novel.coverUrl || '/default-cover.png'"
              fit="cover"
              style="width: 100%; height: 100%;"
              fallback="https://cube.elemecdn.com/e/fd/0cfd52cf0d1dce0d32533ae06e1cd.png"
              lazy
            />
          </div>

          <!-- 左侧信息区：核心修改 - 作者名+状态 -->
          <div class="novel-left-info">
            <div class="novel-title">{{ novel.title || '未知小说' }}</div>
            <!-- 作者名 + 状态标签 -->
            <div class="novel-author-row">
              <span class="novel-author">{{ novel.authorPenName || '未知作者' }}</span>
              <span class="novel-status" :class="getStatusClass(novel.updateStatus)">
                {{ getStatusText(novel.updateStatus) }}
              </span>
            </div>
            <div class="novel-desc">{{ novel.intro || '暂无简介' }}</div>
            <div class="novel-word-count">{{ formatWordCount(novel.wordCount || 0) }}</div>
          </div>

          <!-- 右侧信息区 -->
          <div class="novel-right-info">
            <div class="novel-type">{{ novel.typeName || '未知分类' }}</div>
            <div class="novel-update-time">{{ formatTime(novel.updateTime) }}</div>
            <div class="novel-id">ID: {{ novel.novelId }}</div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="novelList.length === 0 && !listLoading" class="empty-tip">
          <el-empty description="该分组暂无小说" />
        </div>
      </div>
    </div>

    <!-- ✅ 复用章节管理的右键菜单结构 -->
    <div
      ref="contextMenuRef"
      v-if="contextMenuVisible && currentEditGroup"
      class="manual-context-menu"
      :style="{ left: contextMenuX + 'px', top: contextMenuY + 'px', position: 'fixed', zIndex: 999999 }"
      @contextmenu.prevent
    >
      <div class="context-menu">
        <div 
          class="menu-item"
          @click="handleGroupMove('up')"
          :class="{ disabled: isFirstGroup(currentEditGroup) || currentEditGroup.default }"
        >
          上移
        </div>
        <div 
          class="menu-item"
          @click="handleGroupMove('down')"
          :class="{ disabled: isLastGroup(currentEditGroup) || currentEditGroup.default }"
        >
          下移
        </div>
        <div 
          class="menu-item"
          @click="handleGroupRename"
          :class="{ disabled: currentEditGroup.default }"
        >
          重命名
        </div>
        <div 
          class="menu-item danger divide"
          @click="handleGroupDelete"
          :class="{ disabled: currentEditGroup.default }"
        >
          删除
        </div>
      </div>
    </div>

    <!-- 新增/重命名分组弹窗 -->
    <el-dialog v-model="groupDialogVisible" :title="dialogTitle" width="400px" @closed="handleDialogClosed">
      <el-form :model="groupForm" :rules="groupFormRules" ref="groupFormRef">
        <el-form-item label="分组名称" prop="name">
          <el-input v-model="groupForm.name" placeholder="请输入分组名称" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="groupDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmGroupOperation">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, computed, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import request from '@/utils/request';
import { ElMessage, ElMessageBox } from 'element-plus';
import { UserStore } from '@/status/user';

const router = useRouter();
const userStore = UserStore();

// ✅ 复用章节管理的右键菜单状态
const contextMenuRef = ref(null);
const contextMenuVisible = ref(false);
const currentEditGroup = ref(null);
const contextMenuX = ref(0);
const contextMenuY = ref(0);

const userId = computed(() => {
  const id = userStore.userInfo?.uid; // 把 id 改成 uid
  return id != null ? Number(id) : null;
});

const groupList = ref([]);
const currentGroupId = ref(0);
const groupDialogVisible = ref(false);
const dialogTitle = ref('新增分组');

const groupForm = reactive({ name: '' });
const groupFormRules = reactive({
  name: [
    { required: true, message: '分组名称不能为空', trigger: 'blur' },
    { max: 20, message: '分组名称不能超过20个字符', trigger: 'blur' }
  ]
});
const groupFormRef = ref(null);

const sortType = ref('collect');
const novelList = ref([]);
const listLoading = ref(false);

// ========== 核心新增：状态处理方法 ==========
const getStatusText = (status) => {
  switch (status) {
    case 0: return '连载中'; // 对应 NovelUpdateStatus.SERIALIZING
    case 1: return '暂停';   // 对应 NovelUpdateStatus.PAUSED
    case 2: return '已完结'; // 对应 NovelUpdateStatus.FINISHED
    default: return '未知';
  }
};

const getStatusClass = (status) => {
  switch (status) {
    case 0: return 'serial';
    case 1: return 'paused';
    case 2: return 'finished';
    default: return 'unknown';
  }
};

const handleDialogClosed = () => {
  // ✅ 弹窗关闭后清空 groupForm.name，避免复用上次内容
  groupForm.name = '';
  // 重置表单校验状态
  groupFormRef.value?.resetFields();
};

// ========== 加载分组列表 ==========
const loadGroupList = async () => {
  try {
    const res = await request.get('/shelf/category/list');
    if (res.data?.code === '0') {
      groupList.value = [...(res.data.data || [])];
      // 手动给每个分组赋值 default 字段（假设默认分组 name 是 "默认分组"）
      groupList.value.forEach(group => {
        group.default = group.name === '默认分组';
      });
      // 排序逻辑不变
      groupList.value.sort((a, b) => {
        if (a.default && !b.default) return -1;
        if (!a.default && b.default) return 1;
        return a.sort - b.sort;
      });
      const defaultGroup = groupList.value.find(item => item.default === true);
      if (defaultGroup) {
        currentGroupId.value = defaultGroup.id;
        loadNovelList();
      }
    } else {
      ElMessage.warning(res.data?.msg || '加载分组列表失败');
    }
  } catch (error) {
    console.error('加载分组列表失败：', error);
    ElMessage.error('加载分组列表异常');
  }
};

// ========== 加载小说列表 ==========
const loadNovelList = async () => {
  if (!userId.value || !currentGroupId.value) return;
  listLoading.value = true;
  try {
    const res = await request.get('/collect/list', {
      params: {
        userId: userId.value,
        categoryId: currentGroupId.value,
        sortType: sortType.value
      }
    });
    if (res.data?.code === '0') {
      novelList.value = res.data.data || [];
    } else {
      ElMessage.warning(res.data?.msg || '加载小说列表失败');
    }
  } catch (error) {
    console.error('加载小说列表失败：', error);
    ElMessage.error('加载小说列表异常');
  } finally {
    listLoading.value = false;
  }
};

const switchGroup = (groupId) => {
  currentGroupId.value = groupId;
  loadNovelList();
};

const handleSortChange = () => {
  loadNovelList();
};

const handleAddGroup = () => {
  dialogTitle.value = '新增分组';
  // ✅ 先重置表单，再清空（顺序反过来）
  groupFormRef.value?.resetFields();
  groupForm.name = ''; 
  groupDialogVisible.value = true;
};

// 确认分组操作（新增/重命名）
const confirmGroupOperation = async () => {
  if (!userStore.isLogin) {
    ElMessage.warning('未登录，无法操作分组');
    return;
  }
  try {
    await groupFormRef.value.validate();
  } catch (error) {
    return ElMessage.warning('请填写正确的分组名称');
  }

  try {
    let res;
    if (dialogTitle.value === '新增分组') {
      res = await request.post('/shelf/category/add', {
        name: groupForm.name.trim()
      });
    } else {
      const requestParams = {
        categoryId: Number(currentEditGroupId.value),
        newName: groupForm.name.trim()
      };
      res = await request.post('/shelf/category/update/name', requestParams);
    }
    if (res.data && res.data.code === '0') {
      ElMessage.success(res.data.msg || '操作成功');
      groupDialogVisible.value = false;
      loadGroupList();
    } else {
      ElMessage.error(res.data?.msg || '操作失败');
    }
  } catch (error) {
    console.error('分组操作失败:', error);
    ElMessage.error('分组操作异常');
  } finally {
    if (dialogTitle.value === '重命名分组') {
      currentEditGroupId.value = null;
      currentEditGroup.value = null;
    }
  }
};

// ========== ✅ 核心改造：复用章节管理的右键菜单逻辑 ==========
// 关闭右键菜单
const closeContextMenu = () => {
  contextMenuVisible.value = false;
  currentEditGroup.value = null;
  contextMenuX.value = 0;
  contextMenuY.value = 0;
};

// 判断是否是第一个分组（只有索引为0时才禁用）
const isFirstGroup = (group) => {
  if (!group) return true;
  // 注意：这里应该在 editableGroups 里计算索引，而不是 groupList
  const editableGroups = groupList.value.filter(g => !g.default);
  const currentIndex = editableGroups.findIndex(item => item.id === group.id);
  return currentIndex === 0;
};

// 判断是否是最后一个分组（只有索引为最后一位时才禁用）
const isLastGroup = (group) => {
  if (!group) return true;
  // ✅ 正确：在 editableGroups 里算索引
  const editableGroups = groupList.value.filter(g => !g.default);
  const currentIndex = editableGroups.findIndex(item => item.id === group.id);
  return currentIndex === editableGroups.length - 1;
};

const currentEditGroupId = ref(null);

// 右键菜单触发逻辑
const handleGroupContextMenu = (event, group) => {
  if (group.name === '默认分组' || group.default) {
    return;
  }
  // 阻止默认右键菜单
  event.preventDefault();
  event.stopImmediatePropagation();
  
  // 设置当前操作的分组
  currentEditGroup.value = group;
  currentEditGroupId.value = group.id; 
  
  // 设置菜单位置
  contextMenuX.value = event.clientX;
  contextMenuY.value = event.clientY;
  
  // 显示菜单
  contextMenuVisible.value = true;

  // 清除之前的定时器
  if (window.closeMenuTimer) {
    clearTimeout(window.closeMenuTimer);
    window.closeMenuTimer = null;
  }
};

// 分组上移/下移 最终版（参考章节排序逻辑）
const handleGroupMove = async (direction) => {
console.log('=== handleGroupMove 开始执行 ===');
  console.log('userId:', userId.value, '类型:', typeof userId.value);
  console.log('currentEditGroup:', currentEditGroup.value);
  console.log('currentEditGroup.value.default:', currentEditGroup.value?.default);

  if (!currentEditGroup.value) {
    console.log('=== 提前 return：currentEditGroup 为空 ===');
    return;
  }
  // 单独判断 userId：如果是 undefined 或 null，提示用户
  if (userId.value == null) {
    ElMessage.warning('用户信息未加载，请重新登录');
    closeContextMenu();
    return;
  }
  if (currentEditGroup.value?.default === true) {
    console.log('=== 提前 return：是默认分组 ===');
    ElMessage.warning('默认分组不能移动');
    closeContextMenu();
    return;
  }

  console.log('=== 继续执行后续逻辑 ===');
  const editableGroups = groupList.value.filter(g => !g.default);
  console.log('editableGroups:', editableGroups);
  // 2. 在 editableGroups 里重新计算当前分组的索引
  const currentIndex = editableGroups.findIndex(item => item.id === currentEditGroup.value.id);
  
  if (direction === 'up' && currentIndex === 0) {
    return ElMessage.warning('已经是第一个分组，无法上移');
  }
  if (direction === 'down' && currentIndex === editableGroups.length - 1) {
    return ElMessage.warning('已经是最后一个分组，无法下移');
  }

  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  const currentGroup = editableGroups[currentIndex];
  const targetGroup = editableGroups[targetIndex];
  
  try {
    // 交换两个分组的sort值（前端临时调整）
    const tempSort = currentGroup.sort;
    currentGroup.sort = targetGroup.sort;
    targetGroup.sort = tempSort;

    // 构造批量排序数据
    const sortData = editableGroups.map(group => ({
      categoryId: Number(group.id),
      sort: group.sort
    }));

    console.log('请求参数 sortData:', sortData); // 看 categoryId 和 sort 是否正确

    // 调用批量排序接口
    const res = await request.post(`/shelf/category/adjust-sort/${userId.value}`,
      sortData,
      { headers: { 'Content-Type': 'application/json' } }
    );
console.log('接口返回:', res.data); // 看后端是否真的返回 code=0
    if (res.data?.code === '0') {
      ElMessage.success(`分组${direction === 'up' ? '上移' : '下移'}成功`);
      await loadGroupList();
      currentGroupId.value = currentGroup.id;
    } else {
      ElMessage.error(res.data?.msg || '分组排序调整失败');
    }
  } catch (error) {
    console.error('调整分组排序失败：', error);
    ElMessage.error('网络异常，分组排序调整失败');

        console.error('请求失败详情:', error); // 重点看这个错误信息
  } finally {
    closeContextMenu();
  }
};

// 重命名分组
const handleGroupRename = () => {
  if (!currentEditGroup.value) return;
  if (currentEditGroup.value.default) {
    ElMessage.warning('默认分组不能修改名称');
    closeContextMenu();
    return;
  }
  dialogTitle.value = '重命名分组';
  // ✅ 先重置表单，再赋值（顺序反过来）
  groupFormRef.value?.resetFields();
  groupForm.name = currentEditGroup.value.name; 
  groupDialogVisible.value = true;
  closeContextMenu(); // 关闭右键菜单
};

// 删除分组
const handleGroupDelete = async () => {
  if (!currentEditGroup.value) {
    console.error("删除失败：currentEditGroup 为空", currentEditGroup.value);
    ElMessage.error("非法操作，无法获取分组信息");
    return;
  }

  if (currentEditGroup.value.default) {
    ElMessage.warning('默认分组不能删除');
    closeContextMenu();
    return;
  }

  try {
    // ✅ 先存 id 到局部变量
    const groupId = Number(currentEditGroup.value.id);
    // ✅ 再关闭菜单（此时 currentEditGroup 被清空，但局部变量 groupId 还在）
    closeContextMenu();

    await ElMessageBox.confirm(
      '删除后该分组下的小说将移入默认分组，是否确认删除？',
      '提示',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    const requestParams = {
      categoryId: groupId
    };
    const res = await request.post('/shelf/category/delete', requestParams);

    if (res.data && res.data.code === '0') {
      ElMessage.success(res.data.msg || '分组删除成功');
      loadGroupList();
    } else {
      ElMessage.error(res.data?.msg || '分组删除失败');
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除请求异常:', error);
      ElMessage.error('删除操作失败，请重试');
    }
  }
};

// 跳转到阅读页
const goToRead = async (novelId) => {
  try {
    // 1. 获取小说详情，判断字数
    const novelRes = await request.get(`/novel/bookStore/detail/${novelId}`);
    const novelInfo = novelRes.data?.data?.novelInfo || {};
    const wordCount = novelInfo.wordCount || 0;

    if (wordCount === 0) {
      router.push(`/novel/detail/${novelId}`);
      ElMessage.info('该小说暂无内容，已为你跳转到详情页');
      return;
    }

    // 2. 获取最后阅读章节（请求合并后的接口）
    let lastChapterId = '';
    try {
      const readRes = await request.get(`/read/last-chapter/${novelId}`);
      // 接口返回的是章节ID（直接取 data）
      lastChapterId = readRes.data.data || '';
    } catch (err) {
      console.error('获取最后阅读章节失败:', err);
      lastChapterId = '';
    }

    // 3. 有最后阅读章节 → 跳转；无则跳第一章
    if (lastChapterId) {
      router.push(`/novel/read/${novelId}/${lastChapterId}`);
      return;
    }

    const chapterRes = await request.get('/chapter/list', { params: { novelId } });
    if (chapterRes.data?.code === '0' && chapterRes.data.data?.length > 0) {
      const firstChapterId = chapterRes.data.data[0].chapterId;
      router.push(`/novel/read/${novelId}/${firstChapterId}`);
    } else {
      ElMessage.warning('该小说暂无章节，已为你跳转到详情页');
      router.push(`/novel/detail/${novelId}`);
    }
  } catch (err) {
    console.error('跳转阅读页失败:', err);
    ElMessage.error('跳转失败，请重试');
  }
};

// 格式化时间
const formatTime = (time) => {
  if (!time) return '未知时间';
  const date = new Date(time);
  if (isNaN(date.getTime())) return '未知时间';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

// 格式化字数
const formatWordCount = (count) => {
  if (count < 10000) return `${count}字`;
  else if (count < 100000) return `${(count / 10000).toFixed(1)}万字`;
  else return `${Math.floor(count / 10000)}万字`;
};

// ========== 生命周期：添加全局事件监听 ==========
onMounted(async () => {
  await userStore.initUserInfo();
  if (!userStore.isLogin) {
    ElMessage.warning('未获取到用户信息，请先登录');
    router.replace('/login');
    return;
  }

  loadGroupList();

  // ✅ 复用章节管理的全局事件监听
  const handleDocumentClick = (e) => {
    if (contextMenuVisible.value) {
      const menuElement = contextMenuRef.value;
      setTimeout(() => {
        if (!menuElement || !menuElement.contains(e.target)) {
          closeContextMenu();
        }
      }, 100);        
    }
  };

  const handleDocumentContextMenu = (e) => {
    const isGroupItem = e.target.closest('.group-item');
    if (!isGroupItem) {
      closeContextMenu();
    } else {
      e.stopPropagation();
    }
  };

  const handleEscKeyDown = (e) => {
    if (e.key === 'Escape' && contextMenuVisible.value) {
      closeContextMenu();
    }
  };

  // 绑定全局事件
  document.addEventListener('click', handleDocumentClick);
  document.addEventListener('contextmenu', handleDocumentContextMenu);
  document.addEventListener('keydown', handleEscKeyDown);
  
  // 挂载到window方便卸载
  window.handleDocumentClick = handleDocumentClick;
  window.handleDocumentContextMenu = handleDocumentContextMenu;
  window.handleEscKeyDown = handleEscKeyDown;
});

// ========== 生命周期：移除事件监听 ==========
onBeforeUnmount(() => {
  // 移除全局事件监听
  document.removeEventListener('click', window.handleDocumentClick);
  document.removeEventListener('contextmenu', window.handleDocumentContextMenu);
  document.removeEventListener('keydown', window.handleEscKeyDown);
  
  // 清空挂载的方法
  window.handleDocumentClick = null;
  window.handleDocumentContextMenu = null;
  window.handleEscKeyDown = null;
  
  // 关闭菜单
  closeContextMenu();
  
  // 清除定时器
  if (window.closeMenuTimer) {
    clearTimeout(window.closeMenuTimer);
    window.closeMenuTimer = null;
  }
});
</script>

<style scoped>
.bookshelf-page {
  display: flex;
  min-height: 85vh;
  max-width: 1400px;
  margin: 20px auto;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}

.group-sidebar {
  width: 220px;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
}
.sidebar-header {
  padding: 15px;
  font-size: 16px;
  font-weight: bold;
  border-bottom: 1px solid #e0e0e0;
}
.group-list {
  flex: 1;
  overflow-y: auto;
}
.group-item {
  padding: 12px 15px;
  cursor: pointer;
  transition: background-color 0.2s;
}
.group-item:hover {
  background-color: #f5f7fa;
}
.group-item.active {
  background-color: #ecf5ff;
  color: #409eff;
}
.add-group-btn {
  padding: 15px;
  border-top: 1px solid #e0e0e0;
}

.content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.sort-bar {
  padding: 15px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: flex-end;
}

.novel-list {
  flex: 1;
  padding: 0;
  overflow-y: auto;
}
.novel-item {
  display: flex;
  align-items: flex-start;
  padding: 15px;
  border-bottom: 1px solid #e0e0e0;
  cursor: pointer;
  transition: background-color 0.2s;
}
.novel-item:hover {
  background-color: #f8f9fa;
}
.novel-item:last-child {
  border-bottom: none;
}
.novel-cover {
  width: 120px;
  height: 160px;
  margin-right: 20px;
  border: 1px solid #e0e0e0;
  flex-shrink: 0;
}
.novel-left-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
  min-width: 0;
}
.novel-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

/* ========== 核心新增：状态标签样式 ========== */
.novel-author-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}
.novel-author {
  font-size: 14px;
  color: #666;
}
.novel-status {
  padding: 2px 6px;
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
.novel-status.unknown {
  background-color: #f5f5f5;
  color: #999;
}

.novel-desc {
  font-size: 14px;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  /* autoprefixer: ignore next */
  -webkit-line-clamp: 2;
  line-clamp: 2;
  /* 用标准 flex 替代旧 box 语法，消除 Autoprefixer 警告 */
  display: -webkit-box;
  -webkit-box-orient: vertical;
  /* 删掉这两行旧语法：display: box; box-orient: vertical; */
}
.novel-word-count {
  font-size: 12px;
  color: #999;
}
.novel-right-info {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  margin-left: 20px;
  min-width: 120px;
}
.novel-type {
  font-size: 14px;
  color: #666;
  background-color: #f0f9ff;
  padding: 2px 8px;
  border-radius: 4px;
}
.novel-update-time {
  font-size: 12px;
  color: #999;
}
.novel-id {
  font-size: 12px;
  color: #999;
}
.empty-tip {
  padding: 50px 0;
  text-align: center;
}

/* ✅ 复用章节管理的右键菜单样式 */
.manual-context-menu {
  padding: 4px 0 !important;
  background-color: #fff !important;
  border-radius: 4px !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15) !important;
  border: 1px solid #e5e7eb !important;
  font-size: 14px !important;
  color: #333 !important;
  position: fixed !important;
  z-index: 999999 !important; 
  pointer-events: auto !important;
  min-width: 120px; 
}

.manual-context-menu .menu-item {
  padding: 8px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
  pointer-events: auto !important;
}

.manual-context-menu .menu-item:hover {
  background-color: #f5f7fa;
}

.manual-context-menu .menu-item.disabled {
  color: #c0c4cc;
  cursor: not-allowed;
  background-color: transparent !important;
}

.manual-context-menu .menu-item.danger {
  color: #f56c6c;
}

.manual-context-menu .menu-item.danger:hover {
  background-color: #fef0f0 !important;
}

.manual-context-menu .menu-item.divide {
  border-top: 1px solid #e0e0e0;
  margin-top: 5px;
  padding-top: 8px;
}
</style>