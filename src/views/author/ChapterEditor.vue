<template>
<div class="chapters-container" :class="currentMode">
    <div class="top">
        <label class="label">所属小说</label>
        <el-select 
           v-model="currentNovelId"
           placeholder="请选择小说"
           class="novel-select"
           @change="handleNovelChange"
           :disabled="loading"
           v-if="novelList.length > 0"
        >
           <el-option
              v-for="novel in novelList"
              :key="novel.id"
              :label="novel.title"
              :value="novel.id"
              :data-status="novel.status"
           />
        </el-select>
        <span class="auto-save-tip" v-if="autoSaveTip">{{ autoSaveTip }}</span>
    </div>
    

    <div class="main-layout" >
        <div class="sidebar-left">
            <div class="chapter-list-wrapper" ref="chapterListRef">
            <div v-if="chapterList.length === 0" class="empty-tip">暂无内容，请先创建章节</div>
            
            <div class="chapter-group" v-if="publishedChapters.length > 0">
                <div class="group-title">已发布章节</div>
                <div 
                    class="chapter-item"
                    :class="{
                        active: chapter.id === currentChapter.id,
                        published: chapter.status === 'PUBLISHED',
                        offline: chapter.status === 'OFFLINE'
                    }"
                    v-for="chapter in publishedChapters"
                    :key="chapter.id"
                    @contextmenu.prevent="openContextMenu(chapter, 'publish', $event)"
                    @click="selectChapter(chapter)"
                >
                    <div class="chapter-content" >
                        <span class="chapter-text">第{{ chapter.publishSort }}章 {{ chapter.title }}</span>                  
                        <span class="chapter-status">(已发布:{{ chapter.wordCount }}字)</span>
                    </div>
                </div>
           </div>

           <div class="chapter-group" v-if="offlineChapters.length > 0">
              <div class="group-title">已下架章节</div>
                <div 
                class="chapter-item"
                :class="{
                    active: chapter.id === currentChapter.id,
                    offline: chapter.status === 'OFFLINE'
                }"
                v-for="chapter in offlineChapters"
                :key="chapter.id"
                @contextmenu.prevent="openContextMenu(chapter, 'offline', $event)"
                @click="selectChapter(chapter)"
                >
                <div class="chapter-content" >
                    <span class="chapter-text">第{{ chapter.publishSort }}章 {{ chapter.title }}</span>                  
                    <span class="chapter-status">(已下架:{{ chapter.wordCount }}字)</span>
                </div>
              </div>
            </div>

           <div class="chapter-group" v-if="draftChapters.length > 0">
            <div class="group-title">未发布章节</div>
            <div 
                class="chapter-item" 
                :class="{ 
                    active: chapter.id === currentChapter.id,
                    draft: chapter.status !== 'PUBLISHED'    
                }" 
                v-for="chapter in draftChapters"
                :key="chapter.id"
                @contextmenu.prevent="openContextMenu(chapter, 'draft', $event)"
                @click="selectChapter(chapter)"
            >
                <div class="chapter-content">
                    <span class="chapter-text">第{{ chapter.sort }}章 {{ chapter.title }}</span>                
                    <span class="chapter-status">({{ chapter.status }}: {{ chapter.wordCount }}字)</span>
                </div>
            </div>
        </div>
    </div>

            <div class="sidebar-actions">
                <el-button type="primary" @click="createChapter('正文')">新建章节</el-button>
            </div>
        </div>

        <!-- 纯文本编辑器区域 -->
        <div class="editor-area-wrapper">
            <div class="editor-area">
                <div class="plain-text-editor">
                    <div class="editor-toolbar">
                        <span class="word-count">字数：{{ currentChapter.wordCount }}</span>
                    </div>
                    <textarea
                        v-model="chapterContent"
                        class="editor-input"
                        :class="currentMode + '-mode'"
                        placeholder="请输入章节内容（纯文本）"
                        @input="handleTextChange"
                    ></textarea>
                </div>
                
                <div class="mode-switch">
                    模式切换：
                    <el-button size="small" @click="switchMode('eye')" :type="currentMode === 'eye' ? 'primary' : ''">护眼</el-button>
                    <el-button size="small" @click="switchMode('night')" :type="currentMode === 'night' ? 'primary' : ''">夜间</el-button>
                    <el-button size="small" @click="switchMode('sun')" :type="currentMode === 'sun' ? 'primary' : ''">日间</el-button>
                </div>
            </div>
        </div>

        <div class="sidebar-right">
            <div class="setting-title">章节设置</div>
            <el-form :model="currentChapter" label-width="80px" class="setting-form">
                <el-form-item label="章节标题">
                    <el-input v-model="currentChapter.title" placeholder="请输入章节标题" :disabled="currentChapter.status === 'OFFLINE'"/>
                </el-form-item>
                <el-form-item label="章节简介">
                    <el-input 
                       v-model="currentChapter.brief"
                       type="textarea"
                       placeholder="请输入章节简介（选填）"
                       :rows="3"
                       class="w-full"
                       :disabled="currentChapter.status == 'OFFLINE'"
                    />
                </el-form-item>
                <el-button type="primary" @click="saveDraft(false)" :loading="btnLoading" style="margin-right: 8px;" v-if="currentChapter.status !== 'OFFLINE'">保存草稿</el-button>
                <el-button type="success" @click="publishChapter" :loading="btnLoading" v-if="currentChapter.status != 'OFFLINE'">发布</el-button> 
            </el-form>
        </div>
    </div>
    <div
        ref="contextMenuRef"
        v-if="contextMenuVisible && currentContextMenuChapter"
        class="manual-context-menu"
        :style="{ left: contextMenuX + 'px', top: contextMenuY + 'px', position: 'fixed', zIndex: 999999 }"
        @mousedown.stop @mouseup.stop @contextmenu.stop
    >
        <div class="context-menu">
            <div 
                class="menu-item"
                @click="handleMenuClick('moveUp')"
                :class="{ disabled: ['OFFLINE'].includes(currentContextMenuChapter?.status) || isFirstChapter(currentContextMenuChapter, currentContextMenuType) }"
            >
                上移
            </div>
            <div 
                class="menu-item"
                @click="handleMenuClick('moveDown')"
                :class="{ disabled: ['OFFLINE'].includes(currentContextMenuChapter?.status) || isLastChapter(currentContextMenuChapter, currentContextMenuType) }"
            >
                下移
            </div>
            <div 
                class="menu-item danger"
                @click="handleMenuClick('delete')"
                v-if="currentContextMenuChapter?.status != 'OFFLINE'"
            >
                {{ currentContextMenuChapter?.status === 'PUBLISHED' ? '下架' : '删除' }}
            </div>
            <div 
                class="menu-item"
                v-if="currentContextMenuChapter?.status === 'OFFLINE'"
                @click="handleMenuClick('restore')"
            >
                上架
            </div>
        </div>
    </div>
