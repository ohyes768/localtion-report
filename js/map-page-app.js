/**
 * 车辆定位页主应用
 * 整合所有模块，处理页面逻辑
 */
class MapPageApp {
    constructor() {
        this.currentCar = null;
        this.currentLocation = null;
        this.locationManager = null;
        this.mapManager = null;
        this.infoCard = null;
        this.actionButtons = null;
        this.screenshotManager = null;
        this.isInitialized = false;
    }

    /**
     * 初始化应用
     */
    async init() {
        try {
            console.log('🚀 开始初始化应用...');

            // 解析URL参数
            const params = Utils.getUrlParams();
            const carId = params.car;

            if (!carId || !VEHICLE_CONFIG[carId]) {
                throw new Error('无效的车辆参数，请重新选择车辆');
            }

            this.currentCar = VEHICLE_CONFIG[carId];
            console.log('📗 当前车辆:', this.currentCar.name);

            // 初始化模块
            this.infoCard = new VehicleInfoCard('vehicle-info-card');
            this.infoCard.initialize(this.currentCar);

            this.screenshotManager = new ScreenshotManager();

            this.actionButtons = new ActionButtons();
            this.setupActionButtons();

            // 设置页面标题
            document.title = `${this.currentCar.name} - 位置`;

            // 显示加载状态
            this.infoCard.setLoading(true);

            // 初始化定位和地图管理器
            this.locationManager = new LocationManager();
            this.mapManager = new MapManager();

            // 开始定位
            await this.startLocationTracking();

            this.isInitialized = true;
            console.log('✅ 应用初始化完成');

        } catch (error) {
            console.error('❌ 应用初始化失败:', error);
            this.showError(error.message);
        }
    }

    /**
     * 设置操作按钮回调
     */
    setupActionButtons() {
        this.actionButtons.on('switch', () => {
            console.log('🔄 返回车辆选择页');
            window.location.href = 'index.html';
        });

        this.actionButtons.on('refresh', async () => {
            await this.refreshLocation();
        });

        this.actionButtons.on('share', async () => {
            await this.shareLocation();
        });
    }

    /**
     * 开始定位追踪
     */
    async startLocationTracking() {
        try {
            console.log('📍 开始定位...');

            // 获取当前位置
            const location = await this.locationManager.getCurrentPosition();
            this.currentLocation = location;

            console.log('✅ 定位成功:', {
                lat: location.lat,
                lng: location.lng,
                provider: location.provider,
                isDefault: location.isDefaultLocation
            });

            // 更新信息卡片
            this.infoCard.updateLocation(location);

            // 初始化地图
            await this.initializeMap();

            // 获取地址
            await this.fetchAddress();

        } catch (error) {
            console.error('❌ 定位失败:', error);
            this.infoCard.showError('定位失败，请检查定位权限');
            throw error;
        } finally {
            this.infoCard.setLoading(false);
        }
    }

    /**
     * 初始化地图
     */
    async initializeMap() {
        try {
            console.log('🗺️ 初始化地图...');

            // 在地图初始化前拦截WebGL上下文，启用preserveDrawingBuffer以支持截图
            if (typeof this.mapManager.interceptWebGLContext === 'function') {
                this.mapManager.interceptWebGLContext();
            } else {
                console.warn('⚠️ interceptWebGLContext 方法不存在，可能影响截图功能');
            }

            const container = document.getElementById('map-container');
            await this.mapManager.initializeMap(
                container,
                this.currentLocation,
                MAP_CONFIG.zoom
            );

            // 添加车辆标记
            this.mapManager.addMarker(this.currentLocation, this.currentCar);

            console.log('✅ 地图初始化完成');

        } catch (error) {
            console.error('❌ 地图初始化失败:', error);
            Utils.showToast('地图加载失败: ' + error.message);
        }
    }

    /**
     * 获取地址信息
     */
    async fetchAddress() {
        try {
            const address = await this.mapManager.getAddressFromLocation(this.currentLocation);
            this.infoCard.updateAddress(address);
            console.log('✅ 地址解析成功:', address);
        } catch (error) {
            console.error('❌ 地址解析失败:', error);
            this.infoCard.updateAddress('地址解析失败');
        }
    }

    /**
     * 刷新定位
     */
    async refreshLocation() {
        try {
            console.log('🔄 刷新定位...');

            const location = await this.locationManager.getCurrentPosition({ force: true });
            this.currentLocation = location;

            // 更新信息卡片
            this.infoCard.updateLocation(location);
            this.infoCard.updateParkingTime();

            // 更新地图标记
            this.mapManager.addMarker(location, this.currentCar);
            this.mapManager.setCenter(location);

            // 重新获取地址
            await this.fetchAddress();

            Utils.showToast('✅ 位置已更新');
            console.log('✅ 定位刷新完成');

        } catch (error) {
            console.error('❌ 刷新定位失败:', error);
            Utils.showToast('刷新失败: ' + error.message);
            throw error;
        }
    }

    /**
     * 分享位置 - 截图分享
     */
    async shareLocation() {
        try {
            console.log('📸 截图分享...');

            // 更新停车时间
            this.infoCard.updateParkingTime();

            // 获取地址（失败不影响截图）
            let address = '地址解析中...';
            try {
                address = await this.mapManager.getAddressFromLocation(this.currentLocation);
            } catch (error) {
                console.warn('⚠️ 地址解析失败，使用坐标信息:', error);
                // 地址解析失败不影响截图，使用坐标作为地址
                address = `坐标: ${this.currentLocation.lat.toFixed(6)}, ${this.currentLocation.lng.toFixed(6)}`;
            }

            // 初始化截图管理器
            this.screenshotManager.initialize(
                this.mapManager,
                this.currentCar,
                this.currentLocation,
                address
            );

            // 执行截图并分享
            await this.screenshotManager.captureAndShare();

        } catch (error) {
            console.error('❌ 截图分享失败:', error);
            Utils.showToast('截图失败: ' + error.message);
            throw error;
        }
    }

    /**
     * 显示错误信息
     * @param {string} message - 错误信息
     */
    showError(message) {
        const errorModal = new bootstrap.Modal(document.getElementById('errorModal'));
        document.getElementById('errorMessage').textContent = message;
        errorModal.show();
    }
}

// 应用初始化
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 DOM加载完成，开始初始化应用...');

    // 创建应用实例
    window.app = new MapPageApp();

    try {
        await window.app.init();
    } catch (error) {
        console.error('❌ 应用启动失败:', error);
    }
});

// 页面可见性变化时刷新定位
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && window.app && window.app.isInitialized) {
        console.log('👁️ 页面重新可见，刷新定位...');
        // 可选：自动刷新定位
        // window.app.refreshLocation();
    }
});

// 导出为全局变量
if (typeof window !== 'undefined') {
    window.MapPageApp = MapPageApp;
}
