// 视窗纯函数：贴边吸附 / 工作区约束（无 Electron 依赖，可单测）。
export interface Rect { x: number; y: number; width: number; height: number }

export function snapToEdge(
  pos: { x: number; y: number },
  size: { width: number; height: number },
  area: Rect,
  threshold = 24,
): { x: number; y: number } {
  let { x, y } = pos
  if (Math.abs(x - area.x) <= threshold) x = area.x
  else if (Math.abs(area.x + area.width - (x + size.width)) <= threshold) x = area.x + area.width - size.width
  if (Math.abs(y - area.y) <= threshold) y = area.y
  else if (Math.abs(area.y + area.height - (y + size.height)) <= threshold) y = area.y + area.height - size.height
  return { x, y }
}

export function clampToWorkArea(
  pos: { x: number; y: number },
  size: { width: number; height: number },
  area: Rect,
): { x: number; y: number } {
  return {
    x: Math.min(Math.max(pos.x, area.x), area.x + area.width - size.width),
    y: Math.min(Math.max(pos.y, area.y), area.y + area.height - size.height),
  }
}
