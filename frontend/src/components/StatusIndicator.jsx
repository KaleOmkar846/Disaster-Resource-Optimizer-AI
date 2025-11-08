import React, { useContext } from 'react';
import { Box, Chip, Alert } from '@mui/material';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import { AppContext } from '../context/AppContext';

const StatusIndicator = () => {
    const { isOnline, pendingSync } = useContext(AppContext);

    return (
        <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <Chip
                icon={isOnline ? <WifiIcon /> : <WifiOffIcon />}
                label={isOnline ? 'Online' : 'Offline'}
                color={isOnline ? 'success' : 'warning'}
                size="small"
            />
            {pendingSync > 0 && (
                <Alert severity="info" sx={{ py: 0 }}>
                    {pendingSync} verification(s) pending sync - will auto-sync when online
                </Alert>
            )}
        </Box>
    );
};

export default StatusIndicator;
