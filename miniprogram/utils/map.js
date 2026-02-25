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
    const marker = {
      id: parseInt(carInfo.id.replace('car', '')),
      longitude: location.longitude,
      latitude: location.latitude,
      iconPath: carInfo.markerIcon || '/assets/images/markers/default_marker.png',
      width: 40,
      height: 40,
      rotate: 0,
      alpha: 1,
      callout: {
        content: `${carInfo.name}\n${carInfo.plate}`,
        color: '#333333',
        fontSize: 14,
        borderRadius: 8,
        bgColor: '#ffffff',
        padding: 10,
        display: 'ALWAYS',
        textAlign: 'center',
        boxShadow: '0 2rpx 8rpx rgba(0,0,0,0.1)'
      }
    };

    // 如果有自定义标记颜色，使用自定义标记
    if (carInfo.color) {
      marker.customCallout = {
        display: 'ALWAYS',
        anchorY: 0,
        anchorX: 0,
        content: this._createCustomMarkerContent(carInfo)
      };
    }

    return marker;
  }

  /**
   * 创建自定义标记内容
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

    const marker = this.createMarker(location, carInfo);
    this.mapData.markers = [marker];

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
