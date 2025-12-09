// 浏览器检测和定位优化
class BrowserDetection {
    constructor() {
        this.browserInfo = this.getBrowserInfo();
        this.locationStrategy = this.getLocationStrategy();
    }

    // 获取浏览器信息
    getBrowserInfo() {
        const ua = navigator.userAgent;
        const vendor = navigator.vendor || '';

        return {
            isUC: /UCBrowser|UCWEB/.test(ua),
            isMiuiBrowser: /MiuiBrowser|mibrowser/.test(ua),
            isWechat: /MicroMessenger/.test(ua),
            isChrome: /Chrome/.test(ua) && /Google Inc/.test(vendor),
            isFirefox: /Firefox/.test(ua),
            isSafari: /Safari/.test(ua) && /Apple Computer/.test(vendor),
            isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua),
            isAndroid: /Android/.test(ua),
            isIOS: /iPhone|iPad|iPod/.test(ua),
            userAgent: ua
        };
    }

    // 根据浏览器选择定位策略
    getLocationStrategy() {
        const { isUC, isMiuiBrowser, isWechat, isMobile, isAndroid, isIOS } = this.browserInfo;

        if (isWechat) {
            return {
                name: '微信浏览器',
                enableHighAccuracy: true,  // 强制高精度
                timeout: 25000,            // 增加超时时间到25秒
                maximumAge: 0,             // 不使用缓存位置
                retries: 3,                // 增加重试次数
                description: '微信浏览器高精度定位策略，解决定位偏差问题'
            };
        }

        if (isUC) {
            return {
                name: 'UC浏览器',
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0,
                retries: 2,
                description: 'UC浏览器定位优化，使用增强定位服务'
            };
        }

        if (isMiuiBrowser) {
            return {
                name: '小米浏览器',
                enableHighAccuracy: true,
                timeout: 25000,  // 增加超时时间
                maximumAge: 0,
                retries: 3,      // 增加重试次数
                description: '小米浏览器需要更长的定位时间和更多重试'
            };
        }

        if (isAndroid) {
            return {
                name: 'Android浏览器',
                enableHighAccuracy: true,
                timeout: 20000,
                maximumAge: 0,
                retries: 2,
                description: 'Android设备定位策略'
            };
        }

        if (isIOS) {
            return {
                name: 'iOS浏览器',
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0,
                retries: 2,
                description: 'iOS设备定位策略'
            };
        }

        return {
            name: '通用浏览器',
            enableHighAccuracy: true,
            timeout: 20000,
            maximumAge: 0,
            retries: 2,
            description: '标准定位策略'
        };
    }

    // 获取定位建议
    getLocationAdvice() {
        const { isUC, isMiuiBrowser } = this.browserInfo;

        if (isMiuiBrowser) {
            return {
                title: '小米浏览器定位优化建议',
                tips: [
                    '请确保已开启GPS定位服务',
                    '建议在室外或靠近窗户的位置使用',
                    '可以尝试切换到UC浏览器获得更好的定位体验',
                    '检查浏览器是否获得了定位权限'
                ],
                accuracy: '中等'
            };
        }

        if (isUC) {
            return {
                title: 'UC浏览器定位',
                tips: [
                    'UC浏览器通常提供较好的定位精度',
                    '建议使用最新版本的UC浏览器',
                    '确保已授予定位权限'
                ],
                accuracy: '高'
            };
        }

        return {
            title: '浏览器定位',
            tips: [
                '建议使用Chrome或UC浏览器获得最佳定位效果',
                '确保设备GPS功能已开启',
                '在空旷区域定位精度更高'
            ],
            accuracy: '标准'
        };
    }

    // 检测是否需要使用腾讯定位组件
    shouldUseTencentLocation() {
        // 小米浏览器建议使用腾讯定位作为补充
        return this.browserInfo.isMiuiBrowser;
    }

    // 获取调试信息
    getDebugInfo() {
        return {
            browser: this.browserInfo,
            strategy: this.locationStrategy,
            timestamp: new Date().toISOString(),
            locationSupport: 'geolocation' in navigator,
            permissions: 'permissions' in navigator
        };
    }
}

// 导出单例实例
const browserDetection = new BrowserDetection();

// 如果在模块环境中
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BrowserDetection, browserDetection };
}