</div>
</template>

<script setup>
import { ElMessage, ElMessageBox } from 'element-plus';
import { ref, reactive, onMounted, onBeforeUnmount, watch, nextTick, triggerRef, readonly, computed } from 'vue';
import request from '@/utils/request';

// 上下文菜单相关
const contextMenuVisible = ref(false);
const currentContextMenuChapter = ref(null);
const currentContextMenuType = ref('');
const contextMenuX = ref(0);
const contextMenuY = ref(0);
const contextMenuRef = ref(null);

// 纯文本内容绑定
const chapterContent = ref('');

const openContextMenu = (chapter, type, event) => {
    if (window.closeMenuTimer) {
        clearTimeout(window.closeMenuTimer);
        window.closeMenuTimer = null;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    currentContextMenuChapter.value = chapter;
    currentContextMenuType.value = type;
    contextMenuX.value = event.clientX;
    contextMenuY.value = event.clientY;
    contextMenuVisible.value = true;
};

const closeContextMenu = () => {
    if (window.closeMenuTimer) {
        clearTimeout(window.closeMenuTimer);
        window.closeMenuTimer = null;
    }
    contextMenuVisible.value = false;
    currentContextMenuChapter.value = null;
    currentContextMenuType.value = '';
    contextMenuX.value = 0;
    contextMenuY.value = 0;
};

const handleMenuClick = (command) => {
    if (!currentContextMenuChapter.value) return;
    switch(command) {
        case 'moveUp':
            moveChapterUp(currentContextMenuChapter.value, currentContextMenuType.value);
            break;
        case 'moveDown':
            moveChapterDown(currentContextMenuChapter.value, currentContextMenuType.value);
            break;
        case 'delete':
            handleDeleteChapter(currentContextMenuChapter.value);
            break;
        case 'restore':
            restoreChapter(currentContextMenuChapter.value);
            break;
    }
    closeContextMenu(); 
};

const loading = ref(false);
const btnLoading = ref(false);
const autoSaveTip = ref('');
let autoSaveTimer = null;

const novelList = ref([]);
const currentNovelId = ref('');
const currentNovelStatus = ref('');
const chapterList = ref([]);

let sortableInstance = null;

// 小说更新状态（0=连载，1=暂停，2=完结）
const currentNovelUpdateStatus = ref(0);

// 纯文本字数统计（去除所有空白字符）
const calculateWordCount = (text) => {
  if (!text) return 0;
  return text.replaceAll(/\s+/g, '').length;
};

// 纯文本内容变化监听
const handleTextChange = () => {
  currentChapter.content = chapterContent.value;
  currentChapter.draftContent = chapterContent.value;
  currentChapter.wordCount = calculateWordCount(chapterContent.value);
  
  // 更新章节列表中的字数
  const targetChapter = chapterList.value.find(ch => ch.id == currentChapter.id);
  if (targetChapter) {
      targetChapter.wordCount = currentChapter.wordCount;
      targetChapter.draftContent = chapterContent.value;
  }

  // 触发自动保存
  triggerAutoSave();
};

const getNovelsList = async () => {
    loading.value = true;
    try {
        const res = await request.get('/novel/list');
        if (res.data.code === '0') {
            novelList.value = res.data.data.records || [];
            if (novelList.value.length > 0) {
                currentNovelId.value = novelList.value[0].id;
                currentNovelStatus.value = novelList.value[0].status;
                await nextTick();
                await handleNovelChange(currentNovelId.value);
            } else {
                ElMessage.info('未在名下找到小说，请先创建小说');
            }
        }
    } catch (error) {
        console.error('获取作品列表失败',error);
        ElMessage.error('网络异常，获取作品列表失败');
        novelList.value = [];
    } finally {
        loading.value = false;
    }
};

const currentChapter = reactive({
    id: '',
    title: '',
    status: '',
    wordCount: 0,
    content: '',
    draftContent: '',
    brief: '',
});

const currentMode = ref('sun');

// 切换编辑器模式
const switchMode = (modeType) => {
    currentMode.value = modeType;
};

const isFirstChapter = (chapter, type) => {
    if(!chapter) return true;
    let list = type === 'publish' ? publishedChapters.value : draftChapters.value;
    const currentIndex = list.findIndex(item => item.id === chapter.id);
    return currentIndex <= 0;
};

const isLastChapter = (chapter, type) => {
    if(!chapter) return true;
    let list = type === 'publish' ? publishedChapters.value : draftChapters.value;
    const currentIndex = list.findIndex(item => item.id === chapter.id);
    return currentIndex === list.length -1 || currentIndex === -1;
};

const moveChapterUp = async (chapter, type) => {
    if (!chapter) return;
    let list, sortKey, updateFunc;
    if (type === 'publish') {
        list = publishedChapters.value;
        sortKey = 'publishSort';
        updateFunc = updatePublishSort;
    } else {
        list = draftChapters.value;
        sortKey = 'sort';
        updateFunc = updateChapterSort;
    }
    const currentIndex = list.findIndex(item => item.id === chapter.id);
    if (currentIndex <= 0) {
        ElMessage.info('已经是第一个章节，无法上移');
        return;
    }
    const prevChapter = list[currentIndex - 1];
    const tempSort = chapter[sortKey];
    chapter[sortKey] = prevChapter[sortKey];
    prevChapter[sortKey] = tempSort;
    const chapterIndex = chapterList.value.findIndex(item => item.id === chapter.id);
    const prevIndex = chapterList.value.findIndex(item => item.id === prevChapter.id);
    chapterList.value[chapterIndex][sortKey] = chapter[sortKey];
    chapterList.value[prevIndex][sortKey] = prevChapter[sortKey];
    await updateFunc();
    ElMessage.success('章节上移成功');
}

const moveChapterDown = async (chapter, type) => {
    if(!chapter) return;
    let list, sortKey, updateFunc;
    if (type === 'publish') {
        list = publishedChapters.value;
        sortKey = 'publishSort';
        updateFunc = updatePublishSort;
    } else {
        list = draftChapters.value;
        sortKey = 'sort';
        updateFunc = updateChapterSort;
    }
    const currentIndex = list.findIndex(item => item.id === chapter.id);
    if (currentIndex === list.length - 1 || currentIndex === -1) {
        ElMessage.info('已经是最后一个章节，无法下移');
        return;
    }
    const nextChapter = list[currentIndex + 1];
    const tempSort = chapter[sortKey];
    chapter[sortKey] = nextChapter[sortKey];
    nextChapter[sortKey] = tempSort;
    const chapterIndex = chapterList.value.findIndex(item => item.id === chapter.id);
    const nextIndex = chapterList.value.findIndex(item => item.id === nextChapter.id);
    chapterList.value[chapterIndex][sortKey] = chapter[sortKey];
    chapterList.value[nextIndex][sortKey] = nextChapter[sortKey];
    await updateFunc();
    ElMessage.success('章节下移成功');
};

const updateChapterSort = async () => {
    if (!currentNovelId.value) return;
    try {
        const sortData = chapterList.value.filter(ch => ch.status !== 'PUBLISHED').map(chapter => ({
            chapterId: Number(chapter.id),
            sort: chapter.sort
        }));
        const res = await request.post(`/chapter/adjust-sort/${currentNovelId.value}`,
            sortData,
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );
        if (res.data.code === '0') {
            await handleNovelChange(currentNovelId.value);
        } else {
            ElMessage.error(res.data.msg || '章节顺序更新失败');
        }
    } catch (error) {
        console.error('更新章节排序失败：', error);
        console.error('后端返回的错误详情：', error.response?.data);
        ElMessage.error('网络异常，章节顺序更新失败');
    }
};

const updatePublishSort = async () => {
    if (!currentNovelId.value) return;
    try {
        const sortData = publishedChapters.value.map(chapter => ({
            chapterId: Number(chapter.id),
            sort: chapter.publishSort
        }));
        const res = await request.post(`/chapter/adjust-publish-sort/${currentNovelId.value}`,
            sortData,
            { headers: { 'Content-Type': 'application/json' } }
        );
        if (res.data.code === '0') {
            await handleNovelChange(currentNovelId.value);
        } else {
            ElMessage.error(res.data.msg || '已发布章节顺序更新失败');
        }
    } catch (error) {
        console.error('更新已发布章节排序失败：', error);
        ElMessage.error('网络异常，已发布章节顺序更新失败');
    }
};

const handleDeleteChapter = async (chapter) => {
    if(!chapter) return;
    const deleteText = chapter.status === 'PUBLISHED' ? '软删除（下架）' : '硬删除（永久删除)';
    const confirmText = chapter.status === 'PUBLISHED' ? '确认将该章节下架？下架后可在后台恢复' : '确认永久删除该章节？删除后不可恢复！';
    try {
        await ElMessageBox.confirm(
            confirmText,
            {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }
        );
        loading.value =true;
        let res;
        if (chapter.status === 'PUBLISHED') {
            res = await request.post(`/chapter/offline/${chapter.id}`);
        } else {
            res = await request.delete(`/chapter/delete/${chapter.id}`);
        }
        if (res.data.code === '0') {
                ElMessage.success(chapter.status === 'PUBLISHED' ? '章节下架成功' : '章节删除成功');
                await handleNovelChange(currentNovelId.value);
            } else {
                ElMessage.error(res.data.msg || '章节删除失败');
            }
        } catch (error) {
            if (error !== 'cancel') {
                console.error(`章节${deleteText}失败：`, error);
                ElMessage.error('网络异常，章节删除失败');
            }
        } finally {
            loading.value = false;
        }
    };

const restoreChapter = async (chapter) => {
    if (!chapter) return;
    try {
        await ElMessageBox.confirm(
            `确认恢复该章节上架？恢复后读者可正常查看`,
            {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'info'
            }
        );
        loading.value = true;
        const res = await request.post(`/chapter/restore/${chapter.id}`);
        if (res.data.code === '0') {
            ElMessage.success('章节恢复上架成功');
            await handleNovelChange(currentNovelId.value);
        } else {
            ElMessage.error(res.data.msg || '章节恢复上架失败');
        }
    } catch (error) {
        if (error !== 'cancel') {
            console.error('章节恢复上架失败：', error);
            ElMessage.error('网络异常，章节恢复上架失败');
        }
    } finally {
        loading.value = false;
    }
}

const triggerAutoSave = () => {
    if(!currentChapter.id || !chapterContent.value.trim()) return;
    if(autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(async () => {
        await saveDraft(true);
    },180000);  
};

const saveDraft = async (isAuto = false) => {
    if (!currentChapter.id) {
        ElMessage.warning('章节id不存在，请先选择/新建章节');
        return;
    }
    if(!chapterContent.value || chapterContent.value.trim() === '') {
        if(!isAuto) ElMessage.warning('内容不能为空');
        return;
    }
    // 计算纯文本字数
    const latestWordCount = calculateWordCount(chapterContent.value);
    currentChapter.wordCount = latestWordCount;

    if(!isAuto) btnLoading.value = true;
    try {
        const postData = {
            draftContent: chapterContent.value,
            brief: currentChapter.brief,
            title: currentChapter.title,
            isAuto: isAuto,
            wordCount: latestWordCount
        };
        const response = await request.post(`/chapter/auto-save/${currentChapter.id}`,
        postData,
        { headers: { 'Content-Type': 'application/json' } }
        );
        const target = chapterList.value.find(ch => ch.id === currentChapter.id);
        if (target) {
            target.title = currentChapter.title;
            target.draftContent = chapterContent.value;
            target.wordCount = latestWordCount;
            target.brief = currentChapter.brief;
            target.updateTime = new Date().toLocaleTimeString();
        } 
        if (isAuto) {
            autoSaveTip.value = `${response.data.msg}(${new Date().toLocaleTimeString()})`;
            setTimeout(() => autoSaveTip.value = '', 3000);
        } else {
            ElMessage.success('草稿保存成功');
        }
    } catch (error) {
        console.error('保存草稿失败',error);
        if (!isAuto) {
            ElMessage.error('草稿保存失败，请重试');
        }
    } finally {
        if(!isAuto) btnLoading.value = false;
    }
};

const selectChapter = (chapter) => {
    if(!chapter) return;
    Object.assign(currentChapter, {
        id: String(chapter.id),
        title: chapter.title,
        status:chapter.status,
        wordCount: chapter.wordCount || 0,
        content: chapter.content || '',
        draftContent: chapter.draftContent || '',
        brief: chapter.brief || '',
        sort: chapter.sort || 0
    });
    // 绑定纯文本内容
    chapterContent.value = chapter.draftContent || chapter.content || '';

    if (chapter.status === 'PUBLISHED') {
        ElMessage.info('已加载已发布章节，编辑内容将先保存为草稿，重新发布后生效');
    }
};

const createChapter =async (type) => {
    if (!currentNovelId.value) {
        ElMessage.warning('请先选择所属小说');
        return;
    }
    loading.value = true;
    try {
        const res = await request.post('/chapter/create',{
            novelId: currentNovelId.value,
            title: '新章节',
            status: 'DRAFT',
            brief: ''
        });
        console.log('创建章节后端响应：',res.data);
        if (res.data.code === '0' ) {
            const chapterId = res.data.data;
            if (!chapterId) {
                ElMessage.error('创建章节失败，未获取到章节ID');
                return;
            }
            const chapterListRes = await request.get(`/chapter/list`,{
                params: { novelId: currentNovelId.value }
            });
            if (chapterListRes.data.code === '0') {
                const newChapterData = chapterListRes.data.data.find(ch => ch.chapterId === chapterId);
                if (!newChapterData) {
                    ElMessage.error('创建章节成功，但未查询到章节信息');
                    return;
                }
                const newChapter = {
                    id: String(newChapterData.chapterId),
                    novelId: currentNovelId.value,
                    title: newChapterData.title || '新章节',
                    status: newChapterData.status || 'DRAFT',
                    wordCount: newChapterData.wordCount || 0,
                    content: newChapterData.content || '',
                    draftContent: newChapterData.draftContent || '',
                    brief: newChapterData.brief || '',
                    sort: newChapterData.sort,
                    publishSort: newChapterData.publishSort || 0,
                    draftSaveTime: newChapterData.draftSaveTime || null,
                    createTime: new Date().toLocaleDateString(),
                    updateTime: new Date().toLocaleDateString()
                };
                chapterList.value = chapterListRes.data.data.map(ch => ({
                    id: String(ch.chapterId),
                    novelId: ch.novelId,
                    title: ch.title || '新章节',
                    status: ch.status,wordCount: ch.wordCount || 0,
                    content: ch.content || '',
                    draftContent: ch.draftContent || '',
                    brief: ch.brief || '',
                    sort: ch.sort,
                    publishSort: ch.publishSort || 0,
                    draftSaveTime: ch.draftSaveTime || null,
                    createTime: ch.createTime ? new Date(ch.createTime).toLocaleDateString() : new Date().toLocaleDateString(),
                    updateTime: ch.updateTime ? new Date(ch.updateTime).toLocaleDateString() : new Date().toLocaleDateString()
                })).sort((a, b) => a.sort - b.sort);
                selectChapter(newChapter);
                ElMessage.success('章节创建成功');
                } else {
                     ElMessage.error('创建章节成功，但获取章节列表失败：' + chapterListRes.data.msg);
                }
            } else {
                ElMessage.error('章节创建失败：' + res.data.msg );
            }
        } catch(error) {
            console.error('创建章节失败', error);
            ElMessage.error('网络异常，章节创建失败');
        } finally {
            loading.value = false;
        }
};

const handleNovelChange = async (novelId) => {
    const clearNovelId = String(novelId).split(':')[0];
    if(!novelId) return;
    loading.value = true;
    try {
        const res = await request.get(`/chapter/list`, {
            params: {novelId: novelId}
        });
        console.log('后端返回的章节原始数据：',res.data.data);
        if (res.data.code === '0') {
            let chapters = res.data.data.map(ch => {
                console.log('后端原始章节数据：',ch);
                const backWordCount = ch.wordCount || 0;
                const draftWordCount = calculateWordCount(ch.draftContent || '');
                const publishWordCount = calculateWordCount(ch.content || '');
                const finalWordCount = ch.status === 'PUBLISHED'
                    ? (backWordCount > 0 ? backWordCount : publishWordCount)
                    : (backWordCount > 0 ? backWordCount : draftWordCount);
                return {
                id: String(ch.chapterId),
                title: ch.title || '新章节',
                status: ch.status,
                wordCount: finalWordCount,
                content: ch.content ||  '',
                draftContent: ch.draftContent || '',
                brief: ch.brief,
                novelId: ch.novelId,
                sort: ch.sort || 0,
                publishSort: ch.publishSort || 0
                };
            });
            chapterList.value = chapters;
            console.log('章节列表id：', chapterList.value.map(ch => ({id: ch.id, wordCount: ch.wordCount})));
            const currentNovel = novelList.value.find(n => n.id === novelId);
            if (currentNovel) {
                currentNovelStatus.value = currentNovel.status;
                currentNovelUpdateStatus.value = currentNovel.updateStatus;
            }
            ElMessage.success(`已切换到《${novelList.value.find(n => n.id === novelId)?.title}》`);
            if (chapterList.value.length > 0) {
                selectChapter(chapterList.value[0]);
            } else {
                Object.assign(currentChapter, { id: '', title: '', content: '', wordCount:0})
                chapterContent.value = ''; // 清空编辑器
                ElMessage.info('该小说暂无章节，请新建');
            }
        } else {
            ElMessage.error(res.data.msg || '切换小说失败');
        }
    } catch (error) {
        console.error('切换小说失败', error);
        ElMessage.error('网络异常，切换小说失败');
    } finally {
        loading.value = false;
    }
};

const publishChapter = async() => {
if (currentNovelUpdateStatus.value === 1) {
        ElMessage.error('该小说已暂停，请先更改连载状态后再发布章节');
        return;
    }

    const unpublishStatus = ['DRAFT','PENDING_REVIEW','REJECTED','OFFLINE'];
    if (unpublishStatus.includes(currentNovelStatus.value)) {
        ElMessage.error('请先发布小说，再发布章节');
        return;
    }
    if (!currentChapter.title || currentChapter.title.trim() === '') {
        ElMessage.warning('请填写章节标题');
        return;
    }
    // 计算纯文本字数
    const latestWordCount = calculateWordCount(chapterContent.value);
    currentChapter.wordCount = latestWordCount;
    if (latestWordCount < 200) {
        ElMessage.warning('章节内容不能少于200个字');
        return;
    }
    btnLoading.value = true;
    try {
        const isAlreadyPublished = currentChapter.status === 'PUBLISHED';
        const publishData = {
            title: currentChapter.title,
            brief: currentChapter.brief,
            content: chapterContent.value, // 提交纯文本内容
            wordCount: latestWordCount,
            status: isAlreadyPublished ? 'PUBLISHED' : 'PENDING'
        };
        let response;
        if (isAlreadyPublished) {
            response = await request.post(`/chapter/update/${currentChapter.id}`,publishData);
        } else {
            response = await request.post(`/chapter/publish/${currentChapter.id}`,publishData);
        }
        const resData = response.data || {};
        if (resData.code === '0' || resData.success === true) {
            ElMessage.success(isAlreadyPublished ? "章节内容更新成功" : "章节发布成功");
            await handleNovelChange(currentNovelId.value);
            const newChapter = chapterList.value.find(ch => ch.id === currentChapter.id);
            if (newChapter) {
                selectChapter(newChapter);
            }
        } else {
            ElMessage.error(resData.msg || '章节发布/更新失败，请重试');
        }
    } catch (error) {
        const errorResponse = error.response || {};
        const errorData = errorResponse.data || {};
        const errorMsg = errorData.msg || '章节发布/更新失败，请重试';
        ElMessage.error(errorMsg);
        console.error('发布/更新失败:', error);
    } finally {
        btnLoading.value =false;
    }
};

onMounted(() => {
    getNovelsList();
    
    const handleDocumentClick = (e) => {
        if (contextMenuVisible.value) {
            const menuElement = contextMenuRef.value;
            setTimeout(() => {
                if (!menuElement || !menuElement.contains(e.target)) {
                    closeContextMenu();
                }
            }, 10);        
        }
    };
    const handleDocumentContextMenu = (e) => {
        const isChapterItem = e.target.closest('.chapter-item');
        if (!isChapterItem) {
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
    document.addEventListener('click',handleDocumentClick);
    document.addEventListener('contextmenu',handleDocumentContextMenu);
    document.addEventListener('keydown',handleEscKeyDown);
    window.handleDocumentClick = handleDocumentClick;
    window.handleDocumentContextMenu = handleDocumentContextMenu;
    window.handleEscKeyDown = handleEscKeyDown;
});

onBeforeUnmount(async () => {
   // 组件卸载前自动保存草稿
   if (currentChapter.id && chapterContent.value && chapterContent.value.trim()) {
    try {
        await saveDraft(true);
    } catch (e) {
        console.warn('组件卸载时自动保存草稿失败：', e);
    }
   }
   // 移除事件监听
   document.removeEventListener('click', window.handleDocumentClick);
   document.removeEventListener('contextmenu',window.handleDocumentContextMenu);
   document.removeEventListener('keydown', window.handleEscKeyDown);
   window.handleDocumentClick = null;
   window.handleDocumentContextMenu = null;
   window.handleEscKeyDown = null;
   closeContextMenu();
});

// 计算属性保持不变
const publishedChapters = computed(() => {
    return [...chapterList.value].filter(ch => ch.status === 'PUBLISHED').sort((a, b) => a.publishSort - b.publishSort);
});

const offlineChapters = computed(() => {
  return [...chapterList.value].filter(ch => ch.status === 'OFFLINE').sort((a, b) => a.publishSort - b.publishSort);
});

const draftChapters = computed(() => {
    return [...chapterList.value].filter(ch => ch.status === 'DRAFT').sort((a, b) => a.sort - b.sort);
});

watch(currentNovelId, (newVal) => {
    if (newVal) {
        const currentNovel = novelList.value.find(n => n.id === newVal);
        if (currentNovel) {
            currentNovelStatus.value = currentNovel.status;
            currentNovelUpdateStatus.value = currentNovel.updateStatus;
        }
    }
});
</script>

<style scoped>
.chapters-container {
    display: flex;
    height: 100%;
    flex-direction: column;
    overflow: hidden;
    transition: all 0.2s;
}

.sun { background: #fff; color: #333; }
.eye { background: #f8faf2; color: #333; }
.night { background: #1e1e2e; color: #eee; }

.top {
    padding: 10px 20px;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
}

.novel-select {
    width: 200px;
}

.main-layout {
    flex: 1;
    display: flex;
    overflow: hidden;
}

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

.sidebar-left {
    width: 220px;
    border-right: 1px solid #e5e7eb;
    padding: 10px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.chapter-list-wrapper {
    flex: 1;
    overflow-y: auto;
    padding-bottom: 10px;
}

.empty-tip {
    text-align: center;
    padding: 20px;
    color: #999;
    font-size: 14px;
}

.chapter-item {
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  margin-bottom: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
}
.chapter-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chapter-text {
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chapter-status {
  font-size: 12px;
  color: #909399;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chapter-item:hover .chapter-dropdown {
  opacity: 1;
}

.chapter-item.active {
  background-color: #e5f0ff;
  color: #1989fa;
}

.chapter-item.published {
  border-left: 3px solid #409eff;
}

.chapter-item.draft {
  border-left: 3px solid #e6a23c;
}

.chapter-item.offline {
  border-left: 3px solid #909399;
  color: #909399;
}

.chapter-item:hover {
  background-color: #f5f7fa;
}

.sidebar-actions {
    margin-top: auto;
    padding-top: 15px;
    padding-bottom: 15px;
    border-top: 1px solid #e5e7eb;
}

.editor-area-wrapper {
    flex: 1;
    display: flex;
    justify-content: center;
    padding: 0 20px;
    overflow: hidden;
}

.editor-area {
    width: 100%;
    display: flex;
    flex-direction: column;
    height: 100%;
}

.mode-switch {
    margin-top: 15px;
    margin-bottom: 10px;
    text-align: right;
    flex-shrink: 0;
}

.sidebar-right {
    width: 240px;
    border-left: 1px solid #e5e7eb;
    padding: 10px;
    overflow-y: auto;
}

.setting-title {
    font-weight: bold;
    margin-bottom: 10px;
}

.setting-form {
    width: 100%;
}

/* 纯文本编辑器样式 */
.plain-text-editor {
  height: calc(100vh - 190px);
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
}

.editor-toolbar {
  padding: 8px 10px;
  border-bottom: 1px solid #e5e7eb;
  background-color: #f8f9fa;
  border-radius: 4px 4px 0 0;
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
}

.word-count {
  font-size: 14px;
  color: #666;
}

.editor-input {
  flex: 1;
  width: 100%;
  border: none;
  outline: none;
  padding: 10px;
  resize: none;
  font-size: 16px;
  line-height: 1.6;
  font-family: inherit;
}

/* 模式样式 */
.sun-mode {
  background-color: #fff;
  color: #333;
}

.night-mode {
  background-color: #2c3e50;
  color: #fff;
}

.eye-mode {
  background-color: #e9f5db;
  color: #333;
}
</style>