// myan-san/src/pages/FuelConsumptionPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Container, Typography, Box, TextField, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  IconButton, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
  FormControl, InputLabel, Select, MenuItem, CircularProgress, Alert
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import carNumbersData from '../data/carNumbers.json'; // Import carNumbers.json
import { formatMMK } from '../utils/currencyFormatter'; // Import formatMMK

const API_BASE_URL = 'http://localhost:5001/api';

function FuelConsumptionPage() {
  const [fuelReadings, setFuelReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const [formData, setFormData] = useState({
    carNo: '',
    tripId: '',
    readingDate: new Date().toISOString().split('T')[0],
    readingTime: new Date().toTimeString().split(' ')[0].substring(0, 5), // HH:MM format
    fuelGaugeReading: '', // in gallons
    remarks: '',
  });

  const [availableTrips, setAvailableTrips] = useState([]); // Trips without fuel readings for selected car
  const [selectedCarNoForTrips, setSelectedCarNoForTrips] = useState(''); // For fetching trips

  // For editing
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingReadingId, setEditingReadingId] = useState(null);
  const [editFormData, setEditFormData] = useState({
    carNo: '',
    tripId: '',
    readingDate: '',
    readingTime: '',
    fuelGaugeReading: '',
    remarks: '',
  });
  const [editAvailableTrips, setEditAvailableTrips] = useState([]); // Trips for the car being edited

  // Delete confirmation dialog states
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [readingToDelete, setReadingToDelete] = useState(null);

  // Fetch all fuel readings
  const fetchFuelReadings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/fuel-readings`);
      if (response.data.message === "success") {
        setFuelReadings(response.data.data);
      } else {
        setError("ဆီစားနှုန်းမှတ်တမ်းများကို ရယူရာတွင် အမှားဖြစ်ပွားခဲ့ပါသည်။");
        console.error("Failed to fetch fuel readings:", response.data.error);
      }
    } catch (err) {
      setError("ဆီစားနှုန်းမှတ်တမ်းများကို ရယူရာတွင် အမှားဖြစ်ပွားခဲ့ပါသည်။");
      console.error("Error fetching fuel readings:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch trips without fuel readings for a specific car
  const fetchTripsWithoutFuelReading = useCallback(async (carNo) => {
    if (!carNo) {
      setAvailableTrips([]);
      return;
    }
    try {
      const response = await axios.get(`${API_BASE_URL}/trips-without-fuel-reading/${carNo}`);
      if (response.data.message === "success") {
        setAvailableTrips(response.data.data);
      } else {
        console.error("Failed to fetch trips without fuel reading:", response.data.error);
        setAvailableTrips([]);
      }
    } catch (err) {
      console.error("Error fetching trips without fuel reading:", err);
      setAvailableTrips([]);
    }
  }, []);

  // Initial fetch on component mount
  useEffect(() => {
    fetchFuelReadings();
  }, [fetchFuelReadings]);

  // Fetch trips for the selected car in the new form
  useEffect(() => {
    fetchTripsWithoutFuelReading(selectedCarNoForTrips);
    // Reset tripId when carNo changes
    setFormData(prev => ({ ...prev, tripId: '' }));
  }, [selectedCarNoForTrips, fetchTripsWithoutFuelReading]);


  // Handle form input changes for new entry
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({ ...prevData, [name]: value }));
  };

  // Handle car number change in new form to fetch relevant trips
  const handleCarNoChange = (e) => {
    const carNo = e.target.value;
    setFormData(prev => ({ ...prev, carNo: carNo, tripId: '' })); // Reset tripId
    setSelectedCarNoForTrips(carNo); // Trigger useEffect to fetch trips
  };

  // Handle form input changes for edit entry
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prevData => ({ ...prevData, [name]: value }));
  };

  // Handle car number change in edit form to fetch relevant trips
  const handleEditCarNoChange = async (e) => {
    const carNo = e.target.value;
    setEditFormData(prev => ({ ...prev, carNo: carNo, tripId: '' })); // Reset tripId

    // Fetch trips for the selected car, including the one currently associated with the reading
    try {
      const response = await axios.get(`${API_BASE_URL}/trips-without-fuel-reading/${carNo}`);
      let trips = response.data.data;

      // Also add the current trip associated with the reading if it's not already in the list
      // This is important if the current trip already has a reading but we are editing it
      const currentReading = fuelReadings.find(r => r.id === editingReadingId);
      if (currentReading && currentReading.car_no === carNo && !trips.some(t => t.id === currentReading.trip_id)) {
        const currentTripResponse = await axios.get(`${API_BASE_URL}/trips/${currentReading.trip_id}`);
        if (currentTripResponse.data.message === "success" && currentTripResponse.data.data) {
          trips = [...trips, currentTripResponse.data.data].sort((a, b) => new Date(b.date) - new Date(a.date));
        }
      }
      setEditAvailableTrips(trips);
    } catch (err) {
      console.error("Error fetching trips for edit:", err);
      setEditAvailableTrips([]);
    }
  };


  // Handle adding a new fuel reading
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!formData.carNo || !formData.tripId || !formData.readingDate || !formData.readingTime || formData.fuelGaugeReading === '') {
      setError('ကျေးဇူးပြု၍ ကားနံပါတ်၊ ခရီးစဉ်၊ ရက်စွဲ၊ အချိန် နှင့် ဆီတိုင်းအမှတ် နေရာများကို ပြည့်စုံစွာ ထည့်သွင်းပါ။');
      return;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/fuel-readings`, {
        ...formData,
        fuelGaugeReading: parseFloat(formData.fuelGaugeReading),
        tripId: parseInt(formData.tripId, 10), // Ensure tripId is integer
      });

      if (response.status === 201) {
        setSuccessMessage("ဆီစားနှုန်းမှတ်တမ်း အောင်မြင်စွာ ထည့်သွင်းပြီးပါပြီ။");
        setFormData({
          carNo: '',
          tripId: '',
          readingDate: new Date().toISOString().split('T')[0],
          readingTime: new Date().toTimeString().split(' ')[0].substring(0, 5),
          fuelGaugeReading: '',
          remarks: '',
        });
        setSelectedCarNoForTrips(''); // Reset selected car for fetching trips
        fetchFuelReadings(); // Refresh the list
      } else {
        setError(`မှတ်တမ်းထည့်သွင်းရာတွင် အမှားဖြစ်ပွားခဲ့ပါသည်။: ${response.data.error || 'Unknown error'}`);
      }
    } catch (err) {
      setError(`မှတ်တမ်းထည့်သွင်းရာတွင် အမှားဖြစ်ပွားခဲ့ပါသည်။: ${err.response?.data?.error || err.message}`);
      console.error("Error adding fuel reading:", err);
    }
  };

  // Handle Edit button click (Opens Dialog)
  const handleEdit = async (reading) => {
    setEditingReadingId(reading.id);
    setEditFormData({
      carNo: reading.car_no,
      tripId: reading.trip_id,
      readingDate: reading.reading_date,
      readingTime: reading.reading_time,
      fuelGaugeReading: reading.fuel_gauge_reading,
      remarks: reading.remarks || '',
    });

    // Fetch trips for the car being edited, including the one currently assigned
    try {
      const response = await axios.get(`${API_BASE_URL}/trips-without-fuel-reading/${reading.car_no}`);
      let trips = response.data.data;

      // Add the current trip if it's not already in the list (it might be because it already has a reading)
      if (reading.trip_id && !trips.some(t => t.id === reading.trip_id)) {
        const currentTripResponse = await axios.get(`${API_BASE_URL}/trips/${reading.trip_id}`);
        if (currentTripResponse.data.message === "success" && currentTripResponse.data.data) {
          trips = [...trips, currentTripResponse.data.data].sort((a, b) => new Date(b.date) - new Date(a.date));
        }
      }
      setEditAvailableTrips(trips);
    } catch (err) {
      console.error("Error fetching trips for edit dialog:", err);
      setEditAvailableTrips([]);
    }

    setEditDialogOpen(true);
  };

  // Handle Save Edit button click
  const handleSaveEdit = async () => {
    setError(null);
    setSuccessMessage(null);

    if (!editFormData.carNo || !editFormData.tripId || !editFormData.readingDate || !editFormData.readingTime || editFormData.fuelGaugeReading === '') {
      setError('ကျေးဇူးပြု၍ လိုအပ်သော အချက်အလက်များကို ပြည့်စုံစွာ ဖြည့်သွင်းပါ။');
      return;
    }

    try {
      const response = await axios.put(`${API_BASE_URL}/fuel-readings/${editingReadingId}`, {
        ...editFormData,
        fuelGaugeReading: parseFloat(editFormData.fuelGaugeReading),
        tripId: parseInt(editFormData.tripId, 10),
      });

      if (response.status === 200) {
        setSuccessMessage('ဆီစားနှုန်းမှတ်တမ်း အောင်မြင်စွာ ပြင်ဆင်ပြီးပါပြီ။');
        setEditingReadingId(null);
        setEditDialogOpen(false);
        fetchFuelReadings(); // Refresh the list
      } else {
        setError(`မှတ်တမ်းပြင်ဆင်ရာတွင် အမှားဖြစ်ပွားခဲ့ပါသည်။: ${response.data.error || 'Unknown error'}`);
      }
    } catch (err) {
      setError(`မှတ်တမ်းပြင်ဆင်ရာတွင် အမှားဖြစ်ပွားခဲ့ပါသည်။: ${err.response?.data?.error || err.message}`);
      console.error('Error saving fuel reading edit:', err);
    }
  };

  // Handle Cancel Edit button click
  const handleCancelEdit = () => {
    setEditingReadingId(null);
    setEditDialogOpen(false);
    setEditFormData({
      carNo: '', tripId: '', readingDate: '', readingTime: '', fuelGaugeReading: '', remarks: '',
    });
    setEditAvailableTrips([]);
  };

  // Handle Delete button click
  const handleDelete = (reading) => {
    setReadingToDelete(reading);
    setDeleteConfirmOpen(true);
  };

  // Handle Confirm Delete button click
  const handleConfirmDelete = async () => {
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await axios.delete(`${API_BASE_URL}/fuel-readings/${readingToDelete.id}`);
      if (response.status === 200) {
        setSuccessMessage('ဆီစားနှုန်းမှတ်တမ်းကို ဖျက်ပစ်ပြီးပါပြီ။');
        fetchFuelReadings(); // Refresh the list
      } else {
        setError(`မှတ်တမ်းကို ဖျက်ပစ်ရာတွင် အမှားဖြစ်ပွားခဲ့ပါသည်။: ${response.data.error || 'Unknown error'}`);
      }
    } catch (err) {
      setError(`မှတ်တမ်းကို ဖျက်ပစ်ရာတွင် အမှားဖြစ်ပွားခဲ့ပါသည်။: ${err.response?.data?.error || err.message}`);
      console.error('Error deleting fuel reading:', err);
    } finally {
      setDeleteConfirmOpen(false);
      setReadingToDelete(null);
    }
  };

  // Handle Close Delete Confirm dialog
  const handleCloseDeleteConfirm = () => {
    setDeleteConfirmOpen(false);
    setReadingToDelete(null);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ color: '#1976d2', fontWeight: 'bold' }}>
        ဆီစားနှုန်း မှတ်တမ်း (Fuel Consumption)
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {successMessage && <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>}

      <Paper elevation={3} sx={{ p: 4, mb: 4, borderRadius: '8px' }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#3f51b5', mb: 2 }}>
          ဆီတိုင်းအမှတ် အသစ်ထည့်သွင်းရန်
        </Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 2 }}>
          <FormControl fullWidth variant="outlined" size="small">
            <InputLabel id="car-no-label">ကားနံပါတ် (Car No)</InputLabel>
            <Select
              labelId="car-no-label"
              id="carNo"
              name="carNo"
              value={formData.carNo}
              onChange={handleCarNoChange}
              label="ကားနံပါတ် (Car No)"
            >
              <MenuItem value="">ကားနံပါတ် ရွေးပါ</MenuItem>
              {carNumbersData.map((car, index) => (
                <MenuItem key={index} value={car.number}>
                  {car.number} ({car.gate})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth variant="outlined" size="small">
            <InputLabel id="trip-id-label">ခရီးစဉ် (Trip)</InputLabel>
            <Select
              labelId="trip-id-label"
              id="tripId"
              name="tripId"
              value={formData.tripId}
              onChange={handleChange}
              label="ခရီးစဉ် (Trip)"
              disabled={!formData.carNo || availableTrips.length === 0}
            >
              <MenuItem value="">
                {formData.carNo ? (availableTrips.length > 0 ? 'ခရီးစဉ် ရွေးပါ' : 'ဤကားအတွက် မှတ်တမ်းမရှိသေးသော ခရီးစဉ် မရှိပါ') : 'ကားနံပါတ် ရွေးချယ်ပါ'}
              </MenuItem>
              {availableTrips.map((trip) => (
                <MenuItem key={trip.id} value={trip.id}>
                  {trip.date} - {trip.from_location} မှ {trip.to_location} ({trip.km_travelled} KM)
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="ရက်စွဲ (Date)"
            type="date"
            name="readingDate"
            value={formData.readingDate}
            onChange={handleChange}
            fullWidth
            InputLabelProps={{ shrink: true }}
            variant="outlined"
            size="small"
          />
          <TextField
            label="အချိန် (Time)"
            type="time"
            name="readingTime"
            value={formData.readingTime}
            onChange={handleChange}
            fullWidth
            InputLabelProps={{ shrink: true }}
            variant="outlined"
            size="small"
          />
          <TextField
            label="ဆီတိုင်းအမှတ် (ဂါလံ)"
            type="number"
            name="fuelGaugeReading"
            value={formData.fuelGaugeReading}
            onChange={handleChange}
            fullWidth
            variant="outlined"
            size="small"
            inputProps={{ step: "0.1" }}
          />
          <TextField
            label="မှတ်ချက် (Remarks)"
            name="remarks"
            value={formData.remarks}
            onChange={handleChange}
            fullWidth
            variant="outlined"
            size="small"
            sx={{ gridColumn: 'span 2' }} // Span two columns if grid allows
          />
          <Box sx={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button type="submit" variant="contained" color="primary" sx={{ py: 1.5, px: 4 }}>
              မှတ်တမ်းတင်မည်
            </Button>
          </Box>
        </Box>
      </Paper>

      <Typography variant="h5" component="h2" gutterBottom sx={{ color: '#1976d2', fontWeight: 'bold', mt: 4 }}>
        ဆီစားနှုန်း မှတ်တမ်းများ
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} elevation={3} sx={{ borderRadius: '8px' }}>
          <Table stickyHeader aria-label="fuel readings table">
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f0f0f0' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>No.</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>ကားနံပါတ်</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>ခရီးစဉ်</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>ရက်စွဲ</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>အချိန်</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>ဆီတိုင်းအမှတ် (ဂါလံ)</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>ယခင်ဆီတိုင်းအမှတ် (ဂါလံ)</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>သုံးစွဲဆီ (ဂါလံ)</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>ခရီးအကွာအဝေး (KM)</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>KM/ဂါလံ</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>မှတ်ချက်</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>လုပ်ဆောင်ချက်များ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {fuelReadings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    ဆီစားနှုန်းမှတ်တမ်းများ မရှိသေးပါ
                  </TableCell>
                </TableRow>
              ) : (
                fuelReadings.map((reading, index) => (
                  <TableRow key={reading.id} sx={{ '&:nth-of-type(odd)': { backgroundColor: '#f9f9f9' } }}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{reading.car_no}</TableCell>
                    <TableCell>
                      {reading.trip_date ? `${reading.trip_date} (${reading.from_location} - ${reading.to_location})` : 'N/A'}
                    </TableCell>
                    <TableCell>{reading.reading_date}</TableCell>
                    <TableCell>{reading.reading_time}</TableCell>
                    <TableCell>{reading.fuel_gauge_reading ? reading.fuel_gauge_reading.toFixed(2) : 'N/A'}</TableCell>
                    <TableCell>{reading.previous_fuel_gauge_reading ? reading.previous_fuel_gauge_reading.toFixed(2) : '-'}</TableCell>
                    <TableCell>{reading.fuel_consumed_gallons ? reading.fuel_consumed_gallons.toFixed(2) : '-'}</TableCell>
                    <TableCell>{reading.km_for_this_trip ? reading.km_for_this_trip.toFixed(0) : '-'}</TableCell>
                    <TableCell>{reading.km_per_gallon ? reading.km_per_gallon.toFixed(2) : '-'}</TableCell>
                    <TableCell>{reading.remarks || '-'}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <IconButton color="info" size="small" onClick={() => handleEdit(reading)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton color="error" size="small" onClick={() => handleDelete(reading)}>
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Edit Fuel Reading Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={handleCancelEdit}
        aria-labelledby="edit-fuel-reading-dialog-title"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="edit-fuel-reading-dialog-title">ဆီစားနှုန်းမှတ်တမ်း ပြင်ဆင်ခြင်း</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 2 }}>
            <FormControl fullWidth variant="outlined" size="small">
              <InputLabel id="edit-car-no-label">ကားနံပါတ် (Car No)</InputLabel>
              <Select
                labelId="edit-car-no-label"
                id="editCarNo"
                name="carNo"
                value={editFormData.carNo}
                onChange={handleEditCarNoChange}
                label="ကားနံပါတ် (Car No)"
              >
                <MenuItem value="">ကားနံပါတ် ရွေးပါ</MenuItem>
                {carNumbersData.map((car, index) => (
                  <MenuItem key={index} value={car.number}>
                    {car.number} ({car.gate})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth variant="outlined" size="small">
              <InputLabel id="edit-trip-id-label">ခရီးစဉ် (Trip)</InputLabel>
              <Select
                labelId="edit-trip-id-label"
                id="editTripId"
                name="tripId"
                value={editFormData.tripId}
                onChange={handleEditChange}
                label="ခရီးစဉ် (Trip)"
                disabled={!editFormData.carNo || editAvailableTrips.length === 0}
              >
                <MenuItem value="">
                  {editFormData.carNo ? (editAvailableTrips.length > 0 ? 'ခရီးစဉ် ရွေးပါ' : 'ဤကားအတွက် မှတ်တမ်းမရှိသေးသော ခရီးစဉ် မရှိပါ') : 'ကားနံပါတ် ရွေးချယ်ပါ'}
                </MenuItem>
                {editAvailableTrips.map((trip) => (
                  <MenuItem key={trip.id} value={trip.id}>
                    {trip.date} - {trip.from_location} မှ {trip.to_location} ({trip.km_travelled} KM)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="ရက်စွဲ (Date)"
              type="date"
              name="readingDate"
              value={editFormData.readingDate}
              onChange={handleEditChange}
              fullWidth
              InputLabelProps={{ shrink: true }}
              variant="outlined"
              size="small"
            />
            <TextField
              label="အချိန် (Time)"
              type="time"
              name="readingTime"
              value={editFormData.readingTime}
              onChange={handleEditChange}
              fullWidth
              InputLabelProps={{ shrink: true }}
              variant="outlined"
              size="small"
            />
            <TextField
              label="ဆီတိုင်းအမှတ် (ဂါလံ)"
              type="number"
              name="fuelGaugeReading"
              value={editFormData.fuelGaugeReading}
              onChange={handleEditChange}
              fullWidth
              variant="outlined"
              size="small"
              inputProps={{ step: "0.1" }}
            />
            <TextField
              label="မှတ်ချက် (Remarks)"
              name="remarks"
              value={editFormData.remarks}
              onChange={handleEditChange}
              fullWidth
              variant="outlined"
              size="small"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelEdit} color="secondary">
            မလုပ်တော့ပါ
          </Button>
          <Button onClick={handleSaveEdit} color="primary" variant="contained">
            သိမ်းဆည်းမည်
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={handleCloseDeleteConfirm}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{"ဆီစားနှုန်းမှတ်တမ်း ဖျက်သိမ်းခြင်း"}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            ရက်စွဲ {readingToDelete?.reading_date}၊ ကားနံပါတ် {readingToDelete?.car_no} ၏ ဆီစားနှုန်းမှတ်တမ်းကို ဖျက်သိမ်းမှာ သေချာပါသလား။
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteConfirm} color="primary">
            မလုပ်တော့ပါ
          </Button>
          <Button onClick={handleConfirmDelete} color="error" autoFocus>
            ဖျက်သိမ်းမည်
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default FuelConsumptionPage;
