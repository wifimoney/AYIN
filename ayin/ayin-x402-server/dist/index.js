"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("./logger");
const server_1 = require("./server");
const logger = (0, logger_1.createLogger)('info');
const server = new server_1.X402Server(logger, new server_1.MockPaymentProvider(logger));
const port = parseInt(process.env.PORT || '3000', 10);
server.start(port);
logger.info('x402 Server started', { port });
