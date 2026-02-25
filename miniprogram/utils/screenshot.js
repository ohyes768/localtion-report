/**
 * 截图管理器
 * 使用腾讯地图静态图 API + Canvas 2D 生成截图
 */
const util = require('./util.js');
const config = require('../config/config.js');

class ScreenshotManager {
  constructor() {
    this.canvasWidth = 600;
    this.canvasHeight = 400;
  }

  /**
   * 生成地图截图
   * @param {Object} mapData 地图数据
   * @param {Object} carInfo 车辆信息
   * @param {Object} location 位置信息
   * @returns {Promise<string>} 图片临时路径
   */
  async generateScreenshot(mapData, carInfo, location) {
    try {
      util.showLoading('生成中...');

      // 1. 获取地图静态图
      const mapImagePath = await this._getMapStaticImage(mapData, location);

      // 2. 绘制到 Canvas
      const ctx = wx.createCanvasContext('screenshotCanvas', this);

      // 绘制背景
      ctx.setFillStyle('#f8f9fa');
      ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

      // 绘制地图底图
      ctx.drawImage(mapImagePath, 0, 0, this.canvasWidth, this.canvasHeight);

      // 绘制车辆标记
      this._drawMarker(ctx, carInfo, this.canvasWidth / 2, this.canvasHeight / 2);

      // 绘制信息卡片
      this._drawInfoCard(ctx, carInfo, location);

      // 3. 导出图片
      const tempFilePath = await this._exportImage(ctx);

      wx.hideLoading();
      return tempFilePath;

    } catch (error) {
      wx.hideLoading();
      console.error('截图生成失败:', error);
      throw error;
    }
  }

  /**
   * 获取地图静态图
   */
  async _getMapStaticImage(mapData, location) {
    return new Promise((resolve, reject) => {
      // 腾讯地图静态图 API
      const url = `https://apis.map.qq.com/ws/staticmap/v2/` +
        `?center=${location.latitude},${location.longitude}` +
        `&zoom=${mapData.scale}` +
        `&size=${this.canvasWidth}x${this.canvasHeight}` +
        `&maptype=roadmap` +
        `&markers=color:0x${location.color || 'ff0000'}|${location.latitude},${location.longitude}` +
        `&key=${config.TENCENT_MAP_KEY}`;

      // 下载图片
      wx.downloadFile({
        url: url,
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.tempFilePath);
          } else {
            reject(new Error('地图图片下载失败'));
          }
        },
        fail: reject
      });
    });
  }

  /**
   * 绘制车辆标记
   */
  _drawMarker(ctx, carInfo, centerX, centerY) {
    const color = carInfo.color || '#007AFF';

    // 外圈发光
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 45);
    gradient.addColorStop(0, this._hexToRgba(color, 0.3));
    gradient.addColorStop(1, this._hexToRgba(color, 0));
    ctx.setFillStyle gradient);
    ctx.beginPath();
    ctx.arc(centerX, centerY, 45, 0, 2 * Math.PI);
    ctx.fill();

    // 阴影效果
    ctx.setShadow(0, 4, 12, 'rgba(0, 0, 0, 0.3)');

    // 主标记圆圈
    ctx.setFillStyle(color);
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
    ctx.fill();

    // 清除阴影
    ctx.setShadow(0, 0, 0, 'transparent');

    // 白色边框
    ctx.setStrokeStyle(carInfo.isLight ? '#ccc' : 'white');
    ctx.setLineWidth(4);
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
    ctx.stroke();

    // 绘制车辆标识（文字）
    ctx.setFillStyle(carInfo.isLight ? '#333' : 'white');
    ctx.setFontSize(16);
    ctx.setTextAlign('center');
    ctx.setTextBaseline('middle');
    ctx.fillText('🚗', centerX, centerY - 6);

    // 车辆名称缩写
    ctx.setFontSize(12);
    ctx.fillText(carInfo.name.substring(0, 2), centerX, centerY + 14);
  }

  /**
   * 绘制信息卡片
   */
  _drawInfoCard(ctx, carInfo, location) {
    const cardY = this.canvasHeight - 90;
    const cardHeight = 70;

    // 背景
    ctx.setFillStyle('rgba(0, 0, 0, 0.7)');
    ctx.fillRect(20, cardY, this.canvasWidth - 40, cardHeight);

    // 车辆图标和名称
    ctx.setFillStyle('white');
    ctx.setFontSize(18);
    ctx.setTextAlign('left');
    ctx.fillText(`🚗 ${carInfo.name}`, 40, cardY + 25);

    // 车牌号
    ctx.setFontSize(14);
    ctx.fillText(`📍 ${carInfo.plate}`, 40, cardY + 50);

    // 时间
    const time = util.formatTime(new Date(location.timestamp || Date.now()));
    ctx.setTextAlign('right');
    ctx.setFontSize(12);
    ctx.setFillStyle('rgba(255, 255, 255, 0.8)');
    ctx.fillText(`🕒 ${time}`, this.canvasWidth - 40, cardY + 25);

    // 地址（截断过长的地址）
    let address = location.address || '位置未知';
    if (address.length > 25) {
      address = address.substring(0, 25) + '...';
    }
    ctx.fillText(`📍 ${address}`, this.canvasWidth - 40, cardY + 45);
  }

  /**
   * 导出图片
   */
  _exportImage(ctx) {
    return new Promise((resolve, reject) => {
      ctx.draw(false, () => {
        wx.canvasToTempFilePath({
          canvasId: 'screenshotCanvas',
          x: 0,
          y: 0,
          width: this.canvasWidth,
          height: this.canvasHeight,
          destWidth: this.canvasWidth,
          destHeight: this.canvasHeight,
          success: (res) => resolve(res.tempFilePath),
          fail: reject
        }, this);
      });
    });
  }

  /**
   * Hex 转 RGBA
   */
  _hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}

module.exports = ScreenshotManager;
