/**
 * 截图管理器
 * 使用 Canvas 2D 新版 API
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

      console.log('开始生成截图...', {
        carInfo: carInfo.name,
        location: {
          lat: location.latitude,
          lng: location.longitude,
          address: location.address
        }
      });

      // 1. 获取地图静态图
      const mapImagePath = await this._getMapStaticImage(mapData, location);
      console.log('地图静态图下载成功:', mapImagePath);

      // 2. 创建离屏 Canvas
      const canvas = wx.createOffscreenCanvas({
        type: '2d',
        width: this.canvasWidth,
        height: this.canvasHeight
      });

      const ctx = canvas.getContext('2d');

      // 3. 绘制地图底图
      const mapImage = canvas.createImage();
      await new Promise((resolve, reject) => {
        mapImage.onload = () => {
          console.log('地图图片加载完成');
          resolve();
        };
        mapImage.onerror = (err) => {
          console.error('地图图片加载失败:', err);
          reject(err);
        };
        mapImage.src = mapImagePath;
      });

      // 绘制背景
      ctx.fillStyle = '#f8f9fa';
      ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

      // 绘制地图底图
      ctx.drawImage(mapImage, 0, 0, this.canvasWidth, this.canvasHeight);
      console.log('地图底图绘制完成');

      // 4. 加载车辆 Logo
      const logoImage = canvas.createImage();
      await new Promise((resolve, reject) => {
        logoImage.onload = () => {
          console.log('车辆Logo加载完成:', carInfo.logo);
          resolve();
        };
        logoImage.onerror = (err) => {
          console.log('车辆Logo加载失败，将使用emoji:', err);
          resolve(); // Logo加载失败也继续，使用emoji
        };
        logoImage.src = carInfo.logo;
      });

      // 5. 绘制车辆标记（传入Logo图片）
      this._drawMarker(ctx, carInfo, this.canvasWidth / 2, this.canvasHeight / 2, logoImage);
      console.log('车辆标记绘制完成');

      // 6. 绘制信息卡片
      this._drawInfoCard(ctx, carInfo, location, logoImage);
      console.log('信息卡片绘制完成');

      // 7. 导出图片
      const tempFilePath = await this._exportImage(canvas);
      console.log('截图导出成功:', tempFilePath);

      wx.hideLoading();
      return tempFilePath;

    } catch (error) {
      wx.hideLoading();
      console.error('截图生成失败:', error);
      util.showToast('截图失败: ' + error.message);
      throw error;
    }
  }

  /**
   * 获取地图静态图
   */
  async _getMapStaticImage(mapData, location) {
    return new Promise((resolve, reject) => {
      const url = `https://apis.map.qq.com/ws/staticmap/v2/` +
        `?center=${location.latitude},${location.longitude}` +
        `&zoom=${mapData.scale}` +
        `&size=${this.canvasWidth}x${this.canvasHeight}` +
        `&maptype=roadmap` +
        `&markers=color:0xff0000|${location.latitude},${location.longitude}` +
        `&key=${config.TENCENT_MAP_KEY}`;

      console.log('静态图URL:', url);

      wx.downloadFile({
        url: url,
        success: (res) => {
          console.log('图片下载响应:', res);
          if (res.statusCode === 200) {
            resolve(res.tempFilePath);
          } else {
            reject(new Error(`地图图片下载失败: ${res.statusCode}`));
          }
        },
        fail: (err) => {
          console.error('图片下载失败:', err);
          reject(new Error('地图图片下载失败: ' + err.errMsg));
        }
      });
    });
  }

  /**
   * 绘制车辆标记（与页面样式保持一致）
   */
  _drawMarker(ctx, carInfo, centerX, centerY, logoImage) {
    const color = carInfo.color || '#007AFF';
    const markerRadius = 40;  // 与页面上的标记大小一致（80rpx ≈ 40px）

    // 外圈发光效果
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, markerRadius + 15);
    gradient.addColorStop(0, this._hexToRgba(color, 0.4));
    gradient.addColorStop(1, this._hexToRgba(color, 0));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, markerRadius + 15, 0, 2 * Math.PI);
    ctx.fill();

    // 阴影效果
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;

    // 主标记圆圈（使用车辆颜色）
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(centerX, centerY, markerRadius, 0, 2 * Math.PI);
    ctx.fill();

    // 清除阴影
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // 白色边框
    ctx.strokeStyle = carInfo.isLight ? '#ddd' : 'white';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(centerX, centerY, markerRadius, 0, 2 * Math.PI);
    ctx.stroke();

    // 绘制车辆 Logo（如果有且加载成功）
    if (logoImage && logoImage.complete && logoImage.width > 0) {
      const logoSize = 32;  // Logo 尺寸
      ctx.drawImage(
        logoImage,
        centerX - logoSize / 2,
        centerY - logoSize / 2 - 3,
        logoSize,
        logoSize
      );
    } else {
      // Logo加载失败时使用 emoji
      ctx.fillStyle = carInfo.isLight ? '#333' : 'white';
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🚗', centerX, centerY - 3);
    }
  }

  /**
   * 绘制信息卡片
   */
  _drawInfoCard(ctx, carInfo, location, logoImage) {
    const cardY = this.canvasHeight - 90;
    const cardHeight = 70;

    // 背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(20, cardY, this.canvasWidth - 40, cardHeight);

    // 绘制车辆 Logo（如果有）
    if (logoImage && logoImage.complete && logoImage.width > 0) {
      const logoSize = 32;
      ctx.drawImage(
        logoImage,
        40,
        cardY + 19,
        logoSize,
        logoSize
      );

      // 车辆名称（在Logo右侧）
      ctx.fillStyle = 'white';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(carInfo.name, 80, cardY + 28);

      // 车牌号
      ctx.font = '12px sans-serif';
      ctx.fillText(`📍 ${carInfo.plate}`, 80, cardY + 50);
    } else {
      // 没有Logo时使用emoji
      ctx.fillStyle = 'white';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`🚗 ${carInfo.name}`, 40, cardY + 28);

      ctx.font = '12px sans-serif';
      ctx.fillText(`📍 ${carInfo.plate}`, 40, cardY + 50);
    }

    // 时间
    const time = util.formatTime(new Date(location.timestamp || Date.now()));
    ctx.textAlign = 'right';
    ctx.font = '12px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
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
  _exportImage(canvas) {
    return new Promise((resolve, reject) => {
      try {
        // 使用新版 API 直接导出
        const dataURL = canvas.toDataURL();
        console.log('Canvas toDataURL 完成');

        // 将 base64 转为临时文件
        const filePath = `${wx.env.USER_DATA_PATH}/screenshot_${Date.now()}.png`;

        const fs = wx.getFileSystemManager();
        const base64 = dataURL.replace(/^data:image\/\w+;base64,/, '');
        const buffer = wx.base64ToArrayBuffer(base64);

        fs.writeFile({
          filePath: filePath,
          data: buffer,
          encoding: 'binary',
          success: () => {
            console.log('图片保存成功:', filePath);
            resolve(filePath);
          },
          fail: (err) => {
            console.error('图片保存失败:', err);
            reject(err);
          }
        });
      } catch (error) {
        console.error('导出图片失败:', error);
        reject(error);
      }
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
