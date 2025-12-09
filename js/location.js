// 定位相关功能 - 简化版本
class LocationManager {
    constructor() {
        this.currentPosition = null;
        this.watchId = null;
        this.callbacks = [];
        this.isWatching = false;
        // 移除缓存相关配置，强制每次都获取最新位置
    }

    // 获取当前位置
    getCurrentPosition(options = {}) {
        return new Promise((resolve, reject) => {
            const finalOptions = {
                enableHighAccuracy: true,
                timeout: 20000,
                maximumAge: 0, // 强制不使用缓存位置
                ...options
            };

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const location = this._processPosition(position);
                    this.currentPosition = location;
                    this.notifyCallbacks(location);
                    resolve(location);
                },
                (error) => {
                    // 直接使用默认位置，不再使用缓存
                    console.warn('定位失败，使用默认位置');
                    const defaultLocation = this._createDefaultLocation();
                    resolve(defaultLocation);
                },
                finalOptions
            );
        });
    }

    // 处理定位结果
    _processPosition(position) {
        const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: position.timestamp || Date.now(),
            provider: '浏览器GPS',
            accuracyLevel: this.getAccuracyDescription(position.coords.accuracy),
            quality: this._calculateLocationQuality({
                accuracy: position.coords.accuracy,
                speed: position.coords.speed,
                timestamp: position.timestamp || Date.now()
            })
        };

        return location;
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

    // 获取当前位置
    getLastPosition() {
        return this.currentPosition;
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

    // 清除所有位置缓存
    clearAllCache() {
        // 清除本地存储中的位置缓存
        Utils.storage.remove('last_position');

        // 清除地址缓存
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('address_')) {
                Utils.storage.remove(key);
            }
        });

        // 清除分享页面缓存
        const shareKeys = keys.filter(key => key.startsWith('sharepage_'));
        shareKeys.forEach(key => {
            Utils.storage.remove(key);
        });

        console.log('✅ 已清除所有位置和地址缓存');
    }

    // 销毁定位管理器
    destroy() {
        this.stopWatching();
        this.currentPosition = null;
        this.callbacks = [];
    }
}