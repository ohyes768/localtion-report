# 家庭车辆位置分享系统
**项目状态：** 已完成开发 ✅

一个基于腾讯位置服务的车辆位置分享系统，支持扫码获取车辆位置、实时地图显示和位置分享功能。

## 🎯 功能特性

### 核心功能
- ✅ **扫码定位**：扫描二维码自动识别车辆并获取位置
- ✅ **智能定位**：集成HTML5 Geolocation，定位失败时自动使用默认位置
- ✅ **地图显示**：基于腾讯地图JavaScript API展示位置
- ✅ **位置分享**：支持位置信息分享和截图功能
- ✅ **响应式设计**：完美适配手机屏幕

### 车辆管理
- 🚗 支持4辆车管理（雷克萨斯LS200、零跑T03、奥迪Q5、小米SU7）
- 🎨 品牌专属配色和Logo（奥迪黑、雷克萨斯灰、零跑白、小米紫）
- 🔒 车牌号脱敏保护（中间字符隐藏）

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

### 📱 车辆链接（车牌号已脱敏）
- **雷克萨斯LS200 (浙***717)**: `?car=car001` - 雷克萨斯灰色
- **零跑T03 (浙***508)**: `?car=car002` - 零跑白色
- **奥迪Q5 (浙***598)**: `?car=car003` - 奥迪黑色
- **小米SU7 (浙***779)**: `?car=car004` - 小米紫色

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
├── 需求文档.md                   # 需求文档
├── 设计文档.md                   # 设计文档
├── docker-compose.yml            # Docker部署配置
├── css/
│   └── style.css                # 样式文件
├── js/
│   ├── config.js                # 配置文件
│   ├── app.js                   # 主应用逻辑
│   ├── location.js              # 定位功能模块
│   ├── map.js                   # 地图功能模块
│   ├── utils.js                 # 工具函数库
│   └── browser-detection.js     # 浏览器检测模块
├── test-*.html                   # 测试页面集合
└── assets/
    ├── images/
    │   └── icons/               # 品牌Logo图标
    │       ├── audi_logo.png    # 奥迪Logo
    │       ├── leapmotor_logo.png # 零跑Logo
    │       ├── lexus_logo.png   # 雷克萨斯Logo
    │       └── ximi_logo.png    # 小米Logo
    └── qrcodes/                 # 二维码图片
        ├── car001.png
        ├── car002.png
        ├── car003.png
        └── car004.png
```

## 配置说明

### 车辆配置（v3.0 - 含品牌Logo和专属配色）
```javascript
const VEHICLE_CONFIG = {
    car001: {
        id: 'car001',
        name: '雷克萨斯LS200',
        plate: '浙***717',      // 车牌号已脱敏
        color: '#808080',      // 雷克萨斯灰色
        brand: 'lexus',
        logo: 'assets/images/icons/lexus_logo.png'
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

## 🎉 已完成的功能更新

### 最新版本特性
- ✅ **品牌Logo集成**：所有车辆使用对应品牌官方Logo
- ✅ **专属配色方案**：每辆车配备品牌专属颜色
- ✅ **隐私保护**：车牌号自动脱敏，保护敏感信息
- ✅ **移动端优化**：修复按钮换行问题，优化布局
- ✅ **分享页面统一**：标记样式与主页保持一致
- ✅ **定位算法优化**：修复标记偏移问题

### 技术修复
- 修复分享页面async/await语法错误
- 解决地图标记定位在左上角的问题
- 优化地址解析异步处理流程
- 改进移动端响应式布局

## 故障排除

### 定位失败
- 📍 **默认位置**：权限拒绝时自动使用杭州西湖位置
- 🔄 **刷新重试**：点击刷新按钮重新获取位置
- ⚙️ **权限检查**：确保浏览器定位权限设置正确

### 地图显示问题
- 🌐 **网络连接**：检查网络连接和API访问
- 🔑 **API Key**：确认腾讯地图API Key配置正确

### UI显示问题
- 📱 **移动端适配**：如遇按钮换行，请清除缓存后重试
- 🎨 **Logo显示**：确保Logo图片文件存在于正确路径

## 许可证

MIT License

---

**开发状态：** 项目已完成所有开发任务，可用于生产环境部署。如有问题或建议，欢迎提交Issue。