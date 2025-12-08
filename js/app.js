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

        // 添加调试信息
        if (typeof window !== 'undefined') {
            window.appDebug = {
                log: (...args) => {
                    if (APP_CONFIG.debug) {
                        console.log('[APP]', ...args);
                    }
                }
            };
        }
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

            // 设置页面可见性变化监听
            this.setupVisibilityHandling();

            // 开始定位
            await this.startLocationTracking();

            this.isInitialized = true;

            // 记录初始化完成时间
            const initTime = Date.now() - this.initStartTime;
            if (APP_CONFIG.debug) {
                console.log(`应用初始化完成，耗时: ${initTime}ms`);
            }

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
        if (!Utils.isMobileDevice()) {
            console.warn('检测到非移动设备，部分功能可能体验不佳');
        }

        // 记录设备信息
        const deviceInfo = Utils.getDeviceInfo();
        Utils.storage.set('device_info', deviceInfo, 24 * 60 * 60 * 1000); // 缓存24小时

        if (APP_CONFIG.debug) {
            console.log('设备信息:', deviceInfo);
        }
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

    // 开始定位追踪
    async startLocationTracking() {
        try {
            // 获取当前位置
            const location = await this.locationManager.getCurrentPosition();
            this.currentLocation = location;

            // 初始化地图
            await this.initializeMap();

            // 显示地图页面
            this.showMapPage();

            // 开始监听位置变化
            this.locationManager.watchPosition((newLocation) => {
                this.onLocationUpdate(newLocation);
            });

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

    // 位置更新回调
    onLocationUpdate(location) {
        const oldLocation = this.currentLocation;
        this.currentLocation = location;

        // 计算移动距离
        if (oldLocation && LocationManager.isValidPosition(location)) {
            const distance = LocationManager.calculateDistance(
                oldLocation.lat, oldLocation.lng,
                location.lat, location.lng
            );

            if (APP_CONFIG.debug && distance > 10) { // 移动超过10米
                console.log(`位置更新，移动距离: ${Math.round(distance)}米`);
            }
        }

        if (this.mapManager.isMapLoaded) {
            this.updateMapDisplay();
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

    // 显示地图页面
    showMapPage() {
        this.showPage('map-page');
        document.getElementById('location-title').textContent = this.currentCar.name;
    }

    // 显示分享页面
    async showSharePage() {
        this.showPage('share-page');

        try {
            // 生成截图
            const screenshotUrl = await this.mapManager.generateScreenshot(
                this.currentLocation,
                this.currentCar
            );

            // 设置截图
            const screenshotImage = document.getElementById('screenshot-image');
            if (screenshotImage) {
                screenshotImage.src = screenshotUrl;
                screenshotImage.onload = () => {
                    if (APP_CONFIG.debug) {
                        console.log('分享截图加载完成');
                    }
                };
                screenshotImage.onerror = () => {
                    console.error('分享截图加载失败');
                    Utils.showToast('截图生成失败，请重试');
                };
            }

            // 更新分享信息
            this.updateShareInfo();

        } catch (error) {
            Utils.logError(error, { type: 'share_page' });
            Utils.showToast('分享页面加载失败: ' + error.message);
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