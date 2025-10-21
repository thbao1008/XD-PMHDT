// src/services/packageService.js
const KEY = "aesp_packages_v1";

const DEFAULT_PACKAGES = [
  { id: 1, name: "Gói Basic", description: "Bài tập cơ bản, 4 buổi/tháng", price: 199000, durationMonths: 1, active: true },
  { id: 2, name: "Gói Pro", description: "Thực hành nâng cao, 12 buổi/tháng", price: 499000, durationMonths: 1, active: true },
  { id: 3, name: "Gói Premium", description: "Kèm mentor 1:1, không giới hạn", price: 1299000, durationMonths: 1, active: true },
];

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      localStorage.setItem(KEY, JSON.stringify(DEFAULT_PACKAGES));
      return DEFAULT_PACKAGES.slice();
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error("packageService read error - packageService.js:19", e);
    return DEFAULT_PACKAGES.slice();
  }
}

function write(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function listPackages() {
  return Promise.resolve(read());
}

export function getPackage(id) {
  const p = read().find(x => x.id === Number(id));
  return Promise.resolve(p || null);
}

export function createPackage(payload) {
  const list = read();
  const nextId = (list.reduce((m, i) => Math.max(m, i.id), 0) || 0) + 1;
  const item = { id: nextId, ...payload };
  list.unshift(item);
  write(list);
  return Promise.resolve(item);
}

export function updatePackage(id, payload) {
  const list = read();
  const idx = list.findIndex(x => x.id === Number(id));
  if (idx === -1) return Promise.reject(new Error("Not found"));
  list[idx] = { ...list[idx], ...payload };
  write(list);
  return Promise.resolve(list[idx]);
}

export function deletePackage(id) {
  const list = read().filter(x => x.id !== Number(id));
  write(list);
  return Promise.resolve(true);
}
