/**
 * 截图分享模块（精简版 - 支持地图截图）
 * 提供地图 WebGL 截图和分享功能
 */
class ScreenshotManager {
    constructor() {
        this.mapManager = null;
        this.currentCar = null;
        this.currentLocation = null;
        this.currentAddress = '';
        this.logoImage = null; // 预加载的车辆 logo
    }

    /**
     * 初始化截图管理器
     */
    initialize(mapManager, car, location, address) {
        this.mapManager = mapManager;
        this.currentCar = car;
        this.currentLocation = location;
        this.currentAddress = address;
    }

    /**
     * 截图并分享 - 主入口方法
     */
    async captureAndShare() {
        try {
            console.log('📸 开始生成地图截图...');
            Utils.showToast('正在生成截图...', 'info');

            // 生成截图（仅 WebGL）
            const imageDataUrl = await this.captureMap();

            if (imageDataUrl) {
                // 显示分享对话框
                this.showShareDialog(imageDataUrl);
                Utils.showToast('✅ 截图生成成功');
            } else {
                throw new Error('无法生成地图截图');
            }

        } catch (error) {
            console.error('❌ 截图分享失败:', error);
            Utils.showToast('截图失败: ' + error.message);
        }
    }

    /**
     * 截取地图（仅 WebGL）
     */
    async captureMap() {
        return new Promise((resolve, reject) => {
            try {
                const mapContainer = document.getElementById('map-container');

                if (!mapContainer) {
                    throw new Error('地图容器未找到');
                }

                console.log('📸 地图容器尺寸:', mapContainer.offsetWidth, 'x', mapContainer.offsetHeight);

                // 使用 mapManager 获取地图 canvas
                const mapCanvas = this.mapManager.getCanvas();

                if (!mapCanvas) {
                    reject(new Error('未找到地图 Canvas，请确保地图已加载'));
                    return;
                }

                console.log('🎮 检测到地图 Canvas，尺寸:', mapCanvas.width, 'x', mapCanvas.height);
                console.log('🎮 尝试 WebGL 截图...');

                // 等待地图完全渲染
                setTimeout(async () => {
                    // WebGL 截图
                    this.captureWebGLCanvas(mapCanvas).then(async resultCanvas => {
                        if (resultCanvas) {
                            console.log('✅ WebGL 截图成功');
                            // 添加车辆信息水印（等待 logo 预加载）
                            const watermarkedCanvas = await this.addWatermark(resultCanvas);
                            const imageDataUrl = watermarkedCanvas.toDataURL('image/png');
                            resolve(imageDataUrl);
                        } else {
                            reject(new Error('WebGL 截图失败，无法读取地图像素数据'));
                        }
                    }).catch(error => {
                        console.error('❌ WebGL 截图异常:', error);
                        reject(new Error('WebGL 截图失败: ' + error.message));
                    });

                }, 800); // 等待地图完全渲染

            } catch (error) {
                console.error('❌ 截图失败:', error);
                reject(error);
            }
        });
    }

