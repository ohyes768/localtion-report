/**
 * 腾讯地图小程序 JavaScript SDK
 * 简化版本，仅包含本项目需要的功能
 * 官方文档: https://lbs.qq.com/miniProgram/jsSdk/jsSdkOverview
 */

class QQMapWX {
  /**
   * 构造函数
   * @param {Object} options 配置项
   * @param {String} options.key 腾讯地图开发者密钥
   */
  constructor(options) {
    this.key = options.key;
  }

  /**
   * 逆地理编码
   * @param {Object} options
   * @param {Object} options.location {latitude, longitude}
   * @param {String} options.get_poi 是否返回POI信息
   * @param {Function} success 成功回调
   * @param {Function} fail 失败回调
   */
  reverseGeocode(options) {
    const { location, get_poi = 0, success, fail } = options;

    wx.request({
      url: 'https://apis.map.qq.com/ws/geocoder/v1/',
      data: {
        location: `${location.latitude},${location.longitude}`,
        key: this.key,
        get_poi: get_poi
      },
      success: (res) => {
        if (typeof success === 'function') {
          success(res.data);
        }
      },
      fail: (err) => {
        if (typeof fail === 'function') {
          fail(err);
        }
      }
    });
  }

  /**
   * 地理编码
   * @param {Object} options
   * @param {String} options.address 地址
   * @param {Function} success 成功回调
   * @param {Function} fail 失败回调
   */
  geocoder(options) {
    const { address, success, fail } = options;

    wx.request({
      url: 'https://apis.map.qq.com/ws/geocoder/v1/',
      data: {
        address: address,
        key: this.key
      },
      success: (res) => {
        if (typeof success === 'function') {
          success(res.data);
        }
      },
      fail: (err) => {
        if (typeof fail === 'function') {
          fail(err);
        }
      }
    });
  }

  /**
   * 计算距离
   * @param {Object} options
   * @param {String} options.from 起点坐标 "lat,lng"
   * @param {String} options.to 终点坐标 "lat,lng"
   * @param {Function} success 成功回调
   * @param {Function} fail 失败回调
   */
  calculateDistance(options) {
    const { from, to, success, fail } = options;

    wx.request({
      url: 'https://apis.map.qq.com/ws/distance/v1/',
      data: {
        mode: 'driving',
        from: from,
        to: to,
        key: this.key
      },
      success: (res) => {
        if (typeof success === 'function') {
          success(res.data);
        }
      },
      fail: (err) => {
        if (typeof fail === 'function') {
          fail(err);
        }
      }
    });
  }

  /**
   * POI检索
   * @param {Object} options
   * @param {String} options.keyword 关键词
   * @param {Object} options.location 位置
   * @param {Function} success 成功回调
   * @param {Function} fail 失败回调
   */
  search(options) {
    const { keyword, location, success, fail } = options;

    wx.request({
      url: 'https://apis.map.qq.com/ws/place/v1/search',
      data: {
        keyword: keyword,
        boundary: `nearby(${location.latitude},${location.longitude},1000)`,
        key: this.key,
        page_size: 20
      },
      success: (res) => {
        if (typeof success === 'function') {
          success(res.data);
        }
      },
      fail: (err) => {
        if (typeof fail === 'function') {
          fail(err);
        }
      }
    });
  }
}

module.exports = QQMapWX;
