// src/lib/InjectorManager.ts

type InjectTask = () => boolean

class InjectorManager {
  private tasks: Set<InjectTask> = new Set()
  private observer: MutationObserver | null = null
  private isThrottled = false

  register(task: InjectTask) {
    this.tasks.add(task)
    try { task() } catch { /* 首次执行失败静默 */ }
  }

  unregister(task: InjectTask) {
    this.tasks.delete(task)
  }

  start() {
    if (this.observer) return
    this.observer = new MutationObserver(() => {
      if (this.isThrottled) return
      this.isThrottled = true
      requestAnimationFrame(() => {
        for (const task of this.tasks) {
          try { task() } catch { /* 重试失败静默 */ }
        }
        this.isThrottled = false
      })
    })
    this.observer.observe(document.body, { childList: true, subtree: true })
  }

  stop() {
    this.observer?.disconnect()
    this.observer = null
  }
}

export const injector = new InjectorManager()
