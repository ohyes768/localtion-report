/**
 * 地图管理器
 */

class MapManager {
  constructor() {
    this.mapData = null;
  }

  /**
   * 初始化地图数据
   * @param {Object} options 地图配置
   */
  initMap(options = {}) {
    this.mapData = {
      longitude: options.longitude || 120.204781,
      latitude: options.latitude || 30.204763,
      scale: options.scale || 18,
      markers: [],
      showLocation: options.showLocation !== false,
      enableZoom: options.enableZoom !== false,
      enableScroll: options.enableScroll !== false,
      enableRotate: options.enableRotate || false,
      showCompass: options.showCompass || false,
      showScale: options.showScale !== false,
      subkey: options.subkey || ''
    };

    return this.mapData;
  }

  /**
   * 创建车辆标记
   * @param {Object} location 位置信息
   * @param {Object} carInfo 车辆信息
   * @returns {Object} 标记配置
   */
  createMarker(location, carInfo) {
    // 地图中心的自定义标记（cover-view）已显示在 map.wxml 中
    // 这里返回空的 markers 配置，或者可以添加其他标记
    return [];
  }

  /**
   * 创建自定义标记内容（已弃用，改用预制的标记图标）
   */
  _createCustomMarkerContent(carInfo) {
    return `
      <view class="custom-marker" style="background-color: ${carInfo.color}">
        <image src="${carInfo.logo}" class="marker-logo" />
        <text class="marker-label">${carInfo.name}</text>
      </view>
    `;
  }

  /**
   * 更新地图中心
   * @param {number} longitude 经度
   * @param {number} latitude 纬度
   */
  updateCenter(longitude, latitude) {
    if (this.mapData) {
      this.mapData.longitude = longitude;
      this.mapData.latitude = latitude;
    }
    return {
      longitude,
      latitude
    };
  }

  /**
   * 更新地图缩放级别
   * @param {number} scale 缩放级别
   */
  updateScale(scale) {
    if (this.mapData) {
      this.mapData.scale = scale;
    }
    return scale;
  }

  /**
   * 添加标记
   * @param {Object} location 位置信息
   * @param {Object} carInfo 车辆信息
   */
  addMarker(location, carInfo) {
    if (!this.mapData) {
      this.initMap();
    }

    // 地图中心的自定义标记已在 wxml 中显示
    // 这里不需要添加 markers 数组中的标记
    this.mapData.markers = [];

    return this.mapData;
  }

  /**
   * 清除所有标记
   */
  clearMarkers() {
    if (this.mapData) {
      this.mapData.markers = [];
    }
  }

  /**
   * 获取地图数据
   */
  getMapData() {
    return this.mapData;
  }

  /**
   * 计算两点间距离（米）
   */
  static calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000; // 地球半径（米）
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

module.exports = MapManager;
