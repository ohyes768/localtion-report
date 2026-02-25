// pages/index/index.js
const { getVehicleList, getVehicleById } = require('../../config/vehicle.js');
const util = require('../../utils/util.js');

const app = getApp();

Page({
  data: {
    vehicles: []
  },

  onLoad() {
    // 加载车辆配置
    const vehicles = getVehicleList().map(v => ({
      ...v,
      isLight: v.color === '#F0F0F0' // 浅色背景需要边框
    }));
    this.setData({ vehicles });
  },

  /**
   * 选择车辆
   */
  onVehicleSelect(e) {
    const { carId } = e.currentTarget.dataset;
    const vehicle = getVehicleById(carId);

    if (!vehicle) {
      util.showToast('车辆信息不存在');
      return;
    }

    // 保存到全局数据
    app.globalData.currentVehicle = vehicle;

    // 跳转到地图页
    wx.navigateTo({
      url: `/pages/map/map?carId=${carId}`
    });
  },

  /**
   * 扫码选择车辆
   */
  onScanCode() {
    // 检查扫码权限
    wx.scanCode({
      onlyFromCamera: false,
      success: (res) => {
        console.log('扫码结果:', res);
        // 解析二维码中的车辆ID
        const carId = this._parseCarIdFromQR(res.result);
        if (carId && getVehicleById(carId)) {
          // 模拟点击车辆卡片
          this.onVehicleSelect({
            currentTarget: { dataset: { carId } }
          });
        } else {
          util.showToast('无效的车辆二维码');
        }
      },
      fail: (err) => {
        console.error('扫码失败:', err);
        if (err.errMsg.includes('cancel')) {
          // 用户取消扫码
          return;
        }
        util.showToast('扫码失败，请重试');
      }
    });
  },

  /**
   * 从二维码解析车辆ID
   * 支持格式：
   * - https://xxx.com?car=car001
   * - car001
   */
  _parseCarIdFromQR(qrContent) {
    // 尝试从URL参数中解析
    const urlMatch = qrContent.match(/[?&]car=([^&]+)/);
    if (urlMatch) {
      return urlMatch[1];
    }

    // 直接匹配车辆ID格式
    if (/^car\d{3}$/.test(qrContent.trim())) {
      return qrContent.trim();
    }

    return null;
  },

  /**
   * 分享配置
   */
  onShareAppMessage() {
    return {
      title: '车辆位置分享系统',
      path: '/pages/index/index',
      imageUrl: ''
    };
  }
});
