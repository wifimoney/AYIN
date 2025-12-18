import { Logger } from './types';

export class ConsoleLogger implements Logger {
    private level: string;

    constructor(level: string = 'info') {
        this.level = level;
    }

    info(msg: string, data?: Record<string, unknown>): void {
        console.log(`[INFO] ${msg}`, data ? JSON.stringify(data) : '');
    }

    error(msg: string, error?: Error | Record<string, unknown>): void {
        console.error(`[ERROR] ${msg}`, error);
    }

    warn(msg: string, data?: Record<string, unknown>): void {
        console.warn(`[WARN] ${msg}`, data ? JSON.stringify(data) : '');
    }

    debug(msg: string, data?: Record<string, unknown>): void {
        if (this.level === 'debug') {
            console.debug(`[DEBUG] ${msg}`, data ? JSON.stringify(data) : '');
        }
    }
}

export function createLogger(level: string = 'info'): Logger {
    return new ConsoleLogger(level);
}
