// app.js
App({
  onLaunch() {
    console.log('小程序启动');

    // 检查更新
    this.checkUpdate();

    // 初始化全局数据
    this.initGlobalData();
  },

  /**
   * 检查小程序更新
   */
  checkUpdate() {
    if (wx.canIUse('getUpdateManager')) {
      const updateManager = wx.getUpdateManager();

      updateManager.onCheckForUpdate((res) => {
        console.log('检查更新结果:', res.hasUpdate);
      });

      updateManager.onUpdateReady(() => {
        wx.showModal({
          title: '更新提示',
          content: '新版本已准备好，是否重启应用？',
          success: (res) => {
            if (res.confirm) {
              updateManager.applyUpdate();
            }
          }
        });
      });

      updateManager.onUpdateFailed(() => {
        console.log('新版本下载失败');
      });
    }
  },

  /**
   * 初始化全局数据
   */
  initGlobalData() {
    this.globalData = {
      currentVehicle: null,
      currentLocation: null,
      config: {
        mapKey: '67PBZ-AWOWQ-TTW5A-BTI3M-BNMHH-2YBXZ',
        debug: false
      }
    };
  },

  globalData: {}
});
