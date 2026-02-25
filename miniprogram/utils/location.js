/**
 * 定位管理器
 */
const config = require('../config/config.js');

class LocationManager {
  constructor() {
    this.currentLocation = null;
  }

  /**
   * 获取当前位置
   * @param {Object} options 定位选项
   * @returns {Promise<Object>} 位置信息
   */
  getCurrentPosition(options = {}) {
    return new Promise((resolve, reject) => {
      wx.getLocation({
        type: 'gcj02',  // 直接返回 GCJ-02 坐标（火星坐标）
        altitude: options.altitude || true,
        accuracy: options.accuracy || 'best',
        success: (res) => {
          const location = this._processLocation(res);
          this.currentLocation = location;
          resolve(location);
        },
        fail: (err) => {
          console.error('定位失败:', err);
          // 定位失败时使用默认位置
          const defaultLocation = this._getDefaultLocation();
          resolve(defaultLocation);
        }
      });
    });
  }

  /**
   * 处理定位结果
   * @param {Object} res 微信定位结果
   * @returns {Object} 标准化位置信息
   */
  _processLocation(res) {
    return {
      // 坐标信息（GCJ-02）
      latitude: res.latitude,
      longitude: res.longitude,

      // 精度信息
      accuracy: res.accuracy || 0,
      altitude: res.altitude || 0,
      altitudeAccuracy: res.altitudeAccuracy || 0,

      // 运动信息
      speed: res.speed || 0,
      heading: res.heading || 0,

      // 元数据
      timestamp: Date.now(),
      provider: '微信小程序定位',
      accuracyLevel: this._getAccuracyLevel(res.accuracy),
      quality: this._calculateQuality(res)
    };
  }

  /**
   * 获取默认位置（测试用）
   */
  _getDefaultLocation() {
    return {
      latitude: config.DEFAULT_LOCATION.latitude,
      longitude: config.DEFAULT_LOCATION.longitude,
      accuracy: 50,
      altitude: 0,
      altitudeAccuracy: 0,
      speed: 0,
      heading: 0,
      timestamp: Date.now(),
      provider: '默认位置（测试）',
      accuracyLevel: '中等精度',
      quality: 50,
      isDefault: true
    };
  }

  /**
   * 获取精度等级描述
   */
  _getAccuracyLevel(accuracy) {
    if (accuracy < 10) return '极高精度';
    if (accuracy < 30) return '高精度';
    if (accuracy < 100) return '中等精度';
    if (accuracy < 500) return '低精度';
    return '极低精度';
  }

  /**
   * 计算位置质量评分（0-100）
   */
  _calculateQuality(res) {
    let score = 100;

    // 精度评分
    if (res.accuracy > 10) {
      score -= Math.min(50, (res.accuracy - 10) / 4);
    }

    // 速度评分
    if (res.speed > 50) {
      score -= 30;
    }

    return Math.max(0, Math.round(score));
  }

  /**
   * 持续定位
   * @param {Function} callback 位置回调
   */
  watchPosition(callback) {
    wx.startLocationUpdate({
      success: () => {
        wx.onLocationChange(callback);
      },
      fail: (err) => {
        console.error('启动持续定位失败:', err);
      }
    });
  }

  /**
   * 停止持续定位
   */
  stopWatch() {
    wx.stopLocationUpdate();
    wx.offLocationChange();
  }

  /**
   * 获取最后一次定位
   */
  getLastLocation() {
    return this.currentLocation;
  }
}

module.exports = LocationManager;
