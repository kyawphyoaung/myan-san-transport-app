// myan-san/src/pages/EmptyChargeManagementPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import {
    Container, Typography, Box, TextField, Button, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper, IconButton, Dialog, DialogActions,
    DialogContent, DialogTitle, MenuItem, FormControl, InputLabel, Select,
    CircularProgress, Alert, Collapse, Tooltip, DialogContentText
} from '@mui/material';
import {
    Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon, History as HistoryIcon,
    CheckCircleOutline as CheckCircleOutlineIcon, InfoOutlined as InfoOutlinedIcon,
    ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon,
    ContentCopy as ContentCopyIcon, Save as SaveIcon, Cancel as CancelIcon
} from '@mui/icons-material';
import { formatMMK } from '../utils/currencyFormatter'; // Import formatMMK

const API_BASE_URL = 'http://localhost:5001/api';

function EmptyChargeManagementPage() {
    const [activeEmptyCharges, setActiveEmptyCharges] = useState(null);
    const [historicalEmptyCharges, setHistoricalEmptyCharges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    // State for New Version Dialog
    const [newVersionDialogOpen, setNewVersionDialogOpen] = useState(false);
    const [newVersionEffectiveDate, setNewVersionEffectiveDate] = useState('');
    const [newEmptyLocations, setNewEmptyLocations] = useState([]); // Array of { location: '', charge_40_ft: 0 }
    const [newSameDirectionOverrides, setNewSameDirectionOverrides] = useState([]); // Array of { main_trip_origin: '', main_trip_destination: '', empty_location: '' }
    const [newPortLocations, setNewPortLocations] = useState(''); // Comma-separated string

    // State for Edit Version Dates Dialog
    const [editDatesDialogOpen, setEditDatesDialogOpen] = useState(false);
    const [editingVersionId, setEditingVersionId] = useState(null);
    const [editEffectiveDate, setEditEffectiveDate] = useState('');
    const [editEndDate, setEditEndDate] = useState(''); // Can be null

    // State for Activate Version Dialog
    const [activateDialogOpen, setActivateDialogOpen] = useState(false);
    const [versionToActivate, setVersionToActivate] = useState(null);
    const [activateEffectiveDate, setActivateEffectiveDate] = useState('');

    // State for Delete Confirmation Dialog
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [versionToDeleteId, setVersionToDeleteId] = useState(null);
    const [versionToDeleteNumber, setVersionToDeleteNumber] = useState('');

    // State for View Details Dialog
    const [viewDetailsDialogOpen, setViewDetailsDialogOpen] = useState(false);
    const [viewingVersionDetails, setViewingVersionDetails] = useState(null);

    // State for filter collapse
    const [showFilters, setShowFilters] = useState(false);

    // Fetch active empty charges
    const fetchActiveEmptyCharges = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/empty-charges/active`);
            setActiveEmptyCharges(res.data.data);
        } catch (err) {
            console.error("Error fetching active empty charges:", err);
            setActiveEmptyCharges(null);
        }
    }, []);

    // Fetch historical empty charges
    const fetchHistoricalEmptyCharges = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get(`${API_BASE_URL}/empty-charges/history`);
            setHistoricalEmptyCharges(res.data.data);
        } catch (err) {
            console.error("Error fetching historical empty charges:", err);
            setError("အခွံချ/တင် နှုန်းထား သမိုင်းမှတ်တမ်းများ ရယူရာတွင် အမှားအယွင်းရှိခဲ့ပါသည်။");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchActiveEmptyCharges();
        fetchHistoricalEmptyCharges();
    }, [fetchActiveEmptyCharges, fetchHistoricalEmptyCharges]);

    // Handle opening New Version Dialog
    const handleOpenNewVersionDialog = (copyActive = false) => {
        setNewVersionEffectiveDate(new Date().toISOString().split('T')[0]); // Default to today
        if (copyActive && activeEmptyCharges && activeEmptyCharges.emptyCharges) {
            // Deep copy existing data
            setNewEmptyLocations(JSON.parse(JSON.stringify(activeEmptyCharges.emptyCharges.empty_locations_charges || [])));
            setNewSameDirectionOverrides(JSON.parse(JSON.stringify(activeEmptyCharges.emptyCharges.same_direction_overrides || [])));
            setNewPortLocations((activeEmptyCharges.emptyCharges.port_locations || []).join(', '));
        } else {
            setNewEmptyLocations([]);
            setNewSameDirectionOverrides([]);
            setNewPortLocations('');
        }
        setNewVersionDialogOpen(true);
        setError(null);
        setSuccessMessage(null);
    };

    // Handle closing New Version Dialog
    const handleCloseNewVersionDialog = () => {
        setNewVersionDialogOpen(false);
        setNewVersionEffectiveDate('');
        setNewEmptyLocations([]);
        setNewSameDirectionOverrides([]);
        setNewPortLocations('');
    };

    // Handle adding a new empty location row in the form
    const handleAddEmptyLocation = () => {
        setNewEmptyLocations([...newEmptyLocations, { location: '', charge_40_ft: 0 }]);
    };

    // Handle updating an empty location row in the form
    const handleUpdateEmptyLocation = (index, field, value) => {
        const updated = [...newEmptyLocations];
        updated[index][field] = field === 'charge_40_ft' ? (parseFloat(value) || 0) : value;
        setNewEmptyLocations(updated);
    };

    // Handle removing an empty location row in the form
    const handleRemoveEmptyLocation = (index) => {
        const updated = newEmptyLocations.filter((_, i) => i !== index);
        setNewEmptyLocations(updated);
    };

    // Handle adding a new same direction override row in the form
    const handleAddSameDirectionOverride = () => {
        setNewSameDirectionOverrides([...newSameDirectionOverrides, { main_trip_origin: '', main_trip_destination: '', empty_location: '' }]);
    };

    // Handle updating a same direction override row in the form
    const handleUpdateSameDirectionOverride = (index, field, value) => {
        const updated = [...newSameDirectionOverrides];
        updated[index][field] = value;
        setNewSameDirectionOverrides(updated);
    };

    // Handle removing a same direction override row in the form
    const handleRemoveSameDirectionOverride = (index) => {
        const updated = newSameDirectionOverrides.filter((_, i) => i !== index);
        setNewSameDirectionOverrides(updated);
    };

    // Handle creating a new empty charge version
    const handleCreateNewVersion = async () => {
        setError(null);
        setSuccessMessage(null);

        if (!newVersionEffectiveDate) {
            setError("စတင်သက်ရောက်မည့်ရက်ကို ထည့်သွင်းပါ။");
            return;
        }

        const emptyChargeData = {
            empty_locations_charges: newEmptyLocations,
            same_direction_overrides: newSameDirectionOverrides,
            port_locations: newPortLocations.split(',').map(loc => loc.trim()).filter(loc => loc !== '')
        };

        try {
            await axios.post(`${API_BASE_URL}/empty-charges/new-version`, {
                effectiveDate: newVersionEffectiveDate,
                emptyChargeData: JSON.stringify(emptyChargeData) // Send as JSON string
            });
            setSuccessMessage("အခွံချ/တင် နှုန်းထား Version အသစ် ထည့်သွင်းခြင်း အောင်မြင်ပါသည်။");
            handleCloseNewVersionDialog();
            fetchActiveEmptyCharges();
            fetchHistoricalEmptyCharges();
        } catch (err) {
            console.error("Error creating new empty charge version:", err);
            setError(err.response?.data?.error || "အခွံချ/တင် နှုန်းထား Version အသစ် ထည့်သွင်းခြင်း မအောင်မြင်ပါ။");
        }
    };

    // Handle opening Edit Dates Dialog
    const handleOpenEditDatesDialog = (version) => {
        setEditingVersionId(version.id);
        setEditEffectiveDate(version.effective_date);
        setEditEndDate(version.end_date || ''); // Use empty string for null
        setEditDatesDialogOpen(true);
        setError(null);
        setSuccessMessage(null);
    };

    // Handle closing Edit Dates Dialog
    const handleCloseEditDatesDialog = () => {
        setEditDatesDialogOpen(false);
        setEditingVersionId(null);
        setEditEffectiveDate('');
        setEditEndDate('');
    };

    // Handle updating version dates
    const handleUpdateVersionDates = async () => {
        setError(null);
        setSuccessMessage(null);

        if (!editEffectiveDate) {
            setError("စတင်သက်ရောက်မည့်ရက်ကို ထည့်သွင်းပါ။");
            return;
        }

        try {
            await axios.put(`${API_BASE_URL}/empty-charges-versions/${editingVersionId}`, {
                effectiveDate: editEffectiveDate,
                endDate: editEndDate || null // Send null if empty string
            });
            setSuccessMessage("Version ရက်စွဲများ ပြင်ဆင်ခြင်း အောင်မြင်ပါသည်။");
            handleCloseEditDatesDialog();
            fetchActiveEmptyCharges();
            fetchHistoricalEmptyCharges();
        } catch (err) {
            console.error("Error updating empty charge version dates:", err);
            setError(err.response?.data?.error || "Version ရက်စွဲများ ပြင်ဆင်ခြင်း မအောင်မြင်ပါ။");
        }
    };

    // Handle opening Activate Version Dialog
    const handleOpenActivateDialog = (version) => {
        setVersionToActivate(version);
        setActivateEffectiveDate(new Date().toISOString().split('T')[0]); // Default to today
        setActivateDialogOpen(true);
        setError(null);
        setSuccessMessage(null);
    };

    // Handle closing Activate Version Dialog
    const handleCloseActivateDialog = () => {
        setActivateDialogOpen(false);
        setVersionToActivate(null);
        setActivateEffectiveDate('');
    };

    // Handle activating a historical version
    const handleActivateVersion = async () => {
        setError(null);
        setSuccessMessage(null);

        if (!activateEffectiveDate) {
            setError("အသက်ဝင်စေမည့်ရက်ကို ထည့်သွင်းပါ။");
            return;
        }

        try {
            await axios.post(`${API_BASE_URL}/empty-charges/activate-version`, {
                versionIdToActivate: versionToActivate.id,
                newEffectiveDateForActivation: activateEffectiveDate
            });
            setSuccessMessage(`Version ${versionToActivate.version_number} ကို အောင်မြင်စွာ အသက်ဝင်စေပါပြီ။`);
            handleCloseActivateDialog();
            fetchActiveEmptyCharges();
            fetchHistoricalEmptyCharges();
        } catch (err) {
            console.error("Error activating empty charge version:", err);
            setError(err.response?.data?.error || "Version အသက်ဝင်စေခြင်း မအောင်မြင်ပါ။");
        }
    };

    // Handle opening Delete Confirmation Dialog
    const handleOpenDeleteConfirm = (versionId, versionNumber) => {
        setVersionToDeleteId(versionId);
        setVersionToDeleteNumber(versionNumber);
        setDeleteConfirmOpen(true);
        setError(null);
        setSuccessMessage(null);
    };

    // Handle closing Delete Confirmation Dialog
    const handleCloseDeleteConfirm = () => {
        setDeleteConfirmOpen(false);
        setVersionToDeleteId(null);
        setVersionToDeleteNumber('');
    };

    // Handle deleting a version
    const handleDeleteVersion = async () => {
        setError(null);
        setSuccessMessage(null);
        try {
            await axios.delete(`${API_BASE_URL}/empty-charges-versions/${versionToDeleteId}`);
            setSuccessMessage(`Version ${versionToDeleteNumber} ကို အောင်မြင်စွာ ဖျက်ပစ်ပြီးပါပြီ။`);
            handleCloseDeleteConfirm();
            fetchActiveEmptyCharges();
            fetchHistoricalEmptyCharges();
        } catch (err) {
            console.error("Error deleting empty charge version:", err);
            setError(err.response?.data?.error || "Version ဖျက်ပစ်ခြင်း မအောင်မြင်ပါ။");
        }
    };

    // Handle opening View Details Dialog
    const handleViewDetails = (version) => {
        setViewingVersionDetails(version);
        setViewDetailsDialogOpen(true);
    };

    // Handle closing View Details Dialog
    const handleCloseViewDetailsDialog = () => {
        setViewDetailsDialogOpen(false);
        setViewingVersionDetails(null);
    };

    // Determine if a version can be deleted (only if it's not active and not the only version)
    const canDeleteVersion = (versionId) => {
        return historicalEmptyCharges.length > 1 &&
               (!activeEmptyCharges || activeEmptyCharges.id !== versionId);
    };

    // Determine if a version can be edited (only if it's not active or it's the only version)
    const canEditVersion = (versionId) => {
        return !activeEmptyCharges || activeEmptyCharges.id !== versionId || historicalEmptyCharges.length === 1;
    };


    return (
        <Container maxWidth="xl" className="py-8">
            <Typography variant="h4" component="h1" gutterBottom className="text-blue-700 font-bold">
                အခွံချ/တင် နှုန်းထား စီမံခန့်ခွဲမှု
            </Typography>

            {successMessage && (
                <Alert severity="success" className="mb-4">{successMessage}</Alert>
            )}
            {error && (
                <Alert severity="error" className="mb-4">{error}</Alert>
            )}

            {/* Active Version Section */}
            <Paper elevation={3} className="p-6 mb-8 rounded-lg shadow-lg">
                <Box className="flex items-center mb-4">
                    <Typography variant="h5" component="h2" className="text-blue-600 mr-2">
                        လက်ရှိအသက်ဝင်နေသော နှုန်းထား
                    </Typography>
                    <CheckCircleOutlineIcon color="success" />
                </Box>
                {activeEmptyCharges ? (
                    <Box>
                        <Typography variant="body1">
                            <strong>Version:</strong> {activeEmptyCharges.versionNumber}
                        </Typography>
                        <Typography variant="body1">
                            <strong>စတင်သက်ရောက်သည့်ရက်:</strong> {activeEmptyCharges.effectiveDate}
                        </Typography>
                        {/* <Button
                            variant="outlined"
                            startIcon={<InfoOutlinedIcon />}
                            onClick={() => handleViewDetails(activeEmptyCharges)}
                            className="mt-4 text-blue-600 border-blue-600 hover:bg-blue-50"
                        >
                            အသေးစိတ်ကြည့်ရန်
                        </Button> */}
                    </Box>
                ) : (
                    <Typography>လက်ရှိအသက်ဝင်နေသော နှုန်းထား မရှိသေးပါ။</Typography>
                )}
            </Paper>

            {/* Actions Section */}
            <Paper elevation={3} className="p-6 mb-8 rounded-lg shadow-lg flex flex-wrap gap-4 justify-start">
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenNewVersionDialog(false)}
                    className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                >
                    Version အသစ်ဖန်တီးမည် (အစမှ)
                </Button>
                <Button
                    variant="contained"
                    startIcon={<ContentCopyIcon />}
                    onClick={() => handleOpenNewVersionDialog(true)}
                    className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
                    disabled={!activeEmptyCharges}
                >
                    လက်ရှိနှုန်းထားမှ ကော်ပီပွားဖန်တီးမည်
                </Button>
            </Paper>

            {/* Historical Versions Table */}
            <Paper elevation={3} className="rounded-lg shadow-lg overflow-hidden">
                <Box className="flex justify-between items-center p-4 bg-blue-700">
                    <Typography variant="h5" component="h2" className="text-white">
                        နှုန်းထား သမိုင်းမှတ်တမ်းများ
                    </Typography>
                </Box>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell className="font-semibold">Version No.</TableCell>
                                <TableCell className="font-semibold">စတင်သက်ရောက်သည့်ရက်</TableCell>
                                <TableCell className="font-semibold">ပြီးဆုံးသည့်ရက်</TableCell>
                                <TableCell className="font-semibold">ဖန်တီးသည့်ရက်</TableCell>
                                <TableCell className="font-semibold">အခြေအနေ</TableCell>
                                <TableCell className="font-semibold">လုပ်ဆောင်ချက်များ</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center">
                                        <CircularProgress />
                                        <Typography>အချက်အလက်များ ရယူနေပါသည်...</Typography>
                                    </TableCell>
                                </TableRow>
                            ) : historicalEmptyCharges.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center">
                                        <Typography>နှုန်းထား သမိုင်းမှတ်တမ်းများ မရှိသေးပါ။</Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                historicalEmptyCharges.map((version) => (
                                    <TableRow key={version.id} className="hover:bg-gray-50">
                                        <TableCell>{version.version_number}</TableCell>
                                        <TableCell>{version.effective_date}</TableCell>
                                        <TableCell>{version.end_date || 'N/A'}</TableCell>
                                        <TableCell>{new Date(version.created_at).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            {activeEmptyCharges && activeEmptyCharges.id === version.id ? (
                                                <Typography variant="body2" color="success.main" className="font-semibold">
                                                    Active
                                                </Typography>
                                            ) : (
                                                <Typography variant="body2" color="text.secondary">
                                                    Inactive
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Tooltip title="အသေးစိတ်ကြည့်ရန်">
                                                <IconButton color="info" size="small" onClick={() => handleViewDetails(version)}>
                                                    <InfoOutlinedIcon />
                                                </IconButton>
                                            </Tooltip>
                                            {canEditVersion(version.id) && (
                                                <Tooltip title="ရက်စွဲများ ပြင်ဆင်ရန်">
                                                    <IconButton color="primary" size="small" onClick={() => handleOpenEditDatesDialog(version)}>
                                                        <EditIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                            {activeEmptyCharges && activeEmptyCharges.id !== version.id && (
                                                <Tooltip title="ဤ Version ကို အသက်ဝင်စေရန်">
                                                    <IconButton color="success" size="small" onClick={() => handleOpenActivateDialog(version)}>
                                                        <CheckCircleOutlineIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                            {canDeleteVersion(version.id) && (
                                                <Tooltip title="ဖျက်ရန်">
                                                    <IconButton color="error" size="small" onClick={() => handleOpenDeleteConfirm(version.id, version.version_number)}>
                                                        <DeleteIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* New Version Dialog */}
            <Dialog
                open={newVersionDialogOpen}
                onClose={handleCloseNewVersionDialog}
                maxWidth="lg"
                fullWidth
            >
                <DialogTitle>အခွံချ/တင် နှုန်းထား Version အသစ် ဖန်တီးမည်</DialogTitle>
                <DialogContent dividers>
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                    <TextField
                        label="စတင်သက်ရောက်မည့်ရက်"
                        type="date"
                        fullWidth
                        variant="outlined"
                        value={newVersionEffectiveDate}
                        onChange={(e) => setNewVersionEffectiveDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={{ mb: 3 }}
                    />

                    <Typography variant="h6" sx={{ mt: 3, mb: 2, color: 'text.primary' }}>
                        အခွံချ/တင် နေရာအလိုက် နှုန်းထားများ
                    </Typography>
                    <TableContainer component={Paper} sx={{ mb: 3, maxHeight: 300 }}>
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold' }}>နေရာ</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>၄၀' ကွန်တိန်နာခ</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>လုပ်ဆောင်ချက်</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {newEmptyLocations.map((loc, index) => (
                                    <TableRow key={index}>
                                        <TableCell>
                                            <TextField
                                                value={loc.location}
                                                onChange={(e) => handleUpdateEmptyLocation(index, 'location', e.target.value)}
                                                variant="outlined"
                                                size="small"
                                                fullWidth
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <TextField
                                                type="number"
                                                value={loc.charge_40_ft}
                                                onChange={(e) => handleUpdateEmptyLocation(index, 'charge_40_ft', e.target.value)}
                                                variant="outlined"
                                                size="small"
                                                fullWidth
                                                InputProps={{
                                                    endAdornment: (
                                                        <Typography variant="body2" color="textSecondary">
                                                            {loc.charge_40_ft && !isNaN(parseFloat(loc.charge_40_ft)) ? formatMMK(parseFloat(loc.charge_40_ft)) : ''}
                                                        </Typography>
                                                    ),
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <IconButton color="error" size="small" onClick={() => handleRemoveEmptyLocation(index)}>
                                                <DeleteIcon />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={handleAddEmptyLocation}
                        sx={{ mb: 4 }}
                    >
                        နေရာအသစ်ထည့်ရန်
                    </Button>

                    <Typography variant="h6" sx={{ mt: 3, mb: 2, color: 'text.primary' }}>
                        လားရာတူ ခြွင်းချက်များ (Same Direction Overrides)
                    </Typography>
                    <TableContainer component={Paper} sx={{ mb: 3, maxHeight: 300 }}>
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Main Trip မှ</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Main Trip သို့</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>အခွံတင်/ချ နေရာ</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>လုပ်ဆောင်ချက်</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {newSameDirectionOverrides.map((rule, index) => (
                                    <TableRow key={index}>
                                        <TableCell>
                                            <TextField
                                                value={rule.main_trip_origin}
                                                onChange={(e) => handleUpdateSameDirectionOverride(index, 'main_trip_origin', e.target.value)}
                                                variant="outlined"
                                                size="small"
                                                fullWidth
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <TextField
                                                value={rule.main_trip_destination}
                                                onChange={(e) => handleUpdateSameDirectionOverride(index, 'main_trip_destination', e.target.value)}
                                                variant="outlined"
                                                size="small"
                                                fullWidth
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <TextField
                                                value={rule.empty_location}
                                                onChange={(e) => handleUpdateSameDirectionOverride(index, 'empty_location', e.target.value)}
                                                variant="outlined"
                                                size="small"
                                                fullWidth
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <IconButton color="error" size="small" onClick={() => handleRemoveSameDirectionOverride(index)}>
                                                <DeleteIcon />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={handleAddSameDirectionOverride}
                        sx={{ mb: 4 }}
                    >
                        ခြွင်းချက်အသစ်ထည့်ရန်
                    </Button>

                    <Typography variant="h6" sx={{ mt: 3, mb: 2, color: 'text.primary' }}>
                        ဆိပ်ကမ်းနေရာများ (Port Locations)
                        <Tooltip title="ကွန်တိန်နာတင်/ချရာတွင် အဓိကကျသော ဆိပ်ကမ်းများ၏ အမည်များကို ကော်မာ (,) ခြား၍ ထည့်သွင်းပါ။ ဥပမာ: MIP, AWPT, MIIT">
                            <InfoOutlinedIcon sx={{ ml: 1, verticalAlign: 'middle', fontSize: '1.2rem' }} color="action" />
                        </Tooltip>
                    </Typography>
                    <TextField
                        label="ဆိပ်ကမ်းအမည်များ (ကော်မာခြား၍)"
                        fullWidth
                        variant="outlined"
                        value={newPortLocations}
                        onChange={(e) => setNewPortLocations(e.target.value)}
                        placeholder="ဥပမာ: MIP, AWPT, MIIT, သီလဝါ"
                        sx={{ mb: 3 }}
                    />

                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseNewVersionDialog} color="secondary" startIcon={<CancelIcon />}>
                        မလုပ်တော့ပါ
                    </Button>
                    <Button onClick={handleCreateNewVersion} color="primary" variant="contained" startIcon={<SaveIcon />}>
                        ဖန်တီးမည်
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Edit Version Dates Dialog */}
            <Dialog
                open={editDatesDialogOpen}
                onClose={handleCloseEditDatesDialog}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Version ရက်စွဲများ ပြင်ဆင်ရန်</DialogTitle>
                <DialogContent dividers>
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                    <TextField
                        label="စတင်သက်ရောက်မည့်ရက်"
                        type="date"
                        fullWidth
                        variant="outlined"
                        value={editEffectiveDate}
                        onChange={(e) => setEditEffectiveDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={{ mb: 3 }}
                    />
                    <TextField
                        label="ပြီးဆုံးသည့်ရက် (မရှိလျှင် မထည့်ပါ)"
                        type="date"
                        fullWidth
                        variant="outlined"
                        value={editEndDate}
                        onChange={(e) => setEditEndDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={{ mb: 3 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseEditDatesDialog} color="secondary" startIcon={<CancelIcon />}>
                        မလုပ်တော့ပါ
                    </Button>
                    <Button onClick={handleUpdateVersionDates} color="primary" variant="contained" startIcon={<SaveIcon />}>
                        သိမ်းဆည်းမည်
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Activate Version Dialog */}
            <Dialog
                open={activateDialogOpen}
                onClose={handleCloseActivateDialog}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Version အသက်ဝင်စေရန် အတည်ပြုပါ</DialogTitle>
                <DialogContent dividers>
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                    {versionToActivate && (
                        <Typography sx={{ mb: 2 }}>
                            Version <strong>{versionToActivate.version_number}</strong> ကို လက်ရှိအသက်ဝင်နေသော နှုန်းထားအဖြစ် သတ်မှတ်မှာ သေချာပါသလား။
                            လက်ရှိအသက်ဝင်နေသော နှုန်းထားသည် အလိုအလျောက် ပြီးဆုံးသွားပါမည်။
                        </Typography>
                    )}
                    <TextField
                        label="အသက်ဝင်စေမည့်ရက်"
                        type="date"
                        fullWidth
                        variant="outlined"
                        value={activateEffectiveDate}
                        onChange={(e) => setActivateEffectiveDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={{ mb: 3 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseActivateDialog} color="secondary" startIcon={<CancelIcon />}>
                        မလုပ်တော့ပါ
                    </Button>
                    <Button onClick={handleActivateVersion} color="success" variant="contained" startIcon={<CheckCircleOutlineIcon />}>
                        အသက်ဝင်စေမည်
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={deleteConfirmOpen}
                onClose={handleCloseDeleteConfirm}
                aria-labelledby="delete-dialog-title"
                aria-describedby="delete-dialog-description"
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle id="delete-dialog-title">Version ဖျက်ရန် အတည်ပြုပါ</DialogTitle>
                <DialogContent>
                    <DialogContentText id="delete-dialog-description">
                        Version <strong>{versionToDeleteNumber}</strong> ကို ဖျက်ပစ်မှာ သေချာပါသလား။ ဤလုပ်ဆောင်ချက်ကို ပြန်လည်ပြင်ဆင်၍ မရနိုင်ပါ။
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDeleteConfirm} color="secondary">
                        မလုပ်တော့ပါ
                    </Button>
                    <Button onClick={handleDeleteVersion} color="error" variant="contained">
                        ဖျက်မည်
                    </Button>
                </DialogActions>
            </Dialog>

            {/* View Details Dialog */}
            <Dialog
                open={viewDetailsDialogOpen}
                onClose={handleCloseViewDetailsDialog}
                maxWidth="lg"
                fullWidth
            >
                <DialogTitle>Version {viewingVersionDetails?.version_number} အသေးစိတ်</DialogTitle>
                <DialogContent dividers>
                    {viewingVersionDetails && (
                        <Box>
                            <Typography variant="h6" sx={{ mb: 2 }}>
                                အခွံချ/တင် နေရာအလိုက် နှုန်းထားများ
                            </Typography>
                            <TableContainer component={Paper} sx={{ mb: 3, maxHeight: 300 }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 'bold' }}>နေရာ</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>၄၀' ကွန်တိန်နာခ</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {(viewingVersionDetails.empty_charge_data?.empty_locations_charges || []).map((loc, index) => (
                                            <TableRow key={index}>
                                                <TableCell>{loc.location}</TableCell>
                                                <TableCell>{formatMMK(loc.charge_40_ft)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
                                လားရာတူ ခြွင်းချက်များ (Same Direction Overrides)
                            </Typography>
                            <TableContainer component={Paper} sx={{ mb: 3, maxHeight: 300 }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Main Trip မှ</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Main Trip သို့</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>အခွံတင်/ချ နေရာ</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {(viewingVersionDetails.empty_charge_data?.same_direction_overrides || []).map((rule, index) => (
                                            <TableRow key={index}>
                                                <TableCell>{rule.main_trip_origin}</TableCell>
                                                <TableCell>{rule.main_trip_destination}</TableCell>
                                                <TableCell>{rule.empty_location}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
                                ဆိပ်ကမ်းနေရာများ (Port Locations)
                            </Typography>
                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography>
                                    {(viewingVersionDetails.empty_charge_data?.port_locations || []).join(', ')}
                                </Typography>
                            </Paper>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseViewDetailsDialog} color="primary">
                        ပိတ်မည်
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}

export default EmptyChargeManagementPage;
