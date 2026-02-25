// pages/map/map.js
const { getVehicleById } = require('../../config/vehicle.js');
const LocationManager = require('../../utils/location.js');
const MapManager = require('../../utils/map.js');
const ScreenshotManager = require('../../utils/screenshot.js');
const util = require('../../utils/util.js');
const QQMapWX = require('../../lib/qqmap-wx-jssdk/index.js');

const app = getApp();

Page({
  data: {
    currentVehicle: null,
    mapData: {
      longitude: 120.204781,
      latitude: 30.204763,
      scale: 18,
      markers: [],
      showLocation: true,
      enableZoom: true,
      enableScroll: true
    },
    location: {
      address: '',
      addressLoading: false,
      accuracy: 0,
      timeStr: '',
      isDefault: false
    },
    refreshing: false
  },

  locationManager: null,
  mapManager: null,
  qqmap: null,

  onLoad(options) {
    const { carId } = options;

    // 初始化腾讯地图SDK
    this.qqmap = new QQMapWX({
      key: app.globalData.config.mapKey
    });

    // 从全局数据或参数获取车辆信息
    let vehicle = app.globalData.currentVehicle;
    if (!vehicle && carId) {
      vehicle = getVehicleById(carId);
    }

    if (!vehicle) {
      util.showToast('车辆信息不存在');
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    // 标记浅色背景
    vehicle.isLight = vehicle.color === '#F0F0F0';

    this.setData({ currentVehicle: vehicle });

    // 初始化管理器
    this.locationManager = new LocationManager();
    this.mapManager = new MapManager();

    // 初始化地图
    this.mapManager.initMap({
      scale: 18,
      showLocation: true
    });

    // 开始定位
    this.startLocation();
  },

  onReady() {
    // 地图组件加载完成
    this.mapContext = wx.createMapContext('vehicleMap', this);
  },

  /**
   * 开始定位
   */
  async startLocation() {
    if (this.data.refreshing) return;

    this.setData({ refreshing: true });

    try {
      // 获取位置
      const location = await this.locationManager.getCurrentPosition();
      app.globalData.currentLocation = location;

      // 更新地图
      this.updateMap(location);

      // 逆地理编码
      this.reverseGeocode(location);

    } catch (error) {
      console.error('定位失败:', error);
      util.showToast('定位失败');
    } finally {
      this.setData({ refreshing: false });
    }
  },

  /**
   * 更新地图
   */
  updateMap(location) {
    // 更新地图中心
    this.mapManager.updateCenter(location.longitude, location.latitude);

    // 添加车辆标记
    this.mapManager.addMarker(location, this.data.currentVehicle);

    // 更新数据
    this.setData({
      mapData: this.mapManager.getMapData(),
      location: {
        ...this.data.location,
        accuracy: Math.round(location.accuracy),
        timeStr: util.formatTime(new Date(location.timestamp)),
        isDefault: location.isDefault || false
      }
    });
  },

  /**
   * 逆地理编码（使用SDK）
   */
  reverseGeocode(location) {
    this.setData({
      'location.addressLoading': true
    });

    // 使用腾讯地图SDK
    this.qqmap.reverseGeocode({
      location: {
        latitude: location.latitude,
        longitude: location.longitude
      },
      get_poi: 0,
      success: (res) => {
        console.log('逆地理编码结果:', res);
        if (res.status === 0 && res.result) {
          const address = res.result.address;
          this.setData({
            'location.address': address
          });
          // 保存地址到全局数据
          if (app.globalData.currentLocation) {
            app.globalData.currentLocation.address = address;
          }
        } else {
          this.setData({
            'location.address': '地址解析失败'
          });
        }
      },
      fail: (error) => {
        console.error('逆地理编码失败:', error);
        this.setData({
          'location.address': '地址解析失败'
        });
      },
      complete: () => {
        this.setData({
          'location.addressLoading': false
        });
      }
    });
  },

  /**
   * 刷新定位
   */
  onRefreshLocation() {
    if (this.data.refreshing) return;
    this.startLocation();
  },

  /**
   * 截图分享
   */
  async onShareLocation() {
    try {
      const screenshotManager = new ScreenshotManager();
      const location = app.globalData.currentLocation;

      if (!location) {
        util.showToast('请先完成定位');
        return;
      }

      // 生成截图
      const imagePath = await screenshotManager.generateScreenshot(
        this.data.mapData,
        this.data.currentVehicle,
        location
      );

      // 预览图片
      wx.previewImage({
        urls: [imagePath],
        current: imagePath
      });

    } catch (error) {
      console.error('截图失败:', error);
      util.showToast('截图失败: ' + error.message);
    }
  },

  /**
   * 地图区域变化
   */
  onMapRegionChange(e) {
    if (e.type === 'end') {
      console.log('地图区域变化:', e.detail);
    }
  },

  /**
   * 点击标记
   */
  onMarkerTap(e) {
    console.log('点击标记:', e);
    // 可以显示车辆详情
  },

  /**
   * 返回上一页
   */
  onGoBack() {
    wx.navigateBack();
  },

  /**
   * 分享配置
   */
  onShareAppMessage() {
    return {
      title: `${this.data.currentVehicle.name} 位置分享`,
      path: `/pages/map/map?carId=${this.data.currentVehicle.id}`,
      imageUrl: ''
    };
  }
});
