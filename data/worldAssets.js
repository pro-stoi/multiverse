// multiverse/data/worldAssets.js
//
// Загрузка списка миров и миров по ID.

const BASE = './assets/worlds';
const API = '/api/multiverse/worlds/list';

const cache = new Map();
let worldListCache = null;

async function fetchJson(url) {
    if (cache.has(url)) return cache.get(url);
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        cache.set(url, data);
        return data;
    } catch (e) {
        console.warn('[worldAssets] не загружено', url, e.message);
        return null;
    }
}

// Список ID миров. Кэшируется.
export async function loadWorldList() {
    if (worldListCache) return worldListCache;

    // 1. Сначала пробуем сервер
    let data = null;
    try {
        const res = await fetch(API);
        if (res.ok) data = await res.json();
    } catch (e) {
        // сервер недоступен — это нормально на GitHub Pages
    }

    // 2. Если сервер не ответил — читаем index.json
    if (!data || !Array.isArray(data.worlds)) {
        try {
            const res = await fetch(`${BASE}/index.json`);
            if (res.ok) data = await res.json();
        } catch (e) {
            console.warn('[worldAssets] index.json не загружен', e.message);
        }
    }

    worldListCache = (data && Array.isArray(data.worlds)) ? data.worlds : [];
    return worldListCache;
}

// Один мир по ID.
export async function loadWorld(id) {
    return fetchJson(`${BASE}/${id}.json`);
}

// Взять ID мира по (branchId, era).
export async function pickWorldId(branchId, era) {
    const list = await loadWorldList();
    if (list.length === 0) return null;
    const idx = Math.abs(branchId + era * 3) % list.length;
    return list[idx];
}
