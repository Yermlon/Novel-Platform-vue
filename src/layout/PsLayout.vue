<template>
  <div class="pd-layout">
    <el-aside width="200px" class="sidebar">
      <el-menu
        :default-active="currentRoute"
        active-text-color="#409eff"
        text-color="#333"
        class="el-menu-vertical"
        router
      >
       <el-menu-item index="/personal/info">个人资料</el-menu-item>
       <el-menu-item index="/personal/history">浏览历史</el-menu-item>
       <el-menu-item index="/personal/myComments">我的评论</el-menu-item>
       <el-menu-item index="/personal/applyat" >申请成为作者</el-menu-item>
      </el-menu>
    </el-aside>
    <el-main class="content">
      <router-view/>
    </el-main>
  </div>

</template>

<script setup>
import { useRoute } from 'vue-router';

const currentRoute = useRoute().path;

</script>

<style>
.pd-layout{
  display: flex;
  height: calc(100vh - 60px);
}
.sidebar{
  background-color: #fff;
  border-right: 1px solid #ebeef5;
}
.content{
  padding: 20px;
  flex: 1;
}
</style>