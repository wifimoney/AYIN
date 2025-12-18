import { Logger, LogLevel } from './types';

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

export class ConsoleLogger implements Logger {
    private level: LogLevel;

    constructor(level: LogLevel = 'info') {
        this.level = level;
    }

    private shouldLog(msgLevel: LogLevel): boolean {
        return LOG_LEVELS[msgLevel] >= LOG_LEVELS[this.level];
    }

    private timestamp(): string {
        return new Date().toISOString();
    }

    info(msg: string, data?: Record<string, unknown>): void {
        if (this.shouldLog('info')) {
            console.log(
                `[${this.timestamp()}] INFO  ${msg}`,
                data ? JSON.stringify(data) : ''
            );
        }
    }

    error(msg: string, error?: Error | Record<string, unknown>): void {
        if (this.shouldLog('error')) {
            const errorStr = error instanceof Error
                ? error.stack || error.message
                : JSON.stringify(error);
            console.error(`[${this.timestamp()}] ERROR ${msg}`, errorStr);
        }
    }

    warn(msg: string, data?: Record<string, unknown>): void {
        if (this.shouldLog('warn')) {
            console.warn(
                `[${this.timestamp()}] WARN  ${msg}`,
                data ? JSON.stringify(data) : ''
            );
        }
    }

    debug(msg: string, data?: Record<string, unknown>): void {
        if (this.shouldLog('debug')) {
            console.debug(
                `[${this.timestamp()}] DEBUG ${msg}`,
                data ? JSON.stringify(data) : ''
            );
        }
    }
}

export function createLogger(level: LogLevel = 'info'): Logger {
    return new ConsoleLogger(level);
}
