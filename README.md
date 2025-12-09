# 家庭车辆位置分享系统

一个基于腾讯位置服务的车辆位置分享系统，支持扫码获取车辆位置、实时地图显示、经纬度显示、默认位置回退和iframe嵌入分享功能。

## 功能特性

### 核心功能
- ✅ **扫码定位**：扫描二维码自动识别车辆并获取位置
- ✅ **智能定位**：集成HTML5 Geolocation和腾讯定位SDK，支持浏览器检测优化
- ✅ **默认位置回退**：定位失败或权限拒绝时自动使用杭州西湖默认位置（30.204763,120.204781）
- ✅ **地图显示**：基于腾讯地图JavaScript API展示位置，支持实时标记
- ✅ **经纬度显示**：实时显示当前位置经纬度、精度、定位来源和时间信息
- ✅ **位置分享**：使用iframe直接嵌入腾讯位置标记页面，支持新窗口打开和系统分享
- ✅ **响应式设计**：完美适配手机屏幕和微信浏览器

### 车辆管理
- 🚗 支持4辆车管理（雷克萨斯LS200、零跑T03、奥迪Q5、小米SU7）
- 🏷️ 每辆车有唯一标识（车牌号/昵称）
- 🎨 个性化颜色主题

### 用户体验
- 📱 移动端优化，支持多种浏览器（小米、UC、微信等）
- 🌙 深色模式支持
- ⚡ 快速加载，智能缓存
- 🔒 隐私保护（不存储历史位置）
- 🧪 完善的测试页面支持室内环境测试

## 快速开始

### 环境要求
- 现代浏览器（支持ES6）
- 网络连接（用于地图API调用）
- 定位权限（用于获取位置）

### 安装部署

#### 方式一：GitHub Pages部署（推荐）
```bash
# 1. Fork或克隆项目
git clone <repository-url>
cd localtion-report

# 2. 推送到GitHub并启用Pages
git push origin main
# 在GitHub仓库设置中启用GitHub Pages，选择main分支
```

#### 方式二：Docker部署（阿里云ECS）
```bash
# 1. 克隆项目
git clone <repository-url>
cd localtion-report

# 2. 启动服务
docker-compose up -d

# 3. 访问应用
# http://your-server-ip:8080
```

#### 方式三：Nginx静态部署
```bash
# 1. 克隆项目到服务器
git clone <repository-url> /var/www/location-report

# 2. 配置Nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/location-report;
    index index.html;
}
```

### 配置说明
项目已预配置腾讯地图API Key，如需修改请编辑 `js/config.js`：

```javascript
const MAP_CONFIG = {
    key: '67PBZ-AWOWQ-TTW5A-BTI3M-BNMHH-2YBXZ', // 腾讯地图API Key
    defaultLocation: {
        lat: 30.204763,        // 默认纬度（杭州西湖）
        lng: 120.204781,       // 默认经度（杭州西湖）
        address: '浙江省杭州市西湖区西湖风景名胜区'
    }
};
```

### 🚀 快速开始

1. **访问二维码页面**
   - 打开：`https://your-domain.com/qr-codes.html`
   - 查看所有车辆的二维码

2. **打印和贴车**
   - 打印二维码页面（Ctrl+P）
   - 裁剪对应二维码贴到车上

3. **扫码使用**
   - 用手机扫描二维码
   - 允许定位权限（或选择"一律不允许"测试默认位置）
   - 查看车辆位置和经纬度信息
   - 使用iframe嵌入功能分享位置

### 🧪 测试页面
- **默认位置测试**: `test-default-location.html` - 室内环境测试
- **定位失败测试**: `test-location-failure.html` - 各种错误场景测试
- **iframe分享测试**: `test-iframe-share.html` - 分享功能测试
- **坐标显示测试**: `test-coordinates-display.html` - 经纬度功能测试

### 📱 车辆链接
- **雷克萨斯LS200 (浙A5W717)**: `?car=car001`
- **零跑T03 (浙AA28508)**: `?car=car002`
- **奥迪Q5 (浙ALQ598)**: `?car=car003`
- **小米SU7 (浙AE19779)**: `?car=car004`

## 技术架构

### 前端技术栈
- **HTML5**：页面结构和语义化
- **CSS3**：响应式设计和动画效果
- **JavaScript ES6+**：应用逻辑和交互
- **腾讯位置服务API**：地图显示、定位SDK、标记功能
- **iframe嵌入**：第三方位置服务嵌入

