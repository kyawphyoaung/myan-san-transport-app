// myan-san/src/pages/RouteChargesManagementPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import {
    Container, Typography, Box, Button, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper, IconButton, Dialog,
    DialogActions, DialogContent, DialogContentText, DialogTitle,
    TextField, Alert, CircularProgress, Collapse, Divider
} from '@mui/material';
import {
    Edit as EditIcon, Add as AddIcon, History as HistoryIcon,
    ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon,
    CheckCircleOutline as CheckCircleOutlineIcon,
    InfoOutlined as InfoOutlinedIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { formatMMK } from '../utils/currencyFormatter';

const API_BASE_URL = 'http://localhost:5001/api';

function RouteChargesManagementPage() {
    const [activeRouteCharges, setActiveRouteCharges] = useState(null);
    const [historyRouteCharges, setHistoryRouteCharges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    // State for New Version Dialog
    const [openNewVersionDialog, setOpenNewVersionDialog] = useState(false);
    const [newVersionEffectiveDate, setNewVersionEffectiveDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [newVersionRouteData, setNewVersionRouteData] = useState('');
    const [newVersionError, setNewVersionError] = useState('');

    // State for Edit Dates Dialog
    const [openEditDatesDialog, setOpenEditDatesDialog] = useState(false);
    const [editingVersion, setEditingVersion] = useState(null);
    const [editEffectiveDate, setEditEffectiveDate] = useState('');
    const [editEndDate, setEditEndDate] = useState('');
    const [editDatesError, setEditDatesError] = useState('');

    // State for Activate Version Dialog
    const [openActivateVersionDialog, setOpenActivateVersionDialog] = useState(false);
    const [versionToActivate, setVersionToActivate] = useState(null);
    const [activateEffectiveDate, setActivateEffectiveDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [activateVersionError, setActivateVersionError] = useState('');


    const fetchRouteCharges = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch active version
            const activeRes = await axios.get(`${API_BASE_URL}/route-charges/active`);
            setActiveRouteCharges(activeRes.data.data);

            // Fetch history versions
            const historyRes = await axios.get(`${API_BASE_URL}/route-charges/history`);
            setHistoryRouteCharges(historyRes.data.data);
        } catch (err) {
            console.error("Error fetching route charges:", err);
            setError(err.response?.data?.error || "လမ်းကြောင်းခနှုန်းထားများ ရယူရာတွင် အမှားအယွင်းရှိခဲ့ပါသည်။");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRouteCharges();
    }, [fetchRouteCharges]);

    const handleOpenNewVersionDialog = () => {
        setOpenNewVersionDialog(true);
        setNewVersionError('');
        setNewVersionEffectiveDate(format(new Date(), 'yyyy-MM-dd'));
        // Pre-fill with current active route data if available
        if (activeRouteCharges && activeRouteCharges.routeCharges) {
            setNewVersionRouteData(JSON.stringify(activeRouteCharges.routeCharges, null, 2));
        } else {
            setNewVersionRouteData('[]'); // Default to empty array JSON string
        }
    };

    const handleCloseNewVersionDialog = () => {
        setOpenNewVersionDialog(false);
        setNewVersionError('');
        setNewVersionRouteData('');
    };

    const handleCreateNewVersion = async () => {
        setNewVersionError('');
        setSuccessMessage(null);
        try {
            // Basic validation for routeData JSON format
            let parsedData;
            try {
                parsedData = JSON.parse(newVersionRouteData);
                if (!Array.isArray(parsedData) || parsedData.length === 0) {
                    setNewVersionError("လမ်းကြောင်းခအချက်အလက်သည် JSON array ဖြစ်ရမည်ဖြစ်ပြီး အနည်းဆုံး entry တစ်ခု ပါဝင်ရပါမည်။");
                    return;
                }
                // Optional: More detailed validation for each item in the array if needed
                // e.g., parsedData.every(item => item.route && item.MIP_AWPT_40 && item.MIIT_40)
            } catch (e) {
                setNewVersionError("လမ်းကြောင်းခအချက်အလက်သည် မှန်ကန်သော JSON format မဟုတ်ပါ။");
                return;
            }

            const response = await axios.post(`${API_BASE_URL}/route-charges/new-version`, {
                effectiveDate: newVersionEffectiveDate,
                routeData: newVersionRouteData, // Send as string
            });
            setSuccessMessage(`Version ${response.data.versionNumber} အသစ် ဖန်တီးပြီးပါပြီ။`);
            handleCloseNewVersionDialog();
            fetchRouteCharges(); // Refresh data
        } catch (err) {
            console.error("Error creating new version:", err);
            setNewVersionError(err.response?.data?.error || "Version အသစ်ဖန်တီးရာတွင် အမှားအယွင်းရှိခဲ့ပါသည်။");
        }
    };

    const handleOpenEditDatesDialog = (version) => {
        setEditingVersion(version);
        setEditEffectiveDate(version.effective_date);
        setEditEndDate(version.end_date || ''); // Use empty string for null
        setEditDatesError('');
        setOpenEditDatesDialog(true);
    };

    const handleCloseEditDatesDialog = () => {
        setOpenEditDatesDialog(false);
        setEditingVersion(null);
        setEditEffectiveDate('');
        setEditEndDate('');
        setEditDatesError('');
    };

    const handleSaveEditDates = async () => {
        setEditDatesError('');
        setSuccessMessage(null);
        try {
            const payload = {
                effectiveDate: editEffectiveDate,
                endDate: editEndDate === '' ? null : editEndDate, // Send null if empty string
            };
            const response = await axios.put(`${API_BASE_URL}/route-charges-versions/${editingVersion.id}`, payload);
            setSuccessMessage("ရက်စွဲများ ပြင်ဆင်ပြီးပါပြီ။");
            handleCloseEditDatesDialog();
            fetchRouteCharges(); // Refresh data
        } catch (err) {
            console.error("Error updating version dates:", err);
            setEditDatesError(err.response?.data?.error || "ရက်စွဲများ ပြင်ဆင်ရာတွင် အမှားအယွင်းရှိခဲ့ပါသည်။");
        }
    };

    const handleOpenActivateVersionDialog = (version) => {
        setVersionToActivate(version);
        setActivateEffectiveDate(format(new Date(), 'yyyy-MM-dd')); // Default to today
        setActivateVersionError('');
        setOpenActivateVersionDialog(true);
    };

    const handleCloseActivateVersionDialog = () => {
        setOpenActivateVersionDialog(false);
        setVersionToActivate(null);
        setActivateEffectiveDate(format(new Date(), 'yyyy-MM-dd'));
        setActivateVersionError('');
    };

    const handleActivateVersion = async () => {
        setActivateVersionError('');
        setSuccessMessage(null);
        try {
            const response = await axios.post(`${API_BASE_URL}/route-charges/activate-version`, {
                versionIdToActivate: versionToActivate.id,
                newEffectiveDateForActivation: activateEffectiveDate,
            });
            setSuccessMessage(`Version ${response.data.versionNumber} ကို အသက်ဝင်စေခဲ့ပါပြီ။`);
            handleCloseActivateVersionDialog();
            fetchRouteCharges(); // Refresh data
        } catch (err) {
            console.error("Error activating version:", err);
            setActivateVersionError(err.response?.data?.error || "Version အသက်ဝင်စေရာတွင် အမှားအယွင်းရှိခဲ့ပါသည်။");
        }
    };


    // State for collapsing history details
    const [expandedVersionId, setExpandedVersionId] = useState(null);
    const handleToggleExpand = (versionId) => {
        setExpandedVersionId(expandedVersionId === versionId ? null : versionId);
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ color: '#1976d2', fontWeight: 'bold' }}>
                လမ်းကြောင်းခနှုန်းထားများ စီမံခန့်ခွဲမှု
            </Typography>

            {loading && <CircularProgress sx={{ mt: 2 }} />}
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}
            {successMessage && (
                <Alert severity="success" sx={{ mb: 2 }}>
                    {successMessage}
                </Alert>
            )}

            {/* Current Active Route Charges */}
            <Paper elevation={3} sx={{ p: 3, mb: 4, borderRadius: '12px' }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h5" component="h2" sx={{ color: '#3f51b5', fontWeight: 'bold' }}>
                        လက်ရှိအသုံးပြုနေသော လမ်းကြောင်းခနှုန်းထားများ
                    </Typography>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<AddIcon />}
                        onClick={handleOpenNewVersionDialog}
                        sx={{ borderRadius: '8px' }}
                    >
                        Version အသစ်ဖန်တီးမည်
                    </Button>
                </Box>
                {activeRouteCharges ? (
                    <Box>
                        <Typography variant="body1" sx={{ mb: 1 }}>
                            **Version:** {activeRouteCharges.versionNumber}
                        </Typography>
                        <Typography variant="body1" sx={{ mb: 2 }}>
                            **စတင်သက်ရောက်သည့်ရက်:** {activeRouteCharges.effectiveDate}
                        </Typography>
                        <TableContainer>
                            <Table size="small">
                                <TableHead sx={{ backgroundColor: '#e0e0e0' }}>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 'bold' }}>လမ်းကြောင်း</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>MIP/AWPT 40'</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>MIIT 40'</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {activeRouteCharges.routeCharges.map((charge, index) => (
                                        <TableRow key={index}>
                                            <TableCell>{charge.route}</TableCell>
                                            <TableCell align="right">{formatMMK(charge.MIP_AWPT_40)}</TableCell>
                                            <TableCell align="right">{formatMMK(charge.MIIT_40)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                ) : (
                    <Alert severity="info">လက်ရှိအသုံးပြုနေသော လမ်းကြောင်းခနှုန်းထားများ မရှိသေးပါ။</Alert>
                )}
            </Paper>

            <Divider sx={{ my: 4 }} />

            {/* Route Charges Version History */}
            <Paper elevation={3} sx={{ p: 3, borderRadius: '12px' }}>
                <Typography variant="h5" component="h2" gutterBottom sx={{ color: '#3f51b5', fontWeight: 'bold' }}>
                    လမ်းကြောင်းခနှုန်းထား သမိုင်းကြောင်း
                </Typography>
                {historyRouteCharges.length > 0 ? (
                    <TableContainer>
                        <Table size="small">
                            <TableHead sx={{ backgroundColor: '#e0e0e0' }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Version</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>စတင်သက်ရောက်သည့်ရက်</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>သက်တမ်းကုန်ဆုံးသည့်ရက်</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>ဖန်တီးသည့်ရက်စွဲ</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>လုပ်ဆောင်ချက်</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {historyRouteCharges.map((version) => (
                                    <React.Fragment key={version.id}>
                                        <TableRow>
                                            <TableCell>{version.version_number}</TableCell>
                                            <TableCell>{version.effective_date}</TableCell>
                                            <TableCell>{version.end_date || 'လက်ရှိအသုံးပြုနေဆဲ'}</TableCell>
                                            <TableCell>{format(new Date(version.created_at), 'yyyy-MM-dd HH:mm')}</TableCell>
                                            <TableCell align="center">
                                                <IconButton
                                                    onClick={() => handleOpenEditDatesDialog(version)}
                                                    color="info"
                                                    size="small"
                                                    aria-label="edit dates"
                                                >
                                                    <EditIcon />
                                                </IconButton>
                                                {version.end_date !== null && ( // Only show Activate button if it's not the active version
                                                    <Button
                                                        variant="outlined"
                                                        color="success"
                                                        size="small"
                                                        startIcon={<CheckCircleOutlineIcon />}
                                                        onClick={() => handleOpenActivateVersionDialog(version)}
                                                        sx={{ ml: 1, textTransform: 'none', borderRadius: '8px' }}
                                                    >
                                                        ပြန်လည်အသက်ဝင်စေမည်
                                                    </Button>
                                                )}
                                                <IconButton
                                                    onClick={() => handleToggleExpand(version.id)}
                                                    color="primary"
                                                    size="small"
                                                    aria-label="toggle details"
                                                >
                                                    {expandedVersionId === version.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                                                <Collapse in={expandedVersionId === version.id} timeout="auto" unmountOnExit>
                                                    <Box sx={{ margin: 1, p: 2, border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
                                                        <Typography variant="h6" gutterBottom component="div">
                                                            လမ်းကြောင်းခ အသေးစိတ်
                                                        </Typography>
                                                        <Table size="small">
                                                            <TableHead sx={{ backgroundColor: '#e8e8e8' }}>
                                                                <TableRow>
                                                                    <TableCell>လမ်းကြောင်း</TableCell>
                                                                    <TableCell align="right">MIP/AWPT 40'</TableCell>
                                                                    <TableCell align="right">MIIT 40'</TableCell>
                                                                </TableRow>
                                                            </TableHead>
                                                            <TableBody>
                                                                {version.route_data.map((charge, idx) => (
                                                                    <TableRow key={idx}>
                                                                        <TableCell>{charge.route}</TableCell>
                                                                        <TableCell align="right">{formatMMK(charge.MIP_AWPT_40)}</TableCell>
                                                                        <TableCell align="right">{formatMMK(charge.MIIT_40)}</TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </Box>
                                                </Collapse>
                                            </TableCell>
                                        </TableRow>
                                    </React.Fragment>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                ) : (
                    <Alert severity="info">သမိုင်းကြောင်း လမ်းကြောင်းခနှုန်းထားများ မရှိသေးပါ။</Alert>
                )}
            </Paper>

            {/* New Version Dialog */}
            <Dialog open={openNewVersionDialog} onClose={handleCloseNewVersionDialog} fullWidth maxWidth="md">
                <DialogTitle sx={{ backgroundColor: '#1976d2', color: 'white', pb: 1 }}>
                    လမ်းကြောင်းခနှုန်းထား Version အသစ် ဖန်တီးမည်
                </DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    {newVersionError && <Alert severity="error" sx={{ mb: 2 }}>{newVersionError}</Alert>}
                    <TextField
                        autoFocus
                        margin="dense"
                        label="စတင်သက်ရောက်မည့်ရက်"
                        type="date"
                        fullWidth
                        variant="outlined"
                        value={newVersionEffectiveDate}
                        onChange={(e) => setNewVersionEffectiveDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={{ mb: 2 }}
                    />
                    <TextField
                        margin="dense"
                        label="လမ်းကြောင်းခ အချက်အလက် (JSON Format)"
                        type="text"
                        fullWidth
                        multiline
                        rows={15}
                        variant="outlined"
                        value={newVersionRouteData}
                        onChange={(e) => setNewVersionRouteData(e.target.value)}
                        placeholder='[{"id": 1, "route": "လမ်းကြောင်းအမည်", "MIP_AWPT_40": 100000, "MIIT_40": 120000}]'
                        sx={{ mb: 2 }}
                    />
                    <Alert severity="info" icon={<InfoOutlinedIcon fontSize="inherit" />}>
                        လမ်းကြောင်းခအချက်အလက်ကို JSON Array format ဖြင့် ထည့်သွင်းပါ။ ဥပမာ: <br />
                        {`[{"id": 1, "route": "ဂန္ဒီ+ညောင်တန်း", "MIP_AWPT_40": 215000, "MIIT_40": 285000}, ...]`}
                    </Alert>
                </DialogContent>
                <DialogActions sx={{ p: 3, pt: 1 }}>
                    <Button onClick={handleCloseNewVersionDialog} color="secondary" sx={{ borderRadius: '8px' }}>
                        မလုပ်တော့ပါ
                    </Button>
                    <Button onClick={handleCreateNewVersion} variant="contained" color="primary" sx={{ borderRadius: '8px' }}>
                        ဖန်တီးမည်
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Edit Dates Dialog */}
            {editingVersion && (
                <Dialog open={openEditDatesDialog} onClose={handleCloseEditDatesDialog} fullWidth maxWidth="sm">
                    <DialogTitle sx={{ backgroundColor: '#1976d2', color: 'white', pb: 1 }}>
                        Version {editingVersion.version_number} ရက်စွဲများ ပြင်ဆင်ခြင်း
                    </DialogTitle>
                    <DialogContent sx={{ pt: 2 }}>
                        {editDatesError && <Alert severity="error" sx={{ mb: 2 }}>{editDatesError}</Alert>}
                        <Typography variant="body1" sx={{ mb: 2 }}>
                            **Version:** {editingVersion.version_number}
                        </Typography>
                        <TextField
                            autoFocus
                            margin="dense"
                            label="စတင်သက်ရောက်သည့်ရက်"
                            type="date"
                            fullWidth
                            variant="outlined"
                            value={editEffectiveDate}
                            onChange={(e) => setEditEffectiveDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            sx={{ mb: 2 }}
                        />
                        <TextField
                            margin="dense"
                            label="သက်တမ်းကုန်ဆုံးသည့်ရက် (မရှိပါက လစ်လပ်ထားပါ)"
                            type="date"
                            fullWidth
                            variant="outlined"
                            value={editEndDate}
                            onChange={(e) => setEditEndDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            sx={{ mb: 2 }}
                        />
                        <Alert severity="info" icon={<InfoOutlinedIcon fontSize="inherit" />}>
                            **သက်တမ်းကုန်ဆုံးသည့်ရက်** ကို ထည့်သွင်းခြင်းမရှိပါက ဤ Version သည် လက်ရှိအသုံးပြုနေသော Version ဖြစ်သွားပါမည်။
                            <br/>
                            ရက်စွဲများ ထပ်နေခြင်း သို့မဟုတ် လစ်ဟာခြင်း မရှိစေရန် သတိပြုပါ။
                        </Alert>
                    </DialogContent>
                    <DialogActions sx={{ p: 3, pt: 1 }}>
                        <Button onClick={handleCloseEditDatesDialog} color="secondary" sx={{ borderRadius: '8px' }}>
                            မလုပ်တော့ပါ
                        </Button>
                        <Button onClick={handleSaveEditDates} variant="contained" color="primary" sx={{ borderRadius: '8px' }}>
                            သိမ်းဆည်းမည်
                        </Button>
                    </DialogActions>
                </Dialog>
            )}

            {/* Activate Version Dialog */}
            {versionToActivate && (
                <Dialog open={openActivateVersionDialog} onClose={handleCloseActivateVersionDialog} fullWidth maxWidth="sm">
                    <DialogTitle sx={{ backgroundColor: '#1976d2', color: 'white', pb: 1 }}>
                        Version {versionToActivate.version_number} ကို ပြန်လည်အသက်ဝင်စေမည်
                    </DialogTitle>
                    <DialogContent sx={{ pt: 2 }}>
                        {activateVersionError && <Alert severity="error" sx={{ mb: 2 }}>{activateVersionError}</Alert>}
                        <Typography variant="body1" sx={{ mb: 2 }}>
                            **Version:** {versionToActivate.version_number}
                        </Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                            ဤ Version ကို ပြန်လည်အသက်ဝင်စေပါက လက်ရှိအသုံးပြုနေသော Version ၏ သက်တမ်းကုန်ဆုံးသည့်ရက်ကို အလိုအလျောက် သတ်မှတ်ပေးပါမည်။
                        </Typography>
                        <TextField
                            autoFocus
                            margin="dense"
                            label="စတင်သက်ရောက်မည့်ရက် (အသက်ဝင်မည့်ရက်)"
                            type="date"
                            fullWidth
                            variant="outlined"
                            value={activateEffectiveDate}
                            onChange={(e) => setActivateEffectiveDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            sx={{ mb: 2 }}
                        />
                    </DialogContent>
                    <DialogActions sx={{ p: 3, pt: 1 }}>
                        <Button onClick={handleCloseActivateVersionDialog} color="secondary" sx={{ borderRadius: '8px' }}>
                            မလုပ်တော့ပါ
                        </Button>
                        <Button onClick={handleActivateVersion} variant="contained" color="success" sx={{ borderRadius: '8px' }}>
                            အသက်ဝင်စေမည်
                        </Button>
                    </DialogActions>
                </Dialog>
            )}
        </Container>
    );
}

export default RouteChargesManagementPage;