    /**
     * WebGL 像素读取截图（精简版）
     */
    async captureWebGLCanvas(canvas) {
        console.log('🎯 WebGL 像素读取...');

        try {
            // 获取 WebGL 上下文
            const gl = canvas.getContext('webgl') ||
                      canvas.getContext('experimental-webgl') ||
                      canvas.getContext('webgl2');

            if (!gl) {
                console.log('❌ 无法获取 WebGL 上下文');
                return null;
            }

            const width = canvas.width;
            const height = canvas.height;
            const pixels = new Uint8Array(width * height * 4);

            console.log('📐 Canvas 尺寸:', width, 'x', height);
            console.log('📐 准备读取像素...');

            // 强制完成渲染，多次尝试确保渲染完成
            try {
                for (let i = 0; i < 3; i++) {
                    gl.flush();
                }
                gl.finish();
                // 等待更长时间，确保渲染完成
                await new Promise(resolve => setTimeout(resolve, 300));
            } catch (e) {
                console.log('⚠️ 强制渲染失败:', e);
            }

            // 读取像素数据
            gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

            console.log('📊 像素数据读取完成，检查有效性...');

            // 检查数据有效性（更宽松的检查）
            const hasValidData = this.checkValidPixels(pixels);
            if (!hasValidData) {
                console.log('⚠️ 像素数据检查未通过，尝试再次读取...');

                // 尝试再次读取
                await new Promise(resolve => setTimeout(resolve, 200));
                gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

                const stillInvalid = !this.checkValidPixels(pixels);
                if (stillInvalid) {
                    console.log('❌ 第二次读取仍然无效');
                    // 输出像素样本以便调试
                    console.log('📊 像素样本:', Array.from(pixels.slice(0, 20)));
                    return null;
                }
            }

            console.log('✅ WebGL 像素读取成功');

            // 创建结果 canvas
            const resultCanvas = document.createElement('canvas');
            resultCanvas.width = width;
            resultCanvas.height = height;
            const ctx = resultCanvas.getContext('2d');

            // WebGL 像素是上下翻转的，需要翻转回来
            const flippedData = new Uint8Array(pixels.length);
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const srcOffset = ((height - y - 1) * width + x) * 4;
                    const destOffset = (y * width + x) * 4;
                    flippedData[destOffset] = pixels[srcOffset];
                    flippedData[destOffset + 1] = pixels[srcOffset + 1];
                    flippedData[destOffset + 2] = pixels[srcOffset + 2];
                    flippedData[destOffset + 3] = pixels[srcOffset + 3];
                }
            }

            // 写入 canvas
            const imageData = ctx.createImageData(width, height);
            imageData.data.set(flippedData);
            ctx.putImageData(imageData, 0, 0);

