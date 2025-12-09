// 简化的浏览器检测
class BrowserDetection {
    constructor() {
        this.browserInfo = this.getBrowserInfo();
    }

    // 获取基本浏览器信息
    getBrowserInfo() {
        const ua = navigator.userAgent;
        return {
            isWechat: /MicroMessenger/.test(ua),
            isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua),
            isAndroid: /Android/.test(ua),
            isIOS: /iPhone|iPad|iPod/.test(ua),
            userAgent: ua
        };
    }

    // 基本定位策略
    getLocationStrategy() {
        return {
            name: '标准定位',
            enableHighAccuracy: true,
            timeout: 20000,
            maximumAge: 0,
            retries: 2
        };
    }
}

// 导出单例实例
const browserDetection = new BrowserDetection();