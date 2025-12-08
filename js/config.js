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
    key: '67PBZ-AWOWQ-TTW5A-BTI3M-BNMHH-2YBXZ', // 需要替换为实际的腾讯地图API Key
    center: [39.908692, 116.397477], // 北京天安门
    zoom: 16,
    style: 'normal'
};

// 应用配置
const APP_CONFIG = {
    title: '家庭车辆位置分享系统',
    version: '1.0.0',
    debug: false, // 开发环境设为true
    locationTimeout: 10000, // 定位超时时间（毫秒）
    mapZoomLevels: {
        default: 16,
        detailed: 18,
        overview: 14
    },
    // 分析功能配置
    analysis: {
        enableLocationAnalysis: true, // 启用位置分析功能
        showParkingRecommendation: true, // 显示停车建议
        showLocationHistory: false // 是否显示历史位置（暂不实现）
    }
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

// 分享配置
const SHARE_CONFIG = {
    screenshotSize: {
        width: 600,
        height: 400
    },
    mapTypes: ['roadmap', 'satellite'],
    defaultMapType: 'roadmap'
};

// API配置
const API_CONFIG = {
    // 腾讯地图API
    tencentMap: {
        baseUrl: 'https://apis.map.qq.com',
        geocoder: '/ws/geocoder/v1/',
        staticMap: '/ws/staticmap/v2/'
    },
    // 请求超时时间
    timeout: 8000
};

// 缓存配置
const CACHE_CONFIG = {
    // 地址缓存时间（毫秒）
    addressCacheTime: 5 * 60 * 1000, // 5分钟
    // 位置缓存时间（毫秒）
    locationCacheTime: 30 * 1000, // 30秒
    // 截图缓存时间（毫秒）
    screenshotCacheTime: 2 * 60 * 1000 // 2分钟
};

// 性能配置
const PERFORMANCE_CONFIG = {
    // 防抖延迟（毫秒）
    debounceDelay: 300,
    // 节流间隔（毫秒）
    throttleInterval: 100,
    // 最大重试次数
    maxRetries: 3,
    // 重试间隔（毫秒）
    retryInterval: 1000
};