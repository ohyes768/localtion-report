# 车辆位置分享系统 - API文档

## 概述

本文档描述了车辆位置分享系统v2.0中使用的API接口和模块。

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

### 3.1 LocationManager

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

### 3.2 MapManager

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

#### getAddressFromLocation(location)
逆地理编码获取地址

**参数**:
```javascript
{
    location: {lat: number, lng: number}  // 位置信息
}
```

**返回值**: `Promise<string>` - 地址信息

### 3.3 Utils工具模块

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

### 4.1 车辆配置 (VEHICLE_CONFIG)

```javascript
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
    }
    // ... 更多车辆配置
};
```

### 4.2 地图配置 (MAP_CONFIG)

```javascript
const MAP_CONFIG = {
    key: '67PBZ-AWOWQ-TTW5A-BTI3M-BNMHH-2YBXZ',
    center: [39.908692, 116.397477],
    zoom: 16,
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

### 4.3 应用配置 (APP_CONFIG)

```javascript
const APP_CONFIG = {
    title: '家庭车辆位置分享系统',
    version: '2.0.0',
    debug: true,
    locationTimeout: 20000,
    buildVersion: '20241209',
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

### 7.2 隐私保护

- 不存储历史位置信息
- 位置信息仅在内存中保存
- 支持权限拒绝时的默认位置回退

### 7.3 API密钥安全

- API密钥已配置在前端，用于演示目的
- 生产环境建议使用后端代理或限制访问域名

## 8. 版本更新记录

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