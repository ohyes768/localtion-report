# GitHub Pages 部署测试指南

## 快速部署步骤

### 1. 确保代码已推送到GitHub
```bash
# 检查当前状态
git status

# 如果有未提交的更改，先提交
git add .
git commit -m "精简截图实现，只保留腾讯地图API"
git push
```

### 2. 启用GitHub Pages
1. 访问你的GitHub仓库：`https://github.com/ohyes768/localtion-report`
2. 点击 **Settings** 选项卡
3. 在左侧菜单中找到 **Pages**
4. 在 **Source** 下选择 **Deploy from a branch**
5. **Branch** 选择 **main**，文件夹选择 **/(root)**
6. 点击 **Save**

### 3. 等待部署完成
- GitHub Pages需要几分钟时间来部署
- 部署成功后，在Pages页面会显示访问地址
- 你的网站地址将是：`https://ohyes768.github.io/localtion-report/`

### 4. 测试部署结果

#### 基础功能测试
访问以下链接测试车辆页面：

1. **雷克萨斯LS200**
   - 链接：`https://ohyes768.github.io/localtion-report/?car=car001`
   - 二维码：访问 `https://ohyes768.github.io/localtion-report/qr-codes.html` 查看对应二维码

2. **零跑T03**
   - 链接：`https://ohyes768.github.io/localtion-report/?car=car002`

3. **奥迪Q5**
   - 链接：`https://ohyes768.github.io/localtion-report/?car=car003`

4. **小米SU7**
   - 链接：`https://ohyes768.github.io/localtion-report/?car=car004`

#### 测试清单
- [ ] 页面能正常打开，无404错误
- [ ] 车辆信息正确显示（车牌号、车辆名称）
- [ ] 地图API正常加载（无API错误提示）
- [ ] 定位功能正常工作（允许位置权限）
- [ ] 地图能显示当前位置
- [ ] 分享功能正常（生成截图）
- [ ] 在手机浏览器中测试
- [ ] 在微信内置浏览器中测试

### 5. 移动端测试特别说明

#### iOS设备测试
1. 在Safari中打开链接
2. 允许位置权限
3. 检查地图显示是否正常
4. 测试分享功能

#### Android设备测试
1. 在Chrome或其他浏览器中打开链接
2. 允许位置权限
3. 检查地图显示
4. 测试分享功能

#### 微信内测试
1. 将链接发送到微信群
2. 在微信中点击链接
3. 允许位置权限
4. 测试完整流程

### 6. 常见问题排查

#### 地图无法显示
- 检查浏览器控制台是否有错误信息
- 确认腾讯地图API Key配置正确
- 检查网络连接是否正常

#### 定位失败
- 确保设备定位服务已开启
- 检查浏览器是否允许获取位置
- 尝试在室外或靠近窗户的地方使用

#### 分享功能异常
- 检查截图生成是否有错误
- 确认腾讯地图静态图API配额未用完
- 查看控制台错误信息

### 7. 生成实体二维码（可选）
1. 访问：`https://ohyes768.github.io/localtion-report/qr-codes.html`
2. 打印页面（Ctrl+P）
3. 裁剪对应的二维码贴到车上

### 8. 配置自定义域名（可选）
如果需要使用自定义域名：

1. 在仓库根目录创建 `CNAME` 文件，内容为：
   ```
   yourdomain.com
   ```

2. 在域名解析中添加CNAME记录：
   - 主机记录：`www`
   - 记录值：`ohyes768.github.io`

### 9. 监控和维护
- 定期检查腾讯地图API使用量
- 监控网站访问是否正常
- 收集用户使用反馈

## 联系方式
如有问题，请通过以下方式联系：
- GitHub Issues: `https://github.com/ohyes768/localtion-report/issues`
- 邮箱: [你的邮箱地址]

---

**注意**：确保腾讯地图API Key已配置在 `js/config.js` 文件中，并且域名 `ohyes768.github.io` 已添加到腾讯地图控制台的域名白名单中。