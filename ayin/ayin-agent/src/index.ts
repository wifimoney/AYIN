import { runAgent } from './runtime/agent';
import { config } from './config/config';

async function loop() {
    console.log("Starting Agent Loop...");
    while (true) {
        try {
            await runAgent();
        } catch (err) {
            console.error('[AGENT ERROR]', err);
        }
        await new Promise(r => setTimeout(r, config.pollIntervalMs));
    }
}

loop();
