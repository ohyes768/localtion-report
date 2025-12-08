// 定位相关功能
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
            if (!navigator.geolocation) {
                reject(new Error('您的浏览器不支持定位功能'));
                return;
            }

            // 检查定位频率限制
            const now = Date.now();
            if (now - this.lastPositionTime < this.minPositionInterval &&
                this.currentPosition &&
                !options.force) {
                resolve(this.currentPosition);
                return;
            }

            const defaultOptions = {
                enableHighAccuracy: true,
                timeout: APP_CONFIG.locationTimeout,
                maximumAge: options.force ? 0 : 10000 // 强制定位时不使用缓存
            };

            const finalOptions = { ...defaultOptions, ...options };

            if (APP_CONFIG.debug) {
                console.log('开始定位，选项:', finalOptions);
            }

            const startTime = Date.now();

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const duration = Date.now() - startTime;
                    const location = this._processPosition(position);

                    this.currentPosition = location;
                    this.lastPositionTime = now;

                    // 缓存位置信息
                    Utils.storage.set('last_position', location, CACHE_CONFIG.locationCacheTime);

                    if (APP_CONFIG.debug) {
                        console.log('定位成功:', location, `耗时: ${duration}ms`);
                    }

                    this.notifyCallbacks(location);
                    resolve(location);
                },
                (error) => {
                    const duration = Date.now() - startTime;
                    const errorMessage = this._handleGeolocationError(error);

                    Utils.logError(error, {
                        type: 'geolocation',
                        duration: duration,
                        options: finalOptions
                    });

                    reject(new Error(errorMessage));
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
            timestamp: position.timestamp || Date.now()
        };

        // 添加精度级别描述
        location.accuracyLevel = this.getAccuracyDescription(location.accuracy);

        // 添加位置质量评分
        location.quality = this._calculateLocationQuality(location);

        return location;
    }

    // 计算位置质量评分
    _calculateLocationQuality(location) {
        let score = 100;

        // 精度扣分
        if (location.accuracy > 10) {
            score -= Math.min(50, (location.accuracy - 10) / 4);
        }

        // 速度扣分（如果速度异常）
        if (location.speed !== null && location.speed > 50) { // 50m/s = 180km/h
            score -= 30;
        }

        // 时间戳检查
        const age = Date.now() - location.timestamp;
        if (age > 30000) { // 超过30秒
            score -= Math.min(20, age / 3000);
        }

        return Math.max(0, Math.round(score));
    }

    // 处理定位错误
    _handleGeolocationError(error) {
        let errorMessage;
        switch(error.code) {
            case error.PERMISSION_DENIED:
                errorMessage = ERROR_MESSAGES.PERMISSION_DENIED;
                break;
            case error.POSITION_UNAVAILABLE:
                errorMessage = ERROR_MESSAGES.POSITION_UNAVAILABLE;
                break;
            case error.TIMEOUT:
                errorMessage = ERROR_MESSAGES.TIMEOUT;
                break;
            default:
                errorMessage = '获取位置失败：' + error.message;
        }

        return errorMessage;
    }

    // 开始监听位置变化
    watchPosition(callback, options = {}) {
        if (!navigator.geolocation) {
            throw new Error('您的浏览器不支持定位功能');
        }

        if (this.isWatching && !options.force) {
            // 如果已经在监听，添加回调即可
            this.callbacks.push(callback);
            return;
        }

        this.callbacks.push(callback);

        const defaultOptions = {
            enableHighAccuracy: true,
            timeout: APP_CONFIG.locationTimeout,
            maximumAge: 5000
        };

        const finalOptions = { ...defaultOptions, ...options };

        if (APP_CONFIG.debug) {
            console.log('开始位置监听，选项:', finalOptions);
        }

        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
                const location = this._processPosition(position);
                this.currentPosition = location;
                this.lastPositionTime = Date.now();

                if (APP_CONFIG.debug) {
                    console.log('位置更新:', location);
                }

                this.notifyCallbacks(location);
            },
            (error) => {
                console.error('定位监听错误:', error);

                // 对于监听模式，不抛出异常，只记录日志
                Utils.logError(error, {
                    type: 'geolocation_watch',
                    options: finalOptions
                });
            },
            finalOptions
        );

        this.isWatching = true;

        // 定期清理无效的回调
        this._cleanupCallbacks();
    }

    // 停止监听位置变化
    stopWatching() {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
            this.isWatching = false;

            if (APP_CONFIG.debug) {
                console.log('停止位置监听');
            }
        }

        this.callbacks = [];
    }

    // 清理无效的回调
    _cleanupCallbacks() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }

        this.cleanupTimer = setInterval(() => {
            this.callbacks = this.callbacks.filter(callback => {
                try {
                    // 测试回调是否有效
                    callback.toString();
                    return true;
                } catch (error) {
                    return false;
                }
            });
        }, 60000); // 每分钟清理一次
    }

    // 通知所有回调
    notifyCallbacks(location) {
        this.callbacks.forEach(callback => {
            try {
                callback(location);
            } catch (error) {
                console.error('定位回调错误:', error);
                Utils.logError(error, {
                    type: 'location_callback',
                    location: location
                });
            }
        });
    }

    // 获取定位精度描述
    getAccuracyDescription(accuracy) {
        if (accuracy < 10) {
            return '极高精度';
        } else if (accuracy < 30) {
            return '高精度';
        } else if (accuracy < 100) {
            return '中等精度';
        } else if (accuracy < 500) {
            return '低精度';
        } else {
            return '极低精度';
        }
    }

    // 检查定位权限
    async checkLocationPermission() {
        if ('permissions' in navigator) {
            try {
                const result = await navigator.permissions.query({ name: 'geolocation' });
                return result.state;
            } catch (error) {
                console.warn('权限检查失败:', error);
                return 'unknown';
            }
        } else {
            return 'unknown';
        }
    }

    // 请求定位权限
    async requestLocationPermission() {
        try {
            // 尝试获取位置以触发权限请求
            await this.getCurrentPosition({ timeout: 1000 });
            return 'granted';
        } catch (error) {
            if (error.message.includes('permission') || error.message.includes('允许')) {
                return 'denied';
            }
            return 'prompt';
        }
    }

    // 获取缓存的最后位置
    getLastPosition() {
        if (this.currentPosition) {
            return this.currentPosition;
        }

        // 从本地存储读取
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

        // 检查经纬度范围
        if (position.lat < -90 || position.lat > 90 ||
            position.lng < -180 || position.lng > 180) {
            return false;
        }

        // 检查精度是否合理
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
            speed: position.speed ? Math.round(position.speed * 3.6) : null, // 转换为km/h
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

        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }

        this.currentPosition = null;
        this.callbacks = [];

        if (APP_CONFIG.debug) {
            console.log('定位管理器已销毁');
        }
    }
}