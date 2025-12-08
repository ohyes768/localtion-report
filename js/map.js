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
            if (this.marker) {
                this.marker.setMap(null);
            }

            // 由于TMap.Marker在GL版本中不可用，直接使用备用方法
            console.log('使用DOMOverlay创建标记...');
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
            console.log('创建DOMOverlay标记...', carInfo);
            console.log('位置信息:', location);

            // 使用DOMOverlay作为主要方案
            const div = document.createElement('div');
            div.style.cssText = `
                width: 50px !important;
                height: 50px !important;
                background: ${carInfo.color || '#007AFF'} !important;
                border-radius: 50% !important;
                border: 3px solid white !important;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3), 0 0 20px rgba(0,0,0,0.2) !important;
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                justify-content: center !important;
                color: white !important;
                font-size: 20px !important;
                font-weight: bold !important;
                position: absolute !important;
                z-index: 10000 !important;
                cursor: pointer !important;
                user-select: none !important;
                transition: transform 0.2s ease !important;
                pointer-events: auto !important;
                opacity: 1 !important;
                visibility: visible !important;
            `;
            div.innerHTML = `
                <div style="font-size: 24px;">🚗</div>
                <div style="font-size: 8px; margin-top: -5px;">${carInfo.name.substring(0, 2)}</div>
            `;
            div.title = `${carInfo.name} (${carInfo.plate})`;

            // 添加悬停效果
            div.onmouseover = function() {
                this.style.transform = 'scale(1.1)';
            };
            div.onmouseout = function() {
                this.style.transform = 'scale(1)';
            };

            if (typeof TMap.DOMOverlay === 'function') {
                console.log('TMap.DOMOverlay可用，创建标记...');
                const marker = new TMap.DOMOverlay({
                    map: this.map,
                    position: new TMap.LatLng(location.lat, location.lng),
                    content: div,
                    zIndex: 10000,
                    altitude: 0,
                    visible: true
                });

                this.marker = marker;
                console.log('DOMOverlay标记创建成功:', marker);

                // 确保标记可见
                setTimeout(() => {
                    console.log('检查标记是否可见...');
                    if (marker.dom && marker.dom.parentNode) {
                        console.log('标记DOM已添加到页面');
                        console.log('标记DOM元素:', marker.dom);
                        console.log('标记元素样式:', window.getComputedStyle(marker.dom));
                        console.log('标记元素位置:', marker.dom.getBoundingClientRect());
                        console.log('标记元素可见性:', marker.dom.style.visibility);
                        console.log('标记元素显示:', marker.dom.style.display);
                        console.log('标记元素z-index:', marker.dom.style.zIndex);
                    } else {
                        console.warn('标记DOM可能未正确显示');
                        console.log('marker.dom:', marker.dom);
                        console.log('marker对象:', marker);
                    }
                }, 1000);

                // 强制重绘地图以确保标记可见
                setTimeout(() => {
                    if (this.map) {
                        console.log('触发地图重绘...');
                        this.map.panTo(this.map.getCenter());
                        this.map.setZoom(this.map.getZoom());
                    }
                }, 2000);

            } else {
                console.log('TMap.DOMOverlay不可用，使用备用方案');
                // 最后的备用方案：直接在地图中心显示信息
                this.setCenter(location);
                this.showCenterInfo(carInfo, location);
            }

        } catch (error) {
            console.error('DOMOverlay标记创建失败:', error);
            console.error('错误详情:', error.stack);
            // 最后的备用方案
            this.setCenter(location);
            this.showCenterInfo(carInfo, location);
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

        const cacheKey = `${location.lat}_${location.lng}_${MAP_CONFIG.zoom}`;

        // 检查缓存
        const cachedUrl = Utils.storage.get(`screenshot_${cacheKey}`);
        if (cachedUrl && !this._isPositionStale(cachedUrl.timestamp, CACHE_CONFIG.screenshotCacheTime)) {
            if (APP_CONFIG.debug) {
                console.log('使用缓存的地图截图');
            }
            return cachedUrl.url;
        }

        try {
            // 使用腾讯地图静态图API
            const params = new URLSearchParams({
                center: `${location.lat},${location.lng}`,
                zoom: MAP_CONFIG.zoom,
                size: `${SHARE_CONFIG.screenshotSize.width}x${SHARE_CONFIG.screenshotSize.height}`,
                maptype: SHARE_CONFIG.defaultMapType,
                markers: `size:large|color:red|label:${carInfo.name}|${location.lat},${location.lng}`,
                key: MAP_CONFIG.key,
                format: 'png'
            });

            const url = `${API_CONFIG.tencentMap.staticMap}?${params.toString()}`;

            // 缓存结果
            const cacheData = {
                url: url,
                timestamp: Date.now()
            };
            Utils.storage.set(`screenshot_${cacheKey}`, cacheData, CACHE_CONFIG.screenshotCacheTime);

            if (APP_CONFIG.debug) {
                console.log('生成新的地图截图:', url);
            }

            return url;

        } catch (error) {
            Utils.logError(error, {
                type: 'screenshot_generation',
                location: location
            });
            throw new Error('地图截图生成失败: ' + error.message);
        }
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

// 将样式添加到页面
if (!document.getElementById('map-styles')) {
    const styleElement = document.createElement('div');
    styleElement.id = 'map-styles';
    styleElement.innerHTML = customMarkerStyles;
    document.body.appendChild(styleElement);
}