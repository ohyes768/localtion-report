// 地图相关功能
class MapManager {
    constructor() {
        this.map = null;
        this.marker = null;
        this.currentLocation = null;
        this.isMapLoaded = false;
        this.infoWindow = null;
        this.addressCache = new Map();
        this.retryCount = 0;
        this.addressAPILimited = false; // 地址API配额限制标志
    }

    // 初始化地图
    async initializeMap(container, center, zoom = MAP_CONFIG.zoom) {
        if (this.map) {
            this.destroy();
        }

        return new Promise((resolve, reject) => {
            // 检查腾讯地图API是否已加载
            if (typeof TMap === 'undefined') {
                reject(new Error('腾讯地图API未加载，请检查网络连接'));
                return;
            }

            try {
                this._doInitializeMap(container, center, zoom, resolve, reject);
            } catch (error) {
                console.error('地图初始化错误:', error);
                reject(new Error('地图初始化失败: ' + error.message));
            }
        });
    }

    // 动态加载地图API
    _loadMapAPI() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            const key = MAP_CONFIG.key === 'MAP_KEY_PLACEHOLDER' ?
                'YOUR_REAL_MAP_KEY' : MAP_CONFIG.key;

            script.src = `https://map.qq.com/api/gljs?v=1.exp&key=${key}`;
            script.onload = resolve;
            script.onerror = reject;

