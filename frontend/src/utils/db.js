import { openDB } from 'idb';

const DB_NAME = 'disaster-response-db';
const DB_VERSION = 1;
const NEEDS_STORE = 'needs';
const PENDING_STORE = 'pending-verifications';

// Initialize database
export const initDB = async () => {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            // Store for cached needs
            if (!db.objectStoreNames.contains(NEEDS_STORE)) {
                db.createObjectStore(NEEDS_STORE, { keyPath: '_id' });
            }
            // Store for pending verifications
            if (!db.objectStoreNames.contains(PENDING_STORE)) {
                const store = db.createObjectStore(PENDING_STORE, {
                    keyPath: 'id',
                    autoIncrement: true,
                });
                store.createIndex('synced', 'synced');
            }
        },
    });
};

// Cache needs list
export const cacheNeeds = async (needs) => {
    const db = await initDB();
    const tx = db.transaction(NEEDS_STORE, 'readwrite');
    // Clear old data
    await tx.store.clear();
    // Add new data
    await Promise.all(needs.map((need) => tx.store.put(need)));
    await tx.done;
};

// Get cached needs
export const getCachedNeeds = async () => {
    const db = await initDB();
    return db.getAll(NEEDS_STORE);
};

// Add pending verification
export const addPendingVerification = async (needId, volunteerId, notes = '') => {
    const db = await initDB();
    await db.add(PENDING_STORE, {
        needId,
        volunteerId,
        notes,
        verifiedAt: new Date().toISOString(),
        synced: false,
    });
};

// Get pending verifications
export const getPendingVerifications = async () => {
    const db = await initDB();
    const index = db.transaction(PENDING_STORE).store.index('synced');
    return index.getAll(false);
};

// Mark verification as synced
export const markVerificationSynced = async (id) => {
    const db = await initDB();
    const tx = db.transaction(PENDING_STORE, 'readwrite');
    const verification = await tx.store.get(id);
    if (verification) {
        verification.synced = true;
        await tx.store.put(verification);
    }
    await tx.done;
};

// Update need locally
export const updateNeedLocally = async (needId, updates) => {
    const db = await initDB();
    const tx = db.transaction(NEEDS_STORE, 'readwrite');
    const need = await tx.store.get(needId);
    if (need) {
        Object.assign(need, updates);
        await tx.store.put(need);
    }
    await tx.done;
};

// Clear all data
export const clearAllData = async () => {
    const db = await initDB();
    await db.clear(NEEDS_STORE);
    await db.clear(PENDING_STORE);
};