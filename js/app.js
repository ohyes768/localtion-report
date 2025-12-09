// 主应用类
class VehicleLocationApp {
    constructor() {
        this.currentCar = null;
        this.currentLocation = null;
        this.locationManager = new LocationManager();
        this.mapManager = new MapManager();
        this.isInitialized = false;
        this.pageHistory = [];
        this.initStartTime = null;

      }

    // 初始化应用
    async init() {
        this.initStartTime = Date.now();

        try {
            // 检查环境
            this._checkEnvironment();

            // 解析URL参数
            const params = Utils.getUrlParams();
            const carId = params.car;

            if (!carId || !VEHICLE_CONFIG[carId]) {
                throw new Error(ERROR_MESSAGES.INVALID_QRCODE);
            }

            this.currentCar = VEHICLE_CONFIG[carId];

            // 初始化UI
            this.initUI();

            // 显示加载页面
            this.showPage('loading-page');

            // 绑定事件
            this.bindEvents();

            // 清除所有缓存，确保测试准确性
            this.locationManager.clearAllCache();

            // 设置页面可见性变化监听
            this.setupVisibilityHandling();

            // 开始定位
            await this.startLocationTracking();

            this.isInitialized = true;

            // 记录初始化完成时间
            const initTime = Date.now() - this.initStartTime;
        
        } catch (error) {
            Utils.logError(error, {
                type: 'app_initialization',
                car: this.currentCar,
                initTime: Date.now() - this.initStartTime
            });
            this.handleError(error);
        }
    }

    // 检查环境
    _checkEnvironment() {
        // 检查浏览器支持
        if (!navigator.geolocation) {
            throw new Error('您的浏览器不支持定位功能，请升级浏览器或使用其他设备');
        }

        // 检查是否为移动设备
      
        // 记录设备信息
        const deviceInfo = Utils.getDeviceInfo();
        Utils.storage.set('device_info', deviceInfo, 24 * 60 * 60 * 1000); // 缓存24小时
    }

    // 初始化UI
    initUI() {
        // 设置车辆信息
        document.getElementById('car-name').textContent = this.currentCar.name;
        document.getElementById('car-plate').textContent = this.currentCar.plate;
        document.title = `${this.currentCar.name} - ${APP_CONFIG.title}`;

        // 设置主题色
        this._applyTheme();

        // 检查深色模式
        this._checkDarkMode();
    }

    // 应用主题色
    _applyTheme() {
        const themeColor = this.currentCar.color;
        const styleElement = document.createElement('style');

        styleElement.textContent = `
            .theme-primary { background-color: ${themeColor} !important; }
            .theme-primary:hover { background-color: ${this._darkenColor(themeColor, 10)} !important; }
        `;

        document.head.appendChild(styleElement);
    }

    // 颜色加深
    _darkenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;

