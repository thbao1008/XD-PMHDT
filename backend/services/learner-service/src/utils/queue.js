// Queue utility - supports Bull (Redis) or EventEmitter fallback
import EventEmitter from "events";

const REDIS_URL = process.env.REDIS_URL;

let enqueue;
let registerProcessor;  
let closeAll;

if (REDIS_URL) {
  const Queue = (await import("bull")).default;
  const queues = new Map();

  function getQueue(name) {
    if (!queues.has(name)) {
      const q = new Queue(name, REDIS_URL);
      queues.set(name, q);
    }
    return queues.get(name);
  }

  enqueue = async function(name, data = {}, opts = {}) {
    const q = getQueue(name);
    return q.add(data, opts);
  };

  registerProcessor = function(name, handler) {
    const q = getQueue(name);
    q.process(async (job) => {
      try {
        return await handler(job);
      } catch (err) {
        console.error(`Queue handler error for ${name}: - queue.js:33`, err);
        throw err;
      }
    });
  };

  closeAll = async function() {
    for (const q of queues.values()) {
      await q.close();
    }
  };
} else {
  const emitter = new EventEmitter();
  const jobs = {};
  const processors = {};

  enqueue = async function(name, data = {}, opts = {}) {
    jobs[name] = jobs[name] || [];
    jobs[name].push({ data, opts, id: Date.now() });
    emitter.emit('job', name, { data, opts });
    return { id: Date.now() };
  };

  registerProcessor = function(name, handler) {
    processors[name] = handler;
    emitter.on('job', async (jobName, job) => {
      if (jobName === name && processors[name]) {
        try {
          await processors[name](job);
        } catch (err) {
          console.error(`EventEmitter handler error for ${name}:`, err);
        }
      }
    });
  };

  closeAll = async function() {
    // No-op for EventEmitter
  };
}

export { enqueue, registerProcessor, closeAll };

