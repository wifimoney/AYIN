
import { redis, isConnected } from './lib/redis';

async function test() {
    console.log('Redis instance:', !!redis);
    console.log('Redis status:', redis?.status);
    try {
        const connected = await isConnected();
        console.log('isConnected:', connected);
    } catch (e) {
        console.error('isConnected error:', e);
    }
    process.exit(0);
}

test();
