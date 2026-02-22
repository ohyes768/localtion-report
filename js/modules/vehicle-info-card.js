/**
 * 车辆信息卡片组件
 * 负责渲染和更新车辆位置信息卡片
 */
class VehicleInfoCard {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.vehicle = null;
        this.location = null;
        this.address = '';
    }

    /**
     * 初始化卡片
     * @param {Object} vehicle - 车辆信息
     */
    initialize(vehicle) {
        this.vehicle = vehicle;
        this.render();
        console.log('✅ 车辆信息卡片初始化', { vehicle: vehicle.name });
    }

    /**
     * 渲染卡片内容
     */
    render() {
        if (!this.container || !this.vehicle) {
            console.error('车辆信息卡片初始化失败');
            return;
        }

        // 生成停车时间（如果存在）
        const parkingTime = this.location && this.location.timestamp
            ? Utils.formatTime(new Date(this.location.timestamp))
            : Utils.formatTime(new Date());

        // 构建卡片HTML - 左右分栏布局
        this.container.innerHTML = `
            <div class="vehicle-info-content">
                <!-- 左侧：车辆信息 -->
                <div class="vehicle-left">
                    <div class="vehicle-avatar">
                        <img src="${this.vehicle.logo}" alt="${this.vehicle.brand}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2250%22 height=%2250%22><text y=%22.9em%22 font-size=%2245%22>🚗</text></svg>'">
                    </div>
                    <div class="vehicle-details">
                        <div class="vehicle-name">${this.vehicle.name}</div>
                        <div class="vehicle-plate">${this.vehicle.plate}</div>
                    </div>
                </div>

                <!-- 右侧：位置信息 -->
                <div class="location-right">
                    <div class="info-item">
                        <i class="bi bi-geo-alt text-primary"></i>
                        <span class="info-value" id="coordinates">正在获取...</span>
                    </div>
                    <div class="info-item">
                        <i class="bi bi-map text-success"></i>
                        <span class="info-value" id="address">正在解析...</span>
                    </div>
                    <div class="info-item">
                        <i class="bi bi-clock text-warning"></i>
                        <span class="info-value" id="parking-time">${parkingTime}</span>
                    </div>
                    <div class="info-item">
                        <i class="bi bi-zoom-in text-info"></i>
                        <span class="info-value">放大: x${MAP_CONFIG.zoom}</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 更新位置信息
     * @param {Object} location - 位置信息
     */
    updateLocation(location) {
        this.location = location;

        // 更新经纬度显示
        const coordinatesEl = this.container.querySelector('#coordinates');
        if (coordinatesEl && location) {
            const lat = location.lat.toFixed(6);
            const lng = location.lng.toFixed(6);
            coordinatesEl.textContent = `${lat}, ${lng}`;

            // 如果是默认位置，添加特殊样式
            if (location.isDefaultLocation) {
                coordinatesEl.style.color = '#ff9500';
                coordinatesEl.style.fontStyle = 'italic';
            }
        }

        console.log('✅ 位置信息已更新', {
            coordinates: coordinatesEl?.textContent
        });
    }

    /**
     * 更新地址信息
     * @param {string} address - 地址字符串
     */
    updateAddress(address) {
        this.address = address;

        const addressEl = this.container.querySelector('#address');
        if (addressEl) {
            addressEl.textContent = address || '地址解析失败';
        }

        console.log('✅ 地址信息已更新', { address });
    }

    /**
     * 更新停车时间
     */
    updateParkingTime() {
        const timeEl = this.container.querySelector('#parking-time');
        if (timeEl) {
            const time = this.location && this.location.timestamp
                ? Utils.formatTime(new Date(this.location.timestamp))
                : Utils.formatTime(new Date());
            timeEl.textContent = time;
        }
    }

    /**
     * 显示加载状态
     * @param {boolean} loading - 是否加载中
     */
    setLoading(loading) {
        const coordsEl = this.container.querySelector('#coordinates');
        const addrEl = this.container.querySelector('#address');

        if (loading) {
            if (coordsEl) coordsEl.textContent = '正在获取...';
            if (addrEl) addrEl.textContent = '正在解析...';
        }
    }

    /**
     * 显示错误状态
     * @param {string} message - 错误信息
     */
    showError(message) {
        const coordsEl = this.container.querySelector('#coordinates');
        const addrEl = this.container.querySelector('#address');

        if (coordsEl) {
            coordsEl.textContent = '获取失败';
            coordsEl.style.color = '#dc3545';
        }
        if (addrEl) {
            addrEl.textContent = message;
            addrEl.style.color = '#dc3545';
        }
    }
}

// 导出为全局变量（供非模块化环境使用）
if (typeof window !== 'undefined') {
    window.VehicleInfoCard = VehicleInfoCard;
}
