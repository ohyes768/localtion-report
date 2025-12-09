// 定位相关功能 - 简化版本
class LocationManager {
    constructor() {
        this.currentPosition = null;
        this.watchId = null;
        this.callbacks = [];
        this.isWatching = false;
        this.lastPositionTime = 0;
        this.minPositionInterval = 5000; // 最小定位间隔5秒
    }

    // 获取当前位置
    getCurrentPosition(options = {}) {
        return new Promise((resolve, reject) => {
            // 检查定位频率限制
            const now = Date.now();
            if (now - this.lastPositionTime < this.minPositionInterval &&
                this.currentPosition &&
                !options.force) {
                resolve(this.currentPosition);
                return;
            }

            const finalOptions = {
                enableHighAccuracy: true,
                timeout: 20000,
                maximumAge: 0,
                ...options
            };

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const location = this._processPosition(position);
                    this.currentPosition = location;
                    this.lastPositionTime = Date.now();

                    // 缓存位置信息
                    Utils.storage.set('last_position', location, CACHE_CONFIG.locationCacheTime);

                    this.notifyCallbacks(location);
                    resolve(location);
                },
                (error) => {
                    // 使用缓存位置或默认位置
                    const cachedPosition = this._getCachedPosition();
                    if (cachedPosition && !options.force) {
                        console.log('使用缓存位置');
                        resolve(cachedPosition);
                    } else {
                        console.warn('定位失败，使用默认位置');
                        const defaultLocation = this._createDefaultLocation();
                        resolve(defaultLocation);
                    }
                },
                finalOptions
            );
        });
    }

    // 处理定位结果
    _processPosition(position) {
        const wgsLat = position.coords.latitude;
        const wgsLng = position.coords.longitude;

        // 坐标系转换：WGS-84 -> GCJ-02 (腾讯地图使用火星坐标系)
        const gcjCoords = this.wgs84ToGcj02(wgsLat, wgsLng);
        const gcjLat = gcjCoords.lat;
        const gcjLng = gcjCoords.lng;

        // 计算坐标偏移距离
        const offsetDistance = this.calculateDistance(wgsLat, wgsLng, gcjLat, gcjLng);

        // 检测浏览器类型
        const isWechat = /MicroMessenger/.test(navigator.userAgent);
        const browserName = isWechat ? '微信浏览器' : '浏览器';

        const location = {
            lat: gcjLat,                    // 使用转换后的GCJ-02坐标
            lng: gcjLng,                    // 使用转换后的GCJ-02坐标
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: position.timestamp || Date.now(),
            provider: `${browserName}GPS (坐标系已校正，偏移${offsetDistance.toFixed(0)}m)`,
            accuracyLevel: this.getAccuracyDescription(position.coords.accuracy),
            quality: this._calculateLocationQuality({
                accuracy: position.coords.accuracy,
                speed: position.coords.speed,
                timestamp: position.timestamp || Date.now()
            }),
            // 添加调试信息
            originalCoords: { lat: wgsLat, lng: wgsLng },
            convertedCoords: { lat: gcjLat, lng: gcjLng },
            offsetDistance: offsetDistance
        };

        // 调试信息
        if (APP_CONFIG.debug) {
            console.log('📡 坐标转换:', {
                original: `${wgsLat.toFixed(6)}, ${wgsLng.toFixed(6)} (WGS-84)`,
                converted: `${gcjLat.toFixed(6)}, ${gcjLng.toFixed(6)} (GCJ-02)`,
                offset: `${offsetDistance.toFixed(1)}m`,
                browser: browserName
            });
        }

        return location;
    }

    // WGS-84 到 GCJ-02 坐标转换
    wgs84ToGcj02(wgsLat, wgsLng) {
        if (this.outOfChina(wgsLat, wgsLng)) {
            return { lat: wgsLat, lng: wgsLng };
        }

        let dLat = this.transformLat(wgsLng - 105.0, wgsLat - 35.0);
        let dLng = this.transformLng(wgsLng - 105.0, wgsLat - 35.0);
        const radLat = (wgsLat / 180.0) * Math.PI;
        let magic = Math.sin(radLat);
        magic = 1 - 0.00669342162296594323 * magic * magic;
        const sqrtMagic = Math.sqrt(magic);
        dLat = (dLat * 180.0) / ((6378245.0 * (1 - 0.00669342162296594323)) / (magic * sqrtMagic) * Math.PI);
        dLng = (dLng * 180.0) / (6378245.0 / sqrtMagic * Math.cos(radLat) * Math.PI);

        return {
            lat: wgsLat + dLat,
            lng: wgsLng + dLng
        };
    }

    // 转换算法核心函数
    transformLat(x, y) {
        let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
        ret += (20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0 / 3.0;
        ret += (20.0 * Math.sin(y * Math.PI) + 40.0 * Math.sin(y / 3.0 * Math.PI)) * 2.0 / 3.0;
        ret += (160.0 * Math.sin(y / 12.0 * Math.PI) + 320 * Math.sin(y * Math.PI / 30.0)) * 2.0 / 3.0;
        return ret;
    }

    transformLng(x, y) {
        let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
        ret += (20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0 / 3.0;
        ret += (20.0 * Math.sin(x * Math.PI) + 40.0 * Math.sin(x / 3.0 * Math.PI)) * 2.0 / 3.0;
        ret += (150.0 * Math.sin(x / 12.0 * Math.PI) + 300.0 * Math.sin(x / 30.0 * Math.PI)) * 2.0 / 3.0;
        return ret;
    }

    // 判断是否在中国境外
    outOfChina(lat, lng) {
        return (lng < 72.004 || lng > 137.8347) || ((lat < 0.8293 || lat > 55.8271) || false);
    }

    // 计算两点间距离（米）
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371000; // 地球半径（米）
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    // 创建默认位置
    _createDefaultLocation() {
        const defaultLocation = JSON.parse(JSON.stringify(MAP_CONFIG.defaultLocation));
        defaultLocation.timestamp = Date.now();
        defaultLocation.provider = '默认位置（测试）';
        defaultLocation.accuracyLevel = '模拟定位';
        defaultLocation.quality = 50;
        return defaultLocation;
    }

    // 获取缓存的最后位置
    _getCachedPosition() {
        if (this.currentPosition && !this.isPositionStale(this.currentPosition.timestamp, 300000)) {
            return this.currentPosition;
        }

        const cached = Utils.storage.get('last_position');
        if (cached && !this.isPositionStale(cached.timestamp, 300000)) {
            return cached;
        }

        return null;
    }

    // 计算位置质量评分
    _calculateLocationQuality(location) {
        let score = 100;

        if (location.accuracy > 10) {
            score -= Math.min(50, (location.accuracy - 10) / 4);
        }

        if (location.speed !== null && location.speed > 50) {
            score -= 30;
        }

        const age = Date.now() - location.timestamp;
        if (age > 30000) {
            score -= Math.min(20, age / 3000);
        }

        return Math.max(0, Math.round(score));
    }

    // 开始监听位置变化
    watchPosition(callback, options = {}) {
        if (!navigator.geolocation) {
            throw new Error('您的浏览器不支持定位功能');
        }

        if (this.isWatching && !options.force) {
            this.callbacks.push(callback);
            return;
        }

        this.callbacks.push(callback);

        const finalOptions = {
            enableHighAccuracy: true,
            timeout: APP_CONFIG.locationTimeout,
            maximumAge: 5000,
            ...options
        };

        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
                const location = this._processPosition(position);
                this.currentPosition = location;
                this.lastPositionTime = Date.now();
                this.notifyCallbacks(location);
            },
            (error) => {
                console.error('定位监听错误:', error);
            },
            finalOptions
        );

        this.isWatching = true;
    }

    // 停止监听位置变化
    stopWatching() {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
            this.isWatching = false;
        }

        this.callbacks = [];
    }

    // 通知所有回调
    notifyCallbacks(location) {
        this.callbacks.forEach(callback => {
            try {
                callback(location);
            } catch (error) {
                console.error('定位回调错误:', error);
            }
        });
    }

    // 获取定位精度描述
    getAccuracyDescription(accuracy) {
        if (accuracy < 10) return '极高精度';
        if (accuracy < 30) return '高精度';
        if (accuracy < 100) return '中等精度';
        if (accuracy < 500) return '低精度';
        return '极低精度';
    }

    // 获取缓存的最后位置
    getLastPosition() {
        if (this.currentPosition) {
            return this.currentPosition;
        }
        return Utils.storage.get('last_position');
    }

    // 检查位置是否过时
    isPositionStale(timestamp, maxAge = CACHE_CONFIG.locationCacheTime) {
        return (Date.now() - timestamp) > maxAge;
    }

    // 计算两点间距离
    static calculateDistance(lat1, lng1, lat2, lng2) {
        return Utils.calculateDistance(lat1, lng1, lat2, lng2);
    }

    // 检查位置是否有效
    static isValidPosition(position) {
        if (!position || typeof position.lat !== 'number' || typeof position.lng !== 'number') {
            return false;
        }

        if (position.lat < -90 || position.lat > 90 ||
            position.lng < -180 || position.lng > 180) {
            return false;
        }

        if (position.accuracy && (position.accuracy < 0 || position.accuracy > 10000)) {
            return false;
        }

        return true;
    }

    // 格式化位置信息
    static formatLocation(position) {
        return {
            latitude: Utils.formatCoordinate(position.lat, 6),
            longitude: Utils.formatCoordinate(position.lng, 6),
            accuracy: Math.round(position.accuracy || 0),
            altitude: position.altitude ? Math.round(position.altitude) : null,
            speed: position.speed ? Math.round(position.speed * 3.6) : null,
            heading: position.heading ? Math.round(position.heading) : null,
            time: Utils.formatTime(new Date(position.timestamp || Date.now()))
        };
    }

    // 获取定位状态
    getStatus() {
        return {
            isWatching: this.isWatching,
            hasPosition: !!this.currentPosition,
            lastUpdate: this.currentPosition ? this.currentPosition.timestamp : null,
            watchId: this.watchId,
            callbackCount: this.callbacks.length
        };
    }

    // 销毁定位管理器
    destroy() {
        this.stopWatching();
        this.currentPosition = null;
        this.callbacks = [];
        this.lastPositionTime = 0;
    }
}