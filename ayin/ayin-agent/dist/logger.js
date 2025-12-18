"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsoleLogger = void 0;
exports.createLogger = createLogger;
const LOG_LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};
class ConsoleLogger {
    constructor(level = 'info') {
        this.level = level;
    }
    shouldLog(msgLevel) {
        return LOG_LEVELS[msgLevel] >= LOG_LEVELS[this.level];
    }
    timestamp() {
        return new Date().toISOString();
    }
    info(msg, data) {
        if (this.shouldLog('info')) {
            console.log(`[${this.timestamp()}] INFO  ${msg}`, data ? JSON.stringify(data) : '');
        }
    }
    error(msg, error) {
        if (this.shouldLog('error')) {
            const errorStr = error instanceof Error
                ? error.stack || error.message
                : JSON.stringify(error);
            console.error(`[${this.timestamp()}] ERROR ${msg}`, errorStr);
        }
    }
    warn(msg, data) {
        if (this.shouldLog('warn')) {
            console.warn(`[${this.timestamp()}] WARN  ${msg}`, data ? JSON.stringify(data) : '');
        }
    }
    debug(msg, data) {
        if (this.shouldLog('debug')) {
            console.debug(`[${this.timestamp()}] DEBUG ${msg}`, data ? JSON.stringify(data) : '');
        }
    }
}
exports.ConsoleLogger = ConsoleLogger;
function createLogger(level = 'info') {
    return new ConsoleLogger(level);
}
//# sourceMappingURL=logger.js.map