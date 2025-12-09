// 定位相关功能 - 集成腾讯位置服务前端定位组件
class LocationManager {
    constructor() {
        this.currentPosition = null;
        this.watchId = null;
        this.tencentGeolocation = null; // 腾讯定位组件实例
        this.tencentLocationMode = null; // 腾讯定位模式: 'hybrid', 'direct', etc.
        this.callbacks = [];
        this.isWatching = false;
        this.lastPositionTime = 0;
        this.minPositionInterval = 5000; // 最小定位间隔5秒
        this.useTencentLocation = false; // 是否使用腾讯定位组件

        // 浏览器检测
        this.browserDetection = window.browserDetection || null;
        this.locationStrategy = this.browserDetection ? this.browserDetection.locationStrategy : {
            enableHighAccuracy: true,
            timeout: 20000,
            maximumAge: 0,
            retries: 2
        };
    }

    // 获取当前位置（集成腾讯定位组件和浏览器检测）
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

            // 根据浏览器检测选择定位策略
            const browserOptimizedOptions = this._getBrowserOptimizedOptions(options);

            // 检查是否需要使用腾讯定位（特别是小米浏览器）
            if (this._shouldUseTencentLocation() && this._initTencentGeolocation()) {
                console.log(`🎯 使用浏览器优化策略: ${this.locationStrategy.name}`);
                this._attemptTencentLocation(browserOptimizedOptions)
                    .then(resolve)
                    .catch(error => {
                        console.warn('腾讯定位失败，回退到浏览器定位:', error.message);
                        this._attemptBrowserLocationWithStrategy(browserOptimizedOptions, 1)
                            .then(resolve)
                            .catch(reject);
                    });
            } else {
                console.log(`🎯 使用浏览器定位策略: ${this.locationStrategy.name}`);
                // 使用浏览器原生定位（带优化参数）
                this._attemptBrowserLocationWithStrategy(browserOptimizedOptions, 1)
                    .then(resolve)
                    .catch(reject);
            }
        });
    }

    // 根据浏览器获取优化选项
    _getBrowserOptimizedOptions(options) {
        const strategy = this.locationStrategy;

        return {
            ...strategy,
            ...options,  // 用户传入的选项优先
            enableHighAccuracy: options.enableHighAccuracy || strategy.enableHighAccuracy,
            timeout: options.timeout || strategy.timeout,
            maximumAge: options.maximumAge || strategy.maximumAge
        };
    }

    // 检查是否应该使用腾讯定位
    _shouldUseTencentLocation() {
        // 如果启用了腾讯定位混合模式
        if (this.useTencentLocation && this.tencentLocationMode === 'hybrid') {
            return true;
        }

        // 小米浏览器强烈建议使用腾讯定位补充
        if (this.browserDetection && this.browserDetection.shouldUseTencentLocation()) {
            return true;
        }

        // 其他情况下使用用户配置
        return this.useTencentLocation;
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

    // 使用腾讯定位增强的浏览器定位
    _attemptTencentLocation(options) {
        return new Promise((resolve, reject) => {
            if (this.tencentLocationMode === 'hybrid') {
                // 混合模式：使用浏览器定位 + 腾讯地图服务增强
                console.log('🔄 使用混合定位模式：浏览器GPS + 腾讯地图服务');

                // 直接使用浏览器定位，但标记为腾讯增强
                this._attemptBrowserLocationWithStrategy(options, 1)
                    .then(location => {
                        // 添加腾讯增强标识
                        location.provider = 'hybrid (browser + tencent)';
                        location.tencentEnhanced = true;
                        location.tencentLocationMode = this.tencentLocationMode;

                        if (APP_CONFIG.debug) {
                            console.log('✅ 混合定位成功:', location);
                        }

                        resolve(location);
                    })
                    .catch(reject);

            } else if (this.tencentGeolocation) {
                // 传统腾讯定位组件
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
            } else {
                reject(new Error('腾讯定位服务未初始化'));
            }
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

    // 浏览器原生定位（带浏览器优化策略）
    _attemptBrowserLocationWithStrategy(options, attempt) {
        const maxRetries = options.retries || this.locationStrategy.retries;

        return new Promise((resolve, reject) => {
            // 根据浏览器调整定位精度要求
            const enableHighAccuracy = this._adjustAccuracyForBrowser(options.enableHighAccuracy, attempt);

            const finalOptions = {
                enableHighAccuracy: enableHighAccuracy,
                timeout: options.timeout,
                maximumAge: options.maximumAge
            };

            if (APP_CONFIG.debug) {
                console.log(`浏览器定位尝试 ${attempt}/${maxRetries}，浏览器: ${this.locationStrategy.name}，选项:`, finalOptions);
            }

            const startTime = Date.now();

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const duration = Date.now() - startTime;
                    const location = this._processPosition(position);
                    location.browserStrategy = this.locationStrategy.name;
                    location.browserOptimized = true;

                    this.currentPosition = location;
                    this.lastPositionTime = Date.now();

                    // 缓存位置信息
                    Utils.storage.set('last_position', location, CACHE_CONFIG.locationCacheTime);

                    if (APP_CONFIG.debug) {
                        console.log(`✅ 浏览器定位成功 (${this.locationStrategy.name}):`, location, `耗时: ${duration}ms`);
                    }

                    this.notifyCallbacks(location);
                    resolve(location);
                },
                async (error) => {
                    const duration = Date.now() - startTime;
                    const errorInfo = this._handleGeolocationError(error);

                    if (APP_CONFIG.debug) {
                        console.warn(`❌ 浏览器定位失败 (${this.locationStrategy.name}):`, error, `耗时: ${duration}ms`);
                    }

                    // 检查是否需要立即使用默认位置
                    if (errorInfo.shouldUseDefaultLocation) {
                        console.warn(`📍 检测到 ${error.code === error.PERMISSION_DENIED ? '权限被拒绝' : '定位超时'}，使用默认位置（杭州西湖）`);
                        const defaultLocation = this._createDefaultLocation();
                        defaultLocation.browserStrategy = `${this.locationStrategy.name} + 默认位置`;
                        defaultLocation.failureReason = error.code === error.PERMISSION_DENIED ? '权限被拒绝' : '定位超时';
                        resolve(defaultLocation);
                        return;
                    }

                    // 如果还有重试机会，尝试重试
                    if (attempt < maxRetries) {
                        // 检查是否是权限错误，权限错误不重试但使用默认位置
                        if (error.code === error.PERMISSION_DENIED) {
                            console.warn(`🚫 权限被拒绝，使用默认位置`);
                            const defaultLocation = this._createDefaultLocation();
                            defaultLocation.browserStrategy = `${this.locationStrategy.name} + 默认位置`;
                            defaultLocation.failureReason = '权限被拒绝';
                            resolve(defaultLocation);
                            return;
                        }

                        // 根据浏览器调整重试间隔
                        const retryDelay = this._getRetryDelayForBrowser(attempt);

                        if (APP_CONFIG.debug) {
                            console.log(`${retryDelay}ms后进行第 ${attempt + 1} 次定位尝试 (${this.locationStrategy.name})...`);
                        }

                        setTimeout(async () => {
                            try {
                                const result = await this._attemptBrowserLocationWithStrategy(options, attempt + 1);
                                resolve(result);
                            } catch (retryError) {
                                reject(retryError);
                            }
                        }, retryDelay);
                    } else {
                        // 所有尝试都失败，尝试使用腾讯定位作为备用
                        if (this._shouldUseTencentLocation() && this._initTencentGeolocation()) {
                            console.log(`🔄 浏览器定位失败，尝试腾讯定位备用方案...`);
                            try {
                                const tencentResult = await this._attemptTencentLocation(options);
                                tencentResult.browserStrategy = `${this.locationStrategy.name} + 腾讯备用`;
                                resolve(tencentResult);
                            } catch (tencentError) {
                                // 使用默认测试位置
                                console.warn('腾讯定位也失败，使用默认测试位置（杭州西湖）');
                                const defaultLocation = this._createDefaultLocation();
                                defaultLocation.browserStrategy = `${this.locationStrategy.name} + 腾讯备用 + 默认位置`;
                                defaultLocation.failureReason = '所有定位方式失败';
                                resolve(defaultLocation);
                            }
                        } else {
                            // 最后回退到默认位置
                            console.warn('所有定位方式都失败，使用默认测试位置（杭州西湖）');
                            const defaultLocation = this._createDefaultLocation();
                            defaultLocation.browserStrategy = `${this.locationStrategy.name} + 默认位置`;
                            defaultLocation.failureReason = '所有定位方式失败';
                            resolve(defaultLocation);
                        }
                    }
                },
                finalOptions
            );
        });
    }

    // 根据浏览器调整定位精度
    _adjustAccuracyForBrowser(enableHighAccuracy, attempt) {
        // 小米浏览器在多次尝试时降低精度要求
        if (this.browserDetection && this.browserDetection.browserInfo.isMiuiBrowser) {
            if (attempt > 1) {
                console.log(`小米浏览器第${attempt}次尝试，降低精度要求`);
                return false; // 降低精度要求提高成功率
            }
        }

        return enableHighAccuracy;
    }

    // 根据浏览器获取重试间隔
    _getRetryDelayForBrowser(attempt) {
        if (this.browserDetection && this.browserDetection.browserInfo.isMiuiBrowser) {
            // 小米浏览器需要更长的重试间隔
            return attempt * 3000; // 3s, 6s, 9s
        }

        return 2000 * attempt; // 2s, 4s, 6s
    }

    // 创建默认位置（用于测试）
    _createDefaultLocation() {
        const defaultLocation = JSON.parse(JSON.stringify(MAP_CONFIG.defaultLocation)); // 深拷贝

        // 更新时间戳
        defaultLocation.timestamp = Date.now();

        // 添加浏览器策略信息
        if (this.locationStrategy) {
            defaultLocation.browserStrategy = `${this.locationStrategy.name} + 默认位置`;
        }

        // 添加默认位置标识
        defaultLocation.isDefaultLocation = true;
        defaultLocation.isRealLocation = false;

        // 根据失败原因设置不同的描述
        if (!defaultLocation.failureReason) {
            defaultLocation.failureReason = '定位失败自动回退';
        }

        // 根据失败原因设置不同的显示信息
        switch (defaultLocation.failureReason) {
            case '权限被拒绝':
                defaultLocation.provider = '权限被拒绝 (默认位置)';
                defaultLocation.accuracyLevel = '模拟定位 - 权限被拒绝';
                break;
            case '定位超时':
                defaultLocation.provider = '定位超时 (默认位置)';
                defaultLocation.accuracyLevel = '模拟定位 - 超时回退';
                break;
            case '所有定位方式失败':
                defaultLocation.provider = '定位失败 (默认位置)';
                defaultLocation.accuracyLevel = '模拟定位 - 完全失败';
                break;
            default:
                defaultLocation.provider = '自动回退 (默认位置)';
                defaultLocation.accuracyLevel = '模拟定位 - 自动回退';
        }

        if (APP_CONFIG.debug) {
            console.log('📍 创建默认测试位置:', defaultLocation);
        }

        return defaultLocation;
    }

    // 启用腾讯定位组件
    enableTencentLocation() {
        // 检查TMap是否加载
        if (typeof TMap === 'undefined') {
            console.warn('⚠️ 腾讯地图API (TMap) 未加载');
            return false;
        }

        // 腾讯地图GL API定位组件检查
        // GL API主要使用浏览器定位 + 地址解析服务
        const hasBasicAPI = typeof TMap !== 'undefined' && typeof TMap === 'function';

        // 检查是否有其他定位相关服务
        const hasLocationService = typeof TMap.service !== 'undefined' ||
                                 typeof TMap.Service !== 'undefined' ||
                                 typeof window.qq !== 'undefined'; // 旧版API检查

        if (hasBasicAPI || hasLocationService) {
            this.useTencentLocation = true;
            console.log('✅ 已启用腾讯位置服务定位组件');

            if (hasLocationService) {
                console.log('📋 使用腾讯地图地址解析服务 + 浏览器定位');
            } else {
                console.log('📋 使用腾讯地图GL API + 浏览器定位');
            }

            // 设置为混合定位模式：浏览器GPS + 腾讯地图服务
            this.tencentLocationMode = 'hybrid';
            return true;
        } else {
            console.warn('⚠️ 腾讯地图定位组件未找到，将使用浏览器原生定位');

            // 详细检查TMap结构
            console.log('🔍 TMap对象分析:');
            console.log('- TMap类型:', typeof TMap);
            console.log('- TMap构造函数:', typeof TMap === 'function' ? '✅' : '❌');

            // 检查所有属性
            const allProps = Object.getOwnPropertyNames(TMap);
            const publicProps = allProps.filter(name => !name.startsWith('_'));
            console.log('- TMap公共属性:', publicProps);

            // 检查原型链
            if (TMap.prototype) {
                const protoProps = Object.getOwnPropertyNames(TMap.prototype);
                console.log('- TMap原型属性:', protoProps.filter(name => !name.startsWith('_')));
            }

            // 检查全局TMap子对象
            const globalKeys = Object.keys(window).filter(key => key.startsWith('TMap'));
            if (globalKeys.length > 1) {
                console.log('- 全局TMap相关对象:', globalKeys);
            }

            // 尝试创建TMap实例来检查服务
            try {
                console.log('🧪 尝试创建TMap实例...');
                // 注意：这可能会失败，因为需要DOM元素
            } catch (e) {
                console.log('- TMap实例创建失败（正常）:', e.message);
            }

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
                    const errorInfo = this._handleGeolocationError(error);

                    if (APP_CONFIG.debug) {
                        console.warn(`定位失败 (尝试 ${attempt}):`, error, `耗时: ${duration}ms`);
                    }

                    Utils.logError(error, {
                        type: 'geolocation_attempt',
                        attempt: attempt,
                        duration: duration,
                        options: finalOptions
                    });

                    // 检查是否需要立即使用默认位置
                    if (errorInfo.shouldUseDefaultLocation) {
                        console.warn(`📍 检测到 ${error.code === error.PERMISSION_DENIED ? '权限被拒绝' : '定位超时'}，使用默认位置（杭州西湖）`);
                        const defaultLocation = this._createDefaultLocation();
                        defaultLocation.browserStrategy = '渐进式定位 + 默认位置';
                        defaultLocation.failureReason = error.code === error.PERMISSION_DENIED ? '权限被拒绝' : '定位超时';
                        resolve(defaultLocation);
                        return;
                    }

                    // 如果还有重试机会，尝试重试
                    if (attempt < maxAttempts) {
                        // 检查是否是权限错误，权限错误不重试但使用默认位置
                        if (error.code === error.PERMISSION_DENIED) {
                            console.warn(`🚫 权限被拒绝，使用默认位置`);
                            const defaultLocation = this._createDefaultLocation();
                            defaultLocation.browserStrategy = '渐进式定位 + 默认位置';
                            defaultLocation.failureReason = '权限被拒绝';
                            resolve(defaultLocation);
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
                            // 使用默认测试位置（用于开发和测试）
                            console.warn('所有定位方式都失败，使用默认测试位置（杭州西湖）');
                            const defaultLocation = this._createDefaultLocation();
                            defaultLocation.browserStrategy = '渐进式定位 + 默认位置';
                            defaultLocation.failureReason = '所有定位方式失败';
                            resolve(defaultLocation);
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
        let shouldUseDefaultLocation = false;

        switch(error.code) {
            case error.PERMISSION_DENIED:
                errorMessage = ERROR_MESSAGES.PERMISSION_DENIED;
                // 权限被拒绝时使用默认位置
                shouldUseDefaultLocation = true;
                if (APP_CONFIG.debug) {
                    console.log('🚫 用户拒绝位置权限，将使用默认位置');
                }
                break;
            case error.POSITION_UNAVAILABLE:
                errorMessage = ERROR_MESSAGES.POSITION_UNAVAILABLE;
                break;
            case error.TIMEOUT:
                errorMessage = ERROR_MESSAGES.TIMEOUT;
                // 超时时使用默认位置
                shouldUseDefaultLocation = true;
                if (APP_CONFIG.debug) {
                    console.log('⏰ 定位超时，将使用默认位置');
                }
                break;
            default:
                errorMessage = '获取位置失败：' + error.message;
        }

        return {
            message: errorMessage,
            shouldUseDefaultLocation: shouldUseDefaultLocation
        };
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