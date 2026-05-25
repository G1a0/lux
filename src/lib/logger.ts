export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LoggerOptions {
  name: string
  version: string
}

function formatMessage(level: LogLevel, name: string, message: string): string {
  const ts = new Date().toISOString().slice(11, 23)
  return `[${ts}] [${level.toUpperCase()}] [${name}] ${message}`
}

export function createLogger(options: LoggerOptions) {
  return {
    debug(message: string, ...args: unknown[]) {
      console.debug(formatMessage('debug', options.name, message), ...args)
    },
    info(message: string, ...args: unknown[]) {
      console.log(formatMessage('info', options.name, message), ...args)
    },
    warn(message: string, ...args: unknown[]) {
      console.warn(formatMessage('warn', options.name, message), ...args)
    },
    error(message: string, ...args: unknown[]) {
      console.error(formatMessage('error', options.name, message), ...args)
    },
    printBanner() {
      console.log(
        `%c  🔆 Lux v${options.version}  %c 英雄联盟智能选人推荐 `,
        'background:#f0c040;color:#000;font-weight:bold;padding:4px 8px;',
        'background:#333;color:#fff;padding:4px 8px;',
      )
    },
  }
}

export type Logger = ReturnType<typeof createLogger>
