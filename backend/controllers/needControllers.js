import Need from '../models/Need.js';

// Get all unverified needs
export const getUnverifiedNeeds = async (req, res) => {
    try {
        const needs = await Need.find({ status: 'unverified' })
            .sort({ createdAt: -1 })
            .limit(100);
        res.json({
            success: true,
            count: needs.length,
            data: needs
        });
    } catch (error) {
        console.error('Error fetching needs:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch needs',
            error: error.message
        });
    }
};

// Get all needs (for statistics)
export const getAllNeeds = async (req, res) => {
    try {
        const needs = await Need.find()
            .sort({ createdAt: -1 })
            .limit(500);

        // Calculate statistics
        const stats = {
            total: needs.length,
            unverified: needs.filter(n => n.status === 'unverified').length,
            verified: needs.filter(n => n.status === 'verified').length,
            fulfilled: needs.filter(n => n.status === 'fulfilled').length,
            byType: {
                water: needs.filter(n => n.needType === 'Water').length,
                food: needs.filter(n => n.needType === 'Food').length,
                medical: needs.filter(n => n.needType === 'Medical').length,
                rescue: needs.filter(n => n.needType === 'Rescue').length,
                other: needs.filter(n => n.needType === 'Other').length
            },
            byUrgency: {
                high: needs.filter(n => n.urgency === 'High').length,
                medium: needs.filter(n => n.urgency === 'Medium').length,
                low: needs.filter(n => n.urgency === 'Low').length
            }
        };

        res.json({
            success: true,
            stats,
            data: needs
        });
    } catch (error) {
        console.error('Error fetching all needs:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch needs'
        });
    }
};

// Verify a single need
export const verifyNeed = async (req, res) => {
    try {
        const { id } = req.params;
        const { volunteerId, notes } = req.body;
        const need = await Need.findByIdAndUpdate(
            id,
            {
                status: 'verified',
                verifiedBy: volunteerId || 'volunteer-' + Date.now(),
                verifiedAt: new Date(),
                verificationNotes: notes || ''
            },
            { new: true }
        );
        if (!need) {
            return res.status(404).json({
                success: false,
                message: 'Need not found'
            });
        }
        res.json({
            success: true,
            message: 'Need verified successfully',
            data: need
        });
    } catch (error) {
        console.error('Error verifying need:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify need'
        });
    }
};

// Sync multiple verifications (for offline queue)
export const syncVerifications = async (req, res) => {
    try {
        const { verifications } = req.body;
        if (!Array.isArray(verifications)) {
            return res.status(400).json({
                success: false,
                message: 'Verifications must be an array'
            });
        }
        const results = [];
        for (const verification of verifications) {
            try {
                const need = await Need.findByIdAndUpdate(
                    verification.needId,
                    {
                        status: 'verified',
                        verifiedBy: verification.volunteerId,
                        verifiedAt: new Date(verification.verifiedAt),
                        verificationNotes: verification.notes || ''
                    },
                    { new: true }
                );
                results.push({
                    needId: verification.needId,
                    success: true,
                    data: need
                });
            } catch (err) {
                results.push({
                    needId: verification.needId,
                    success: false,
                    error: err.message
                });
            }
        }
        res.json({
            success: true,
            message: `Synced ${results.filter(r => r.success).length}/${verifications.length} verifications`,
            results
        });
    } catch (error) {
        console.error('Error syncing verifications:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to sync verifications'
        });
    }
};

// Get need by ID
export const getNeedById = async (req, res) => {
    try {
        const { id } = req.params;
        const need = await Need.findById(id);
        if (!need) {
            return res.status(404).json({
                success: false,
                message: 'Need not found'
            });
        }
        res.json({
            success: true,
            data: need
        });
    } catch (error) {
        console.error('Error fetching need:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch need'
        });
    }
};