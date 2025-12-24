import { Logger } from '../types';

export const logger: Logger = {
  info: (msg: string, data?: Record<string, unknown>) => console.log(JSON.stringify({ level: 'INFO', msg, ...data, timestamp: Date.now() })),
  error: (msg: string, error?: Error | Record<string, unknown>) => console.error(JSON.stringify({ level: 'ERROR', msg, error, timestamp: Date.now() })),
  warn: (msg: string, data?: Record<string, unknown>) => console.warn(JSON.stringify({ level: 'WARN', msg, ...data, timestamp: Date.now() })),
  debug: (msg: string, data?: Record<string, unknown>) => console.debug(JSON.stringify({ level: 'DEBUG', msg, ...data, timestamp: Date.now() })),
};

export function logAction(action: Record<string, any>) {
  logger.info('Action', action);
}