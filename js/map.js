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

    // 生成地图分享页面（移除截图功能）
    async generateSharePage(location, carInfo) {
        if (!location) {
            throw new Error('无法生成分享页面：位置信息为空');
        }

        console.log('🎯 生成腾讯位置服务分享页面');
        console.log('位置:', location);
        console.log('车辆信息:', carInfo);

        const cacheKey = `${location.lat}_${location.lng}_${MAP_CONFIG.zoom}`;

        // 检查缓存
        const cachedUrl = Utils.storage.get(`sharepage_${cacheKey}`);
        if (cachedUrl && !this._isPositionStale(cachedUrl.timestamp, CACHE_CONFIG.screenshotCacheTime)) {
            if (APP_CONFIG.debug) {
                console.log('使用缓存的分享页面:', cachedUrl.url);
            }
            return cachedUrl.url;
        }

        try {
            // 生成腾讯地图分享页面
            const sharePageUrl = await this._generateTencentSharePage(location, carInfo);

            const cacheData = {
                url: sharePageUrl,
                timestamp: Date.now(),
                source: '自定义纯净地图分享页面'
            };
            Utils.storage.set(`sharepage_${cacheKey}`, cacheData, CACHE_CONFIG.screenshotCacheTime);

            console.log('✅ 自定义纯净地图分享页面生成成功');
            return sharePageUrl;

        } catch (error) {
            console.error('❌ 分享页面生成失败:', error.message);
            throw new Error('分享页面生成失败：' + error.message);
        }
    }

    // 生成自定义地图分享页面（纯净无侧边栏）
    async _generateTencentSharePage(location, carInfo) {
        console.log('🗺️ 生成自定义纯净地图分享页面...');

        // 获取地址信息
        let address = '位置获取中...';
        try {
            address = await this.getAddressFromLocation(location);
        } catch (error) {
            console.warn('获取地址失败，使用坐标显示:', error);
            address = `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`;
        }

        // 生成自定义地图页面URL（纯净无侧边栏）
        const customMapUrl = this._generateCustomMapUrl(location, carInfo, address);

        console.log('✅ 自定义地图URL生成成功:', customMapUrl);
        return customMapUrl;
    }

    // 生成自定义地图页面URL（纯净无侧边栏）
    _generateCustomMapUrl(location, carInfo, address) {
        // 构建自定义地图页面的URL参数
        const params = new URLSearchParams({
            lat: location.lat.toFixed(6),
            lng: location.lng.toFixed(6),
            name: carInfo.name,
            plate: carInfo.plate || '',
            address: address || '位置信息',
            color: carInfo.color || '#007AFF',
            time: Utils.formatTime(new Date(location.timestamp || Date.now()))
        });

        // 返回自定义地图页面URL
        return `share-map.html?${params.toString()}`;
    }

    // 生成腾讯地图标记页面URL（用于iframe嵌入）- 保留备用
    _generateTencentMarkerUrl(location, carInfo, address) {
        // 使用腾讯地图API生成标记页面
        const params = new URLSearchParams({
            marker: `coord:${location.lat},${location.lng};title:${carInfo.name};addr:${address}`,
            key: MAP_CONFIG.key,
            referer: window.location.hostname
        });

        // 使用腾讯地图URI API，这个可以在iframe中显示
        return `https://apis.map.qq.com/uri/v1/marker?${params.toString()}`;
    }

    // 生成腾讯地图链接（保留用于其他用途）
    _generateTencentMapUrl(location, carInfo, address) {
        const params = new URLSearchParams({
            center: `${location.lat},${location.lng}`,
            zoom: MAP_CONFIG.zoom,
            marker: `color:red|label:${carInfo.name.substring(0, 2)}|${location.lat},${location.lng}`,
            referer: window.location.hostname
        });

        return `https://map.qq.com/?${params.toString()}`;
    }

  

    // 使用腾讯地图静态图API生成截图
    async _generateStaticMapScreenshot(location, carInfo) {
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

        try {
            // 直接返回URL，因为已验证小尺寸API可用
            return await this._createEnhancedScreenshot(staticMapUrl, location, carInfo);
        } catch (error) {
            throw new Error('静态地图API调用失败: ' + error.message);
        }
    }

  
    // 创建增强版截图（生成包含车辆信息的真实图片）
    async _createEnhancedScreenshot(baseMapUrl, location, carInfo) {
        console.log('🎨 生成真实图片，包含车辆标识...');

        // 先获取腾讯地图图片
        const mapImage = await this._loadImageElement(baseMapUrl);

        // 创建最终画布
        const canvas = document.createElement('canvas');
        canvas.width = 600;  // 最终分享图片宽度
        canvas.height = 400; // 最终分享图片高度
        const ctx = canvas.getContext('2d');

        // 1. 绘制背景
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 2. 绘制腾讯地图（居中）
        const mapWidth = 300;
        const mapHeight = 200;
        const mapX = (canvas.width - mapWidth) / 2;
        const mapY = 60;

        ctx.drawImage(mapImage, mapX, mapY, mapWidth, mapHeight);

        // 3. 添加地图边框
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;
        ctx.strokeRect(mapX, mapY, mapWidth, mapHeight);

        // 4. 在地图中心绘制车辆标记
        const centerX = canvas.width / 2;
        const centerY = mapY + mapHeight / 2;
        this._drawVehicleMarker(ctx, centerX, centerY, carInfo);

        // 5. 绘制标题
        this._drawTitle(ctx, canvas.width, carInfo);

        // 6. 绘制车辆信息卡片
        this._drawInfoCard(ctx, canvas.width, canvas.height, carInfo, location);

        // 转换为图片URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        console.log('✅ 真实图片生成完成');
        return dataUrl;
    }

    // 加载图片元素（直接加载，利用腾讯地图的CORS支持）
    async _loadImageElement(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            // 设置跨域属性，腾讯地图API支持CORS
            img.crossOrigin = 'anonymous';

            const timeout = setTimeout(() => {
                reject(new Error('图片加载超时'));
            }, 10000);

            img.onload = () => {
                clearTimeout(timeout);
                console.log('✅ 图片加载成功（使用CORS）');
                resolve(img);
            };

            img.onerror = (e) => {
                clearTimeout(timeout);
                console.error('图片加载失败:', e);
                reject(new Error('图片加载失败 - 可能是跨域问题'));
            };

            // 为了避免缓存污染，添加时间戳
            const separator = url.includes('?') ? '&' : '?';
            img.src = `${url}${separator}t=${Date.now()}`;
        });
    }

    // 创建HTML分享页面（备用方案）
    _createHTMLSharePage(baseMapUrl, location, carInfo) {
        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>📍 车辆位置分享</title>
            <style>
                body {
                    margin: 0;
                    padding: 20px;
                    font-family: Arial, sans-serif;
                    background: #f8f9fa;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                }
                .share-container {
                    background: white;
                    border-radius: 10px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    padding: 20px;
                    max-width: 600px;
                    width: 100%;
                }
                .title {
                    text-align: center;
                    font-size: 18px;
                    font-weight: bold;
                    margin-bottom: 20px;
                    color: #333;
                }
                .map-container {
                    position: relative;
                    width: 300px;
                    height: 200px;
                    margin: 0 auto;
                    border: 1px solid #ddd;
                    border-radius: 5px;
                    overflow: hidden;
                }
                .map-image {
                    width: 100%;
                    height: 100%;
                }
                .vehicle-marker {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 24px;
                    height: 24px;
                    background: ${carInfo.color || '#FF0000'};
                    border-radius: 50%;
                    border: 3px solid white;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 14px;
                }
                .info-card {
                    margin-top: 20px;
                    padding: 15px;
                    background: #f8f9fa;
                    border-radius: 8px;
                }
                .info-item {
                    display: flex;
                    margin-bottom: 10px;
                }
                .info-label {
                    font-weight: bold;
                    margin-right: 10px;
                    color: #666;
                }
                .info-value {
                    color: #333;
                }
            </style>
        </head>
        <body>
            <div class="share-container">
                <div class="title">📍 车辆位置分享</div>
                <div class="map-container">
                    <img src="${baseMapUrl}" class="map-image" alt="地图">
                    <div class="vehicle-marker">🚗</div>
                </div>
                <div class="info-card">
                    <div class="info-item">
                        <span class="info-label">📍 位置:</span>
                        <span class="info-value">${location.address || '获取中...'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">🚗 车牌:</span>
                        <span class="info-value">${carInfo.plateNumber || '未知'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">⏰ 时间:</span>
                        <span class="info-value">${new Date().toLocaleString()}</span>
                    </div>
                </div>
            </div>
        </body>
        </html>
        `;

        // 将HTML转换为Data URL
        const blob = new Blob([htmlContent], { type: 'text/html' });
        return URL.createObjectURL(blob);
    }

    // 绘制车辆标记
    _drawVehicleMarker(ctx, x, y, carInfo) {
        // 外圈发光
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 25);
        gradient.addColorStop(0, carInfo.color + '60');
        gradient.addColorStop(1, carInfo.color + '00');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, 25, 0, Math.PI * 2);
        ctx.fill();

        // 主标记
        ctx.fillStyle = carInfo.color || '#FF0000';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 车辆图标
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🚗', x, y);
    }

    // 绘制标题
    _drawTitle(ctx, width, carInfo) {
        ctx.fillStyle = '#333';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('📍 车辆位置分享', width / 2, 30);
    }

    // 绘制信息卡片
    _drawInfoCard(ctx, width, height, carInfo, location) {
        const cardY = height - 100;
        const cardWidth = width - 40;
        const cardHeight = 80;

        // 卡片阴影
        ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
        ctx.shadowBlur = 5;
        ctx.shadowOffsetY = 2;

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
        ctx.fillText('🚙', 35, cardY + 35);

        // 车辆名称
        ctx.fillStyle = '#333';
        ctx.font = 'bold 16px Arial';
        ctx.fillText(carInfo.name, 65, cardY + 35);

        // 车牌号
        ctx.fillStyle = '#666';
        ctx.font = '14px Arial';
        ctx.fillText(`车牌: ${carInfo.plate}`, 35, cardY + 60);

        // 时间
        const time = new Date().toLocaleString('zh-CN', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        ctx.textAlign = 'right';
        ctx.fillStyle = '#999';
        ctx.font = '12px Arial';
        ctx.fillText(time, width - 35, cardY + 35);
    }

    // 绘制圆角矩形
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
            if (this.marker.setMap) {
                this.marker.setMap(null);
            } else if (this.marker.element && this.marker.element.parentNode) {
                this.marker.element.parentNode.removeChild(this.marker.element);
            }
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