### 核心模块
- **LocationManager**：定位管理，支持多浏览器优化和默认位置回退
- **MapManager**：地图管理，支持标记、分享、iframe嵌入
- **BrowserDetection**：浏览器检测，针对不同浏览器优化定位策略

### 项目结构
```
localtion-report/
├── index.html                    # 主页面
├── qr-codes.html                 # 二维码展示页面
├── README.md                     # 项目说明
├── docker-compose.yml           # Docker部署配置
├── css/
│   └── style.css                # 样式文件
├── js/
│   ├── config.js                # 配置文件（车辆、地图、缓存等）
│   ├── app.js                   # 主应用逻辑
│   ├── location.js              # 定位功能模块（含浏览器检测）
│   ├── map.js                   # 地图功能模块（含iframe分享）
│   ├── utils.js                 # 工具函数库
│   └── browser-detection.js     # 浏览器检测模块
├── test-*.html                   # 各种测试页面
└── qrcodes/                      # 二维码图片
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

## 核心特性详解

### 🎯 智能定位策略
- **浏览器检测**：自动识别小米、UC、微信等浏览器，优化定位参数
- **权限处理**：支持"一律不允许"场景，自动使用默认位置
- **超时处理**：定位超时自动回退到默认位置（杭州西湖）
- **精度提升**：根据浏览器类型选择最佳定位策略

### 📍 经纬度信息显示
- **实时显示**：页面顶部显示当前经纬度、精度、来源、时间
- **一键复制**：支持复制详细位置信息到剪贴板
- **多格式输出**：支持文本格式和地图链接格式
- **测试标识**：默认位置时显示测试标识

### 🖼️ iframe分享功能
- **直接嵌入**：使用iframe嵌入腾讯位置标记页面
- **ServiceWorker优化**：移除Blob URL方案，避免ServiceWorker错误
- **多选项分享**：支持新窗口打开和系统原生分享
- **跨域解决**：完美解决跨域访问限制

## 浏览器兼容性

### 支持的浏览器
- ✅ Chrome 60+
- ✅ Safari 12+
- ✅ Firefox 55+
- ✅ Edge 79+
- ✅ 微信内置浏览器
- ✅ QQ浏览器
- ✅ 小米浏览器（优化定位）
- ✅ UC浏览器（优化定位）

### 功能支持
- ✅ Geolocation API
- ✅ 腾讯定位SDK
- ✅ LocalStorage
- ✅ Clipboard API
- ✅ iframe嵌入
- ⚠️ 部分旧版浏览器可能不支持某些新特性

## 故障排除

### 定位失败或权限拒绝
- 🧪 **室内测试**：使用测试页面模拟定位失败场景
- 📍 **默认位置**：权限拒绝时自动使用杭州西湖位置
- 🔄 **刷新重试**：点击刷新按钮重新获取位置
- ⚙️ **权限检查**：确保浏览器定位权限设置正确

### iframe分享问题
- ✅ **ServiceWorker错误**：已修复，使用直接iframe嵌入
- 🌐 **网络检查**：确保能访问腾讯地图API
- 📱 **浏览器限制**：某些浏览器可能限制iframe加载

### 地图显示问题
- 🌐 **网络连接**：检查网络连接和API访问
- 🔑 **API Key**：确认腾讯地图API Key配置正确
- 📍 **定位权限**：确保浏览器允许获取位置
- 🧪 **测试页面**：使用默认位置测试页面验证功能

## 更新日志

### v2.0.0 (2024-12-09)
- 🔄 **重大更新**：集成腾讯定位SDK，支持多浏览器优化
- 📍 **新增功能**：经纬度信息实时显示和复制功能
- 🧪 **默认位置**：定位失败时自动使用杭州西湖位置
- 🖼️ **iframe分享**：重构分享功能，移除ServiceWorker依赖
- 📱 **浏览器优化**：针对小米、UC浏览器进行专门优化
- 🐛 **错误修复**：解决ServiceWorker注册失败问题

### v1.0.0 (2024-12-08)
- ✨ 首次发布
- ✅ 实现基础定位功能
- ✅ 地图显示和标记
- ✅ 位置分析和分享
- ✅ 响应式设计
- ✅ 深色模式支持

## 许可证

MIT License