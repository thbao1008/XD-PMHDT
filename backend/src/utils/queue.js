// backend/src/utils/queue.js
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
    const job = {
      id: Date.now() + "-" + Math.random().toString(36).slice(2, 6),
      data,
      opts,
      createdAt: Date.now()
    };
    jobs[name].push(job);
    setImmediate(async () => {
      if (processors[name]) {
        try {
          await processors[name](job);
        } catch (err) {
          console.error("Inmemory queue handler error: - queue.js:63", err);
        }
      }
    });
    return job;
  };

  registerProcessor = function(name, handler) {
    processors[name] = async (job) => {
      const jobObj = { id: job.id, data: job.data };
      return handler(jobObj);
    };
  };

  closeAll = async function() {
    return;
  };
}

// ✅ Export các hàm ở top-level với tên mới
export { enqueue, registerProcessor, closeAll };
