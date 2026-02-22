/**
 * 车辆选择器
 * 负责管理车辆选择页面的逻辑
 */
class VehicleSelector {
    constructor() {
        this.vehicles = null;
        this.container = null;
        this.init();
    }

    /**
     * 初始化选择器
     */
    init() {
        // 检查VEHICLE_CONFIG是否已加载
        if (typeof VEHICLE_CONFIG === 'undefined') {
            console.error('VEHICLE_CONFIG未定义，请确保config.js已加载');
            this.showError('配置加载失败，请刷新页面重试');
            return;
        }

        this.vehicles = VEHICLE_CONFIG;
        this.container = document.getElementById('vehicle-grid');

        if (!this.container) {
            console.error('找不到车辆容器元素 #vehicle-grid');
            return;
        }

        // 渲染车辆卡片
        this.renderVehicleCards();

        console.log('✅ 车辆选择器初始化成功', {
            vehicleCount: Object.keys(this.vehicles).length
        });
    }

    /**
     * 渲染所有车辆卡片
     */
    renderVehicleCards() {
        // 清空容器
        this.container.innerHTML = '';

        // 遍历车辆配置并创建卡片
        Object.values(this.vehicles).forEach(vehicle => {
            const card = new VehicleCard(vehicle);
            const cardElement = card.render();
            this.container.appendChild(cardElement);
        });

        console.log('✅ 车辆卡片渲染完成', {
            count: this.container.children.length
        });
    }

    /**
     * 显示错误信息
     * @param {string} message - 错误信息
     */
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger text-center';
        errorDiv.textContent = message;
        this.container.innerHTML = '';
        this.container.appendChild(errorDiv);
    }
}

// 导出为全局变量（供非模块化环境使用）
if (typeof window !== 'undefined') {
    window.VehicleSelector = VehicleSelector;
}