        return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }

    // 检查深色模式
    _checkDarkMode() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.body.classList.add('dark-mode');
        }

        // 监听深色模式变化
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            document.body.classList.toggle('dark-mode', e.matches);
        });
    }

    // 绑定事件
    bindEvents() {
        // 刷新位置按钮
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshLocation();
            });
        }

        // 分享位置按钮
        const shareBtn = document.getElementById('share-btn');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => {
                this.showSharePage();
            });
        }

        // 复制位置信息按钮
        const copyBtn = document.getElementById('copy-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                this.copyLocationInfo();
            });
        }

        // 复制经纬度按钮
        const copyCoordinatesBtn = document.getElementById('copy-coordinates-btn');
        if (copyCoordinatesBtn) {
            copyCoordinatesBtn.addEventListener('click', () => {
                this.copyCoordinates();
            });
        }

        // 保存图片按钮
        const saveImageBtn = document.getElementById('save-image-btn');
        if (saveImageBtn) {
            saveImageBtn.addEventListener('click', () => {
                this.saveImage();
            });
        }

        // 错误模态框确认按钮
        const errorOkBtn = document.getElementById('error-ok-btn');
        if (errorOkBtn) {
            errorOkBtn.addEventListener('click', () => {
                this.hideErrorModal();
            });
        }

        // 键盘事件
        document.addEventListener('keydown', (e) => {
            this.handleKeyPress(e);
        });

        // 页面滑动事件
        document.addEventListener('touchmove', (e) => {
            this.handleTouchMove(e);
        });
    }

    // 设置页面可见性处理
    setupVisibilityHandling() {
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.isInitialized) {
                // 页面重新可见时，检查是否需要刷新位置
                const lastUpdate = this.currentLocation ? this.currentLocation.timestamp : 0;
                const timeSinceUpdate = Date.now() - lastUpdate;

                if (timeSinceUpdate > 60000) { // 超过1分钟，自动刷新
                    this.refreshLocation();
                }
            }
        });

        // 监听页面焦点事件
        window.addEventListener('focus', () => {
            if (this.isInitialized) {
                // 页面获得焦点时，检查地图状态
                this._checkMapStatus();
            }
        });
    }

    // 开始定位追踪（集成腾讯位置服务）
    async startLocationTracking() {
        try {
            // 等待腾讯地图API加载完成（最多等待5秒）
            await this.waitForTencentMapAPI();

            // 获取当前位置（优先使用腾讯定位）
            const location = await this.locationManager.getCurrentPosition();
            this.currentLocation = location;

            // 初始化地图
            await this.initializeMap();

            // 显示地图页面
            this.showMapPage();

            // 移除自动位置监听 - 用户可以通过手动刷新按钮更新位置

        } catch (error) {
            this.handleLocationError(error);
        }
    }

    // 初始化地图
    async initializeMap() {
        const container = document.getElementById('map-container');
        if (!container) {
            throw new Error('地图容器未找到');
        }

        await this.mapManager.initializeMap(container, this.currentLocation);
        await this.updateMapDisplay();
    }

    // 更新地图显示
    async updateMapDisplay() {
        if (!this.currentLocation || !this.mapManager.isMapLoaded) {
            console.log('地图未加载完成，跳过更新', APP_CONFIG.debug ? null : undefined);
            return;
        }

        try {
            if (APP_CONFIG.debug) {
                console.log('开始更新地图显示，车辆:', this.currentCar.name);
                console.log('当前位置:', this.currentLocation);
            }

            // 先更新标记
            this.mapManager.addMarker(this.currentLocation, this.currentCar);

            if (APP_CONFIG.debug) {
                console.log('车辆标记添加完成');
            }

            // 更新经纬度信息显示
            this.updateCoordinatesDisplay(this.currentLocation);

            // 然后更新地址信息
            const address = await this.getAddress();
            this.updateAddressDisplay(address);

        } catch (error) {
            console.error('更新地图显示失败:', error);
            Utils.showToast('地图更新失败: ' + error.message);
        }
    }

    // 获取地址信息
    async getAddress() {
        try {
            const address = await this.mapManager.getAddressFromLocation(this.currentLocation);
            return address;
        } catch (error) {
            console.error('获取地址失败:', error);
            return '地址获取失败';
        }
    }

    
    // 刷新位置
    async refreshLocation() {
        this.showLoadingAnimation();

        try {
            const location = await this.locationManager.getCurrentPosition({ force: true });
            this.currentLocation = location;

            if (this.mapManager.isMapLoaded) {
                await this.updateMapDisplay();
            }

            Utils.showToast('位置已更新');

        } catch (error) {
            Utils.logError(error, { type: 'location_refresh' });
            Utils.showToast('刷新失败: ' + error.message);
        } finally {
            this.hideLoadingAnimation();
        }
    }

    // 等待腾讯地图API加载
    async waitForTencentMapAPI() {
        const maxWaitTime = 8000; // 最多等待8秒

        return new Promise((resolve) => {
            // 如果已经加载完成
            if (window.TencentMapAPILoaded && typeof TMap !== 'undefined') {
                if (APP_CONFIG.debug) {
                    console.log('✅ 腾讯地图API已加载（缓存状态）');
                }
                resolve(true);
                return;
            }

            // 监听API加载完成事件
            const handleMapLoaded = () => {
                window.removeEventListener('tencentMapLoaded', handleMapLoaded);
                if (APP_CONFIG.debug) {
                    console.log('✅ 腾讯地图API已加载（事件监听）');
                }
                resolve(true);
            };

            window.addEventListener('tencentMapLoaded', handleMapLoaded);

            // 设置超时检查
            setTimeout(() => {
                window.removeEventListener('tencentMapLoaded', handleMapLoaded);

                // 最后检查一次TMap是否可用
                if (typeof TMap !== 'undefined') {
                    if (APP_CONFIG.debug) {
                        console.log('✅ 腾讯地图API检测可用（超时检查）');
                    }
                    resolve(true);
                } else {
                    console.warn('⏰ 腾讯地图API加载超时，将使用浏览器原生定位');
                    resolve(false);
                }
            }, maxWaitTime);
        });
    }

    // 显示地图页面
    showMapPage() {
        this.showPage('map-page');
        document.getElementById('location-title').textContent = this.currentCar.name;
    }

    // 显示分享页面 - 跳转到独立页面
    async showSharePage() {
        try {
            // 生成分享页面的URL参数
            const params = new URLSearchParams({
                car: this.currentCar.id,
                name: this.currentCar.name,
                plate: this.currentCar.plate,
                color: this.currentCar.color,
                lat: this.currentLocation.lat,
                lng: this.currentLocation.lng,
                address: this.currentLocation.address || '位置解析中...',
                accuracy: Math.round(this.currentLocation.accuracy),
                time: this.currentLocation.timestamp,
                provider: this.currentLocation.provider
            });

            // 跳转到分享页面
            const shareUrl = `share-map.html?${params.toString()}`;
            window.location.href = shareUrl;

        } catch (error) {
            Utils.logError(error, { type: 'share_page' });
            Utils.showToast('生成分享链接失败: ' + error.message);
        }
    }

    
    // 更新分享信息
    updateShareInfo() {
        const address = document.getElementById('location-address').textContent;
        const time = Utils.formatTime();

        const shareAddress = document.getElementById('share-address');
        const shareTime = document.getElementById('share-time');
        const shareCar = document.getElementById('share-car');

        if (shareAddress) shareAddress.textContent = address;
        if (shareTime) shareTime.textContent = time;
        if (shareCar) shareCar.textContent = `${this.currentCar.name}（${this.currentCar.plate}）`;

        // 添加位置分析到分享页面
        if (APP_CONFIG.analysis.enableLocationAnalysis && this.currentLocation) {
            this.updateShareAnalysis(address);
        }
    }

    // 更新分享分析信息
    updateShareAnalysis(address) {
        const analysis = Utils.analyzeLocation(this.currentLocation, address);
        let analysisElement = document.getElementById('share-analysis');

        if (!analysisElement && analysis) {
            const shareText = document.querySelector('.share-text');
            if (shareText) {
                analysisElement = document.createElement('p');
                analysisElement.id = 'share-analysis';
                analysisElement.innerHTML = `📊 <strong>位置分析：</strong>${analysis}`;
                analysisElement.style.display = 'block';
                shareText.appendChild(analysisElement);
            }
        } else if (analysisElement && analysis) {
            analysisElement.innerHTML = `📊 <strong>位置分析：</strong>${analysis}`;
            analysisElement.style.display = 'block';
        } else if (analysisElement && !analysis) {
            analysisElement.style.display = 'none';
        }
    }

    // 复制位置信息
    async copyLocationInfo() {
        try {
            const address = document.getElementById('share-address').textContent;
            const time = document.getElementById('share-time').textContent;

            // 获取位置分析信息
            let analysis = null;
            if (APP_CONFIG.analysis.enableLocationAnalysis && this.currentLocation) {
                analysis = Utils.analyzeLocation(this.currentLocation, address);
            }

            const shareText = Utils.generateShareText(this.currentCar, address, time, analysis);

            const success = await Utils.copyToClipboard(shareText);

            if (success) {
                Utils.showToast('位置信息已复制');
            } else {
                // 降级方案：显示文本供手动复制
                this.showTextForManualCopy(shareText);
                Utils.showToast('请手动复制文本内容');
            }

        } catch (error) {
            Utils.logError(error, { type: 'copy_location' });
            Utils.showToast('复制失败，请手动复制');
        }
    }

    // 复制经纬度信息
    async copyCoordinates() {
        try {
            if (!this.currentLocation) {
                Utils.showToast('暂无经纬度信息');
                return;
            }

            const lat = this.currentLocation.lat.toFixed(6);
            const lng = this.currentLocation.lng.toFixed(6);
            const accuracy = this.currentLocation.accuracy ? Math.round(this.currentLocation.accuracy) : '未知';
            const time = Utils.formatTime(new Date(this.currentLocation.timestamp || Date.now()));

            // 构建经纬度信息文本
            const coordinatesText = `${this.currentCar.name} 位置信息

📍 经纬度: ${lat}, ${lng}
🎯 精度: ${accuracy}米
🕐 定位时间: ${time}
🚗 车牌号: ${this.currentCar.plate}

---
由车辆位置分享系统生成`;

            const success = await Utils.copyToClipboard(coordinatesText);

            if (success) {
                Utils.showToast('✅ 经纬度信息已复制到剪贴板');
            } else {
                // 降级方案：显示文本供手动复制
                this.showTextForManualCopy(coordinatesText);
                Utils.showToast('请手动复制经纬度信息');
            }

        } catch (error) {
            Utils.logError(error, { type: 'copy_coordinates' });
            Utils.showToast('复制经纬度失败，请手动复制');
        }
    }

    // 显示手动复制文本
    showTextForManualCopy(text) {
        const modal = document.getElementById('error-modal');
        const title = document.getElementById('error-title');
        const message = document.getElementById('error-message');
        const okBtn = document.getElementById('error-ok-btn');

        if (title) title.textContent = '复制位置信息';
        if (message) {
            message.innerHTML = `<textarea readonly style="width:100%;height:150px;margin:10px 0;padding:10px;border:1px solid #ccc;border-radius:4px;resize:vertical;">${text}</textarea>`;
        }

        modal.classList.add('active');

        // 选中文本
        setTimeout(() => {
            const textarea = message.querySelector('textarea');
            if (textarea) {
                textarea.select();
                textarea.focus();
            }
        }, 100);
    }

    // 保存图片
    saveImage() {
        const imageUrl = document.getElementById('screenshot-image').src;

        if (!imageUrl) {
            Utils.showToast('图片未准备好，请重试');
            return;
        }

        try {
            // 创建下载链接
            const link = document.createElement('a');
            link.href = imageUrl;
            link.download = `车辆位置_${Utils.formatTime().replace(/[:\s]/g, '_')}.png`;
            link.target = '_blank';

            // 触发下载
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            Utils.showToast('图片已保存');

        } catch (error) {
            Utils.logError(error, { type: 'save_image' });
            Utils.showToast('保存失败，请长按图片保存');
        }
    }

    // 更新地址显示
    updateAddressDisplay(address) {
        const elements = ['location-address', 'share-address'];
        elements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = address;
            }
        });

        // 更新位置分析（如果启用）
        if (APP_CONFIG.analysis.enableLocationAnalysis && this.currentLocation) {
            this.updateLocationAnalysis(address);
        }
    }

    // 更新经纬度信息显示
    updateCoordinatesDisplay(location) {
        if (!location) {
            return;
        }

        try {
            // 显示经纬度信息容器
            const coordinatesInfo = document.getElementById('coordinates-info');
            if (coordinatesInfo) {
                coordinatesInfo.style.display = 'block';
            }

            // 更新经纬度显示
            const coordinatesDisplay = document.getElementById('coordinates-display');
            if (coordinatesDisplay) {
                const lat = location.lat.toFixed(6);
                const lng = location.lng.toFixed(6);
                coordinatesDisplay.textContent = `${lat}, ${lng}`;

                // 如果是默认位置，添加标识
                if (location.isDefaultLocation) {
                    coordinatesDisplay.style.color = '#ff9500';
                    coordinatesDisplay.style.fontStyle = 'italic';
                } else {
                    coordinatesDisplay.style.color = '#0066cc';
                    coordinatesDisplay.style.fontStyle = 'normal';
                }
            }

            // 更新精度信息
            const accuracyDisplay = document.getElementById('accuracy-display');
            if (accuracyDisplay) {
                const accuracy = location.accuracy ? Math.round(location.accuracy) : '未知';
                accuracyDisplay.textContent = `${accuracy}米`;

                // 如果是默认位置，添加标识
                if (location.isDefaultLocation) {
                    accuracyDisplay.innerHTML = `${accuracy}米 <small style="color: #ff9500;">(测试位置)</small>`;
                }
            }

            // 更新定位来源
            const providerDisplay = document.getElementById('provider-display');
            if (providerDisplay) {
                // 调试信息
                if (APP_CONFIG.debug) {
                    console.log('🎯 更新来源显示 - location对象:', {
                        sourceText: location.sourceText,
                        provider: location.provider,
                        browserStrategy: location.browserStrategy,
                        sourceType: location.sourceType,
                        tencentEnhanced: location.tencentEnhanced
                    });
                }

                // 优先使用新的sourceText字段，回退到provider字段
                let provider = location.sourceText || location.provider || '浏览器定位';

                // 调试信息
                if (APP_CONFIG.debug) {
                    console.log('🎯 最终显示的provider值:', provider);
                }

                // 如果是默认位置，添加特殊标识
                if (location.isDefaultLocation) {
                    provider = `🧪 ${provider}`;
                    providerDisplay.style.color = '#ff9500';
                } else {
                    providerDisplay.style.color = '#007AFF';
                }

                providerDisplay.textContent = provider;
            }

            // 更新定位时间
            const timeDisplay = document.getElementById('time-display');
            if (timeDisplay) {
                const time = new Date(location.timestamp || Date.now());
                const timeText = Utils.formatTime(time);

                // 如果是默认位置，添加标识
                if (location.isDefaultLocation) {
                    timeDisplay.innerHTML = `${timeText} <small style="color: #ff9500;">(测试)</small>`;
                } else {
                    timeDisplay.textContent = timeText;
                }
            }

            if (APP_CONFIG.debug) {
                console.log('✅ 经纬度信息更新完成:', {
                    coordinates: `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`,
                    accuracy: location.accuracy,
                    provider: providerDisplay.textContent,
                    isDefault: location.isDefaultLocation
                });

                // 如果是默认位置，显示特殊提示
                if (location.isDefaultLocation) {
                    console.log('🧪 当前使用默认测试位置（杭州西湖），用于开发和测试');
                }
            }

            // 显示默认位置提示
            if (location.isDefaultLocation) {
                this.showDefaultLocationTip();
            }

        } catch (error) {
            console.error('更新经纬度显示失败:', error);
        }
    }

    // 显示默认位置提示
    showDefaultLocationTip() {
        // 检查是否已经显示过提示
        if (localStorage.getItem('defaultLocationTipShown')) {
            return;
        }

        const tip = document.createElement('div');
        tip.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #ff9500;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            animation: slideDown 0.3s ease-out;
            max-width: 300px;
            text-align: center;
        `;
        tip.innerHTML = `
            <strong>🧪 测试模式</strong><br>
            当前使用默认位置（杭州西湖）<br>
            <small>用于开发和测试分享功能</small>
        `;

        document.body.appendChild(tip);

        // 添加动画样式
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideDown {
                from {
                    opacity: 0;
                    transform: translate(-50%, -20px);
                }
                to {
                    opacity: 1;
                    transform: translate(-50%, 0);
                }
            }
        `;
        document.head.appendChild(style);

        // 3秒后自动隐藏
        setTimeout(() => {
            tip.style.animation = 'slideUp 0.3s ease-out';
            setTimeout(() => {
                document.body.removeChild(tip);
            }, 300);
        }, 5000);

        // 标记已显示过提示
        localStorage.setItem('defaultLocationTipShown', 'true');
    }

    // 更新位置分析信息
    updateLocationAnalysis(address) {
        const analysis = Utils.analyzeLocation(this.currentLocation, address);
        if (analysis) {
            // 在地图页面显示分析结果
            let analysisElement = document.getElementById('location-analysis');
            if (!analysisElement) {
                // 创建分析信息元素
                const mapHeader = document.querySelector('.map-header');
                if (mapHeader) {
                    analysisElement = document.createElement('div');
                    analysisElement.id = 'location-analysis';
                    analysisElement.className = 'location-analysis';
                    mapHeader.appendChild(analysisElement);
                }
            }
            if (analysisElement) {
                analysisElement.textContent = `📊 ${analysis}`;
                analysisElement.style.display = 'block';
            }
        }
    }

    // 显示页面
    showPage(pageId) {
        // 记录页面历史
        this.pageHistory.push(pageId);

        // 隐藏所有页面
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        // 显示指定页面
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add('active');
        }
    }

    // 返回上一页
    goBack() {
        if (this.pageHistory.length > 1) {
            this.pageHistory.pop(); // 移除当前页
            const previousPage = this.pageHistory.pop(); // 获取上一页
            if (previousPage) {
                this.showPage(previousPage);
            }
        }
    }

    // 显示加载动画
    showLoadingAnimation() {
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = '<span class="icon loading"></span> 定位中...';
        }
    }

    // 隐藏加载动画
    hideLoadingAnimation() {
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = '<span class="icon">🔄</span> 刷新位置';
        }
    }

    // 处理按键事件
    handleKeyPress(e) {
        // ESC键关闭模态框
        if (e.key === 'Escape') {
            this.hideErrorModal();
        }

        // F5刷新位置
        if (e.key === 'F5') {
            e.preventDefault();
            this.refreshLocation();
        }
    }

    // 处理触摸移动
    handleTouchMove(e) {
        // 防止页面滚动影响地图操作
        const target = e.target;
        if (target && target.closest('#map-container')) {
            e.stopPropagation();
        }
    }

    // 检查地图状态
    _checkMapStatus() {
        if (this.mapManager && !this.mapManager.isMapLoaded) {
            console.warn('地图状态异常，尝试重新初始化');
            if (this.currentLocation) {
                this.initializeMap();
            }
        }
    }

    // 处理错误
    handleError(error) {
        Utils.logError(error, {
            type: 'app_error',
            car: this.currentCar,
            initialized: this.isInitialized
        });
        this.showErrorModal(error.message || '发生未知错误');
    }

    // 处理定位错误
    handleLocationError(error) {
        Utils.logError(error, {
            type: 'location_error',
            car: this.currentCar
        });

        let message = error.message;

        if (error.message.includes('位置') || error.message.includes('定位')) {
            message = error.message + '\n\n请确保：\n1. 已开启定位服务\n2. 允许浏览器获取位置\n3. 在室外或靠近窗户';
        }

        this.showErrorModal(message);
    }

    // 显示错误模态框
    showErrorModal(message) {
        const title = document.getElementById('error-title');
        const errorMessage = document.getElementById('error-message');

        if (title) title.textContent = '提示';
        if (errorMessage) errorMessage.textContent = message;

        document.getElementById('error-modal').classList.add('active');
    }

    // 隐藏错误模态框
    hideErrorModal() {
        document.getElementById('error-modal').classList.remove('active');
    }

    // 获取应用状态
    getAppStatus() {
        return {
            initialized: this.isInitialized,
            hasLocation: !!this.currentLocation,
            carInfo: this.currentCar,
            locationStatus: this.locationManager.getStatus(),
            mapStatus: this.mapManager.getStatus(),
            currentPage: this.pageHistory[this.pageHistory.length - 1],
            pageHistory: [...this.pageHistory]
        };
    }

    // 重置应用
    reset() {
        // 停止定位监听
        if (this.locationManager) {
            this.locationManager.destroy();
        }

        // 销毁地图
        if (this.mapManager) {
            this.mapManager.destroy();
        }

        // 重置状态
        this.currentCar = null;
        this.currentLocation = null;
        this.isInitialized = false;
        this.pageHistory = [];

        // 清理缓存
        Utils.storage.clear();

        if (APP_CONFIG.debug) {
            console.log('应用已重置');
        }
    }

    
    // 销毁应用
    destroy() {
        this.reset();

        // 清理事件监听器
        document.removeEventListener('visibilitychange', this.setupVisibilityHandling);
        window.removeEventListener('focus', this._checkMapStatus);
        document.removeEventListener('keydown', this.handleKeyPress);
        document.removeEventListener('touchmove', this.handleTouchMove);

        if (APP_CONFIG.debug) {
            console.log('应用已销毁');
        }
    }
}

