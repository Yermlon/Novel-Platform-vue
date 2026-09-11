const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: true,
  lintOnSave:false,
  devServer: {
    client: {//禁用红色错误覆盖层
      overlay: false,
    },
    proxy: {
      'api': {
        target: 'http://localhost:8081',
        ws:true,
        changeOrigin: true,
        pathRewrite: {
          '^/api' : ''
        }
      }
    }
  }
})

