import React, { useContext } from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import { AppContext } from '../context/AppContext';
import NeedCard from './NeedCard';

const NeedsList = () => {
  const { needs, loading } = useContext(AppContext);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  const unverifiedNeeds = needs.filter((need) => need.status === 'unverified');

  if (unverifiedNeeds.length === 0) {
    return (
      <Alert severity="success" sx={{ mt: 2 }}>
        <Typography variant="h6">
          ✅ All reports verified!
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          No pending verifications at this time. New reports will appear here automatically.
        </Typography>
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
        Pending Verifications ({unverifiedNeeds.length})
      </Typography>
      {unverifiedNeeds.map((need) => (
        <NeedCard key={need._id} need={need} />
      ))}
    </Box>
  );
};

export default NeedsList;
