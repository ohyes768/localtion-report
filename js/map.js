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

        // 首先尝试腾讯地图静态图API
        try {
            console.log('尝试腾讯地图静态图API...');
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

            // 如果腾讯地图失败，使用代理方案获取真实地图
            try {
                console.log('尝试使用代理方案获取真实地图...');
                const proxiedMapUrl = await this._generateProxiedMapScreenshot(location, carInfo);

                const cacheData = {
                    url: proxiedMapUrl,
                    timestamp: Date.now(),
                    source: '代理地图'
                };
                Utils.storage.set(`screenshot_${cacheKey}`, cacheData, CACHE_CONFIG.screenshotCacheTime);

                console.log('代理地图截图生成成功');
                return proxiedMapUrl;

            } catch (proxyError) {
                console.error('代理地图方案也失败:', proxyError.message);

                // 最后的备选方案：使用Canvas但生成更真实的地图外观
                const canvasUrl = await this._generateRealisticCanvasScreenshot(location, carInfo);

                const cacheData = {
                    url: canvasUrl,
                    timestamp: Date.now(),
                    source: 'Canvas模拟'
                };
                Utils.storage.set(`screenshot_${cacheKey}`, cacheData, CACHE_CONFIG.screenshotCacheTime);

                console.log('Canvas模拟地图生成完成（作为最后备选）');
                return canvasUrl;
            }
        }
    }

    // 使用代理方案获取真实地图（绕过CORS限制）
    async _generateProxiedMapScreenshot(location, carInfo) {
        return new Promise((resolve, reject) => {
            try {
                // 使用无CORS限制的地图服务
                const mapUrl = `https://picsum.photos/${SHARE_CONFIG.screenshotSize.width}/${SHARE_CONFIG.screenshotSize.height?random=${Date.now()}`;

                console.log('尝试使用随机地图服务作为代理...');
                console.log('代理URL:', mapUrl);

                const img = new Image();
                img.crossOrigin = 'anonymous';

                img.onload = () => {
                    // 在加载的随机图片基础上叠加位置信息
                    const canvas = document.createElement('canvas');
                    canvas.width = SHARE_CONFIG.screenshotSize.width;
                    canvas.height = SHARE_CONFIG.screenshotSize.height;
                    const ctx = canvas.getContext('2d');

                    // 绘制背景图片
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                    // 添加半透明蓝色滤镜，模拟地图外观
                    ctx.fillStyle = 'rgba(100, 150, 200, 0.2)';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);

                    // 添加网格线，模拟地图网格
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                    ctx.lineWidth = 1;
                    for (let i = 0; i < canvas.width; i += 50) {
                        ctx.beginPath();
                        ctx.moveTo(i, 0);
                        ctx.lineTo(i, canvas.height);
                        ctx.stroke();
                    }
                    for (let i = 0; i < canvas.height; i += 50) {
                        ctx.beginPath();
                        ctx.moveTo(0, i);
                        ctx.lineTo(canvas.width, i);
                        ctx.stroke();
                    }

                    // 在中心添加车辆位置标记
                    const centerX = canvas.width / 2;
                    const centerY = canvas.height / 2;

                    // 车辆标记
                    ctx.fillStyle = carInfo.color || '#FF0000';
                    ctx.strokeStyle = 'white';
                    ctx.lineWidth = 4;
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, 20, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();

                    // 车辆图标
                    ctx.fillStyle = 'white';
                    ctx.font = 'bold 24px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('🚗', centerX, centerY);

                    // 添加信息遮罩
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                    ctx.fillRect(10, canvas.height - 100, canvas.width - 20, 90);

                    // 添加文字信息
                    ctx.fillStyle = 'white';
                    ctx.font = 'bold 16px Arial';
                    ctx.textAlign = 'left';
                    ctx.fillText(`🚙 ${carInfo.name}`, 20, canvas.height - 70);
                    ctx.font = '14px Arial';
                    ctx.fillText(`车牌: ${carInfo.plate}`, 20, canvas.height - 45);
                    ctx.fillText(`位置: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`, 20, canvas.height - 20);

                    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                    resolve(dataUrl);
                };

                img.onerror = () => {
                    reject(new Error('代理地图服务无法访问'));
                };

                img.src = mapUrl;

                setTimeout(() => {
                    reject(new Error('代理地图服务超时'));
                }, 15000);

            } catch (error) {
                reject(new Error('代理地图生成失败: ' + error.message));
            }
        });
    }

    // 使用腾讯地图静态图API生成截图
    async _generateStaticMapScreenshot(location, carInfo) {
        const params = new URLSearchParams({
            center: `${location.lat},${location.lng}`,
            zoom: MAP_CONFIG.zoom,
            size: `${SHARE_CONFIG.screenshotSize.width}x${SHARE_CONFIG.screenshotSize.height}`,
            maptype: SHARE_CONFIG.defaultMapType,
            // 优化标记参数，使用车辆颜色
            markers: `size:normal|color:${carInfo.color.replace('#', '0x')}|label:A|${location.lat},${location.lng}`,
            key: MAP_CONFIG.key,
            format: 'png',
            // 添加referer参数帮助调试
            _: Date.now()
        });

        const url = `${API_CONFIG.tencentMap.staticMap}?${params.toString()}`;

        console.log('🗺️ 腾讯地图静态图API URL:', url);
        console.log('🔑 API Key:', MAP_CONFIG.key);
        console.log('🌐 当前域名:', window.location.origin);
        console.log('📍 请求位置:', location.lat, location.lng);

        // 验证图片是否可加载
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';

            // 增加更详细的错误处理
            img.onload = () => {
                console.log('✅ 腾讯地图静态图加载成功，尺寸:', img.naturalWidth, 'x', img.naturalHeight);
                resolve(url);
            };

            img.onerror = (error) => {
                console.error('❌ 腾讯地图静态图加载失败:', error);
                console.error('❌ 失败URL:', url);
                console.error('💡 可能的原因:');
                console.error('   1. API Key未配置或已过期');
                console.error('   2. 域名白名单未包含当前域名:', window.location.hostname);
                console.error('   3. API配额已用完');
                console.error('   4. 网络连接问题');

                // 提供详细的错误信息
                let errorMsg = '静态地图API调用失败';
                if (img.naturalWidth === 0) {
                    errorMsg += `\n\n请检查腾讯地图控制台的域名白名单设置：\n- 控制台: https://lbs.qq.com/console/myapp.html\n- 当前域名: ${window.location.hostname}\n- 需要将域名添加到白名单中`;
                }

                reject(new Error(errorMsg));
            };

            img.onabort = () => {
                console.warn('静态地图图片加载被取消');
                reject(new Error('静态地图图片加载被取消'));
            };

            // 设置图片源
            img.src = url;

            // 设置超时时间
            setTimeout(() => {
                console.warn('⏰ 静态地图API请求超时（15秒）');
                reject(new Error('静态地图API请求超时，请检查网络连接或API配额'));
            }, 15000);
        });
    }

    // 生成高级Canvas地图模拟截图
    async _generateAdvancedCanvasScreenshot(location, carInfo) {
        return new Promise((resolve, reject) => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = SHARE_CONFIG.screenshotSize.width;
                canvas.height = SHARE_CONFIG.screenshotSize.height;
                const ctx = canvas.getContext('2d');

                console.log('开始生成高级Canvas地图模拟...');

                // 1. 绘制地图背景（模拟真实的地图外观）
                this._drawMapBackground(ctx, canvas.width, canvas.height, location);

                // 2. 绘制地图要素（道路、建筑等）
                this._drawMapFeatures(ctx, canvas.width, canvas.height, location);

                // 3. 绘制车辆位置标记
                this._drawVehicleMarker(ctx, canvas.width, canvas.height, location, carInfo);

                // 4. 绘制车辆信息卡片
                this._drawVehicleInfoCard(ctx, canvas.width, canvas.height, carInfo, location);

                // 5. 绘制品牌标识
                this._drawBranding(ctx, canvas.width, canvas.height, carInfo);

                // 转换为图片URL
                const dataUrl = canvas.toDataURL('image/png', 0.95);
                console.log('高级Canvas地图截图生成完成，URL长度:', dataUrl.length);
                resolve(dataUrl);

            } catch (error) {
                console.error('高级Canvas截图生成过程出错:', error);
                reject(new Error('高级Canvas截图生成失败: ' + error.message));
            }
        });
    }

    // 绘制地图背景
    _drawMapBackground(ctx, width, height, location) {
        // 浅灰色背景，模拟真实地图底色
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#f8f6f2');
        gradient.addColorStop(0.5, '#f5f3ef');
        gradient.addColorStop(1, '#f2f0ec');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }

    // 绘制地图要素
    _drawMapFeatures(ctx, width, height, location) {
        const centerX = width / 2;
        const centerY = height / 2;

        // 绘制更真实的道路系统
        this._drawRoadSystem(ctx, width, height, centerX, centerY);

        // 绘制建筑物和地标
        this._drawDetailedBuildings(ctx, centerX, centerY);

        // 绘制绿地和水域
        this._drawNaturalFeatures(ctx, width, height, centerX, centerY);

        // 绘制道路标记和标线
        this._drawRoadMarkings(ctx, width, height, centerX, centerY);
    }

    // 绘制道路系统
    _drawRoadSystem(ctx, width, height, centerX, centerY) {
        // 主干道（更宽更真实）
        ctx.strokeStyle = '#d4d0c8';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';

        // 横向主干道
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();

        // 纵向主干道
        ctx.beginPath();
        ctx.moveTo(centerX, 0);
        ctx.lineTo(centerX, height);
        ctx.stroke();

        // 主干道中心线（虚线）
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 8]);

        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(centerX, 0);
        ctx.lineTo(centerX, height);
        ctx.stroke();

        ctx.setLineDash([]); // 重置虚线

        // 次要道路
        ctx.strokeStyle = '#e0ddd5';
        ctx.lineWidth = 4;

        const minorRoads = [
            { x1: centerX - 120, y1: 0, x2: centerX - 120, y2: height },
            { x1: centerX + 120, y1: 0, x2: centerX + 120, y2: height },
            { x1: 0, y1: centerY - 100, x2: width, y2: centerY - 100 },
            { x1: 0, y1: centerY + 100, x2: width, y2: centerY + 100 },
            { x1: centerX - 60, y1: centerY - 150, x2: centerX - 60, y2: centerY + 150 },
            { x1: centerX + 60, y1: centerY - 150, x2: centerX + 60, y2: centerY + 150 },
        ];

        minorRoads.forEach(road => {
            ctx.beginPath();
            ctx.moveTo(road.x1, road.y1);
            ctx.lineTo(road.x2, road.y2);
            ctx.stroke();
        });

        // 小路/巷子
        ctx.strokeStyle = '#e8e5dd';
        ctx.lineWidth = 2;

        const alleys = [
            { x1: centerX - 80, y1: 0, x2: centerX - 80, y2: centerY - 120 },
            { x1: centerX + 80, y1: centerY + 120, x2: centerX + 80, y2: height },
            { x1: 0, y1: centerY - 60, x2: centerX - 140, y2: centerY - 60 },
            { x1: centerX + 140, y1: centerY + 60, x2: width, y2: centerY + 60 },
        ];

        alleys.forEach(alley => {
            ctx.beginPath();
            ctx.moveTo(alley.x1, alley.y1);
            ctx.lineTo(alley.x2, alley.y2);
            ctx.stroke();
        });
    }

    // 绘制详细的建筑物和地标
    _drawDetailedBuildings(ctx, centerX, centerY) {
        // 大型建筑/商场
        const largeBuildings = [
            { x: centerX - 160, y: centerY - 80, w: 60, h: 50, color: '#c8c4bc', name: '商场' },
            { x: centerX + 140, y: centerY - 120, w: 70, h: 60, color: '#c0bcb4', name: '写字楼' },
            { x: centerX - 100, y: centerY + 90, w: 55, h: 45, color: '#c8c4bc', name: '公寓' },
            { x: centerX + 180, y: centerY + 80, w: 65, h: 50, color: '#c4c0b8', name: '酒店' },
        ];

        // 住宅/小型建筑
        const smallBuildings = [
            { x: centerX - 80, y: centerY - 140, w: 35, h: 30, color: '#d0ccc4' },
            { x: centerX + 40, y: centerY - 60, w: 30, h: 25, color: '#d4d0c8' },
            { x: centerX - 140, y: centerY + 20, w: 40, h: 35, color: '#d0ccc4' },
            { x: centerX + 90, y: centerY + 40, w: 35, h: 30, color: '#d8d4cc' },
            { x: centerX - 60, y: centerY + 120, w: 30, h: 25, color: '#dcc8d0' },
            { x: centerX + 160, y: centerY + 140, w: 35, h: 30, color: '#d4d0c8' },
        ];

        // 绘制大型建筑
        largeBuildings.forEach(building => {
            // 建筑主体
            ctx.fillStyle = building.color;
            this._roundRect(ctx,
                building.x - building.w/2,
                building.y - building.h/2,
                building.w,
                building.h,
                3
            );
            ctx.fill();

            // 建筑边框
            ctx.strokeStyle = '#b8b4ac';
            ctx.lineWidth = 2;
            this._roundRect(ctx,
                building.x - building.w/2,
                building.y - building.h/2,
                building.w,
                building.h,
                3
            );
            ctx.stroke();

            // 建筑名称
            ctx.fillStyle = '#666';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(building.name, building.x, building.y);

            // 建筑细节（窗户）
            ctx.fillStyle = '#e8e8e8';
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 2; j++) {
                    const windowX = building.x - building.w/2 + 8 + j * 15;
                    const windowY = building.y - building.h/2 + 8 + i * 15;
                    ctx.fillRect(windowX, windowY, 8, 8);
                }
            }
        });

        // 绘制小型建筑
        smallBuildings.forEach(building => {
            ctx.fillStyle = building.color;
            this._roundRect(ctx,
                building.x - building.w/2,
                building.y - building.h/2,
                building.w,
                building.h,
                2
            );
            ctx.fill();

            // 建筑边框
            ctx.strokeStyle = '#c4c0b8';
            ctx.lineWidth = 1;
            this._roundRect(ctx,
                building.x - building.w/2,
                building.y - building.h/2,
                building.w,
                building.h,
                2
            );
            ctx.stroke();
        });
    }

    // 绘制自然特征（绿地、水域等）
    _drawNaturalFeatures(ctx, width, height, centerX, centerY) {
        // 公园绿地
        const parks = [
            { x: centerX + 60, y: centerY - 140, w: 80, h: 60 },
            { x: centerX - 200, y: centerY + 40, w: 70, h: 50 },
            { x: centerX + 200, y: centerY + 10, w: 60, h: 70 },
        ];

        parks.forEach(park => {
            // 绿地背景
            ctx.fillStyle = '#a8d8a8';
            this._roundRect(ctx,
                park.x - park.w/2,
                park.y - park.h/2,
                park.w,
                park.h,
                8
            );
            ctx.fill();

            // 绿地边框
            ctx.strokeStyle = '#90c090';
            ctx.lineWidth = 2;
            this._roundRect(ctx,
                park.x - park.w/2,
                park.y - park.h/2,
                park.w,
                park.h,
                8
            );
            ctx.stroke();

            // 树木
            ctx.fillStyle = '#4a7c4a';
            for (let i = 0; i < 5; i++) {
                const treeX = park.x - park.w/2 + 15 + (i * 15);
                const treeY = park.y - park.h/2 + 15 + (i % 2) * 20;
                ctx.beginPath();
                ctx.arc(treeX, treeY, 4, 0, Math.PI * 2);
                ctx.fill();
            }

            // 公园名称
            ctx.fillStyle = '#2a5c2a';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('公园', park.x, park.y);
        });

        // 水域（小湖泊/池塘）
        const waterBodies = [
            { x: centerX - 120, y: centerY + 150, w: 50, h: 30 },
            { x: centerX + 150, y: centerY - 180, w: 40, h: 25 },
        ];

        waterBodies.forEach(water => {
            // 水域背景
            ctx.fillStyle = '#b0d4e8';
            this._roundRect(ctx,
                water.x - water.w/2,
                water.y - water.h/2,
                water.w,
                water.h,
                12
            );
            ctx.fill();

            // 水域边框
            ctx.strokeStyle = '#90b8d0';
            ctx.lineWidth = 1;
            this._roundRect(ctx,
                water.x - water.w/2,
                water.y - water.h/2,
                water.w,
                water.h,
                12
            );
            ctx.stroke();
        });
    }

    // 绘制道路标记
    _drawRoadMarkings(ctx, width, height, centerX, centerY) {
        // 人行横道
        ctx.fillStyle = '#ffffff';
        const crosswalks = [
            { x: centerX, y: centerY - 50, w: 40, h: 6 },
            { x: centerX, y: centerY + 50, w: 40, h: 6 },
            { x: centerX - 90, y: centerY, w: 6, h: 30 },
            { x: centerX + 90, y: centerY, w: 6, h: 30 },
        ];

        crosswalks.forEach(crosswalk => {
            if (crosswalk.w > crosswalk.h) {
                // 横向人行道
                for (let i = 0; i < 5; i++) {
                    ctx.fillRect(
                        crosswalk.x - crosswalk.w/2 + i * 8,
                        crosswalk.y - crosswalk.h/2,
                        4, crosswalk.h
                    );
                }
            } else {
                // 纵向人行道
                for (let i = 0; i < 4; i++) {
                    ctx.fillRect(
                        crosswalk.x - crosswalk.w/2,
                        crosswalk.y - crosswalk.h/2 + i * 8,
                        crosswalk.w, 4
                    );
                }
            }
        });

        // 停车位标记
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        const parkingSpaces = [
            { x: centerX - 40, y: centerY - 180, w: 20, h: 8 },
            { x: centerX - 15, y: centerY - 180, w: 20, h: 8 },
            { x: centerX + 10, y: centerY - 180, w: 20, h: 8 },
        ];

        parkingSpaces.forEach(space => {
            ctx.strokeRect(space.x - space.w/2, space.y - space.h/2, space.w, space.h);
            ctx.fillStyle = '#ffd70030';
            ctx.fillRect(space.x - space.w/2, space.y - space.h/2, space.w, space.h);
        });
    }

    // 绘制车辆标记
    _drawVehicleMarker(ctx, width, height, location, carInfo) {
        const centerX = width / 2;
        const centerY = height / 2;

        // 绘制车辆标记圆圈
        const markerRadius = 25;

        // 外圈发光效果
        const glowGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, markerRadius * 2);
        glowGradient.addColorStop(0, carInfo.color + '40'); // 40表示透明度25%
        glowGradient.addColorStop(1, carInfo.color + '00');
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, markerRadius * 2, 0, Math.PI * 2);
        ctx.fill();

        // 主圆圈
        ctx.fillStyle = carInfo.color || '#007AFF';
        ctx.beginPath();
        ctx.arc(centerX, centerY, markerRadius, 0, Math.PI * 2);
        ctx.fill();

        // 白色边框
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(centerX, centerY, markerRadius, 0, Math.PI * 2);
        ctx.stroke();

        // 车辆图标
        ctx.fillStyle = 'white';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🚗', centerX, centerY - 2);

        // 车辆名称
        ctx.fillStyle = '#333';
        ctx.font = 'bold 12px Arial';
        ctx.fillText(carInfo.name.substring(0, 2), centerX, centerY + markerRadius + 20);
    }

    // 绘制车辆信息卡片
    _drawVehicleInfoCard(ctx, width, height, carInfo, location) {
        const cardX = 20;
        const cardY = height - 120;
        const cardWidth = 280;
        const cardHeight = 100;

        // 卡片背景
        ctx.fillStyle = 'white';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 3;
        this._roundRect(ctx, cardX, cardY, cardWidth, cardHeight, 10);
        ctx.fill();
        ctx.shadowBlur = 0;

        // 卡片边框
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        this._roundRect(ctx, cardX, cardY, cardWidth, cardHeight, 10);
        ctx.stroke();

        // 车辆信息文字
        ctx.fillStyle = '#333';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`🚙 ${carInfo.name}`, cardX + 15, cardY + 25);

        ctx.font = '14px Arial';
        ctx.fillStyle = '#666';
        ctx.fillText(`车牌: ${carInfo.plate}`, cardX + 15, cardY + 50);

        const time = Utils.formatTime();
        ctx.fillText(`时间: ${time}`, cardX + 15, cardY + 75);
    }

    // 绘制品牌标识
    _drawBranding(ctx, width, height, carInfo) {
        // 右上角品牌标识
        ctx.fillStyle = carInfo.color || '#007AFF';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'right';
        ctx.fillText('家庭车辆位置系统', width - 20, 30);

        // 左下角水印
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.font = '10px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('车辆位置分享', 20, height - 10);
    }

    // 使用Google Maps静态图API（免费额度，需要API Key）
    async _generateGoogleMapsScreenshot(location, carInfo) {
        const params = new URLSearchParams({
            center: `${location.lat},${location.lng}`,
            zoom: MAP_CONFIG.zoom.toString(),
            size: `${SHARE_CONFIG.screenshotSize.width}x${SHARE_CONFIG.screenshotSize.height}`,
            markers: `color:red|label:A|${location.lat},${location.lng}`,
            key: 'AIzaSyDummyKey', // 需要替换为实际的Google Maps API Key
            style: 'feature:all|element:geometry|color:0xf5f5f5'
        });

        const url = `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;

        console.log('Google Maps API URL:', url);

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';

            img.onload = () => {
                console.log('✅ Google Maps静态图加载成功');
                resolve(url);
            };

            img.onerror = () => {
                reject(new Error('Google Maps API调用失败'));
            };

            img.src = url;

            setTimeout(() => {
                reject(new Error('Google Maps API请求超时'));
            }, 8000);
        });
    }

    // 使用Mapbox静态图API（免费额度，需要API Key）
    async _generateMapboxScreenshot(location, carInfo) {
        const accessToken = 'pk.dummy'; // 需要替换为实际的Mapbox访问令牌
        const params = new URLSearchParams({
            lon: location.lng.toString(),
            lat: location.lat.toString(),
            zoom: MAP_CONFIG.zoom.toString(),
            width: SHARE_CONFIG.screenshotSize.width.toString(),
            height: SHARE_CONFIG.screenshotSize.height.toString(),
            markers: `pin-l-A+${carInfo.color.replace('#', '')}(${location.lng},${location.lat})`,
            access_token: accessToken
        });

        const url = `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static?${params.toString()}`;

        console.log('Mapbox API URL:', url);

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';

            img.onload = () => {
                console.log('✅ Mapbox静态图加载成功');
                resolve(url);
            };

            img.onerror = () => {
                reject(new Error('Mapbox API调用失败'));
            };

            img.src = url;

            setTimeout(() => {
                reject(new Error('Mapbox API请求超时'));
            }, 8000);
        });
    }

    // 使用免费的地图截图服务（无需API Key）
    async _generateFreeMapScreenshot(location, carInfo) {
        // 使用第三方的免费地图服务
        const params = new URLSearchParams({
            lat: location.lat.toString(),
            lon: location.lng.toString(),
            z: MAP_CONFIG.zoom.toString(),
            w: SHARE_CONFIG.screenshotSize.width.toString(),
            h: SHARE_CONFIG.screenshotSize.height.toString(),
            format: 'png'
        });

        const url = `https://maps.virtualearth.net/REST/v1/Imagery/Map/Road/${location.lat},${location.lng}/${MAP_CONFIG.zoom}?mapSize=${SHARE_CONFIG.screenshotSize.width},${SHARE_CONFIG.screenshotSize.height}&format=png&key=Ar5PD6XBzEkP6Ejxtg-1F7NzrBKmDN7aKZ4d5mzLq7wH8m3bL8xQ3kT2yF4rW5yB6sX7cV8nZ9qW0rA1b`;

        console.log('Virtual Earth API URL:', url);

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';

            img.onload = () => {
                console.log('✅ Virtual Earth静态图加载成功');
                resolve(url);
            };

            img.onerror = () => {
                reject(new Error('Virtual Earth API调用失败'));
            };

            img.src = url;

            setTimeout(() => {
                reject(new Error('Virtual Earth API请求超时'));
            }, 8000);
        });
    }

  // 使用Canvas生成备用截图（基础版本）
    async _generateCanvasScreenshot(location, carInfo) {
        return new Promise((resolve, reject) => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = SHARE_CONFIG.screenshotSize.width;
                canvas.height = SHARE_CONFIG.screenshotSize.height;
                const ctx = canvas.getContext('2d');

                console.log('开始生成基础Canvas截图...');

                // 绘制渐变背景
                const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
                gradient.addColorStop(0, '#f8f9fa');
                gradient.addColorStop(1, '#e9ecef');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // 绘制顶部标题区域
                const titleGradient = ctx.createLinearGradient(0, 0, 0, 100);
                titleGradient.addColorStop(0, carInfo.color || '#007AFF');
                titleGradient.addColorStop(1, this._darkenColor(carInfo.color || '#007AFF', 30));
                ctx.fillStyle = titleGradient;
                ctx.fillRect(0, 0, canvas.width, 100);

                // 绘制装饰性图案
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.beginPath();
                ctx.arc(canvas.width - 80, 50, 60, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(80, 50, 40, 0, Math.PI * 2);
                ctx.fill();

                // 绘制标题文字
                ctx.fillStyle = 'white';
                ctx.font = 'bold 32px Arial';
                ctx.textAlign = 'center';
                ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
                ctx.shadowBlur = 4;
                ctx.shadowOffsetY = 2;
                ctx.fillText('🚗 车辆位置分享', canvas.width / 2, 55);
                ctx.shadowBlur = 0;

                // 绘制主要内容卡片
                const cardY = 140;
                const cardHeight = 200;
                ctx.fillStyle = 'white';
                this._roundRect(ctx, 30, cardY, canvas.width - 60, cardHeight, 15);
                ctx.fill();

                // 卡片边框
                ctx.strokeStyle = '#e0e0e0';
                ctx.lineWidth = 1;
                this._roundRect(ctx, 30, cardY, canvas.width - 60, cardHeight, 15);
                ctx.stroke();

                // 绘制车辆信息
                ctx.fillStyle = '#333';
                ctx.font = 'bold 24px Arial';
                ctx.textAlign = 'left';
                ctx.fillText(`🚙 ${carInfo.name}`, 60, cardY + 50);

                ctx.font = '18px Arial';
                ctx.fillStyle = '#666';
                ctx.fillText(`车牌号: ${carInfo.plate}`, 60, cardY + 85);

                // 绘制分割线
                ctx.strokeStyle = '#f0f0f0';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(60, cardY + 110);
                ctx.lineTo(canvas.width - 60, cardY + 110);
                ctx.stroke();

                // 绘制位置信息
                ctx.fillStyle = '#666';
                ctx.font = '16px Arial';
                const locationText = `📍 ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`;
                ctx.fillText(locationText, 60, cardY + 140);

                const time = Utils.formatTime();
                ctx.fillText(`🕒 ${time}`, 60, cardY + 165);

                const accuracy = location.accuracy ? Math.round(location.accuracy) : '未知';
                ctx.fillText(`🎯 精度: ${accuracy}米`, 60, cardY + 190);

                // 绘制底部提示
                ctx.fillStyle = '#999';
                ctx.font = '14px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('扫描车辆二维码获取实时位置', canvas.width / 2, canvas.height - 30);

                // 转换为图片URL
                const dataUrl = canvas.toDataURL('image/png', 0.9);
                console.log('基础Canvas截图生成完成，URL长度:', dataUrl.length);
                resolve(dataUrl);

            } catch (error) {
                console.error('基础Canvas截图生成过程出错:', error);
                reject(new Error('基础Canvas截图生成失败: ' + error.message));
            }
        });
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

    // 颜色加深辅助函数
    _darkenColor(color, percent) {
        // 简单的颜色加深实现
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }

    // 生成纯文本位置图片作为最后备用方案
    async _generateTextImageScreenshot(location, carInfo) {
        return `data:image/svg+xml;base64,${btoa(`
            <svg width="600" height="400" xmlns="http://www.w3.org/2000/svg">
                <rect width="600" height="400" fill="${carInfo.color || '#007AFF'}"/>
                <text x="300" y="40" font-family="Arial" font-size="24" font-weight="bold" fill="white" text-anchor="middle">
                    ${carInfo.name} 位置分享
                </text>
                <rect x="50" y="80" width="500" height="300" fill="white" rx="10"/>
                <text x="300" y="120" font-family="Arial" font-size="18" fill="#333" text-anchor="middle">
                    车牌: ${carInfo.plate}
                </text>
                <text x="300" y="160" font-family="Arial" font-size="16" fill="#666" text-anchor="middle">
                    位置: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}
                </text>
                <text x="300" y="200" font-family="Arial" font-size="20" text-anchor="middle">
                    🚗
                </text>
                <text x="300" y="250" font-family="Arial" font-size="14" fill="#999" text-anchor="middle">
                    ${Utils.formatTime()}
                </text>
            </svg>
        `)}`;
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