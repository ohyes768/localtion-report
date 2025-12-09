# 家庭车辆位置分享系统

一个基于腾讯位置服务的车辆位置分享系统，支持扫码获取车辆位置、实时地图显示和位置分享功能。

## 功能特性

### 核心功能
- ✅ **扫码定位**：扫描二维码自动识别车辆并获取位置
- ✅ **智能定位**：集成HTML5 Geolocation，定位失败时自动使用默认位置
- ✅ **地图显示**：基于腾讯地图JavaScript API展示位置
- ✅ **位置分享**：支持位置信息分享和截图功能
- ✅ **响应式设计**：完美适配手机屏幕

### 车辆管理
- 🚗 支持4辆车管理（雷克萨斯LS200、零跑T03、奥迪Q5、小米SU7）
- 🏷️ 每辆车有唯一标识和个性化颜色主题

## 快速开始

### 环境要求
- 现代浏览器（支持ES6）
- 网络连接（用于地图API调用）
- 定位权限（用于获取位置）

### 安装部署

#### GitHub Pages部署（推荐）
```bash
# 1. Fork或克隆项目
git clone <repository-url>
cd localtion-report

# 2. 推送到GitHub并启用Pages
git push origin main
# 在GitHub仓库设置中启用GitHub Pages，选择main分支
```

#### Nginx静态部署
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

### 🚀 使用方法

1. **访问二维码页面**
   - 打开：`https://your-domain.com/qr-codes.html`
   - 查看所有车辆的二维码

2. **打印和贴车**
   - 打印二维码页面
   - 裁剪对应二维码贴到车上

3. **扫码使用**
   - 用手机扫描二维码
   - 允许定位权限（或使用默认位置）
   - 查看车辆位置和分享信息

### 📱 车辆链接
- **雷克萨斯LS200 (浙A5W717)**: `?car=car001`
- **零跑T03 (浙AA28508)**: `?car=car002`
- **奥迪Q5 (浙ALQ598)**: `?car=car003`
- **小米SU7 (浙AE19779)**: `?car=car004`

## 技术架构

### 前端技术栈
- **HTML5**：页面结构
- **CSS3**：响应式设计
- **JavaScript ES6+**：应用逻辑
- **腾讯位置服务API**：地图显示和定位

### 核心模块
- **LocationManager**：定位管理，支持默认位置回退
- **MapManager**：地图管理，支持标记和分享功能

### 项目结构
```
localtion-report/
├── index.html                    # 主页面
├── qr-codes.html                 # 二维码展示页面
├── share-map.html                # 地图分享页面
├── README.md                     # 项目说明
├── css/
│   └── style.css                # 样式文件
├── js/
│   ├── config.js                # 配置文件
│   ├── app.js                   # 主应用逻辑
│   ├── location.js              # 定位功能模块
│   ├── map.js                   # 地图功能模块
│   ├── utils.js                 # 工具函数库
│   └── browser-detection.js     # 浏览器检测模块
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
        name: '雷克萨斯LS200',   // 显示名称
        plate: '浙A5W717',      // 车牌号
        color: '#FF6B6B'        // 主题色
    }
};
```

## 浏览器兼容性

### 支持的浏览器
- ✅ Chrome 60+
- ✅ Safari 12+
- ✅ Firefox 55+
- ✅ Edge 79+
- ✅ 微信内置浏览器
- ✅ 移动端浏览器

### 功能支持
- ✅ Geolocation API
- ✅ LocalStorage
- ✅ 响应式设计

## 故障排除

### 定位失败
- 📍 **默认位置**：权限拒绝时自动使用杭州西湖位置
- 🔄 **刷新重试**：点击刷新按钮重新获取位置
- ⚙️ **权限检查**：确保浏览器定位权限设置正确

### 地图显示问题
- 🌐 **网络连接**：检查网络连接和API访问
- 🔑 **API Key**：确认腾讯地图API Key配置正确

## 许可证

MIT License