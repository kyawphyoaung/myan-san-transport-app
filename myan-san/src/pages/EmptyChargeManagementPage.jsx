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
    ContentCopy as ContentCopyIcon, Save as SaveIcon, Cancel as CancelIcon,
    DragIndicator as DragIndicatorIcon
} from '@mui/icons-material';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { formatMMK } from '../utils/currencyFormatter';

const API_BASE_URL = 'http://localhost:5001/api';

// Drag-and-drop အတွက် Custom Component များ
const SortableRow = ({ item, children, ...props }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };
    return (
        <TableRow ref={setNodeRef} style={style} {...attributes}>
            <TableCell sx={{ cursor: 'grab' }} {...listeners}>
                <DragIndicatorIcon fontSize="small" />
            </TableCell>
            {children}
        </TableRow>
    );
};

function EmptyChargeManagementPage() {
    const [activeEmptyCharges, setActiveEmptyCharges] = useState(null);
    const [historicalEmptyCharges, setHistoricalEmptyCharges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    // State for New Version Dialog
    const [newVersionDialogOpen, setNewVersionDialogOpen] = useState(false);
    const [newVersionEffectiveDate, setNewVersionEffectiveDate] = useState('');
    const [newEmptyLocations, setNewEmptyLocations] = useState([]);
    const [newSameDirectionOverrides, setNewSameDirectionOverrides] = useState([]);
    const [newNoChargeRoutes, setNewNoChargeRoutes] = useState([]);
    const [newPortLocations, setNewPortLocations] = useState('');

    // State for Edit Version Dates Dialog
    const [editDatesDialogOpen, setEditDatesDialogOpen] = useState(false);
    const [editingVersionId, setEditingVersionId] = useState(null);
    const [editEffectiveDate, setEditEffectiveDate] = useState('');
    const [editEndDate, setEditEndDate] = useState('');

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
    const [viewingVersionDetails, setViewingVersionDetails] = useState([]);

    // State for filter collapse
    const [showFilters, setShowFilters] = useState(false);

    // Dnd-kit sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor)
    );

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
        setNewVersionEffectiveDate(new Date().toISOString().split('T')[0]);
        if (copyActive && activeEmptyCharges && activeEmptyCharges.emptyCharges) {
            // Deep copy existing data
            const emptyLocationsWithIds = (activeEmptyCharges.emptyCharges.empty_locations_charges || []).map(item => ({
                ...item,
                id: item.id || Math.random().toString(36).substring(2, 9)
            }));
            const sameDirectionOverridesWithIds = (activeEmptyCharges.emptyCharges.same_direction_overrides || []).map(item => ({
                ...item,
                id: item.id || Math.random().toString(36).substring(2, 9)
            }));
            const noChargeRoutesWithIds = (activeEmptyCharges.emptyCharges.no_charge_routes || []).map(item => ({
                ...item,
                id: item.id || Math.random().toString(36).substring(2, 9)
            }));

            setNewEmptyLocations(emptyLocationsWithIds);
            setNewSameDirectionOverrides(sameDirectionOverridesWithIds);
            setNewNoChargeRoutes(noChargeRoutesWithIds);
            setNewPortLocations((activeEmptyCharges.emptyCharges.port_locations || []).join(', '));
        } else {
            setNewEmptyLocations([{ id: Math.random().toString(36).substring(2, 9), location: '', charge_40_ft: 0 }]);
            setNewSameDirectionOverrides([{ id: Math.random().toString(36).substring(2, 9), main_trip_origin: '', main_trip_destination: '', empty_location: '' }]);
            setNewNoChargeRoutes([{ id: Math.random().toString(36).substring(2, 9), origin: '', destination: '' }]);
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
        setNewNoChargeRoutes([]);
        setNewPortLocations('');
    };

    // --- Empty Locations Handlers ---
    const handleAddEmptyLocation = () => {
        setNewEmptyLocations([...newEmptyLocations, { id: Math.random().toString(36).substring(2, 9), location: '', charge_40_ft: 0 }]);
    };
    const handleUpdateEmptyLocation = (id, field, value) => {
        const updated = newEmptyLocations.map(item => item.id === id ? { ...item, [field]: field === 'charge_40_ft' ? (parseFloat(value) || 0) : value } : item);
        setNewEmptyLocations(updated);
    };
    const handleRemoveEmptyLocation = (id) => {
        const updated = newEmptyLocations.filter(item => item.id !== id);
        setNewEmptyLocations(updated);
    };

    // --- Same Direction Overrides Handlers ---
    const handleAddSameDirectionOverride = () => {
        setNewSameDirectionOverrides([...newSameDirectionOverrides, { id: Math.random().toString(36).substring(2, 9), main_trip_origin: '', main_trip_destination: '', empty_location: '' }]);
    };
    const handleUpdateSameDirectionOverride = (id, field, value) => {
        const updated = newSameDirectionOverrides.map(item => item.id === id ? { ...item, [field]: value } : item);
        setNewSameDirectionOverrides(updated);
    };
    const handleRemoveSameDirectionOverride = (id) => {
        const updated = newSameDirectionOverrides.filter(item => item.id !== id);
        setNewSameDirectionOverrides(updated);
    };

    // --- No Charge Routes Handlers ---
    const handleAddNoChargeRoute = () => {
        setNewNoChargeRoutes([...newNoChargeRoutes, { id: Math.random().toString(36).substring(2, 9), origin: '', destination: '' }]);
    };
    const handleUpdateNoChargeRoute = (id, field, value) => {
        const updated = newNoChargeRoutes.map(item => item.id === id ? { ...item, [field]: value } : item);
        setNewNoChargeRoutes(updated);
    };
    const handleRemoveNoChargeRoute = (id) => {
        const updated = newNoChargeRoutes.filter(item => item.id !== id);
        setNewNoChargeRoutes(updated);
    };

    // --- Drag and Drop Handlers ---
    const handleDragEndEmptyLocations = (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setNewEmptyLocations((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };
    const handleDragEndSameDirectionOverrides = (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setNewSameDirectionOverrides((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };
    const handleDragEndNoChargeRoutes = (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setNewNoChargeRoutes((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
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
            empty_locations_charges: newEmptyLocations.map(({ id, ...rest }) => rest),
            same_direction_overrides: newSameDirectionOverrides.map(({ id, ...rest }) => rest),
            no_charge_routes: newNoChargeRoutes.map(({ id, ...rest }) => rest), // New
            port_locations: newPortLocations.split(',').map(loc => loc.trim()).filter(loc => loc !== '')
        };

        try {
            await axios.post(`${API_BASE_URL}/empty-charges/new-version`, {
                effectiveDate: newVersionEffectiveDate,
                emptyChargeData: JSON.stringify(emptyChargeData)
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

    // Handle opening Edit Version Dates Dialog
    const handleOpenEditDatesDialog = (version) => {
        setEditingVersionId(version.id);
        setEditEffectiveDate(version.effective_date);
        setEditEndDate(version.end_date || '');
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
                endDate: editEndDate || null
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
        setActivateEffectiveDate(new Date().toISOString().split('T')[0]);
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
        console.log("Version",version);
        setViewDetailsDialogOpen(true);
    };

    // Handle closing View Details Dialog
    const handleCloseViewDetailsDialog = () => {
        setViewDetailsDialogOpen(false);
        setViewingVersionDetails(null);
    };

    const canDeleteVersion = (versionId) => {
        return historicalEmptyCharges.length > 1 &&
               (!activeEmptyCharges || activeEmptyCharges.id !== versionId);
    };

    const canEditVersion = (versionId) => {
        return !activeEmptyCharges || activeEmptyCharges.id !== versionId || historicalEmptyCharges.length === 1;
    };

    console.log("ViewingVersionDetails",viewingVersionDetails);

    console.log('activeEmptyCharges', activeEmptyCharges);


    return (
        <Container maxWidth="xl" className="py-8">

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
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                        }}
                    >
                        <Typography variant="body1">
                            <strong>Version:</strong> {activeEmptyCharges.versionNumber}
                        </Typography>
                        <Typography variant="body1">
                            <strong>စတင်သက်ရောက်သည့်ရက်:</strong> {activeEmptyCharges.effectiveDate}
                        </Typography>
                        <Button
                            variant="outlined"
                            startIcon={<InfoOutlinedIcon />}
                            onClick={() => handleViewDetails(activeEmptyCharges)}
                            className="mt-4"
                            sx={{mt:3}}
                        >
                            အသေးစိတ်ကြည့်ရန်
                        </Button>
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
                >
                    Version အသစ်ဖန်တီးမည် (အစမှ)
                </Button>
                <Button
                    variant="contained"
                    startIcon={<ContentCopyIcon />}
                    onClick={() => handleOpenNewVersionDialog(true)}
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
                                    <TableRow key={version.id}>
                                        <TableCell>{version.version_number}</TableCell>
                                        <TableCell>{version.effective_date}</TableCell>
                                        <TableCell>{version.end_date || 'N/A'}</TableCell>
                                        <TableCell>{new Date(version.created_at).toLocaleString()}</TableCell>
                                        <TableCell>{activeEmptyCharges && activeEmptyCharges.id === version.id ? "Active" : "Historical"}</TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', gap: 1 }}>
                                                <Tooltip title="အသေးစိတ်ကြည့်ရန်">
                                                    <IconButton color="primary" onClick={() => handleViewDetails(version)}>
                                                        <InfoOutlinedIcon />
                                                    </IconButton>
                                                </Tooltip>
                                                {canEditVersion(version.id) && (
                                                    <Tooltip title="ရက်စွဲများပြင်ရန်">
                                                        <IconButton color="secondary" onClick={() => handleOpenEditDatesDialog(version)}>
                                                            <EditIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                                {!activeEmptyCharges || activeEmptyCharges.id !== version.id ? (
                                                    <Tooltip title="အသက်ဝင်စေရန်">
                                                        <IconButton color="success" onClick={() => handleOpenActivateDialog(version)}>
                                                            <CheckCircleOutlineIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                ) : null}
                                                {canDeleteVersion(version.id) && (
                                                    <Tooltip title="ဖျက်ရန်">
                                                        <IconButton color="error" onClick={() => handleOpenDeleteConfirm(version.id, version.version_number)}>
                                                            <DeleteIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* New Version Dialog */}
            <Dialog open={newVersionDialogOpen} onClose={handleCloseNewVersionDialog} maxWidth="md" fullWidth>
                <DialogTitle>အခွံချ/တင် နှုန်းထား Version အသစ် ဖန်တီးမည်</DialogTitle>
                <DialogContent dividers>
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            စတင်သက်ရောက်မည့်ရက်
                        </Typography>
                        <TextField
                            type="date"
                            fullWidth
                            value={newVersionEffectiveDate}
                            onChange={(e) => setNewVersionEffectiveDate(e.target.value)}
                        />
                    </Box>

                    {/* Table 1: အခွံချ/တင် နေရာအလိုက် နှုန်းထားများ */}
                    <Box sx={{ mt: 3, mb: 2 }}>
                        <Typography variant="h6">
                            အခွံချ/တင် နေရာအလိုက် နှုန်းထားများ
                        </Typography>
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEndEmptyLocations}
                        >
                            <TableContainer component={Paper} variant="outlined" sx={{mt: 3}}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ width: '40px' }}></TableCell>
                                            <TableCell>အခွံချ/တင် နေရာ</TableCell>
                                            <TableCell>၄၀ပေ နှုန်းထား</TableCell>
                                            <TableCell>လုပ်ဆောင်ချက်</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        <SortableContext items={newEmptyLocations.map(item => item.id)} strategy={verticalListSortingStrategy}>
                                            {newEmptyLocations.map((item, index) => (
                                                <SortableRow key={item.id} item={item}>
                                                    <TableCell>
                                                        <TextField
                                                            fullWidth
                                                            variant="standard"
                                                            value={item.location}
                                                            onChange={(e) => handleUpdateEmptyLocation(item.id, 'location', e.target.value)}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <TextField
                                                            fullWidth
                                                            variant="standard"
                                                            type="number"
                                                            value={item.charge_40_ft}
                                                            onChange={(e) => handleUpdateEmptyLocation(item.id, 'charge_40_ft', e.target.value)}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <IconButton color="error" onClick={() => handleRemoveEmptyLocation(item.id)}>
                                                            <DeleteIcon />
                                                        </IconButton>
                                                    </TableCell>
                                                </SortableRow>
                                            ))}
                                        </SortableContext>
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </DndContext>
                        <Button
                            variant="outlined"
                            startIcon={<AddIcon />}
                            onClick={handleAddEmptyLocation}
                            sx={{ mt: 1 }}
                        >
                            နှုန်းထားအသစ်ထည့်မည်
                        </Button>
                    </Box>

                    {/* Table 2: */}
                    <Box sx={{ mt: 3, mb: 2 }}>
                        <Typography variant="h6">
                            Extra Charges ရရှိမည့် လားရာတူ လမ်းကြောင်းများ
                        </Typography>
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEndSameDirectionOverrides}
                        >
                            <TableContainer component={Paper} variant="outlined" sx={{mt:3}}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ width: '40px' }}></TableCell>
                                            {/* <TableCell>ခရီးစတင်ရာ</TableCell>
                                            <TableCell>ခရီးဆုံးရာ</TableCell>
                                            <TableCell>အခွံချ/တင် နေရာ</TableCell>
                                            <TableCell>လုပ်ဆောင်ချက်</TableCell> */}
                                            <TableCell>ပန်းတိုင်</TableCell>
                                            <TableCell>အခွံချ/တင် နေရာ</TableCell>
                                            <TableCell>ပေ၄၀နှုန်းထား</TableCell>
                                            <TableCell>လုပ်ဆောင်ချက်</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        <SortableContext items={newSameDirectionOverrides.map(item => item.id)} strategy={verticalListSortingStrategy}>
                                            {newSameDirectionOverrides.map((item, index) => (
                                                <SortableRow key={item.id} item={item}>
                                                    <TableCell>
                                                        <TextField
                                                            fullWidth
                                                            variant="standard"
                                                            value={item.location}
                                                            onChange={(e) => handleUpdateSameDirectionOverride(item.id, 'item_location', e.target.value)}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <TextField
                                                            fullWidth
                                                            variant="standard"
                                                            value={item.empty_location}
                                                            onChange={(e) => handleUpdateSameDirectionOverride(item.id, 'empty_location', e.target.value)}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <TextField
                                                            fullWidth
                                                            variant="standard"
                                                            value={item.charge_40_ft}
                                                            onChange={(e) => handleUpdateSameDirectionOverride(item.id, 'charge_40_ft', e.target.value)}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <IconButton color="error" onClick={() => handleRemoveSameDirectionOverride(item.id)}>
                                                            <DeleteIcon />
                                                        </IconButton>
                                                    </TableCell>
                                                </SortableRow>
                                            ))}
                                        </SortableContext>
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </DndContext>
                        <Button
                            variant="outlined"
                            startIcon={<AddIcon />}
                            onClick={handleAddSameDirectionOverride}
                            sx={{ mt: 1 }}
                        >
                            ခြွင်းချက်အသစ်ထည့်မည်
                        </Button>
                    </Box>

                    {/* Table 3: လမ်းကြောင်းခ မရှိနိုင်သော လမ်းကြောင်းများ (No Charge Routes) */}
                    <Box sx={{ mt: 3, mb: 2}}>
                        <Typography variant="h6">
                            လမ်းကြောင်းခ မရှိနိုင်သော လမ်းကြောင်းများ
                        </Typography>
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEndNoChargeRoutes}
                        >
                            <TableContainer component={Paper} variant="outlined" sx={{mt: 3}}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ width: '40px' }}></TableCell>
                                            <TableCell>စတင်ရာ</TableCell>
                                            <TableCell>ပန်းတိုင်</TableCell>
                                            <TableCell>အခွံတင်/ချ နေရာ</TableCell>
                                            <TableCell>လုပ်ဆောင်ချက်</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        <SortableContext items={newNoChargeRoutes.map(item => item.id)} strategy={verticalListSortingStrategy}>
                                            {newNoChargeRoutes.map((item, index) => (
                                                <SortableRow key={item.id} item={item}>
                                                    <TableCell>
                                                        <TextField
                                                            fullWidth
                                                            variant="standard"
                                                            value={item.main_trip_origin}
                                                            onChange={(e) => handleUpdateNoChargeRoute(item.id, 'main_trip_origin', e.target.value)}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <TextField
                                                            fullWidth
                                                            variant="standard"
                                                            value={item.main_trip_destination}
                                                            onChange={(e) => handleUpdateNoChargeRoute(item.id, 'main_trip_destination', e.target.value)}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <TextField
                                                            fullWidth
                                                            variant="standard"
                                                            value={item.empty_location}
                                                            onChange={(e) => handleUpdateNoChargeRoute(item.id, 'empty_location', e.target.value)}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <IconButton color="error" onClick={() => handleRemoveNoChargeRoute(item.id)}>
                                                            <DeleteIcon />
                                                        </IconButton>
                                                    </TableCell>
                                                </SortableRow>
                                            ))}
                                        </SortableContext>
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </DndContext>
                        <Button
                            variant="outlined"
                            startIcon={<AddIcon />}
                            onClick={handleAddNoChargeRoute}
                            sx={{ mt: 1 }}
                        >
                            လမ်းကြောင်းအသစ်ထည့်မည်
                        </Button>
                    </Box>

                    {/* Port Locations */}
                    <Box sx={{ mt: 3, mb: 2 }}>
                        <Typography variant="h6">
                            ဆိပ်ကမ်းနေရာများ (Port Locations)
                        </Typography>
                        <TextField
                            fullWidth
                            value={newPortLocations}
                            onChange={(e) => setNewPortLocations(e.target.value)}
                            placeholder="အေးရှားဝေါ,MIP, ... (comma ဖြင့် ခွဲရေးပါ)"
                            sx={{mt:2}}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseNewVersionDialog}>ပယ်ဖျက်မည်</Button>
                    <Button
                        onClick={handleCreateNewVersion}
                        variant="contained"
                        disabled={!newVersionEffectiveDate || newEmptyLocations.length === 0}
                    >
                        သိမ်းဆည်းမည်
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Edit Dates Dialog */}
            <Dialog open={editDatesDialogOpen} onClose={handleCloseEditDatesDialog} maxWidth="sm" fullWidth>
                <DialogTitle>Version ရက်စွဲများ ပြင်ဆင်မည်</DialogTitle>
                <DialogContent>
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                    <TextField
                        margin="dense"
                        label="စတင်သက်ရောက်မည့်ရက်"
                        type="date"
                        fullWidth
                        variant="outlined"
                        value={editEffectiveDate}
                        onChange={(e) => setEditEffectiveDate(e.target.value)}
                        InputLabelProps={{
                            shrink: true,
                        }}
                    />
                    <TextField
                        margin="dense"
                        label="ပြီးဆုံးမည့်ရက်"
                        type="date"
                        fullWidth
                        variant="outlined"
                        value={editEndDate}
                        onChange={(e) => setEditEndDate(e.target.value)}
                        InputLabelProps={{
                            shrink: true,
                        }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseEditDatesDialog}>ပယ်ဖျက်မည်</Button>
                    <Button onClick={handleUpdateVersionDates} variant="contained">บันทึกမည်</Button>
                </DialogActions>
            </Dialog>

            {/* Activate Version Dialog */}
            <Dialog open={activateDialogOpen} onClose={handleCloseActivateDialog} maxWidth="sm" fullWidth>
                <DialogTitle>Version ကို အသက်ဝင်စေမည်</DialogTitle>
                <DialogContent>
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                    <DialogContentText>
                        <Typography variant="body1">
                            Version **{versionToActivate?.version_number}** ကို လက်ရှိနှုန်းထားအဖြစ် အသက်ဝင်စေမည်။
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            လက်ရှိအသက်ဝင်နေသော Version ကို ဤရက်စွဲမတိုင်မီ ပြီးဆုံးသွားအောင် အလိုအလျောက် ပြင်ဆင်ပေးပါမည်။
                        </Typography>
                    </DialogContentText>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="အသက်ဝင်စေမည့်ရက်"
                        type="date"
                        fullWidth
                        variant="outlined"
                        value={activateEffectiveDate}
                        onChange={(e) => setActivateEffectiveDate(e.target.value)}
                        InputLabelProps={{
                            shrink: true,
                        }}
                        sx={{ mt: 2 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseActivateDialog}>ပယ်ဖျက်မည်</Button>
                    <Button onClick={handleActivateVersion} variant="contained">အသက်ဝင်စေမည်</Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteConfirmOpen} onClose={handleCloseDeleteConfirm}>
                <DialogTitle>ဖျက်သိမ်းရန် အတည်ပြုပါ</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Version **{versionToDeleteNumber}** ကို ဖျက်ပစ်ရန် သေချာပါသလား။ ဤလုပ်ဆောင်ချက်ကို ပြန်လည်ပြင်ဆင်နိုင်မည် မဟုတ်ပါ။
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDeleteConfirm}>ပယ်ဖျက်မည်</Button>
                    <Button onClick={handleDeleteVersion} color="error" variant="contained">
                        ဖျက်မည်
                    </Button>
                </DialogActions>
            </Dialog>

            {/* View Details Dialog */}
            <Dialog open={viewDetailsDialogOpen} onClose={handleCloseViewDetailsDialog} maxWidth="md" fullWidth>
                <DialogTitle>Version {viewingVersionDetails?.versionNumber} အသေးစိတ်</DialogTitle>
                <DialogContent dividers>
                    {viewingVersionDetails && (
                        <Box>
                            <Typography variant="h6" gutterBottom>
                                အခွံချ/တင် နေရာအလိုက် နှုန်းထားများ
                            </Typography>
                            <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>အခွံချ/တင် နေရာ</TableCell>
                                            <TableCell>၄၀ပေ နှုန်းထား</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {(viewingVersionDetails.emptyCharges?.empty_locations_charges || []).map((charge, index) => (<TableRow key={index}>
                                                <TableCell>{charge.location}</TableCell>
                                                <TableCell>{formatMMK(charge.charge_40_ft)}</TableCell>
                                            </TableRow>
                                            )
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
                                Extra Charges ရရှိမည့် လားရာတူ လမ်းကြောင်းများ
                            </Typography>
                            <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>ပန်းတိုင်</TableCell>
                                            <TableCell>အခွံချ/တင် နေရာ</TableCell>
                                            <TableCell>ပေ၄၀ နှုန်းထား</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {(viewingVersionDetails.emptyCharges?.same_direction_overrides || []).map((rule, index) => (
                                            <TableRow key={index}>
                                                <TableCell>{rule.location}</TableCell>
                                                <TableCell>{rule.empty_location}</TableCell>
                                                <TableCell>{rule.charge_40_ft}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
                                လမ်းကြောင်းခ မရှိနိုင်သော လမ်းကြောင်းများ
                            </Typography>
                            <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>စတင်ရာ</TableCell>
                                            <TableCell>ပန်းတိုင်</TableCell>
                                            <TableCell>အခွံတင်/ချနေရာ</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {(viewingVersionDetails.emptyCharges?.no_charge_routes || []).map((route, index) => (
                                            <TableRow key={index}>
                                                <TableCell>{route.main_trip_origin}</TableCell>
                                                <TableCell>{route.main_trip_destination}</TableCell>
                                                <TableCell>{route.empty_location}</TableCell>
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
                                    {(viewingVersionDetails.emptyCharges?.port_locations || []).join(', ')}
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