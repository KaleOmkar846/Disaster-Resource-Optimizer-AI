import axios from 'axios';
import {
    cacheNeeds,
    getCachedNeeds,
    addPendingVerification,
    getPendingVerifications,
    markVerificationSynced,
    updateNeedLocally
} from './db';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
    baseURL: API_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Fetch all unverified needs
export const fetchUnverifiedNeeds = async () => {
    try {
        if (!navigator.onLine) {
            // Offline: return cached data
            return await getCachedNeeds();
        }
        // Online: fetch from server
        const response = await api.get('/needs/unverified');
        const needs = response.data.data;
        // Cache for offline use
        await cacheNeeds(needs);
        return needs;
    } catch (error) {
        console.error('Error fetching needs:', error);
        // Fallback to cache on error
        const cached = await getCachedNeeds();
        return cached;
    }
};

// Fetch all needs with statistics
export const fetchAllNeeds = async () => {
    try {
        const response = await api.get('/needs');
        return response.data;
    } catch (error) {
        console.error('Error fetching all needs:', error);
        throw error;
    }
};

// Verify a need
export const verifyNeed = async (needId, volunteerId, notes = '') => {
    try {
        if (!navigator.onLine) {
            // Offline: queue for later
            await addPendingVerification(needId, volunteerId, notes);
            await updateNeedLocally(needId, {
                status: 'verified',
                verifiedBy: volunteerId,
                verifiedAt: new Date().toISOString(),
            });
            return { offline: true };
        }
        // Online: send to server
        const response = await api.put(`/needs/${needId}/verify`, {
            volunteerId,
            notes
        });
        return response.data.data;
    } catch (error) {
        console.error('Error verifying need:', error);
        // On error, queue for later
        await addPendingVerification(needId, volunteerId, notes);
        await updateNeedLocally(needId, {
            status: 'verified',
            verifiedBy: volunteerId,
            verifiedAt: new Date().toISOString(),
        });
        throw error;
    }
};

// Sync pending verifications
export const syncPendingVerifications = async () => {
    try {
        const pending = await getPendingVerifications();
        if (pending.length === 0) {
            return { synced: 0 };
        }
        const verifications = pending.map((v) => ({
            needId: v.needId,
            volunteerId: v.volunteerId,
            notes: v.notes,
            verifiedAt: v.verifiedAt,
        }));
        const response = await api.post('/needs/sync', { verifications });
        // Mark all as synced
        await Promise.all(pending.map((v) => markVerificationSynced(v.id)));
        return {
            synced: pending.length,
            results: response.data.results
        };
    } catch (error) {
        console.error('Sync failed:', error);
        throw error;
    }
};

export default api;