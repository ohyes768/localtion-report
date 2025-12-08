# 二维码图片说明

本目录包含车辆的二维码图片，用于快速访问对应的车辆位置页面。

## 二维码格式

每个二维码指向对应的车辆页面：
- `car001.png` → `https://yourdomain.com/?car=car001` (爸爸的车)
- `car002.png` → `https://yourdomain.com/?car=car002` (妈妈的车)
- `car003.png` → `https://yourdomain.com/?car=car003` (哥哥的车)
- `car004.png` → `https://yourdomain.com/?car=car004` (妹妹的车)

## 如何生成二维码

### 方法1：使用在线二维码生成器
1. 访问 [草料二维码](https://cli.im/) 或类似网站
2. 输入对应的车辆URL
3. 选择适当的尺寸（建议200x200像素）
4. 下载并保存为对应的车辆ID名称

### 方法2：使用Node.js生成
```bash
npm install qrcode
```

```javascript
const QRCode = require('qrcode');
const baseUrl = 'https://yourdomain.com/';

const vehicles = ['car001', 'car002', 'car003', 'car004'];

vehicles.forEach(async (carId) => {
    const url = `${baseUrl}?car=${carId}`;
    await QRCode.toFile(`qrcodes/${carId}.png`, url, {
        width: 200,
        margin: 2
    });
    console.log(`Generated ${carId}.png`);
});
```

### 方法3：使用Python生成
```bash
pip install qrcode[pil]
```

```python
import qrcode
import os

base_url = 'https://yourdomain.com/'
vehicles = ['car001', 'car002', 'car003', 'car004']

os.makedirs('qrcodes', exist_ok=True)

for car_id in vehicles:
    url = f"{base_url}?car={car_id}"
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=2,
    )
    qr.add_data(url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    img.save(f"qrcodes/{car_id}.png")
    print(f"Generated {car_id}.png")
```

## 使用说明

1. 将生成好的二维码图片下载到 `qrcodes/` 目录
2. 确保文件名与车辆ID对应
3. 打印二维码并贴在对应车辆上
4. 用户扫码即可快速访问车辆位置页面

## 注意事项

- 部署前需要将 `yourdomain.com` 替换为实际的域名
- 确保二维码清晰可识别
- 建议使用HTTPS链接
- 可以在二维码旁边添加车辆标识信息