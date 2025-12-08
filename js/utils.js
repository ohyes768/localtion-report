// 工具函数集合
const Utils = {
    // URL参数解析
    getUrlParams: function() {
        const params = new URLSearchParams(window.location.search);
        const result = {};
        for (const [key, value] of params) {
            result[key] = value;
        }
        return result;
    },

    // 格式化时间
    formatTime: function(date = new Date()) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');

        return `${year}-${month}-${day} ${hours}:${minutes}`;
    },

    // 格式化坐标精度
    formatCoordinate: function(coord, precision = 6) {
        return Number(coord).toFixed(precision);
    },

    // 计算两点距离（单位：米）
    calculateDistance: function(lat1, lng1, lat2, lng2) {
        const R = 6371e3; // 地球半径（米）
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lng2 - lng1) * Math.PI / 180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c;
    },

    // 复制到剪贴板
    copyToClipboard: async function(text) {
        try {
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(text);
                return true;
            } else {
                // 兼容旧版浏览器
                const textArea = document.createElement('textarea');
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                return true;
            }
        } catch (err) {
            console.error('复制失败:', err);
            return false;
        }
    },

    // 显示提示信息
    showToast: function(message, duration = 2000) {
        const toast = document.getElementById('toast');
        if (!toast) {
            console.warn('Toast element not found');
            return;
        }

        toast.textContent = message;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
    },

    // 防抖函数
    debounce: function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // 节流函数
    throttle: function(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // 检查是否在微信浏览器中
    isWechatBrowser: function() {
        const ua = navigator.userAgent.toLowerCase();
        return ua.includes('micromessenger');
    },

    // 检查是否为移动设备
    isMobileDevice: function() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },

    // 生成分享文案
    generateShareText: function(carInfo, address, time, analysis = null) {
        let text = `🚗 ${carInfo.name}（${carInfo.plate}）
📍 当前位置：${address}
🕒 更新时间：${time}`;

        // 添加位置分析信息
        if (analysis && APP_CONFIG.analysis.enableLocationAnalysis) {
            text += `
📊 位置分析：${analysis}`;
        }

        text += `
❤️ 点击链接查看：${window.location.href}`;

        return text;
    },

    // 分析位置信息
    analyzeLocation: function(location, address) {
        if (!APP_CONFIG.analysis.enableLocationAnalysis) {
            return null;
        }

        const analysis = [];

        // 定位精度分析
        const accuracyLevel = this.getAccuracyLevel(location.accuracy);
        analysis.push(`定位精度${accuracyLevel}`);

        // 停车环境分析
        const parkingEnv = this.analyzeParkingEnvironment(address);
        if (parkingEnv) {
            analysis.push(parkingEnv);
        }

        // 位置类型分析
        const locationType = this.analyzeLocationType(address);
        if (locationType) {
            analysis.push(locationType);
        }

        return analysis.join('，');
    },

    // 获取精度级别
    getAccuracyLevel: function(accuracy) {
        if (accuracy < 10) return '极高（室内级）';
        if (accuracy < 30) return '高（精准定位）';
        if (accuracy < 100) return '中等（一般定位）';
        if (accuracy < 500) return '低（粗略定位）';
        return '极低（区域级）';
    },

    // 分析停车环境
    analyzeParkingEnvironment: function(address) {
        const keywords = {
            indoor: ['停车场', '地下', '车库', 'B1', 'B2', '楼内'],
            outdoor: ['路边', '街道', '广场', '地面', '露天'],
            residential: ['小区', '花园', '苑', '家园'],
            commercial: ['商场', '超市', '购物中心', '写字楼'],
            public: ['医院', '学校', '公园', '体育场']
        };

        for (const [type, words] of Object.entries(keywords)) {
            if (words.some(word => address.includes(word))) {
                switch(type) {
                    case 'indoor': return '室内停车场';
                    case 'outdoor': return '室外停车';
                    case 'residential': return '住宅区停车';
                    case 'commercial': return '商业区停车';
                    case 'public': return '公共场所停车';
                }
            }
        }

        return null;
    },

    // 分析位置类型
    analyzeLocationType: function(address) {
        if (address.includes('公司') || address.includes('大厦') || address.includes('写字楼')) {
            return '工作地点';
        }
        if (address.includes('家') || address.includes('小区') || address.includes('花园')) {
            return '居住地点';
        }
        if (address.includes('商场') || address.includes('超市') || address.includes('购物中心')) {
            return '购物地点';
        }
        if (address.includes('学校') || address.includes('医院') || address.includes('银行')) {
            return '公共服务地点';
        }

        return '其他地点';
    },

    // 本地存储工具
    storage: {
        set: function(key, value, ttl = null) {
            try {
                const item = {
                    value: value,
                    timestamp: Date.now(),
                    ttl: ttl
                };
                localStorage.setItem(key, JSON.stringify(item));
            } catch (error) {
                console.error('存储失败:', error);
            }
        },

        get: function(key) {
            try {
                const item = JSON.parse(localStorage.getItem(key));
                if (!item) return null;

                // 检查是否过期
                if (item.ttl && (Date.now() - item.timestamp) > item.ttl) {
                    localStorage.removeItem(key);
                    return null;
                }

                return item.value;
            } catch (error) {
                console.error('读取失败:', error);
                return null;
            }
        },

        remove: function(key) {
            try {
                localStorage.removeItem(key);
            } catch (error) {
                console.error('删除失败:', error);
            }
        },

        clear: function() {
            try {
                localStorage.clear();
            } catch (error) {
                console.error('清空失败:', error);
            }
        }
    },

    // HTTP请求工具
    request: async function(url, options = {}) {
        const defaultOptions = {
            timeout: API_CONFIG.timeout,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const finalOptions = { ...defaultOptions, ...options };

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), finalOptions.timeout);

            const response = await fetch(url, {
                ...finalOptions,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('请求超时');
            }
            throw error;
        }
    },

    // 重试机制
    async retry(fn, maxRetries = PERFORMANCE_CONFIG.maxRetries, interval = PERFORMANCE_CONFIG.retryInterval) {
        let lastError;

        for (let i = 0; i <= maxRetries; i++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                if (i < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, interval));
                }
            }
        }

        throw lastError;
    },

    // 获取设备信息
    getDeviceInfo: function() {
        const ua = navigator.userAgent;
        const info = {
            userAgent: ua,
            platform: navigator.platform,
            language: navigator.language,
            isMobile: this.isMobileDevice(),
            isWechat: this.isWechatBrowser(),
            isIOS: /iPad|iPhone|iPod/.test(ua),
            isAndroid: /Android/.test(ua)
        };

        // 获取屏幕信息
        info.screen = {
            width: screen.width,
            height: screen.height,
            availWidth: screen.availWidth,
            availHeight: screen.availHeight
        };

        // 获取视窗信息
        info.viewport = {
            width: window.innerWidth,
            height: window.innerHeight
        };

        return info;
    },

    // 错误日志记录
    logError: function(error, context = {}) {
        if (APP_CONFIG.debug) {
            console.error('应用错误:', error, context);
        }

        // 这里可以添加错误上报逻辑
        const errorInfo = {
            message: error.message,
            stack: error.stack,
            context: context,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        // 存储到本地（用于调试）
        const errors = this.storage.get('app_errors') || [];
        errors.push(errorInfo);

        // 只保留最近50条错误
        if (errors.length > 50) {
            errors.shift();
        }

        this.storage.set('app_errors', errors);
    },

    // 生成唯一ID
    generateId: function(prefix = 'id') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    // 格式化文件大小
    formatFileSize: function(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
};