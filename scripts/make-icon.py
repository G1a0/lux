#!/usr/bin/env python3
"""生成 Lux 图标：深蓝圆角底 + 金色 L。用法：python3 scripts/make-icon.py"""
from PIL import Image, ImageDraw, ImageFont
import os

SIZE = 512
BG = (10, 20, 40, 255)       # 深蓝
GOLD = (200, 170, 110, 255)  # 金
img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
d.rounded_rectangle([8, 8, SIZE - 8, SIZE - 8], radius=96, fill=BG, outline=GOLD, width=10)

font = None
for candidate in [
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
]:
    if os.path.exists(candidate):
        font = ImageFont.truetype(candidate, 320)
        break
if font is None:
    font = ImageFont.load_default()

# 居中绘制 L
bbox = d.textbbox((0, 0), 'L', font=font)
w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
d.text(((SIZE - w) / 2 - bbox[0], (SIZE - h) / 2 - bbox[1] - 10), 'L', font=font, fill=GOLD)

os.makedirs('assets', exist_ok=True)
img.save('assets/icon.png')
img.save('assets/icon.ico', sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
print('assets/icon.png / assets/icon.ico 已生成')
