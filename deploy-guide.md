# 部署指南

## GitHub Pages 部署（推荐）

### 步骤1：推送到GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/vehicle-location.git
git push -u origin main
```

### 步骤2：启用GitHub Pages
1. 进入你的GitHub仓库
2. 点击 Settings 选项卡
3. 在左侧菜单找到 Pages
4. Source 选择 "Deploy from a branch"
5. Branch 选择 "main"
6. 点击 Save

### 步骤3：获取访问地址
部署完成后，你的网站会发布在：
`https://yourusername.github.io/vehicle-location/`

### 步骤4：更新配置
将 `js/config.js` 中的API Key确保已配置：
```javascript
const MAP_CONFIG = {
    key: '67PBZ-AWOWQ-TTW5A-BTI3M-BNMHH-2YBXZ', // 已配置
    // ...
};
```

### 步骤5：生成最终二维码
为每辆车生成对应的二维码：
- 雷克萨斯LS200: `https://yourusername.github.io/vehicle-location/?car=car001`
- 零跑T03: `https://yourusername.github.io/vehicle-location/?car=car002`
- 奥迪Q5: `https://yourusername.github.io/vehicle-location/?car=car003`
- 小米SU7: `https://yourusername.github.io/vehicle-location/?car=car004`

## 其他部署选项

### Nginx部署
如果你有自己的服务器：
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /path/to/vehicle-location;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # 静态资源缓存
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 阿里云OSS/腾讯云COS
1. 创建存储桶
2. 上传所有文件
3. 设置静态网站托管
4. 绑定自定义域名（可选）

## 部署后测试清单

- [ ] 网站能正常访问
- [ ] 二维码扫描能正确打开页面
- [ ] 定位功能正常工作
- [ ] 地图能正常显示
- [ ] 分享功能正常
- [ ] 在不同手机浏览器中测试
- [ ] 在微信中测试（主要使用场景）

## 域名配置（可选）

### 购买域名后
1. 在域名解析中添加CNAME记录：
   - `www` → `yourusername.github.io`
   - 或 `@` → `yourusername.github.io`

2. 在仓库中添加 `CNAME` 文件：
   ```
   yourdomain.com
   ```

### HTTPS配置
GitHub Pages自动提供HTTPS证书，无需额外配置。

## 注意事项

1. **API配额**：注意腾讯地图API的免费使用限制
2. **域名备案**：如果使用国内服务器和域名，需要备案
3. **访问速度**：可以考虑使用CDN加速
4. **数据统计**：可以添加Google Analytics等统计代码

## 生产环境优化

### 1. 压缩资源
- CSS/JS文件压缩
- 图片优化
- Gzip压缩

### 2. 安全设置
- CSP策略
- HTTPS强制跳转
- API密钥保护

### 3. 性能监控
- 错误监控
- 性能分析
- 用户行为追踪