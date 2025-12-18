import { createLogger } from './logger';
import { X402Server, MockPaymentProvider } from './server';

const logger = createLogger('info');

const server = new X402Server(logger, new MockPaymentProvider(logger));

const port = parseInt(process.env.PORT || '3000', 10);
server.start(port);

logger.info('x402 Server started', { port });
