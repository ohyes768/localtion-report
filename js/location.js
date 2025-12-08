// 定位相关功能 - 集成腾讯位置服务前端定位组件
class LocationManager {
    constructor() {
        this.currentPosition = null;
        this.watchId = null;
        this.tencentGeolocation = null; // 腾讯定位组件实例
        this.callbacks = [];
        this.isWatching = false;
        this.lastPositionTime = 0;
        this.minPositionInterval = 5000; // 最小定位间隔5秒
        this.useTencentLocation = false; // 是否使用腾讯定位组件
    }

    // 获取当前位置（集成腾讯定位组件）
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

            // 优先使用腾讯定位组件
            if (this.useTencentLocation && this._initTencentGeolocation()) {
                this._attemptTencentLocation(options)
                    .then(resolve)
                    .catch(error => {
                        console.warn('腾讯定位失败，回退到浏览器定位:', error.message);
                        this._attemptBrowserLocation(options, 1)
                            .then(resolve)
                            .catch(reject);
                    });
            } else {
                // 使用浏览器原生定位
                this._attemptBrowserLocation(options, 1)
                    .then(resolve)
                    .catch(reject);
            }
        });
    }

    // 初始化腾讯定位组件
    _initTencentGeolocation() {
        try {
            // 检查腾讯地图API是否已加载
            if (typeof TMap === 'undefined' || typeof TMap.Geolocation === 'undefined') {
                console.warn('腾讯地图API未加载，无法使用腾讯定位组件');
                return false;
            }

            if (!this.tencentGeolocation) {
                this.tencentGeolocation = new TMap.Geolocation({
                    timeout: 20000, // 20秒超时
                    showButton: false, // 不显示定位按钮
                    map: null, // 不绑定到特定地图
                    enableHighAccuracy: true,
                    complete: (result) => {
                        console.log('腾讯定位组件初始化成功');
                    },
                    error: (error) => {
                        console.warn('腾讯定位组件初始化失败:', error);
                    }
                });
            }

            return true;
        } catch (error) {
            console.error('腾讯定位组件初始化错误:', error);
            return false;
        }
    }

    // 使用腾讯定位组件获取位置
    _attemptTencentLocation(options) {
        return new Promise((resolve, reject) => {
            if (!this.tencentGeolocation) {
                reject(new Error('腾讯定位组件未初始化'));
                return;
            }

            const startTime = Date.now();

            this.tencentGeolocation.getLocation((result) => {
                const duration = Date.now() - startTime;

                if (result.status === 0) {
                    const location = this._processTencentPosition(result);
                    this.currentPosition = location;
                    this.lastPositionTime = Date.now();

                    // 缓存位置信息
                    Utils.storage.set('last_position', location, CACHE_CONFIG.locationCacheTime);

                    if (APP_CONFIG.debug) {
                        console.log(`✅ 腾讯定位成功:`, location, `耗时: ${duration}ms`);
                    }

                    this.notifyCallbacks(location);
                    resolve(location);
                } else {
                    const errorMessage = result.message || '腾讯定位失败';
                    console.warn(`❌ 腾讯定位失败:`, errorMessage, `耗时: ${duration}ms`);
                    reject(new Error(errorMessage));
                }
            }, {
                timeout: options.timeout || 20000,
                accuracy: 'high'
            });
        });
    }

    // 处理腾讯定位结果
    _processTencentPosition(result) {
        const location = {
            lat: result.lat || result.location.lat,
            lng: result.lng || result.location.lng,
            accuracy: result.accuracy || 20, // 默认20米精度
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
            timestamp: Date.now(),
            provider: 'tencent' // 标识定位提供者
        };

        // 添加地址信息（如果腾讯提供了）
        if (result.address) {
            location.address = result.address;
        }

        // 添加精度级别描述
        location.accuracyLevel = this.getAccuracyDescription(location.accuracy);

        // 添加位置质量评分
        location.quality = this._calculateLocationQuality(location);

        return location;
    }

    // 浏览器原生定位（重命名原方法）
    _attemptBrowserLocation(options, attempt) {
        return this._attemptLocation(options, attempt);
    }

    // 启用腾讯定位组件
    enableTencentLocation() {
        if (typeof TMap !== 'undefined' && typeof TMap.Geolocation !== 'undefined') {
            this.useTencentLocation = true;
            console.log('✅ 已启用腾讯位置服务定位组件');
            return true;
        } else {
            console.warn('⚠️ 腾讯地图API未加载，无法启用腾讯定位组件');
            return false;
        }
    }

    // 禁用腾讯定位组件
    disableTencentLocation() {
        this.useTencentLocation = false;
        if (this.tencentGeolocation) {
            try {
                // 清理腾讯定位组件
                this.tencentGeolocation = null;
            } catch (error) {
                console.error('清理腾讯定位组件失败:', error);
            }
        }
        console.log('✅ 已禁用腾讯位置服务定位组件');
    }

    // 渐进式定位尝试
    async _attemptLocation(options, attempt) {
        const maxAttempts = 3;
        const timeouts = [10000, 20000, 30000]; // 渐进式超时：10s, 20s, 30s

        return new Promise((resolve, reject) => {
            // 设置不同精度要求
            const enableHighAccuracy = attempt === 1 ? false : (attempt < 3 ? true : false);

            const defaultOptions = {
                enableHighAccuracy: enableHighAccuracy,
                timeout: Math.min(timeouts[attempt - 1], APP_CONFIG.locationTimeout),
                maximumAge: options.force ? 0 : (attempt === 1 ? 60000 : 30000) // 首次允许1分钟缓存
            };

            const finalOptions = { ...defaultOptions, ...options };

            if (APP_CONFIG.debug) {
                console.log(`定位尝试 ${attempt}/${maxAttempts}，选项:`, finalOptions);
            }

            const startTime = Date.now();

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const duration = Date.now() - startTime;
                    const location = this._processPosition(position);

                    this.currentPosition = location;
                    this.lastPositionTime = Date.now();

                    // 缓存位置信息
                    Utils.storage.set('last_position', location, CACHE_CONFIG.locationCacheTime);

                    if (APP_CONFIG.debug) {
                        console.log(`定位成功 (尝试 ${attempt}):`, location, `耗时: ${duration}ms`);
                    }

                    this.notifyCallbacks(location);
                    resolve(location);
                },
                async (error) => {
                    const duration = Date.now() - startTime;
                    const errorMessage = this._handleGeolocationError(error);

                    if (APP_CONFIG.debug) {
                        console.warn(`定位失败 (尝试 ${attempt}):`, error, `耗时: ${duration}ms`);
                    }

                    Utils.logError(error, {
                        type: 'geolocation_attempt',
                        attempt: attempt,
                        duration: duration,
                        options: finalOptions
                    });

                    // 如果还有重试机会，尝试重试
                    if (attempt < maxAttempts) {
                        // 检查是否是权限错误，权限错误不重试
                        if (error.code === error.PERMISSION_DENIED) {
                            reject(new Error(errorMessage));
                            return;
                        }

                        if (APP_CONFIG.debug) {
                            console.log(`2秒后进行第 ${attempt + 1} 次定位尝试...`);
                        }

                        // 等待2秒后重试
                        setTimeout(async () => {
                            try {
                                const result = await this._attemptLocation(options, attempt + 1);
                                resolve(result);
                            } catch (retryError) {
                                reject(retryError);
                            }
                        }, 2000);
                    } else {
                        // 所有尝试都失败
                        // 尝试使用缓存位置
                        const cachedPosition = this._getCachedPosition();
                        if (cachedPosition && !options.force) {
                            if (APP_CONFIG.debug) {
                                console.log('使用缓存位置作为备用方案');
                            }
                            resolve(cachedPosition);
                        } else {
                            reject(new Error(this._getEnhancedErrorMessage(error, attempt)));
                        }
                    }
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

    // 获取有效的缓存位置（用于备用方案）
    _getCachedPosition() {
        // 先检查当前内存中的位置
        if (this.currentPosition && !this.isPositionStale(this.currentPosition.timestamp, 300000)) {
            return this.currentPosition;
        }

        // 再检查本地存储中的位置（5分钟内有效）
        const cached = Utils.storage.get('last_position');
        if (cached && !this.isPositionStale(cached.timestamp, 300000)) {
            return cached;
        }

        return null;
    }

    // 获取增强的错误信息
    _getEnhancedErrorMessage(error, attempt) {
        const baseMessage = this._handleGeolocationError(error);

        // 根据尝试次数和错误类型提供更详细的错误信息
        let enhancedMessage = baseMessage;

        if (attempt >= 3) {
            enhancedMessage += '\n\n已尝试3次定位仍失败，建议：';
            enhancedMessage += '\n1. 确保设备已开启定位服务';
            enhancedMessage += '\n2. 移动到开阔区域或靠近窗户';
            enhancedMessage += '\n3. 检查浏览器是否允许获取位置';
            enhancedMessage += '\n4. 尝试刷新页面重新定位';

            if (error.code === error.TIMEOUT) {
                enhancedMessage += '\n5. 当前网络环境可能较差，建议稍后重试';
            }
        }

        return enhancedMessage;
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

        // 清理腾讯定位组件
        this.disableTencentLocation();

        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }

        this.currentPosition = null;
        this.callbacks = [];
        this.lastPositionTime = 0;

        if (APP_CONFIG.debug) {
            console.log('✅ 定位管理器已销毁');
        }
    }
}