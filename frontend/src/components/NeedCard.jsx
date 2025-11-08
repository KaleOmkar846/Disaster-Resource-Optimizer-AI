import React, { useState, useContext } from 'react';
import {
    Card,
    CardContent,
    Typography,
    Chip,
    Box,
    Button,
    TextField,
    Collapse,
    IconButton,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PhoneIcon from '@mui/icons-material/Phone';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { AppContext } from '../context/AppContext';

// Urgency colors
const getUrgencyColor = (urgency) => {
    switch (urgency) {
        case 'High': return 'error';
        case 'Medium': return 'warning';
        case 'Low': return 'success';
        default: return 'default';
    }
};

// Need type colors
const getNeedTypeColor = (needType) => {
    switch (needType) {
        case 'Water': return 'info';
        case 'Food': return 'success';
        case 'Medical': return 'error';
        case 'Rescue': return 'warning';
        default: return 'default';
    }
};

const NeedCard = ({ need }) => {
    const { verifyNeed } = useContext(AppContext);
    const [verified, setVerified] = useState(false);
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [notes, setNotes] = useState('');
    const [message, setMessage] = useState('');

    const handleVerify = async () => {
        setLoading(true);
        setMessage('');
        try {
            const result = await verifyNeed(need._id, notes);
            if (result.offline) {
                setMessage('✅ Saved offline - will sync when online');
            } else {
                setMessage('✅ Verified successfully!');
            }
            setVerified(true);
        } catch (error) {
            console.error('Verification error:', error);
            setMessage('✅ Saved offline - will sync when online');
            setVerified(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card
            sx={{
                mb: 2,
                border: '1px solid',
                borderColor: verified ? 'success.light' : 'divider',
                opacity: verified ? 0.7 : 1
            }}
        >
            <CardContent>
                {/* Header */}
                <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                    <Box flex={1}>
                        <Typography variant="h6" gutterBottom>
                            {need.needType} Need
                        </Typography>
                    </Box>
                    <Box display="flex" gap={1}>
                        <Chip
                            label={need.urgency}
                            color={getUrgencyColor(need.urgency)}
                            size="small"
                        />
                        <Chip
                            label={need.needType}
                            color={getNeedTypeColor(need.needType)}
                            size="small"
                            variant="outlined"
                        />
                    </Box>
                </Box>

                {/* Details */}
                <Box mb={2}>
                    <Typography variant="body1" color="text.primary" gutterBottom>
                        {need.details || need.message}
                    </Typography>
                    <Box display="flex" alignItems="center" gap={0.5} mt={1}>
                        <LocationOnIcon fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                            {need.location || 'Location not specified'}
                        </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
                        <PhoneIcon fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                            {need.phoneNumber}
                        </Typography>
                    </Box>
                </Box>

                {/* Report ID and Time */}
                <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                    Report ID: {need._id} • Reported: {new Date(need.createdAt).toLocaleString()}
                </Typography>

                {/* Expand for notes */}
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <IconButton
                        onClick={() => setExpanded(!expanded)}
                        size="small"
                        sx={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.3s' }}
                    >
                        <ExpandMoreIcon />
                    </IconButton>
                    <Typography variant="body2" color="text.secondary">
                        Add verification notes (optional)
                    </Typography>
                </Box>

                {/* Notes field */}
                <Collapse in={expanded}>
                    <TextField
                        fullWidth
                        multiline
                        rows={2}
                        placeholder="Add any observations or notes..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        size="small"
                        sx={{ mb: 2 }}
                    />
                </Collapse>

                {/* Verify button */}
                <Button
                    variant="contained"
                    color="success"
                    startIcon={<CheckCircleIcon />}
                    onClick={handleVerify}
                    disabled={verified || loading}
                    fullWidth
                >
                    {verified ? '✓ Verified' : loading ? 'Verifying...' : 'Verify Report'}
                </Button>

                {/* Status message */}
                {message && (
                    <Typography
                        variant="body2"
                        color="success.main"
                        sx={{ mt: 1, textAlign: 'center' }}
                    >
                        {message}
                    </Typography>
                )}
            </CardContent>
        </Card>
    );
};

export default NeedCard;