            console.log('✅ WebGL 截图创建成功，尺寸:', resultCanvas.width, 'x', resultCanvas.height);
            return resultCanvas;

        } catch (error) {
            console.error('❌ WebGL 截图失败:', error);
            return null;
        }
    }

    /**
     * 检查像素数据是否有效（更宽松的检查）
     */
    checkValidPixels(pixels) {
        // 采样检查，增加采样数量
        let nonTransparentCount = 0;
        let nonZeroPixels = 0;
        const sampleCount = Math.min(5000, pixels.length / 4);

        for (let i = 0; i < sampleCount * 4; i += 4) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            const a = pixels[i + 3];

            // 检查是否有颜色（不只是黑色或透明）
            if (a > 0) {
                nonTransparentCount++;
            }

            // 检查是否有非黑色像素
            if (a > 0 && (r > 0 || g > 0 || b > 0)) {
                nonZeroPixels++;
            }
        }

        const transparencyRatio = nonTransparentCount / sampleCount;
        const colorRatio = nonZeroPixels / sampleCount;

        console.log('📊 像素统计:', {
            transparentRatio: (transparencyRatio * 100).toFixed(1) + '%',
            colorRatio: (colorRatio * 100).toFixed(1) + '%',
            sampleCount: sampleCount
        });

        // 降低阈值：至少有 5% 非透明 或 1% 有颜色
        return transparencyRatio > 0.05 || colorRatio > 0.01;
    }

    /**
     * 添加水印
     */
    async addWatermark(sourceCanvas) {
        const canvas = document.createElement('canvas');
        canvas.width = sourceCanvas.width;
        canvas.height = sourceCanvas.height;
        const ctx = canvas.getContext('2d');

        // 复制原图
        ctx.drawImage(sourceCanvas, 0, 0);

        // 预加载车辆 logo
        await this.preloadLogo();

        // 添加水印
        this.addWatermarkToCanvas(canvas, ctx, canvas.width, canvas.height);

        return canvas;
    }

    /**
     * 预加载车辆 logo
     */
    async preloadLogo() {
        return new Promise((resolve, reject) => {
            if (!this.currentCar || !this.currentCar.logo) {
                resolve();
                return;
            }

            const img = new Image();
            img.onload = () => {
                this.logoImage = img;
                console.log('✅ Logo 预加载成功');
                resolve();
            };
            img.onerror = () => {
                console.warn('⚠️ Logo 加载失败，将使用 emoji');
                this.logoImage = null;
                resolve();
            };
            img.src = this.currentCar.logo;
        });
    }

    /**
     * 添加车辆信息水印到 canvas
     */
    addWatermarkToCanvas(canvas, ctx, width, height) {
        // 先绘制中心点标记（在底部水印之前）
        this.drawCenterMarker(ctx, width, height);

        // 底部背景条（减小高度）
        const footerHeight = 80;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, height - footerHeight, width, footerHeight);

        // 车辆信息
        ctx.fillStyle = 'white';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('🚗 ' + this.currentCar.name, 20, height - footerHeight + 30);

        ctx.font = '16px Arial';
        ctx.fillText('📍 ' + this.currentCar.plate, 20, height - footerHeight + 55);

        // 地址信息和放大倍数
        ctx.font = '14px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';

        // 地址（截断过长的地址）
        let address = this.currentAddress;
        if (address.length > 40) {
            address = address.substring(0, 40) + '...';
        }
        ctx.fillText('📍 ' + address, 20, height - footerHeight + 72);

        // 右侧时间和放大倍数
        ctx.textAlign = 'right';
        const time = Utils.formatTime(new Date(this.currentLocation.timestamp || Date.now()));
        ctx.fillText('🕒 ' + time, width - 20, height - footerHeight + 30);
        ctx.fillText('🔍 放大: x' + MAP_CONFIG.zoom, width - 20, height - footerHeight + 55);

        return canvas;
    }

    /**
     * 绘制中心点标记（模仿 #vehicle-marker 样式）
     */
    drawCenterMarker(ctx, width, height) {
        const centerX = width / 2;
        const centerY = height / 2;
        const markerSize = 60; // 与 DOM 标记相同大小
        const color = this.currentCar.color || '#007AFF';

        // 判断是否为浅色背景（零跑汽车）
        const isLightBackground = color === '#F0F0F0';
        const textColor = isLightBackground ? '#333' : 'white';

        // 1. 绘制外圈发光效果
        const outerGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 45);
        outerGradient.addColorStop(0, this.hexToRgba(color, 0.3));
        outerGradient.addColorStop(1, this.hexToRgba(color, 0));
        ctx.fillStyle = outerGradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 45, 0, Math.PI * 2);
        ctx.fill();

        // 2. 绘制阴影效果
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // 3. 绘制主标记圆圈
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(centerX, centerY, markerSize / 2, 0, Math.PI * 2);
        ctx.fill();

        // 4. 绘制白色边框
        ctx.shadowColor = 'transparent'; // 清除阴影
        ctx.strokeStyle = isLightBackground ? '#ccc' : 'white';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(centerX, centerY, markerSize / 2, 0, Math.PI * 2);
        ctx.stroke();

        // 5. 绘制车辆 logo（使用预加载的图片）
        const logoSize = 28;
        const logoX = centerX - logoSize / 2;
        const logoY = centerY - logoSize / 2 - 5;

        if (this.logoImage) {
            // 绘制预加载的 logo
            ctx.save();

            // 如果是深色背景，应用滤镜效果（转白色）
            if (!isLightBackground) {
                ctx.filter = 'brightness(0) invert(1)';
            }

            ctx.drawImage(this.logoImage, logoX, logoY, logoSize, logoSize);
            ctx.restore();
        } else {
            // logo 加载失败时，使用 emoji 作为后备
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = textColor;
            ctx.fillText('🚗', centerX, centerY - 6);
        }

        // 6. 绘制车辆名称（下方小字）
        ctx.font = 'bold 10px Arial';
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const nameText = this.currentCar.name.substring(0, 2);

        // 添加文字阴影
        if (!isLightBackground) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 2;
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;
        }

        ctx.fillText(nameText, centerX, centerY + 18);
        ctx.shadowColor = 'transparent';
    }

    /**
     * 将 hex 颜色转换为 rgba
     */
    hexToRgba(hex, alpha) {
        // 移除 # 号
        hex = hex.replace('#', '');

        // 解析 RGB
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);

        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    /**
     * 显示分享对话框
     */
    showShareDialog(imageDataUrl) {
        // 隐藏页面的车辆标记
        const vehicleMarker = document.getElementById('vehicle-marker');
        const originalMarkerDisplay = vehicleMarker ? vehicleMarker.style.display : '';
        if (vehicleMarker) {
            vehicleMarker.style.display = 'none';
            console.log('🚗 对话框显示期间，隐藏页面车辆标记');
        }

        // 创建遮罩层
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
        `;

        // 创建对话框
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: white;
            padding: 24px;
            border-radius: 16px;
            max-width: 90%;
            max-height: 90%;
            overflow: auto;
            text-align: center;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        `;

        dialog.innerHTML = `
            <h3 style="margin: 0 0 16px 0; color: #333; font-size: 20px;">📸 地图截图</h3>
            <img src="${imageDataUrl}" style="
                max-width: 100%;
                max-height: 50vh;
                border-radius: 12px;
                margin-bottom: 16px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            " />
            <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                <button id="download-btn" style="
                    background: #007AFF;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 15px;
                    font-weight: 500;
                ">💾 保存图片</button>
                <button id="copy-btn" style="
                    background: #34C759;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 15px;
                    font-weight: 500;
                ">📋 复制图片</button>
                <button id="close-btn" style="
                    background: #8E8E93;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 15px;
                    font-weight: 500;
                ">❌ 关闭</button>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        // 恢复车辆标记的函数
        const restoreMarker = () => {
            if (vehicleMarker) {
                vehicleMarker.style.display = originalMarkerDisplay;
                console.log('🚗 对话框关闭，恢复页面车辆标记');
            }
        };

        // 绑定事件
        dialog.querySelector('#download-btn').addEventListener('click', () => {
            this.downloadScreenshot(imageDataUrl);
        });

        dialog.querySelector('#copy-btn').addEventListener('click', () => {
            this.copyScreenshotToClipboard(imageDataUrl);
        });

        dialog.querySelector('#close-btn').addEventListener('click', () => {
            restoreMarker();
            overlay.remove();
        });

        // 点击背景关闭
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                restoreMarker();
                overlay.remove();
            }
        });

        console.log('✅ 分享对话框已显示');
    }

    /**
     * 下载截图
     */
    downloadScreenshot(dataUrl) {
        try {
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `车辆位置_${Utils.formatTime(new Date()).replace(/[:\s]/g, '_')}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            Utils.showToast('✅ 图片已保存');
        } catch (error) {
            console.error('❌ 下载失败:', error);
            Utils.showToast('下载失败');
        }
    }

    /**
     * 复制截图到剪贴板
     */
    async copyScreenshotToClipboard(dataUrl) {
        // 检测移动端环境
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isWechat = /micromessenger/i.test(navigator.userAgent);

        // 移动端或微信环境下，提示使用保存功能
        if (isMobile || isWechat) {
            Utils.showToast('📱 手机端请使用"保存图片"功能');
            return;
        }

        try {
            const response = await fetch(dataUrl);
            const blob = await response.blob();

            if (navigator.clipboard && window.ClipboardItem) {
                await navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': blob })
                ]);
                Utils.showToast('✅ 图片已复制，可直接粘贴');
            } else {
                Utils.showToast('❌ 浏览器不支持剪贴板功能');
            }
        } catch (error) {
            console.error('❌ 复制失败:', error);
            Utils.showToast('❌ 复制失败，请使用保存功能');
        }
    }
}

// 导出为全局变量
if (typeof window !== 'undefined') {
    window.ScreenshotManager = ScreenshotManager;
}