// 应用初始化
document.addEventListener('DOMContentLoaded', async () => {
    // 创建应用实例
    window.app = new VehicleLocationApp();

    try {
        // 初始化应用
        await window.app.init();

        // 全局错误处理
        window.addEventListener('error', (event) => {
            Utils.logError(event.error, {
                type: 'global_error',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
        });

        // 未处理的Promise拒绝
        window.addEventListener('unhandledrejection', (event) => {
            Utils.logError(event.reason, {
                type: 'unhandled_promise_rejection'
            });
        });

    } catch (error) {
        console.error('应用初始化失败:', error);
        Utils.logError(error, {
            type: 'app_initialization_failure'
        });

        // 显示错误页面
        document.body.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: Arial, sans-serif;">
                <div style="text-align: center; padding: 20px; max-width: 300px;">
                    <h2 style="color: #333; margin-bottom: 20px;">应用启动失败</h2>
                    <p style="color: #666; margin-bottom: 20px;">${error.message}</p>
                    <button onclick="location.reload()" style="padding: 10px 20px; background: #007AFF; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        重新加载
                    </button>
                </div>
            </div>
        `;
    }
});

// 添加加载动画样式
const loadingStyles = `
<style>
.icon.loading {
    animation: spin 1s linear infinite;
    display: inline-block;
}
</style>
`;
document.head.insertAdjacentHTML('beforeend', loadingStyles);