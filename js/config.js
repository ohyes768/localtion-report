// 车辆配置
const VEHICLE_CONFIG = {
    car001: {
        id: 'car001',
        name: '雷克萨斯LS200',
        plate: '浙A5W717',
        color: '#FF6B6B'
    },
    car002: {
        id: 'car002',
        name: '零跑T03',
        plate: '浙AA28508',
        color: '#4ECDC4'
    },
    car003: {
        id: 'car003',
        name: '奥迪Q5',
        plate: '浙ALQ598',
        color: '#45B7D1'
    },
    car004: {
        id: 'car004',
        name: '小米SU7',
        plate: '浙AE19779',
        color: '#96CEB4'
    }
};

// 地图API配置
const MAP_CONFIG = {
    key: '67PBZ-AWOWQ-TTW5A-BTI3M-BNMHH-2YBXZ',
    center: [39.908692, 116.397477],
    zoom: 16,
    style: 'normal',
    // 默认测试位置（杭州西湖附近）
    defaultLocation: {
        lat: 30.204763,
        lng: 120.204781,
        accuracy: 50,
        timestamp: Date.now(),
        provider: '默认位置',
        accuracyLevel: '测试位置',
        quality: 80,
        address: '浙江省杭州市西湖区西湖风景名胜区',
        isDefault: true
    }
};

// 应用配置
const APP_CONFIG = {
    title: '家庭车辆位置分享系统',
    version: '1.0.0',
    debug: false,
    locationTimeout: 20000
};

// 错误信息配置
const ERROR_MESSAGES = {
    PERMISSION_DENIED: '请允许获取位置信息',
    POSITION_UNAVAILABLE: '无法获取位置信息，请检查定位服务',
    TIMEOUT: '获取位置超时，请重试',
    INVALID_QRCODE: '无效的车辆二维码',
    NETWORK_ERROR: '网络错误，请检查网络连接',
    MAP_LOAD_ERROR: '地图加载失败，请刷新页面'
};

// 缓存配置
const CACHE_CONFIG = {
    addressCacheTime: 5 * 60 * 1000, // 5分钟
    locationCacheTime: 30 * 1000,    // 30秒
    screenshotCacheTime: 2 * 60 * 1000 // 2分钟
};