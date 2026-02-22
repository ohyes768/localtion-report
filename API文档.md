# 车辆位置分享系统 - API文档
**项目状态：** v5.0已完成 ✅
**文档版本：** v5.0
**最后更新：** 2026-02-22

## 概述

本文档描述了车辆位置分享系统v5.0（双页面架构版）中使用的API接口和模块。

### v5.0 变更说明
- **架构变化：** 双页面架构 - 车辆选择页 + 地图定位页
- **核心新增：**
  - WebGL截图功能（直接截图，无需跳转）
  - Canvas绘制中心点标记
  - 车辆信息卡片组件（左右分栏布局）
  - 操作按钮组件
  - 主应用逻辑（map-page-app.js）
- **保持不变的模块：**
  - `js/location.js` - LocationManager（定位管理）✅
  - `js/map.js` - MapManager（地图管理+WebGL上下文拦截）✅
  - `js/utils.js` - Utils工具函数 ✅
  - `js/config.js` - 配置文件 ✅

## 目录

1. [腾讯地图API](#1-腾讯地图api)
2. [浏览器定位API](#2-浏览器定位api)
3. [内部模块API](#3-内部模块api)
4. [配置接口](#4-配置接口)
5. [错误处理](#5-错误处理)

## 1. 腾讯地图API

### 1.1 地图JavaScript API

**基础URL**: `https://map.qq.com/api/gljs`

**加载地图**:
```html
<script charset="utf-8" src="https://map.qq.com/api/gljs?v=1.exp&key=67PBZ-AWOWQ-TTW5A-BTI3M-BNMHH-2YBXZ"></script>
```

**API Key**: `67PBZ-AWOWQ-TTW5A-BTI3M-BNMHH-2YBXZ`

### 1.2 腾讯位置服务API

#### 逆地理编码
**接口**: `https://apis.map.qq.com/ws/geocoder/v1/`

**请求参数**:
```javascript
{
    location: "30.204763,120.204781",  // 纬度,经度
    key: "67PBZ-AWOWQ-TTW5A-BTI3M-BNMHH-2YBXZ",
    get_poi: 1
}
```

**响应示例**:
```json
{
    "status": 0,
    "message": "query ok",
    "result": {
        "location": {
            "lat": 30.204763,
            "lng": 120.204781
        },
        "address": "浙江省杭州市西湖区西湖风景名胜区",
        "formatted_addresses": {
            "recommend": "浙江省杭州市西湖区西湖风景名胜区"
        }
    }
}
```

#### 位置标记分享
**接口**: `https://apis.map.qq.com/uri/v1/marker`

**请求参数**:
```javascript
{
    marker: "coord:30.204763,120.204781;title:雷克萨斯LS200;addr:浙江省杭州市西湖区西湖风景名胜区",
    key: "67PBZ-AWOWQ-TTW5A-BTI3M-BNMHH-2YBXZ",
    referer: "yourdomain.com"
}
```

**使用示例**:
```javascript
const markerUrl = `https://apis.map.qq.com/uri/v1/marker?marker=coord:${lat},${lng};title:${title};addr:${address}&key=${MAP_CONFIG.key}&referer=${window.location.hostname}`;
```

## 2. 浏览器定位API

### 2.1 HTML5 Geolocation API

**获取当前位置**:
```javascript
navigator.geolocation.getCurrentPosition(
    (position) => {
        const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
        };
    },
    (error) => {
        // 错误处理
    },
    {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0
    }
);
```

**错误类型**:
- `PERMISSION_DENIED`: 用户拒绝位置请求
- `POSITION_UNAVAILABLE`: 位置信息不可用
- `TIMEOUT`: 获取位置超时

### 2.2 浏览器检测优化

**小米浏览器策略**:
```javascript
{
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 0,
    useTencentSDK: true,
    retryCount: 3
}
```

**UC浏览器策略**:
```javascript
{
    enableHighAccuracy: false,
    timeout: 20000,
    maximumAge: 60000,
    useTencentSDK: true,
    retryCount: 2
}
```

## 3. 内部模块API

### 3.1 ScreenshotManager (v5.0新增)

**构造函数**:
```javascript
const screenshotManager = new ScreenshotManager();
```

**主要方法**:

#### initialize(mapManager, car, location, address)
初始化截图管理器

**参数**:
```javascript
{
    mapManager: MapManager,    // 地图管理器实例
    car: Object,               // 车辆信息
    location: Object,          // 位置信息
    address: string            // 地址字符串
}
```

#### captureAndShare()
截图并分享 - 主入口方法

**返回值**: `Promise<void>`

**示例**:
```javascript
await screenshotManager.captureAndShare();
```

#### captureMap()
截取地图（仅WebGL）

**返回值**: `Promise<string>` - 图片DataURL

**技术要点**:
- WebGL上下文必须设置 `preserveDrawingBuffer: true`
- 等待800ms确保地图完全渲染
- 使用 `gl.readPixels()` 读取像素
- WebGL像素上下翻转，需要修正

#### addWatermark(sourceCanvas)
添加水印（中心点标记+底部信息条）

**参数**:
```javascript
{
    sourceCanvas: HTMLCanvasElement  // 原始地图Canvas
}
```

**返回值**: `Promise<HTMLCanvasElement>` - 带水印的Canvas

#### drawCenterMarker(ctx, width, height)
绘制中心点标记（Canvas绘制）

**参数**:
```javascript
{
    ctx: CanvasRenderingContext2D,  // Canvas 2D上下文
    width: number,                  // Canvas宽度
    height: number                  // Canvas高度
}
```

**标记设计**:
- 外圈发光效果（品牌颜色，透明度0.3→0）
- 阴影效果（rgba(0,0,0,0.4), 模糊12px）
- 主标记圆圈（品牌颜色，直径60px）
- 白色边框（4px）
- 车辆logo（28x28px，深色背景转白色）
- 车辆名称（标记下方，品牌颜色）

### 3.2 VehicleInfoCard (v5.0新增)

**构造函数**:
```javascript
const infoCard = new VehicleInfoCard(containerId);
```

**参数**:
```javascript
{
    containerId: string  // 容器DOM ID
}
```

**主要方法**:

#### initialize(vehicle)
初始化卡片

**参数**:
```javascript
{
    vehicle: Object  // 车辆信息（从VEHICLE_CONFIG获取）
}
```

#### updateLocation(location)
更新位置信息

**参数**:
```javascript
{
    location: {
        lat: number,
        lng: number,
        isDefaultLocation?: boolean
    }
}
```

#### updateAddress(address)
更新地址信息

**参数**:
```javascript
{
    address: string
}
```

#### updateParkingTime()
更新停车时间（使用当前时间戳）

#### setLoading(loading)
显示加载状态

**参数**:
```javascript
{
    loading: boolean
}
```

#### showError(message)
显示错误状态

**参数**:
```javascript
{
    message: string
}
```

### 3.3 ActionButtons (v5.0新增)

**构造函数**:
```javascript
const actionButtons = new ActionButtons();
```

**主要方法**:

#### on(event, callback)
注册事件监听

**参数**:
```javascript
{
    event: 'switch' | 'refresh' | 'share',
    callback: Function
}
```

**事件说明**:
- `switch`: 切换车辆（跳转到index.html）
- `refresh`: 刷新定位
- `share`: 截图分享

### 3.4 LocationManager

**构造函数**:
```javascript
const locationManager = new LocationManager();
```

**主要方法**:

#### getCurrentPosition(options)
获取当前位置，支持默认位置回退

**参数**:
```javascript
{
    force: false  // 是否强制重新定位
}
```

**返回值**:
```javascript
Promise<{
    lat: number,           // 纬度
    lng: number,           // 经度
    accuracy: number,      // 精度（米）
    timestamp: number,     // 时间戳
    provider: string,      // 定位来源
    isDefaultLocation: boolean,  // 是否为默认位置
    address?: string       // 地址信息
}>
```

**示例**:
```javascript
try {
    const location = await locationManager.getCurrentPosition();
    console.log('位置信息:', location);
} catch (error) {
    console.error('定位失败:', error.message);
}
```

#### enableTencentLocation()
启用腾讯定位SDK

**返回值**: `boolean` - 是否成功启用

### 3.5 MapManager (v5.0更新)

**构造函数**:
```javascript
const mapManager = new MapManager();
```

**主要方法**:

#### initializeMap(container, center, zoom)
初始化地图

**参数**:
```javascript
{
    container: HTMLElement,    // 地图容器元素
    center: {lat: number, lng: number},  // 地图中心
    zoom: number              // 缩放级别
}
```

#### generateSharePage(location, carInfo)
生成分享页面URL（iframe嵌入）

**参数**:
```javascript
{
    location: {lat: number, lng: number},  // 位置信息
    carInfo: {name: string, plate: string, color: string}  // 车辆信息
}
```

**返回值**: `Promise<string>` - 分享页面URL

#### addMarker(location, carInfo)
添加地图标记

**参数**:
```javascript
{
    location: {lat: number, lng: number},  // 标记位置
    carInfo: {name: string, plate: string, color: string}  // 车辆信息
}
```

#### interceptWebGLContext() (v5.0新增)
拦截WebGL上下文创建，强制启用preserveDrawingBuffer

**用途**: 确保WebGL Canvas可以被截取

**实现原理**:
```javascript
interceptWebGLContext() {
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(contextType, ...args) {
        if (contextType === 'webgl' || contextType === 'experimental-webgl') {
            let contextAttributes = args[0] || {};
            contextAttributes.preserveDrawingBuffer = true;  // 关键配置
            return originalGetContext.call(this, contextType, contextAttributes);
        }
        return originalGetContext.call(this, contextType, ...args);
    };
}
```

#### getCanvas() (v5.0新增)
获取地图Canvas元素（用于截图）

**返回值**: `HTMLCanvasElement | null`

#### getAddressFromLocation(location)
逆地理编码获取地址

**参数**:
```javascript
{
    location: {lat: number, lng: number}  // 位置信息
}
```

**返回值**: `Promise<string>` - 地址信息

### 3.6 Utils工具模块

#### getUrlParams()
解析URL参数

**返回值**: `Object` - URL参数对象

**示例**:
```javascript
const params = Utils.getUrlParams();
console.log('车辆ID:', params.car);
```

#### formatTime(date)
格式化时间

**参数**:
```javascript
{
    date: Date = new Date()  // 要格式化的日期
}
```

**返回值**: `string` - 格式化的时间字符串

#### copyToClipboard(text)
复制文本到剪贴板

**参数**:
```javascript
{
    text: string  // 要复制的文本
}
```

**返回值**: `Promise<boolean>` - 是否复制成功

#### showToast(message, duration)
显示Toast提示

**参数**:
```javascript
{
    message: string,        // 提示信息
    duration: number = 2000  // 显示时长（毫秒）
}
```

## 4. 配置接口

### 4.1 车辆配置 (VEHICLE_CONFIG) - v5.0

```javascript
const VEHICLE_CONFIG = {
    car001: {
        id: 'car001',
        name: '雷克萨斯LS200',
        plate: '浙***717',      // 车牌号已脱敏
        color: '#808080',      // 雷克萨斯灰色
        brand: 'lexus',        // 品牌标识
        logo: 'assets/images/icons/lexus_logo.png'  // 品牌Logo路径
    },
    car002: {
        id: 'car002',
        name: '零跑T03',
        plate: '浙***508',      // 车牌号已脱敏
        color: '#F0F0F0',      // 零跑白色
        brand: 'leapmotor',
        logo: 'assets/images/icons/leapmotor_logo.png'
    },
    car003: {
        id: 'car003',
        name: '奥迪Q5',
        plate: '浙***598',      // 车牌号已脱敏
        color: '#000000',      // 奥迪黑色
        brand: 'audi',
        logo: 'assets/images/icons/audi_logo.png'
    },
    car004: {
        id: 'car004',
        name: '小米SU7',
        plate: '浙***779',      // 车牌号已脱敏
        color: '#8A2BE2',      // 小米紫色
        brand: 'xiaomi',
        logo: 'assets/images/icons/ximi_logo.png'
    }
};
```

### 4.2 地图配置 (MAP_CONFIG) - v5.0更新

```javascript
const MAP_CONFIG = {
    key: '67PBZ-AWOWQ-TTW5A-BTI3M-BNMHH-2YBXZ',
    center: [39.908692, 116.397477],
    zoom: 18,  // v5.0: 默认放大级别调整为18
    style: 'normal',
    defaultLocation: {
        lat: 30.204763,
        lng: 120.204781,
        accuracy: 50,
        address: '浙江省杭州市西湖区西湖风景名胜区',
        isDefault: true
    }
};
```

### 4.3 应用配置 (APP_CONFIG) - v3.0更新

```javascript
const APP_CONFIG = {
    title: '家庭车辆位置分享系统',
    version: '3.0.0',           // 最终版本
    debug: false,                // 生产环境关闭debug
    locationTimeout: 20000,
    buildVersion: '20241212',   // 构建版本
    // 新增隐私配置
    privacy: {
        enablePlateMasking: true,    // 启用车牌号脱敏
        maskChar: '*',               // 脱敏字符
        maskStart: 2,                // 脱敏起始位置
        maskEnd: 1                   // 脱敏结束位置
    },
    // 品牌配置
    brands: {
        audi: { name: '奥迪', color: '#000000' },
        lexus: { name: '雷克萨斯', color: '#808080' },
        leapmotor: { name: '零跑', color: '#F0F0F0' },
        xiaomi: { name: '小米', color: '#8A2BE2' }
    },
    analysis: {
        enableLocationAnalysis: true,
        showParkingRecommendation: true,
        showLocationHistory: false
    }
};
```

## 5. 错误处理

### 5.1 错误代码

**定位错误**:
- `PERMISSION_DENIED`: 权限被拒绝
- `POSITION_UNAVAILABLE`: 位置不可用
- `TIMEOUT`: 定位超时
- `NETWORK_ERROR`: 网络错误

**地图错误**:
- `MAP_LOAD_ERROR`: 地图加载失败
- `INVALID_API_KEY`: API密钥无效

### 5.2 默认位置回退

当定位失败时，系统会自动使用默认位置：

```javascript
const defaultLocation = {
    lat: 30.204763,
    lng: 120.204781,
    accuracy: 50,
    address: '浙江省杭州市西湖区西湖风景名胜区',
    isDefaultLocation: true,
    provider: '默认位置'
};
```

### 5.3 错误处理示例

```javascript
try {
    const location = await locationManager.getCurrentPosition();
    // 处理成功定位
} catch (error) {
    if (error.message.includes('权限')) {
        Utils.showToast('请允许获取位置信息');
    } else if (error.message.includes('超时')) {
        Utils.showToast('定位超时，已使用默认位置');
    } else {
        Utils.showToast('定位失败: ' + error.message);
    }
}
```

## 6. 缓存策略

### 6.1 地址缓存

**缓存时间**: 5分钟
**缓存键**: `address_${lat}_${lng}`

### 6.2 位置缓存

**缓存时间**: 30秒
**缓存键**: `location_${carId}`

### 6.3 分享页面缓存

**缓存时间**: 2分钟
**缓存键**: `sharepage_${lat}_${lng}_${zoom}`

## 7. 安全考虑

### 7.1 跨域处理

- 使用腾讯地图官方API避免跨域问题
- iframe嵌入使用腾讯地图URI API

### 7.2 隐私保护 - v3.0增强

- 不存储历史位置信息
- 位置信息仅在内存中保存
- 支持权限拒绝时的默认位置回退
- **车牌号自动脱敏**：中间字符自动隐藏（格式：浙***717）
- **数据最小化原则**：仅收集必要的位置信息
- **前端处理**：所有敏感数据处理在前端完成，不传输到服务器

### 7.3 API密钥安全

- API密钥已配置在前端，用于演示目的
- 生产环境建议使用后端代理或限制访问域名

## 8. 版本更新记录

### v5.0.0 (2026-02-22) - 双页面架构版 ✅
- 🆕 **双页面架构**：
  - 车辆选择页（index.html）- 2x2网格布局
  - 地图定位页（map-page.html）- 左右分栏信息卡片
- 🆕 **WebGL截图功能**：
  - 直接截取WebGL地图Canvas，无需跳转页面
  - Canvas绘制中心点标记（使用真实车辆logo）
  - 底部水印（车辆信息、地址、时间、放大倍数）
  - 截图对话框显示时，页面DOM标记自动隐藏
- 🆕 **Bootstrap 5 + BootCDN**：使用国内CDN加速
- ✅ **地图放大倍数显示**：默认x18
- ✅ **模块化JavaScript架构**：
  - VehicleInfoCard - 车辆信息卡片组件
  - ScreenshotManager - WebGL截图管理器
  - ActionButtons - 操作按钮组件
  - MapPageApp - 主应用逻辑

### v4.0.0 (2026-02-22) - UI重构版 🔄
- 🆕 **新增车辆选择页面**：2x2网格布局展示4个车辆
- 🆕 **车辆信息卡片**：展示车型、车牌、经纬度、地址、停车时间
- 🆕 **引入Bootstrap 5**：精简版UI框架，移动端优先
- ✅ **核心功能保持不变**：定位、地图、分享、截图功能全部保留
- ✅ **API接口保持不变**：所有内部模块API无变化
- 🔄 **UI重构**：index.html和map-page.html的UI层重新设计

### v3.0.0 (2024-12-12) - 最终版
- ✅ **品牌Logo集成**：所有车辆标记替换为品牌官方Logo
- ✅ **专属配色方案**：每辆车配备品牌专属颜色
  - 奥迪：黑色 (#000000)
  - 雷克萨斯：灰色 (#808080)
  - 零跑：白色 (#F0F0F0)
  - 小米：紫色 (#8A2BE2)
- ✅ **隐私保护增强**：车牌号自动脱敏功能
- ✅ **移动端UI优化**：修复按钮换行问题
- ✅ **分享页面统一**：标记样式与主页保持一致
- ✅ **定位算法优化**：修复标记偏移到左上角问题
- ✅ **语法错误修复**：修复分享页面async/await错误

### v2.0.0 (2024-12-09)
- 新增默认位置回退功能
- 新增经纬度信息显示
- 新增浏览器检测和优化
- 新增iframe分享功能
- 修复ServiceWorker错误
- 支持多浏览器定位策略

### v1.0.0 (2024-12-08)
- 基础定位功能
- 地图显示和标记
- 位置分析和分享
- 响应式设计

## 9. 已知问题和解决方案

### 9.1 已解决问题

1. **分享页面标记定位错误**
   - 问题描述：标记显示在地图左上角
   - 解决方案：优化定位算法，将标记设置在地图中心

2. **移动端按钮换行**
   - 问题描述：复制经纬度按钮在手机模式下会换行
   - 解决方案：使用flex-wrap布局，确保按钮在同一行

3. **JavaScript语法错误**
   - 问题描述：share-map.html中async/await语法错误
   - 解决方案：移除非异步函数中的await调用

### 9.2 当前状态

所有已知问题已解决，系统运行稳定，可用于生产环境。