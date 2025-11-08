import React, { createContext, useState, useEffect, useCallback } from 'react';
import {
    fetchUnverifiedNeeds,
    verifyNeed as verifyNeedAPI,
    syncPendingVerifications
} from '../utils/api';
import { getPendingVerifications } from '../utils/db';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
    const [needs, setNeeds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [pendingSync, setPendingSync] = useState(0);
    const [volunteerId] = useState(`volunteer-${Date.now()}`);

    // Load needs from API or cache
    const loadNeeds = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchUnverifiedNeeds();
            setNeeds(data);
        } catch (error) {
            console.error('Failed to load needs:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Verify a need
    const verifyNeed = async (needId, notes = '') => {
        try {
            const result = await verifyNeedAPI(needId, volunteerId, notes);
            if (result.offline) {
                setPendingSync(prev => prev + 1);
            }
            // Refresh needs list
            await loadNeeds();
            return result;
        } catch (error) {
            setPendingSync(prev => prev + 1);
            throw error;
        }
    };

    // Sync offline verifications
    const syncData = useCallback(async () => {
        try {
            const result = await syncPendingVerifications();
            if (result.synced > 0) {
                console.log(`Synced ${result.synced} verifications`);
                setPendingSync(0);
                await loadNeeds();
            }
        } catch (error) {
            console.error('Sync failed:', error);
        }
    }, [loadNeeds]);

    // Monitor network status
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            syncData(); // Auto-sync when back online
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [syncData]);

    // Load initial data
    useEffect(() => {
        loadNeeds();
        // Check for pending syncs
        getPendingVerifications().then(pending => {
            setPendingSync(pending.length);
        });
    }, [loadNeeds]);

    // Auto-refresh every 30 seconds when online
    useEffect(() => {
        if (!isOnline) return;
        const interval = setInterval(loadNeeds, 30000);
        return () => clearInterval(interval);
    }, [isOnline, loadNeeds]);

    const value = {
        needs,
        loading,
        isOnline,
        pendingSync,
        volunteerId,
        loadNeeds,
        verifyNeed,
        syncData,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
