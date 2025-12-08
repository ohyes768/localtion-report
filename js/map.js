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
    }

    // 初始化地图
    async initializeMap(container, center, zoom = MAP_CONFIG.zoom) {
        if (this.map) {
            this.destroy();
        }

        return new Promise((resolve, reject) => {
            // 检查腾讯地图API是否已加载
            if (typeof TMap === 'undefined') {
                // 动态加载地图API
                this._loadMapAPI().then(() => {
                    this._doInitializeMap(container, center, zoom, resolve, reject);
                }).catch(reject);
            } else {
                this._doInitializeMap(container, center, zoom, resolve, reject);
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
            this.map = new TMap.Map(container, {
                center: new TMap.LatLng(center.lat, center.lng),
                zoom: zoom,
                mapTypeId: TMap.MapTypeId.ROADMAP,
                pitch: 0,
                rotation: 0,
                showControl: false
            });

            // 监听地图加载完成事件
            this.map.on('idle', () => {
                this.isMapLoaded = true;
                if (APP_CONFIG.debug) {
                    console.log('地图加载完成');
                }
                resolve();
            });

            // 监听地图点击事件
            this.map.on('click', (evt) => {
                if (APP_CONFIG.debug) {
                    console.log('地图点击:', evt.latLng);
                }
            });

        } catch (error) {
            reject(new Error('地图初始化失败: ' + error.message));
        }
    }

    // 添加车辆标记
    addMarker(location, carInfo) {
        if (!this.map || !location) {
            return;
        }

        // 移除旧标记
        if (this.marker) {
            this.marker.setMap(null);
        }

        // 创建新标记
        this.marker = new TMap.Marker({
            map: this.map,
            position: new TMap.LatLng(location.lat, location.lng),
            content: this.createMarkerContent(carInfo),
            zIndex: 1000
        });

        // 添加点击事件
        this.marker.on('click', () => {
            this.showInfoWindow(carInfo, location);
        });

        // 添加动画效果
        this._animateMarker();
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
        if (cachedUrl && !Utils.storage.isPositionStale(cachedUrl.timestamp, CACHE_CONFIG.screenshotCacheTime)) {
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

    // 逆地理编码获取地址
    async getAddressFromLocation(location) {
        if (!location) {
            return '位置未知';
        }

        const cacheKey = `${location.lat.toFixed(4)}_${location.lng.toFixed(4)}`;

        // 检查缓存
        if (this.addressCache.has(cacheKey)) {
            const cached = this.addressCache.get(cacheKey);
            if (!Utils.storage.isPositionStale(cached.timestamp, CACHE_CONFIG.addressCacheTime)) {
                if (APP_CONFIG.debug) {
                    console.log('使用缓存的地址:', cached.address);
                }
                return cached.address;
            }
        }

        try {
            const params = new URLSearchParams({
                location: `${location.lat},${location.lng}`,
                key: MAP_CONFIG.key,
                get_poi: 1
            });

            const url = `${API_CONFIG.tencentMap.geocoder}?${params.toString()}`;

            const data = await Utils.request(url, {
                timeout: API_CONFIG.timeout
            });

            if (data.status === 0 && data.result) {
                const address = data.result.address || '位置未知';

                // 缓存结果
                this.addressCache.set(cacheKey, {
                    address: address,
                    timestamp: Date.now()
                });

                if (APP_CONFIG.debug) {
                    console.log('获取到新地址:', address);
                }

                return address;
            } else {
                throw new Error(data.message || '地址解析失败');
            }

        } catch (error) {
            Utils.logError(error, {
                type: 'geocoding',
                location: location
            });
            return '地址解析失败';
        }
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