/**
 * 应用配置
 */

module.exports = {
  // 应用信息
  APP_NAME: '车辆位置分享',
  VERSION: '1.0.0',
  DEBUG: false,

  // 腾讯地图配置
  TENCENT_MAP_KEY: '67PBZ-AWOWQ-TTW5A-BTI3M-BNMHH-2YBXZ',

  // 地图默认配置
  MAP_DEFAULT: {
    scale: 18,           // 缩放级别
    minScale: 5,         // 最小缩放
    maxScale: 18,        // 最大缩放
    showLocation: true,  // 显示定位点
    enableZoom: true,    // 允许缩放
    enableScroll: true   // 允许拖动
  },

  // 定位配置
  LOCATION: {
    timeout: 20000,      // 超时时间（毫秒）
    accuracy: 'best',    // 定位精度
    altitude: true       // 获取海拔
  },

  // 默认测试位置（杭州西湖）
  DEFAULT_LOCATION: {
    latitude: 30.204763,
    longitude: 120.204781,
    address: '浙江省杭州市西湖区西湖风景名胜区'
  },

  // 错误信息
  ERROR_MESSAGES: {
    LOCATION_FAILED: '定位失败，请检查定位权限',
    LOCATION_TIMEOUT: '定位超时，请重试',
    NETWORK_ERROR: '网络错误，请检查网络连接',
    VEHICLE_NOT_FOUND: '车辆信息不存在',
    MAP_LOAD_FAILED: '地图加载失败'
  },

  // 缓存配置
  CACHE: {
    address: 5 * 60 * 1000,    // 地址缓存5分钟
    location: 30 * 1000        // 位置缓存30秒
  }
};
