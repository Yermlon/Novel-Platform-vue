<template>
  <div id="app">
    <router-view/>
  </div>
</template>

<script>

export default {
  name:'App',
  components: {
     // 注册的组件名需与使用时一致
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