            document.head.appendChild(script);
        });
    }

    // 实际初始化地图
    _doInitializeMap(container, center, zoom, resolve, reject) {
        try {
            // 检查TMap是否正确加载
            if (typeof TMap === 'undefined') {
                reject(new Error('腾讯地图API未正确加载'));
                return;
            }

            // 设置地图配置，移除可能导致问题的属性
            const mapOptions = {
                center: new TMap.LatLng(center.lat, center.lng),
                zoom: zoom,
                pitch: 0,
                rotation: 0,
                showControl: false
            };

            // 只有在ROADMAP常量存在时才添加
            if (TMap.MapTypeId && TMap.MapTypeId.ROADMAP) {
                mapOptions.mapTypeId = TMap.MapTypeId.ROADMAP;
            }

            this.map = new TMap.Map(container, mapOptions);

            // 监听地图加载完成事件
            const onMapLoad = () => {
                this.isMapLoaded = true;
                if (APP_CONFIG.debug) {
                    console.log('地图加载完成');
                }
                resolve();
            };

            // 尝试不同的事件监听方式
            if (typeof this.map.on === 'function') {
                this.map.on('idle', onMapLoad);
            } else {
                // 如果事件监听失败，直接认为加载完成
                setTimeout(onMapLoad, 1000);
            }

            // 监听地图点击事件（如果支持）
            if (typeof this.map.on === 'function') {
                this.map.on('click', (evt) => {
                    if (APP_CONFIG.debug) {
                        console.log('地图点击:', evt.latLng);
                    }
                });
            }

        } catch (error) {
            reject(new Error('地图初始化失败: ' + error.message));
        }
    }

    // 添加车辆标记
    addMarker(location, carInfo) {
        if (!this.map || !location) {
            return;
        }

        try {
            // 移除旧标记
            this._removeDirectMarker();
            if (this.marker && this.marker.setMap) {
                this.marker.setMap(null);
            }

            // 由于TMap.Marker在GL版本中不可用，直接使用备用方法
            console.log('使用直接标记方案...');
            this.createSimpleMarker(location, carInfo);

        } catch (error) {
            console.error('添加标记失败:', error);
            this.setCenter(location);
        }
    }

    // 创建车辆图标
    createMarkerIcon(carInfo) {
        // 尝试使用base64编码的简单图标
        const colors = {
            '#FF6B6B': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOxAAADsQBlSsOGwAABhNJREFUeJztW9uO4zQMbaM3l23VUgIj7yFosSgtJbe4B2Qz2yBmv8GNKI3FJSqiw8KI3M8+z98z8NAUQAh+D4PbgHCCgM/8vJ+PyvBwnJIBvDvnN3Lg9GcDGM5iDQJgXwJhM+Qwn0BiMQfG5GM5iDwJgfGJjO4nwvi8q8K/I/zwvxebvAShmXF6q8K/Cv/evYcB+GcD+Y3P/6v3//x9/MAABBgAA4QsIBKbW5/gAAAABJRU5ErkJggg==',
            '#4ECDC4': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOxAAADsQBlSsOGwAABhNJREFUeJztW9uO4zQMaYM3l23VUgIj7yFosSgtJbe4B2Qz2yBmv8GNKI3FJSqiw8KI3M8+z98z8NAUQAh+D4PbgHCCgM/8vJ+PyvBwnJIBvDvnN3Lg9GcDGM5iDQJgXwJhM+Qwn0BiMQfG5GM5iDwJgfGJjO4nwvi8q8K/I/zwvxebvAShmXF6q8K/Cv/evYcB+GcD+Y3P/6v3//x9/MAABBgAA4QsIBKbW5/gAAAABJRU5ErkJggg==',
            '#45B7D1': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOxAAADsQBlSsOGwAABhNJREFUeJztW9uO4zQMaYM3l23VUgIj7yFosSgtJbe4B2Qz2yBmv8GNKI3FJSqiw8KI3M8+z98z8NAUQAh+D4PbgHCCgM/8vJ+PyvBwnJIBvDvnN3Lg9GcDGM5iDQJgXwJhM+Qwn0BiMQfG5GM5iDwJgfGJjO4nwvi8q8K/I/zwvxebvAShmXF6q8K/Cv/evYcB+GcD+Y3P/6v3//x9/MAABBgAA4QsIBKbW5/gAAAABJRU5ErkJggg==',
            '#96CEB4': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOxAAADsQBlSsOGwAABhNJREFUeJztW9uO4zQMaYM3l23VUgIj7yFosSgtJbe4B2Qz2yBmv8GNKI3FJSqiw8KI3M8+z98z8NAUQAh+D4PbgHCCgM/8vJ+PyvBwnJIBvDvnN3Lg9GcDGM5iDQJgXwJhM+Qwn0BiMQfG5GM5iDwJgfGJjO4nwvi8q8K/I/zwvxebvAShmXF6q8K/Cv/evYcB+GcD+Y3P/6v3//x9/MAABBgAA4QsIBKbW5/gAAAABJRU5ErkJggg=='
        };

        return colors[carInfo.color] || colors['#007AFF'];
    }

    // 创建简单标记（主要方法）
    createSimpleMarker(location, carInfo) {
        try {
            console.log('创建备用标记方案...', carInfo);
            console.log('位置信息:', location);

            // 直接使用备用方案：在地图中心显示车辆标记
            this._createDirectMarker(location, carInfo);

        } catch (error) {
            console.error('标记创建失败:', error);
            console.error('错误详情:', error.stack);
            // 最后的备用方案
            this.setCenter(location);
            this.showCenterInfo(carInfo, location);
        }
    }

    // 直接在地图容器中创建标记
    _createDirectMarker(location, carInfo) {
        // 先确保地图中心定位正确
        this.setCenter(location);

        // 获取地图容器
        const mapContainer = document.getElementById('map-container');
        if (!mapContainer) {
            console.error('找不到地图容器');
            return;
        }

        // 移除旧标记
        this._removeDirectMarker();

        // 创建标记元素
        const markerDiv = document.createElement('div');
        markerDiv.id = 'vehicle-marker';
        markerDiv.style.cssText = `
            position: absolute !important;
            width: 60px !important;
            height: 60px !important;
            background: ${carInfo.color || '#007AFF'} !important;
            border-radius: 50% !important;
            border: 4px solid white !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4), 0 0 24px rgba(0,0,0,0.3) !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            color: white !important;
            font-size: 20px !important;
            font-weight: bold !important;
            z-index: 10000 !important;
            cursor: pointer !important;
            user-select: none !important;
            transition: all 0.3s ease !important;
            left: 50% !important;
            top: 50% !important;
            transform: translate(-50%, -50%) !important;
            pointer-events: auto !important;
            opacity: 1 !important;
            visibility: visible !important;
            font-family: Arial, sans-serif !important;
            text-align: center !important;
            line-height: 1.2 !important;
        `;

        // 添加车辆图标和名称
        markerDiv.innerHTML = `
            <div style="font-size: 28px; margin-bottom: 2px;">🚗</div>
            <div style="font-size: 10px; font-weight: bold; text-shadow: 1px 1px 2px rgba(0,0,0,0.5);">
                ${carInfo.name.substring(0, 2)}
            </div>
        `;

        // 添加提示信息
        markerDiv.title = `${carInfo.name} (${carInfo.plate})\n位置: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`;

        // 添加点击事件
        markerDiv.onclick = () => {
            alert(`${carInfo.name}\n车牌: ${carInfo.plate}\n位置: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`);
        };

        // 添加悬停效果
        markerDiv.onmouseover = () => {
            markerDiv.style.transform = 'translate(-50%, -50%) scale(1.1)';
            markerDiv.style.boxShadow = '0 6px 20px rgba(0,0,0,0.5), 0 0 32px rgba(0,0,0,0.4) !important';
        };

        markerDiv.onmouseout = () => {
            markerDiv.style.transform = 'translate(-50%, -50%) scale(1)';
            markerDiv.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4), 0 0 24px rgba(0,0,0,0.3) !important';
        };

        // 添加到地图容器
        mapContainer.style.position = 'relative';
        mapContainer.appendChild(markerDiv);

        // 保存标记引用
        this.marker = { element: markerDiv, type: 'direct' };

        console.log('直接标记创建成功:', markerDiv);
        console.log('标记已添加到地图中心');

        // 添加动画效果
        setTimeout(() => {
            markerDiv.style.animation = 'markerBounce 0.6s ease-out';
        }, 100);
    }

    // 移除直接创建的标记
    _removeDirectMarker() {
        if (this.marker && this.marker.element && this.marker.type === 'direct') {
            if (this.marker.element.parentNode) {
                this.marker.element.parentNode.removeChild(this.marker.element);
            }
            this.marker = null;
        }
    }

    // 在地图中心显示车辆信息（最后的备用方案）
    showCenterInfo(carInfo, location) {
        const infoDiv = document.createElement('div');
        infoDiv.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            text-align: center;
            min-width: 200px;
        `;
        infoDiv.innerHTML = `
            <h3 style="margin: 0 0 10px 0; color: #333; font-size: 16px;">
                🚗 ${carInfo.name}
            </h3>
            <p style="margin: 5px 0; color: #666; font-size: 14px;">
                ${carInfo.plate}
            </p>
            <p style="margin: 5px 0; color: #999; font-size: 12px;">
                点击关闭
            </p>
        `;

        infoDiv.onclick = function() {
            document.body.removeChild(infoDiv);
        };

        document.body.appendChild(infoDiv);

        // 3秒后自动关闭
        setTimeout(() => {
            if (document.body.contains(infoDiv)) {
                document.body.removeChild(infoDiv);
            }
        }, 3000);
    }

    // 创建标记内容
    createMarkerContent(carInfo) {
        return `
            <div class="custom-marker" style="background-color: ${carInfo.color}">
                <div class="marker-icon">🚗</div>
                <div class="marker-label">${carInfo.name}</div>
            </div>
        `;
    }

    // 标记动画
    _animateMarker() {
        if (!this.marker) return;

        // 添加弹跳动画
        let animationStep = 0;
        const animationInterval = setInterval(() => {
            animationStep++;
            const scale = 1 + Math.sin(animationStep * 0.3) * 0.1;

            if (this.marker && this.marker.dom) {
                this.marker.dom.style.transform = `scale(${scale})`;
            }

            if (animationStep > 10) {
                clearInterval(animationInterval);
                if (this.marker && this.marker.dom) {
                    this.marker.dom.style.transform = 'scale(1)';
                }
            }
        }, 50);
    }

    // 显示信息窗口
    showInfoWindow(carInfo, location) {
        if (this.infoWindow) {
            this.infoWindow.setMap(null);
        }

        this.infoWindow = new TMap.InfoWindow({
            map: this.map,
            position: new TMap.LatLng(location.lat, location.lng),
            content: this.createInfoWindowContent(carInfo, location),
            offset: { x: 0, y: -40 },
            zIndex: 1001
        });

        // 3秒后自动关闭
        setTimeout(() => {
            if (this.infoWindow) {
                this.infoWindow.setMap(null);
                this.infoWindow = null;
            }
        }, 3000);
    }

    // 创建信息窗口内容
    createInfoWindowContent(carInfo, location) {
        const accuracy = location.accuracy ? Math.round(location.accuracy) : '未知';
        const time = Utils.formatTime(new Date(location.timestamp || Date.now()));
        const quality = location.quality ? Math.round(location.quality) : '未知';

        return `
            <div class="info-window">
                <h3>${carInfo.name}</h3>
                <p><strong>车牌：</strong>${carInfo.plate}</p>
                <p><strong>精度：</strong>${accuracy}米</p>
                <p><strong>质量：</strong>${quality}分</p>
                <p><strong>时间：</strong>${time}</p>
            </div>
        `;
    }

    // 更新地图中心
    setCenter(location, animated = true) {
        if (!this.map || !location) {
            return;
        }

        const center = new TMap.LatLng(location.lat, location.lng);

        if (animated) {
            this.map.panTo(center);
        } else {
            this.map.setCenter(center);
        }
    }

    // 更新地图缩放级别
    setZoom(zoom, animated = true) {
        if (!this.map) {
            return;
        }

        if (animated) {
            // 简单的动画效果
            const currentZoom = this.map.getZoom();
            const steps = 10;
            const stepSize = (zoom - currentZoom) / steps;
            let step = 0;

            const animationInterval = setInterval(() => {
                step++;
                if (step <= steps) {
                    this.map.setZoom(currentZoom + stepSize * step);
                } else {
                    clearInterval(animationInterval);
                }
            }, 30);
        } else {
            this.map.setZoom(zoom);
        }
    }

    // 获取当前地图中心
    getCenter() {
        if (!this.map) {
            return null;
        }

        const center = this.map.getCenter();
        return {
            lat: center.getLat(),
            lng: center.getLng()
        };
    }

    // 获取当前缩放级别
    getZoom() {
        if (!this.map) {
            return null;
        }

        return this.map.getZoom();
    }

    // 生成地图截图
    async generateScreenshot(location, carInfo) {
        if (!location) {
            throw new Error('无法生成截图：位置信息为空');
        }

        console.log('开始生成截图，位置:', location);
        console.log('车辆信息:', carInfo);

        const cacheKey = `${location.lat}_${location.lng}_${MAP_CONFIG.zoom}`;

        // 检查缓存
        const cachedUrl = Utils.storage.get(`screenshot_${cacheKey}`);
        if (cachedUrl && !this._isPositionStale(cachedUrl.timestamp, CACHE_CONFIG.screenshotCacheTime)) {
            if (APP_CONFIG.debug) {
                console.log('使用缓存的地图截图:', cachedUrl.url);
            }
            return cachedUrl.url;
        }

        // 仅使用腾讯地图静态图API
        try {
            console.log('使用腾讯地图静态图API生成截图...');
            const tencentMapUrl = await this._generateStaticMapScreenshot(location, carInfo);

            const cacheData = {
                url: tencentMapUrl,
                timestamp: Date.now(),
                source: '腾讯地图'
            };
            Utils.storage.set(`screenshot_${cacheKey}`, cacheData, CACHE_CONFIG.screenshotCacheTime);

            console.log('腾讯地图截图生成成功');
            return tencentMapUrl;

        } catch (tencentError) {
            console.error('腾讯地图API失败:', tencentError.message);
            throw new Error('地图截图生成失败：' + tencentError.message);
        }
    }

  
    // 使用腾讯地图静态图API生成截图
    async _generateStaticMapScreenshot(location, carInfo) {
        console.log('🗺️ 使用小尺寸静态地图方案生成截图...');

        // 使用成功的小尺寸配置
        const params = new URLSearchParams({
            center: `${location.lat},${location.lng}`,
            zoom: MAP_CONFIG.zoom,
            size: '300x200', // 使用成功的小尺寸
            maptype: 'roadmap',
            key: MAP_CONFIG.key,
            format: 'png',
            _: Date.now() // 防止缓存
        });

        const staticMapUrl = `${API_CONFIG.tencentMap.staticMap}?${params.toString()}`;

        console.log('🗺️ 小尺寸地图 URL:', staticMapUrl);
        console.log('🔑 API Key:', MAP_CONFIG.key);
        console.log('🌐 当前域名:', window.location.origin);
        console.log('📍 请求位置:', location.lat, location.lng);

        try {
            // 验证图片是否可加载
            const success = await this._testImageUrl(staticMapUrl);

            if (success) {
                console.log('✅ 小尺寸静态地图加载成功');
                // 创建带车辆标识的增强截图
                return await this._createEnhancedScreenshot(staticMapUrl, location, carInfo);
            } else {
                throw new Error('小尺寸地图加载失败');
            }

        } catch (error) {
            console.error('❌ 静态地图生成失败:', error.message);
            throw new Error('静态地图API调用失败: ' + error.message);
        }
    }

    // 测试图片URL是否可以加载（确保Referer头）
    async _testImageUrl(url) {
        try {
            // 方案1：使用fetch测试（带Referer）
            const response = await fetch(url, {
                mode: 'cors',
                credentials: 'same-origin',
                headers: {
                    'Referer': window.location.origin
                }
            });

            if (response.ok) {
                console.log('✅ Fetch方式测试成功');
                return true;
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

        } catch (fetchError) {
            console.warn('Fetch测试失败，尝试传统方式:', fetchError.message);

            // 方案2：传统图片加载测试
            return new Promise((resolve, reject) => {
                const img = new Image();
                // 不设置crossOrigin，让浏览器自动发送Referer

                const timeout = setTimeout(() => {
                    reject(new Error('图片加载超时'));
                }, 8000);

                img.onload = () => {
                    clearTimeout(timeout);
                    console.log(`图片加载成功: ${img.naturalWidth}x${img.naturalHeight}`);
                    resolve(true);
                };

                img.onerror = (error) => {
                    clearTimeout(timeout);
                    console.warn('传统方式图片加载失败:', error);

                    // 检查是否是具体的错误图片
                    if (img.naturalWidth > 0) {
                        console.warn(`图片加载但有错误: ${img.naturalWidth}x${img.naturalHeight}`);
                        resolve(true); // 某些情况下错误图片仍然可用
                    } else {
                        reject(new Error('图片加载失败'));
                    }
                };

                img.src = url;
            });
        }
    }

    // 创建增强版截图（在小尺寸地图上添加车辆标识）
    async _createEnhancedScreenshot(baseMapUrl, location, carInfo) {
        try {
            console.log('🎨 开始创建增强截图，添加车辆标识...');

            // 先加载基础地图
            const baseMap = await this._loadImageAsCanvas(baseMapUrl);

            // 创建最终截图画布（使用分享配置的尺寸）
            const canvas = document.createElement('canvas');
            canvas.width = SHARE_CONFIG.screenshotSize.width;  // 600
            canvas.height = SHARE_CONFIG.screenshotSize.height; // 400
            const ctx = canvas.getContext('2d');

            // 1. 绘制背景
            this._drawBackground(ctx, canvas.width, canvas.height, carInfo);

            // 2. 绘制基础地图（居中显示）
            const mapWidth = 300;  // 小尺寸地图宽度
            const mapHeight = 200; // 小尺寸地图高度
            const mapX = (canvas.width - mapWidth) / 2;
            const mapY = 60; // 留出标题空间

            ctx.drawImage(baseMap, mapX, mapY, mapWidth, mapHeight);

            // 3. 在地图中心添加车辆标记
            const centerX = canvas.width / 2;
            const centerY = mapY + mapHeight / 2;
            this._drawEnhancedVehicleMarker(ctx, centerX, centerY, carInfo);

            // 4. 绘制车辆信息卡片
            this._drawVehicleInfoCard(ctx, canvas.width, canvas.height, carInfo, location);

            // 5. 绘制位置信息
            this._drawLocationInfo(ctx, canvas.width, canvas.height, location);

            // 转换为URL
            const dataUrl = canvas.toDataURL('image/png', 0.9);
            console.log('✅ 增强截图创建完成');
            return dataUrl;

        } catch (error) {
            console.error('创建增强截图失败:', error);
            return baseMapUrl; // 返回基础地图URL作为备用
        }
    }

    // 绘制背景
    _drawBackground(ctx, width, height, carInfo) {
        // 创建渐变背景
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, carInfo.color + '20'); // 20% 透明度
        gradient.addColorStop(1, '#f8f9fa');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }

    // 绘制增强的车辆标记
    _drawEnhancedVehicleMarker(ctx, x, y, carInfo) {
        // 外圈发光效果
        const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, 30);
        glowGradient.addColorStop(0, carInfo.color + '40'); // 40% 透明度
        glowGradient.addColorStop(1, carInfo.color + '00'); // 0% 透明度
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(x, y, 30, 0, Math.PI * 2);
        ctx.fill();

        // 主标记圆圈
        ctx.fillStyle = carInfo.color || '#FF0000';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 车辆图标
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🚗', x, y);

        // 车辆名称
        ctx.fillStyle = '#333';
        ctx.font = 'bold 10px Arial';
        ctx.fillText(carInfo.name.substring(0, 2), x, y + 20);
    }

    // 绘制车辆信息卡片
    _drawVehicleInfoCard(ctx, width, height, carInfo, location) {
        const cardY = height - 100;
        const cardWidth = width - 40;
        const cardHeight = 70;

        // 卡片阴影
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 3;

        // 卡片背景
        ctx.fillStyle = 'white';
        this._roundRect(ctx, 20, cardY, cardWidth, cardHeight, 8);
        ctx.fill();

        // 重置阴影
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // 卡片边框
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        this._roundRect(ctx, 20, cardY, cardWidth, cardHeight, 8);
        ctx.stroke();

        // 车辆图标和信息
        ctx.fillStyle = carInfo.color || '#FF0000';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('🚙', 35, cardY + 30);

        // 车辆名称
        ctx.fillStyle = '#333';
        ctx.font = 'bold 16px Arial';
        ctx.fillText(carInfo.name, 65, cardY + 30);

        // 车牌号
        ctx.fillStyle = '#666';
        ctx.font = '14px Arial';
        ctx.fillText(`车牌: ${carInfo.plate}`, 35, cardY + 55);

        // 时间
        const time = Utils.formatTime();
        ctx.textAlign = 'right';
        ctx.fillText(time, width - 35, cardY + 30);
    }

    // 绘制位置信息
    _drawLocationInfo(ctx, width, height, location) {
        const infoY = 20;

        // 标题
        ctx.fillStyle = '#333';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('📍 车辆位置分享', width / 2, infoY);

        // 坐标信息（小字）
        ctx.fillStyle = '#666';
        ctx.font = '10px Arial';
        const coords = `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
        ctx.fillText(coords, width / 2, height - 15);
    }

    // 绘制圆角矩形的辅助函数
    _roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

  
    // 加载图片为Canvas对象（带Referer头）
    async _loadImageAsCanvas(url) {
        try {
            // 方案1：使用fetch获取图片数据（确保Referer头）
            const response = await fetch(url, {
                mode: 'cors',
                credentials: 'same-origin',
                headers: {
                    'Referer': window.location.origin
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const blob = await response.blob();
            const imgUrl = URL.createObjectURL(blob);

            // 创建图片对象
            const img = new Image();

            return new Promise((resolve, reject) => {
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth;
                    canvas.height = img.naturalHeight;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);

                    // 清理对象URL
                    URL.revokeObjectURL(imgUrl);
                    resolve(canvas);
                };

                img.onerror = (error) => {
                    URL.revokeObjectURL(imgUrl);
                    reject(new Error('图片加载失败'));
                };

                img.src = imgUrl;
            });

        } catch (fetchError) {
            console.warn('Fetch方式失败，尝试传统方式:', fetchError.message);

            // 方案2：传统方式（不带crossOrigin）
            return new Promise((resolve, reject) => {
                const img = new Image();
                // 不设置crossOrigin，让浏览器自动发送Referer

                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth;
                    canvas.height = img.naturalHeight;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    resolve(canvas);
                };

                img.onerror = reject;
                img.src = url;
            });
        }
    }

    // 处理所有尝试都失败的情况
    async _handleAllAttemptsFailed(location, carInfo) {
        console.error('🚨 所有腾讯地图API配置都失败');

        // 检查是否是调试模式
        if (APP_CONFIG.debug) {
            // 提供调试链接
            const debugUrl = `${window.location.origin}/debug-tencent-api.html`;
            console.error(`🔍 请访问调试页面检查配置: ${debugUrl}`);
        }

        // 提供详细的错误信息
        const errorMsg = `腾讯地图静态图API调用失败

当前配置信息:
- 域名: ${window.location.hostname}
- API Key: ${MAP_CONFIG.key.substring(0, 8)}...
- 协议: ${window.location.protocol}

可能的解决方案:
1. 检查腾讯地图控制台域名白名单
2. 验证API Key是否有效
3. 确认API配额未用完
4. 确保使用HTTPS协议访问

调试工具: ${window.location.origin}/debug-tencent-api.html`;

        throw new Error(errorMsg);
    }

  
    // 逆地理编码获取地址（带用量控制）
    async getAddressFromLocation(location) {
        // 如果API配额已用完，直接返回坐标信息
        if (this.addressAPILimited) {
            return this.getCoordinateDisplay(location);
        }

        if (!location) {
            return '位置未知';
        }

        const cacheKey = `${location.lat.toFixed(4)}_${location.lng.toFixed(4)}`;

        // 检查内存缓存
        if (this.addressCache.has(cacheKey)) {
            const cached = this.addressCache.get(cacheKey);
            if (!this._isPositionStale(cached.timestamp, CACHE_CONFIG.addressCacheTime)) {
                if (APP_CONFIG.debug) {
                    console.log('使用缓存的地址:', cached.address);
                }
                return cached.address;
            }
        }

        // 检查本地存储缓存
        const storageKey = `address_${cacheKey}`;
        const storageCache = Utils.storage.get(storageKey);
        if (storageCache && !this._isPositionStale(storageCache.timestamp || Date.now(), CACHE_CONFIG.addressCacheTime)) {
            if (APP_CONFIG.debug) {
                console.log('使用本地缓存的地址:', storageCache.address);
            }
            return storageCache.address;
        }

        try {
            const params = new URLSearchParams({
                location: `${location.lat},${location.lng}`,
                key: MAP_CONFIG.key,
                get_poi: 0  // 关闭POI查询减少数据量
            });

            const url = `${API_CONFIG.tencentMap.geocoder}?${params.toString()}`;

            // 使用JSONP方式避免跨域问题
            const data = await Utils.jsonpRequest(url);

            if (data.status === 0 && data.result) {
                const address = data.result.address || '位置未知';

                // 缓存到内存
                this.addressCache.set(cacheKey, {
                    address: address,
                    timestamp: Date.now()
                });

                // 缓存到本地存储（30分钟）
                Utils.storage.set(storageKey, {
                    address: address,
                    timestamp: Date.now()
                }, 30 * 60 * 1000);

                if (APP_CONFIG.debug) {
                    console.log('获取到新地址:', address);
                }

                return address;
            } else {
                // 检查是否是配额限制错误
                if (data.message && data.message.includes('limit') || data.message.includes('quota')) {
                    this.addressAPILimited = true;
                    if (APP_CONFIG.debug) {
                        console.warn('地址解析API达到限制，切换到坐标显示模式');
                    }
                    return this.getCoordinateDisplay(location);
                }
                throw new Error(data.message || '地址解析失败');
            }

        } catch (error) {
            Utils.logError(error, {
                type: 'geocoding',
                location: location
            });
            console.error('地址解析错误详情:', error);
            return this.getCoordinateDisplay(location);
        }
    }

    // 获取坐标显示格式
    getCoordinateDisplay(location) {
        const lat = location.lat.toFixed(6);
        const lng = location.lng.toFixed(6);
        const accuracy = location.accuracy ? Math.round(location.accuracy) : '未知';
        return `坐标: ${lat}, ${lng} (精度: ${accuracy}米)`;
    }

    // 检查位置是否过时（内部方法）
    _isPositionStale(timestamp, maxAge) {
        return (Date.now() - timestamp) > maxAge;
    }

    // 搜索周边POI
    async searchNearby(location, keyword, radius = 1000) {
        if (!location) {
            return [];
        }

        try {
            // 这里可以实现POI搜索功能
            // 由于API限制，暂时返回空数组
            return [];
        } catch (error) {
            Utils.logError(error, {
                type: 'poi_search',
                location: location,
                keyword: keyword
            });
            return [];
        }
    }

    // 测量距离
    measureDistance(lat1, lng1, lat2, lng2) {
        return Utils.calculateDistance(lat1, lng1, lat2, lng2);
    }

    // 设置地图样式
    setMapStyle(style) {
        if (!this.map) {
            return;
        }

        // 这里可以根据腾讯地图API设置不同的地图样式
        if (APP_CONFIG.debug) {
            console.log('设置地图样式:', style);
        }
    }

    // 获取地图状态
    getStatus() {
        return {
            isLoaded: this.isMapLoaded,
            hasLocation: !!this.currentLocation,
            hasMarker: !!this.marker,
            center: this.getCenter(),
            zoom: this.getZoom(),
            addressCacheSize: this.addressCache.size
        };
    }

    // 清理缓存
    clearCache() {
        this.addressCache.clear();

        // 清理截图缓存
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('screenshot_')) {
                Utils.storage.remove(key);
            }
        });

        if (APP_CONFIG.debug) {
            console.log('地图缓存已清理');
        }
    }

    // 获取边界
    getBounds() {
        if (!this.map) {
            return null;
        }

        const bounds = this.map.getBounds();
        return {
            northeast: {
                lat: bounds.getNorthEast().getLat(),
                lng: bounds.getNorthEast().getLng()
            },
            southwest: {
                lat: bounds.getSouthWest().getLat(),
                lng: bounds.getSouthWest().getLng()
            }
        };
    }

    // 适应边界
    fitBounds(locations, padding = 50) {
        if (!this.map || !locations || locations.length === 0) {
            return;
        }

        try {
            const bounds = new TMap.LatLngBounds();

            locations.forEach(location => {
                bounds.extend(new TMap.LatLng(location.lat, location.lng));
            });

            this.map.fitBounds(bounds, {
                padding: padding
            });

        } catch (error) {
            console.error('适应边界失败:', error);
        }
    }

    // 销毁地图
    destroy() {
        if (this.infoWindow) {
            this.infoWindow.setMap(null);
            this.infoWindow = null;
        }

        if (this.marker) {
            this.marker.setMap(null);
            this.marker = null;
        }

        if (this.map) {
            this.map.destroy();
            this.map = null;
        }

        this.currentLocation = null;
        this.isMapLoaded = false;
        this.addressCache.clear();

        if (APP_CONFIG.debug) {
            console.log('地图管理器已销毁');
        }
    }
}

