// test-push.js
import Redis from 'ioredis';
import 'dotenv/config';

// This script assumes it's run from the project root,
// and it will read the backend's .env file for the REDIS_URL.
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const redis = new Redis(process.env.REDIS_URL);

async function pushOutgoingJob() {
  const to = process.argv[2];
  const text = process.argv[3];

  if (!to || !text) {
    console.error('Usage: node test-push.js "<phone_number>" "<message>"');
    console.error('Example: node test-push.js "919999988888" "Hello from the test script"');
    process.exit(1);
  }

  const job = { to, text };
  const jobString = JSON.stringify(job);

  try {
    await redis.lpush('queue:outgoing', jobString);
    console.log(`Successfully enqueued job for ${to}: "${text}"`);
  } catch (error) {
    console.error('Failed to enqueue job:', error);
  } finally {
    redis.quit();
  }
}

pushOutgoingJob();