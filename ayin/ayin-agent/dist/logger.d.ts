import { Logger, LogLevel } from './types';
export declare class ConsoleLogger implements Logger {
    private level;
    constructor(level?: LogLevel);
    private shouldLog;
    private timestamp;
    info(msg: string, data?: Record<string, unknown>): void;
    error(msg: string, error?: Error | Record<string, unknown>): void;
    warn(msg: string, data?: Record<string, unknown>): void;
    debug(msg: string, data?: Record<string, unknown>): void;
}
export declare function createLogger(level?: LogLevel): Logger;
//# sourceMappingURL=logger.d.ts.map