// 添加自定义标记样式
const customMarkerStyles = `
<style>
.custom-marker {
    position: relative;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 20px;
    transform: translate(-50%, -100%);
    animation: markerDrop 0.5s ease-out;
}

@keyframes markerDrop {
    0% {
        transform: translate(-50%, -200%);
        opacity: 0;
    }
    50% {
        opacity: 1;
    }
    70% {
        transform: translate(-50%, -110%);
    }
    100% {
        transform: translate(-50%, -100%);
    }
}

.custom-marker .marker-label {
    position: absolute;
    bottom: -25px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0,0,0,0.7);
    color: white;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 12px;
    white-space: nowrap;
}

.info-window {
    padding: 10px;
    min-width: 200px;
    max-width: 280px;
}

.info-window h3 {
    margin: 0 0 10px 0;
    font-size: 16px;
    color: #333;
}

.info-window p {
    margin: 5px 0;
    font-size: 14px;
    color: #666;
    line-height: 1.4;
}

.info-window strong {
    color: #333;
}
</style>
`;

// 添加标记动画样式
const markerAnimation = `
<style>
@keyframes markerBounce {
    0% {
        transform: translate(-50%, -50%) scale(0);
        opacity: 0;
    }
    50% {
        transform: translate(-50%, -50%) scale(1.2);
        opacity: 0.8;
    }
    80% {
        transform: translate(-50%, -50%) scale(0.9);
        opacity: 1;
    }
    100% {
        transform: translate(-50%, -50%) scale(1);
        opacity: 1;
    }
}
</style>
`;

// 将样式添加到页面
if (!document.getElementById('map-styles')) {
    const styleElement = document.createElement('div');
    styleElement.id = 'map-styles';
    styleElement.innerHTML = customMarkerStyles + markerAnimation;
    document.body.appendChild(styleElement);
}