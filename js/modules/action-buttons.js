/**
 * 操作按钮模块
 * 负责管理底部操作按钮的事件和状态
 */
class ActionButtons {
    constructor() {
        this.switchBtn = document.getElementById('switch-vehicle');
        this.refreshBtn = document.getElementById('refresh-location');
        this.shareBtn = document.getElementById('share-location');

        this.callbacks = {
            onSwitch: null,
            onRefresh: null,
            onShare: null
        };

        this.init();
    }

    /**
     * 初始化按钮
     */
    init() {
        if (!this.switchBtn || !this.refreshBtn || !this.shareBtn) {
            console.error('操作按钮元素未找到');
            return;
        }

        // 绑定事件
        this.switchBtn.addEventListener('click', () => this.handleSwitch());
        this.refreshBtn.addEventListener('click', () => this.handleRefresh());
        this.shareBtn.addEventListener('click', () => this.handleShare());

        console.log('✅ 操作按钮初始化成功');
    }

    /**
     * 设置回调函数
     * @param {string} event - 事件名称 ('switch', 'refresh', 'share')
     * @param {Function} callback - 回调函数
     */
    on(event, callback) {
        if (this.callbacks.hasOwnProperty('on' + event.charAt(0).toUpperCase() + event.slice(1))) {
            this.callbacks['on' + event.charAt(0).toUpperCase() + event.slice(1)] = callback;
        } else {
            console.warn('未知事件:', event);
        }
    }

    /**
     * 处理切换车辆
     */
    handleSwitch() {
        console.log('🔄 切换车辆按钮点击');
        if (this.callbacks.onSwitch) {
            this.callbacks.onSwitch();
        } else {
            // 默认行为：返回车辆选择页
            window.location.href = 'index.html';
        }
    }

    /**
     * 处理刷新定位
     */
    async handleRefresh() {
        console.log('🔄 刷新定位按钮点击');

        // 禁用按钮，防止重复点击
        this.setRefreshLoading(true);

        try {
            if (this.callbacks.onRefresh) {
                await this.callbacks.onRefresh();
            }
        } catch (error) {
            console.error('刷新定位失败:', error);
            Utils.showToast('刷新失败: ' + error.message);
        } finally {
            this.setRefreshLoading(false);
        }
    }

    /**
     * 处理分享位置
     */
    async handleShare() {
        console.log('📤 分享位置按钮点击');

        // 禁用按钮
        this.setShareLoading(true);

        try {
            if (this.callbacks.onShare) {
                await this.callbacks.onShare();
            }
        } catch (error) {
            console.error('分享失败:', error);
            Utils.showToast('分享失败: ' + error.message);
        } finally {
            this.setShareLoading(false);
        }
    }

    /**
     * 设置刷新按钮的加载状态
     * @param {boolean} loading - 是否加载中
     */
    setRefreshLoading(loading) {
        if (loading) {
            this.refreshBtn.disabled = true;
            this.refreshBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>定位中...';
        } else {
            this.refreshBtn.disabled = false;
            this.refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> 刷新定位';
        }
    }

    /**
     * 设置分享按钮的加载状态
     * @param {boolean} loading - 是否加载中
     */
    setShareLoading(loading) {
        if (loading) {
            this.shareBtn.disabled = true;
            this.shareBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>生成中...';
        } else {
            this.shareBtn.disabled = false;
            this.shareBtn.innerHTML = '<i class="bi bi-share"></i> 截图分享';
        }
    }

    /**
     * 禁用所有按钮
     */
    disableAll() {
        this.switchBtn.disabled = true;
        this.refreshBtn.disabled = true;
        this.shareBtn.disabled = true;
    }

    /**
     * 启用所有按钮
     */
    enableAll() {
        this.switchBtn.disabled = false;
        this.refreshBtn.disabled = false;
        this.shareBtn.disabled = false;
    }
}

// 导出为全局变量（供非模块化环境使用）
if (typeof window !== 'undefined') {
    window.ActionButtons = ActionButtons;
}
