/**
 * 车辆卡片组件
 * 负责渲染单个车辆的选择卡片
 */
class VehicleCard {
    constructor(vehicle) {
        this.vehicle = vehicle;
    }

    /**
     * 渲染车辆卡片
     * @returns {HTMLElement} 车辆卡片DOM元素
     */
    render() {
        // 创建外层容器
        const col = document.createElement('div');
        col.className = 'col-6';

        // 创建卡片元素
        const card = document.createElement('div');
        card.className = 'vehicle-card';
        card.setAttribute('data-car-id', this.vehicle.id);

        // 构建卡片HTML内容
        card.innerHTML = `
            <div class="vehicle-logo">
                <img src="${this.vehicle.logo}" alt="${this.vehicle.brand}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2250%22 height=%2250%22><text y=%22.9em%22 font-size=%2245%22>🚗</text></svg>'">
            </div>
            <div class="vehicle-name">${this.vehicle.name}</div>
            <div class="vehicle-plate">${this.vehicle.plate}</div>
        `;

        // 添加点击事件
        card.addEventListener('click', () => {
            this.selectVehicle();
        });

        // 添加键盘支持（Enter和Space键）
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', `选择${this.vehicle.name}`);

        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.selectVehicle();
            }
        });

        col.appendChild(card);
        return col;
    }

    /**
     * 选择车辆并跳转到定位页
     */
    selectVehicle() {
        // 添加点击动画效果
        const card = document.querySelector(`[data-car-id="${this.vehicle.id}"]`);
        if (card) {
            card.style.transform = 'scale(0.95)';
            setTimeout(() => {
                card.style.transform = '';
            }, 150);
        }

        // 跳转到车辆定位页
        setTimeout(() => {
            window.location.href = `map-page.html?car=${this.vehicle.id}`;
        }, 200);
    }
}

// 导出为全局变量（供非模块化环境使用）
if (typeof window !== 'undefined') {
    window.VehicleCard = VehicleCard;
}
