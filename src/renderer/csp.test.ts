// 防回归：ChampIcon 的头像是 data URL（data:image/png;base64,...），
// 若 CSP 未放行 img-src data:，真实应用会静默拦截全部头像（jsdom 测试不执行 CSP，拦不住）。
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('renderer CSP', () => {
  it("index.html 的 CSP 放行 img-src 'self' data:（data URL 头像）", () => {
    const html = readFileSync(new URL('./index.html', import.meta.url), 'utf-8')
    expect(html).toContain("img-src 'self' data:")
  })
})
