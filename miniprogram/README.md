# 车辆位置分享系统 - 微信小程序

## 项目说明

这是车辆位置分享系统的微信小程序版本，基于原有 Web 版本改造而来。

## 项目结构

```
miniprogram/
├── pages/                    # 页面目录
│   ├── index/               # 车辆选择页（首页）
│   │   ├── index.wxml       # 页面结构
│   │   ├── index.wxss       # 页面样式
│   │   ├── index.js         # 页面逻辑
│   │   └── index.json       # 页面配置
│   └── map/                 # 地图展示页
│       ├── map.wxml
│       ├── map.wxss
│       ├── map.js
│       └── map.json
├── utils/                   # 工具函数
│   ├── util.js              # 通用工具
│   ├── location.js          # 定位管理器
│   ├── map.js               # 地图管理器
│   └── screenshot.js        # 截图管理器
├── config/                  # 配置文件
│   ├── vehicle.js           # 车辆配置
│   └── config.js            # 应用配置
├── assets/                  # 静态资源
│   └── images/
│       ├── logos/           # 车辆Logo
│       ├── markers/         # 地图标记图标
│       └── icons/           # 其他图标
├── app.js                   # 小程序入口
├── app.json                 # 全局配置
├── app.wxss                 # 全局样式
├── project.config.json      # 项目配置
└── sitemap.json             # 站点地图
```

## 开发指南

### 1. 环境准备

1. 下载并安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)

2. 准备资源文件：
   - 车辆 Logo 图片（放到 `assets/images/logos/` 目录）
   - 地图标记图标（放到 `assets/images/markers/` 目录）

### 2. 配置修改

#### 修改 AppID

编辑 `project.config.json`，修改 appid：

```json
{
  "appid": "你的小程序AppID"
}
```

#### 修改地图 Key

编辑 `config/config.js`，修改腾讯地图 Key：

```javascript
module.exports = {
  TENCENT_MAP_KEY: '你的腾讯地图Key'
};
```

同样需要修改 `app.js` 中的配置：

```javascript
this.globalData = {
  config: {
    mapKey: '你的腾讯地图Key'
  }
};
```

### 3. 导入项目

1. 打开微信开发者工具
2. 选择「导入项目」
3. 选择 `miniprogram` 目录
4. 填写项目名称和 AppID
5. 点击「导入」

### 4. 配置服务器域名

在「小程序后台-开发管理-开发设置-服务器域名」中添加：

```
request合法域名: https://apis.map.qq.com
uploadFile合法域名: https://apis.map.qq.com
downloadFile合法域名: https://apis.map.qq.com
```

### 5. 运行项目

点击开发者工具的「编译」按钮，即可在模拟器中预览。

## 功能说明

### 已实现功能

- ✅ 车辆选择页面（4辆家庭车辆）
- ✅ 实时定位（使用小程序原生定位 API）
- ✅ 地图展示（使用小程序 map 组件）
- ✅ 逆地理编码（腾讯地图 API）
- ✅ 地图截图分享（Canvas 2D + 腾讯地图静态图）
- ✅ 扫码选车功能

### 核心技术

| 技术 | 说明 |
|------|------|
| **定位** | `wx.getLocation` - 直接返回 GCJ-02 坐标，无需转换 |
| **地图** | `<map>` 组件 - 小程序原生地图组件 |
| **截图** | Canvas 2D + 腾讯地图静态图 API |
| **逆地理编码** | 腾讯地图 Web Service API |

## 资源文件准备

需要准备以下图片资源（建议尺寸）：

### 车辆 Logo (assets/images/logos/)

- `lexus_logo.png` - 雷克萨斯 Logo (建议 200x200)
- `leapmotor_logo.png` - 零跑 Logo (建议 200x200)
- `audi_logo.png` - 奥迪 Logo (建议 200x200)
- `xiaomi_logo.png` - 小米 Logo (建议 200x200)

### 地图标记图标 (assets/images/markers/)

- `lexus_marker.png` - 雷克萨斯标记 (建议 80x80)
- `leapmotor_marker.png` - 零跑标记 (建议 80x80)
- `audi_marker.png` - 奥迪标记 (建议 80x80)
- `xiaomi_marker.png` - 小米标记 (建议 80x80)
- `default_marker.png` - 默认标记 (建议 80x80)

## 注意事项

1. **定位权限**：首次使用需要授权定位权限
2. **网络请求**：需要配置服务器域名白名单
3. **地图 Key**：需要申请腾讯地图小程序专用 Key
4. **资源文件**：需要准备车辆 Logo 和标记图标

## 调试技巧

### 真机调试

1. 点击「真机调试」按钮
2. 使用微信扫描二维码
3. 在真机上测试定位和地图功能

### 调试日志

打开「调试器-Console」查看日志输出。

### 清除缓存

如果遇到问题，可以尝试：
- 清除文件缓存
- 清除数据缓存
- 重新编译

## 提交审核

### 1. 检查项

- [ ] 所有功能正常工作
- [ ] 隐私协议已添加
- [ ] 用户信息已填写
- [ ] 服务器域名已配置
- [ ] 测试账号已准备

### 2. 提交流程

1. 上传代码
2. 填写版本号和备注
3. 提交审核
4. 等待审核结果（通常 1-3 个工作日）

## 常见问题

### Q: 地图不显示？

A: 检查以下几点：
- 是否配置了正确的地图 Key
- 网络是否正常
- 是否配置了服务器域名白名单

### Q: 定位失败？

A: 检查以下几点：
- 是否授权了定位权限
- 是否在真机上测试
- 是否开启了定位服务

### Q: 截图失败？

A: 检查以下几点：
- 腾讯地图静态图 API 是否可用
- Canvas 组件是否存在
- 网络是否正常

## 技术支持

如有问题，请联系开发者或查看技术方案文档：
`discuss/微信小程序改造技术方案.md`

## 版本历史

- v1.0.0 (2026-02-25) - 初始版本，核心功能实现
