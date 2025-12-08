# 家庭车辆位置分享系统

一个基于H5的车辆位置分享系统，支持扫码获取车辆位置、地图显示、位置分析和微信群分享功能。

## 功能特性

### 核心功能
- ✅ **扫码定位**：扫描二维码自动识别车辆并获取位置
- ✅ **实时定位**：使用HTML5 Geolocation API获取精准位置
- ✅ **地图显示**：基于腾讯地图JavaScript API展示位置
- ✅ **位置分析**：智能分析定位精度、停车环境和位置类型
- ✅ **分享功能**：生成地图截图和位置文案，支持微信群分享
- ✅ **响应式设计**：完美适配手机屏幕和微信浏览器

### 车辆管理
- 🚗 支持4辆车管理
- 🏷️ 每辆车有唯一标识（车牌号/昵称）
- 🎨 个性化颜色主题

### 用户体验
- 📱 移动端优化
- 🌙 深色模式支持
- ⚡ 快速加载
- 🔒 隐私保护（不存储历史位置）

## 快速开始

### 环境要求
- 现代浏览器（支持ES6）
- 网络连接（用于地图API调用）
- 定位权限（用于获取位置）

### 安装部署

1. **克隆项目**
```bash
git clone <repository-url>
cd vehicle-location
```

2. **配置地图API Key**
编辑 `js/config.js` 文件，替换 `MAP_KEY_PLACEHOLDER` 为你的腾讯地图API Key：
```javascript
const MAP_CONFIG = {
    key: 'YOUR_TENCENT_MAP_API_KEY', // 替换为实际的API Key
    // ...
};
```

3. **配置车辆信息**
编辑 `js/config.js` 文件中的 `VEHICLE_CONFIG`：
```javascript
const VEHICLE_CONFIG = {
    car001: {
        id: 'car001',
        name: '爸爸的车',
        plate: '京A12345',
        color: '#FF6B6B'
    },
    // 添加更多车辆...
};
```

4. **部署到静态服务器**
支持以下部署方式：
- GitHub Pages
- Nginx
- Apache
- 静态文件CDN

### 使用方法

1. **生成二维码**
为每辆车生成包含对应carID参数的二维码：
```
https://yourdomain.com/?car=car001
https://yourdomain.com/?car=car002
```

2. **扫码访问**
使用手机扫描二维码，系统会自动：
- 识别车辆信息
- 请求定位权限
- 获取当前位置
- 在地图上显示
- 分析位置信息

3. **分享位置**
点击"分享位置"按钮可以：
- 生成地图截图
- 复制位置文案
- 分享到微信群

## 技术架构

### 前端技术栈
- **HTML5**：页面结构和语义化
- **CSS3**：响应式设计和动画效果
- **JavaScript ES6+**：应用逻辑和交互
- **腾讯地图API**：地图服务和逆地理编码

### 项目结构
```
vehicle-location/
├── index.html              # 主页面
├── README.md              # 项目说明
├── 需求文档.md            # 需求文档
├── 设计文档.md            # 设计文档
├── css/
│   └── style.css          # 样式文件
├── js/
│   ├── config.js          # 配置文件
│   ├── app.js             # 主应用逻辑
│   ├── location.js        # 定位功能模块
│   ├── map.js             # 地图功能模块
│   └── utils.js           # 工具函数库
├── assets/
│   └── images/            # 图片资源
└── qrcodes/               # 二维码图片
    ├── car001.png
    ├── car002.png
    ├── car003.png
    └── car004.png
```

## 配置说明

### 车辆配置
```javascript
const VEHICLE_CONFIG = {
    car001: {
        id: 'car001',           // 车辆唯一标识
        name: '爸爸的车',        // 显示名称
        plate: '京A12345',      // 车牌号
        color: '#FF6B6B'        // 主题色
    }
};
```

### 地图配置
```javascript
const MAP_CONFIG = {
    key: 'YOUR_API_KEY',           // API密钥
    center: [39.908692, 116.397477], // 默认中心
    zoom: 16,                       // 默认缩放级别
    style: 'normal'                 // 地图样式
};
```

## 浏览器兼容性

### 支持的浏览器
- ✅ Chrome 60+
- ✅ Safari 12+
- ✅ Firefox 55+
- ✅ Edge 79+
- ✅ 微信内置浏览器
- ✅ QQ浏览器

### 功能支持
- ✅ Geolocation API
- ✅ Canvas API
- ✅ LocalStorage
- ✅ Clipboard API
- ⚠️ 部分旧版浏览器可能不支持某些新特性

## 故障排除

### 定位失败
- 确保手机已开启定位服务
- 检查浏览器是否允许获取位置
- 尝试到室外或靠近窗户的地方

### 地图不显示
- 检查网络连接
- 确认API Key配置正确
- 查看浏览器控制台错误信息

### 二维码无法识别
- 确认URL格式正确
- 检查域名是否可访问
- 重新生成清晰的二维码

## 更新日志

### v1.0.0 (2024-12-08)
- ✨ 首次发布
- ✅ 实现基础定位功能
- ✅ 地图显示和标记
- ✅ 位置分析和分享
- ✅ 响应式设计
- ✅ 深色模式支持

## 许可证

MIT License