"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsoleLogger = void 0;
exports.createLogger = createLogger;
class ConsoleLogger {
    constructor(level = 'info') {
        this.level = level;
    }
    info(msg, data) {
        console.log(`[INFO] ${msg}`, data ? JSON.stringify(data) : '');
    }
    error(msg, error) {
        console.error(`[ERROR] ${msg}`, error);
    }
    warn(msg, data) {
        console.warn(`[WARN] ${msg}`, data ? JSON.stringify(data) : '');
    }
    debug(msg, data) {
        if (this.level === 'debug') {
            console.debug(`[DEBUG] ${msg}`, data ? JSON.stringify(data) : '');
        }
    }
}
exports.ConsoleLogger = ConsoleLogger;
function createLogger(level = 'info') {
    return new ConsoleLogger(level);
}
