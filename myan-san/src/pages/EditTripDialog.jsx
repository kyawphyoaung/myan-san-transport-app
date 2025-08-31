import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ListSubheader,
  Typography,
  RadioGroup,
  IconButton,
  FormControlLabel,
  Radio,
  FormHelperText
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import dayjs from "dayjs";
import { DatePicker } from "@mui/x-date-pickers";
import kmData from "../data/kmData.json";

//iic
import DeleteIcon from "@mui/icons-material/Delete";
import WhereToVoteIcon from "@mui/icons-material/WhereToVote";
import ModeOfTravelIcon from "@mui/icons-material/ModeOfTravel";
import WrongLocationIcon from "@mui/icons-material/WrongLocation";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import CloseIcon from "@mui/icons-material/Close";
import SaveIcon from "@mui/icons-material/Save";
import { useEffect } from "react";
import { useState } from "react";

// Dialog Component ကို props တွေ လက်ခံနိုင်အောင် ဖန်တီးပါ
const EditTripDialog = ({
  // Dialog Control
  open,
  onClose,
  onSave,

  // Data Props
  editFormData,
  carNumbersData,
  driverNames,
  groupedRoutes,
  emptyLocationsOptions,
  agentNames,
  originalKmTravelled,
  // Handlers
  setEditFormData,
  handleEditChange,
  handleEditCarNoChange,
  handleEditPointChange,
  handleEditAddPointChange,
  handleEditRemovePointChange,

  // Helpers
  formatMMK,
}) => {
  const [isKmManual, setIsKmManual] = useState(false);
  // useEffect ထဲမှာ
  useEffect(() => {
    // ...
    // Calculate the new km based on current `from` and `to` values

    const newKmTravelled =
      kmData.find(
        (k) =>
          k.start_point === editFormData.from &&
          k.destination_point === editFormData.to
      )?.km_value || 1;


    // Check if the current form's km value is the same as the original value
    const isKmValueManuallyEdited =
      editFormData.kmTravelled !== newKmTravelled;

    setIsKmManual(isKmValueManuallyEdited);

    // Now, update the state based on the logic
    setEditFormData((prevData) => {
      let finalKmTravelled = prevData.kmTravelled;

      // If the current km is NOT manually edited, use the newly calculated km
      if (!isKmValueManuallyEdited) {
        finalKmTravelled = newKmTravelled;
        console.log("isKmValueManuallyEdited က",isKmValueManuallyEdited," ဖြစ်နေလို့ manualEdit လုပ်ထားတာမဟုတ်ဘူးလို့ယူဆပြီး EditTripDialog ထဲမှာ kmTravel ကို auto တွက်ချက်ကာ အသစ်ထည့်လိုက်ပြီ")
      }
      return {
        ...prevData,
        kmTravelled: finalKmTravelled, // Use the determined final km value
        // ... all other fields
      };
    });
  }, [
    editFormData.from,
    editFormData.to,
    editFormData.kmTravelled, // <-- ဒီနေရာကိုလည်း ထည့်ပါ
    originalKmTravelled,
    setEditFormData,
    // ... other dependencies
  ]);

  // သင်ရဲ့ Dialog code အားလုံးကို ဒီထဲကို ထည့်ပါ
  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="edit-trip-dialog-title"
      maxWidth="md"
      fullWidth
    >
      <DialogTitle id="edit-trip-dialog-title">
        ခရီးစဉ်မှတ်တမ်း ပြင်ဆင်ခြင်း
      </DialogTitle>
      <DialogContent dividers>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "1fr 1fr",
              md: "1fr 1fr 1fr",
            },
            gap: 2,
          }}
        >
          {/* Edit ကားနံပါတ် (Car No) */}
          <FormControl fullWidth variant="outlined" size="small">
            <InputLabel>ကားနံပါတ် (Car No)</InputLabel>
            <Select
              name="carNo"
              value={editFormData.carNo}
              onChange={handleEditCarNoChange}
              label="ကားနံပါတ် (Car No)"
            >
              <MenuItem value="">ကားနံပါတ် ရွေးပါ</MenuItem>
              {carNumbersData.map((car, index) => (
                <MenuItem key={index} value={car.number}>
                  {/* မှန်ကန်တဲ့ ပုံစံ */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <LocalShippingIcon fontSize="small" />
                    <span>
                      {car.number} ({car.gate})
                    </span>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Edit ယာဉ်မောင်းအမည် */}
          <FormControl fullWidth variant="outlined" size="small">
            <InputLabel>ယာဉ်မောင်းအမည်</InputLabel>
            <Select
              name="driverName"
              value={editFormData.driverName}
              onChange={handleEditChange}
              label="ယာဉ်မောင်းအမည်"
            >
              <MenuItem value="">ယာဉ်မောင်း ရွေးပါ</MenuItem>
              {driverNames.map((name, index) => (
                <MenuItem key={index} value={name}>
                  {name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Edit ခရီးစဉ်အမျိုးအစား */}
          <div>
            <FormControl fullWidth variant="outlined" size="small">
              <InputLabel>ခရီးစဉ်အမျိုးအစား</InputLabel>
              <Select
                id="editTripType"
                name="tripType"
                value={editFormData.tripType}
                onChange={handleEditChange}
              >
                <MenuItem value="normal">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <WhereToVoteIcon fontSize="small" color="success" />
                    <span>ပုံမှန်</span>
                  </div>
                </MenuItem>
                <MenuItem value="tinSit">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <ModeOfTravelIcon fontSize="small" color="error" />
                    <span>တင်စစ်</span>
                  </div>
                </MenuItem>
                <MenuItem value="pointPyat">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <WrongLocationIcon fontSize="small" color="error" />
                    <span>ပွိုင့်ပျက်</span>
                  </div>
                </MenuItem>
              </Select>
            </FormControl>
          </div>

          {/* Edit မှ */}
          <FormControl fullWidth variant="outlined" size="small">
            <InputLabel>မှ (From)</InputLabel>
            <Select
              name="from"
              value={editFormData.from}
              onChange={handleEditChange}
              label="မှ (From)"
            >
              {Object.keys(groupedRoutes)?.flatMap((groupName) => [
                <ListSubheader key={groupName}>{groupName}</ListSubheader>,
                ...groupedRoutes[groupName].map((route) => (
                  <MenuItem key={route.id} value={route.route}>
                    {route.route}
                  </MenuItem>
                )),
              ])}
            </Select>
          </FormControl>

          {/* Edit သို့ */}
          <FormControl fullWidth variant="outlined" size="small">
            <InputLabel>သို့ (To)</InputLabel>
            <Select
              name="to"
              value={editFormData.to}
              onChange={handleEditChange}
              label="သို့ (To)"
            >
              {Object.keys(groupedRoutes)?.flatMap((groupName) => [
                <ListSubheader key={groupName}>{groupName}</ListSubheader>,
                ...groupedRoutes[groupName].map((route) => (
                  <MenuItem key={route.id} value={route.route}>
                    {route.route}
                  </MenuItem>
                )),
              ])}
            </Select>
          </FormControl>

          {/* Edit လမ်းကြောင်းခ */}
          <TextField
            label="လမ်းကြောင်းခ"
            type="text"
            name="routeCharge"
            value={editFormData.routeCharge || ""}
            onChange={handleEditChange}
            fullWidth
            variant="outlined"
            size="small"
          />

          {/* Edit ခရီးစဥ်စတင်သည့်ရက် (Date) */}
          <DatePicker
            label="ခရီးစဥ်စတင်သည့်ရက် (Date)"
            value={editFormData.date ? dayjs(editFormData.date) : null}
            format="DD-MM-YYYY"
            onChange={(newValue) => {
              const formattedDate = newValue
                ? newValue.format("YYYY-MM-DD")
                : "";
              handleEditChange({
                target: {
                  name: "date",
                  value: formattedDate,
                },
              });
            }}
            slotProps={{
              textField: {
                variant: "outlined",
                size: "small",
                fullWidth: true,
              },
            }}
          />

          {/* Edit  ခရီးစဉ် စတင်ချိန် */}
          <TextField
            label="ခရီးစဉ် စတင်ချိန်"
            type="time"
            name="startTime"
            value={editFormData.startTime}
            onChange={handleEditChange}
            fullWidth
            InputLabelProps={{ shrink: true }}
            variant="outlined"
            size="small"
          />

          {/* Edit အသားတင်သည့်ပုံစံ */}
          <div>
            {/* Edit Dialog - Cargo Loading Type */}
            <div className="mb-4">
              <label
                htmlFor="editCargoLoadType"
                className="block text-sm font-small mb-1"
              >
                အသားတင်သည့်ပုံစံ ( Only For Export)
              </label>
              <FormControl fullWidth variant="outlined" size="small">
                <RadioGroup
                  row
                  name="cargoLoadType"
                  value={editFormData.cargoLoadType}
                  onChange={handleEditChange}
                >
                  <FormControlLabel
                    value="normal"
                    control={<Radio size="small" />}
                    label="ပုံမှန်"
                  />
                  <FormControlLabel
                    value="sameDay"
                    control={<Radio size="small" />}
                    label="ပတ်မောင်း"
                  />
                  <FormControlLabel
                    value="custom"
                    control={<Radio size="small" />}
                    label="ရက်ကြာ"
                  />
                </RadioGroup>
              </FormControl>
            </div>

            {/* Edit Dialog - Cargo Loading Date (Conditionally rendered) */}
            {editFormData.cargoLoadType === "custom" && (
              <div className="mb-4">
                <TextField
                  label="အသားတင်သည့်ရက်စွဲ"
                  type="date"
                  name="cargoLoadDate"
                  value={editFormData.cargoLoadDate}
                  onChange={handleEditChange}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  variant="outlined"
                  size="small"
                />
              </div>
            )}

            {/* Edit Dialog - Cargo Loading Time (Conditionally rendered) */}
            {editFormData.cargoLoadType === "custom" && (
              <TextField
                label="အသားတင်သည့်အချိန်"
                type="time"
                name="cargoLoadTime"
                value={editFormData.cargoLoadTime}
                onChange={handleEditChange}
                fullWidth
                InputLabelProps={{ shrink: true }}
                variant="outlined"
                size="small"
              />
            )}
          </div>

          {/* Edit  ခရီးစဉ် ပြီးဆုံးရက် */}
          <DatePicker
            label="ခရီးစဉ် ပြီးဆုံးရက်"
            value={editFormData.endDate ? dayjs(editFormData.endDate) : null}
            format="DD-MM-YYYY"
            onChange={(newValue) => {
              const formattedDate = newValue
                ? newValue.format("YYYY-MM-DD")
                : "";
              handleEditChange({
                target: {
                  name: "endDate",
                  value: formattedDate,
                },
              });
            }}
            slotProps={{
              textField: {
                variant: "outlined",
                size: "small",
                fullWidth: true,
              },
            }}
          />

          {/* Edit  ခရီးစဉ် ပြီးဆုံးချိန် */}
          <TextField
            label="ခရီးစဉ် ပြီးဆုံးချိန်"
            type="time"
            name="endTime"
            value={editFormData.endTime}
            onChange={handleEditChange}
            fullWidth
            InputLabelProps={{ shrink: true }}
            variant="outlined"
            size="small"
          />

          {/* Edit အခွံတင်/ချ နေရာ */}
          <FormControl fullWidth variant="outlined" size="small">
            <InputLabel>အခွံတင်/ချ နေရာ</InputLabel>
            <Select
              name="emptyHandlingLocation"
              value={editFormData.emptyHandlingLocation}
              onChange={handleEditChange}
              label="အခွံတင်/ချ နေရာ"
            >
              <MenuItem value="">
                <em>ရွေးချယ်ပါ</em>
              </MenuItem>
              {emptyLocationsOptions.map((loc, index) => (
                <MenuItem key={index} value={loc}>
                  {loc}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Edit အခွံတင်/ချ ခ */}
          <TextField
            label="အခွံတင်/ချ ခ"
            type="text"
            id="editEmptyCharge"
            name="emptyCharge"
            value={editFormData.emptyCharge || ""}
            onChange={handleEditChange}
            fullWidth
            variant="outlined"
            size="small"
            InputProps={{
              endAdornment: (
                <Typography variant="body2" color="textPrimary">
                  {editFormData.emptyCharge &&
                  !isNaN(parseFloat(editFormData.emptyCharge))
                    ? formatMMK(parseFloat(editFormData.emptyCharge))
                    : ""}
                </Typography>
              ),
            }}
          />

          {/* Edit အသားအိပ် (Overnight Stay) */}
          <div>
            <label className="block text-sm font-medium mb-1">
              အသားအိပ် (Overnight Stay)
            </label>
            <TextField
              type="text"
              name="overnightStayCount"
              value={editFormData.overnightStayCount}
              onChange={handleEditChange}
              fullWidth
              variant="outlined"
              size="small"
              disabled
            />
          </div>

          {/* Edit နေ့ကျော်/ပြီး (Day Over) */}
          <div>
            <label className="block text-sm font-medium mb-1">
              နေ့ကျော်/ပြီး (Day Over)
            </label>
            <TextField
              type="text"
              name="dayOverDelayedCount"
              value={editFormData.dayOverDelayedCount}
              onChange={handleEditChange}
              fullWidth
              variant="outlined"
              size="small"
              disabled
            />
          </div>

          {/* Edit KM (ခရီးအကွာအဝေး) */}
          <div>
            <label className="block text-sm font-medium mb-1">
              KM (ကီလိုမီတာ)
            </label>
            <TextField
              type="number"
              name="kmTravelled"
              value={editFormData.kmTravelled}
              onChange={handleEditChange}
              fullWidth
              variant="outlined"
              size="small"
            />
            {isKmManual && (
              <FormHelperText sx={{ color: "orange", mt: 0.5 }}>
                တန်ဖိုးကို ကိုယ်တိုင် ပြောင်းလဲထားပါသည်။ (Automatically update
                လုပ်မည်မဟုတ်ပါ။)
              </FormHelperText>
            )}
          </div>

          {/* Edit Agent Name */}
          <div>
            <label
              htmlFor="editAgentName"
              className="block text-sm font-medium   mb-1"
            >
              အေးဂျင့် အမည်
            </label>
            <FormControl fullWidth variant="outlined" size="small">
              <Select
                id="editAgentName"
                name="agentName"
                value={editFormData.agentName || ""}
                onChange={handleEditChange}
              >
                <MenuItem value="">
                  <em>ရွေးချယ်ပါ</em>
                </MenuItem>
                {agentNames?.map((name, index) => (
                  <MenuItem key={index} value={name}>
                    {name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>

          {/* Edit Point Change Section */}
          <div className="col-span-full">
            <label className="block text-sm font-medium mb-1">
              ပွိုင့်ချိန်း (Point Change)
            </label>
            {editFormData.pointChangeLocations?.map((pc, index) => (
              <Box
                key={pc.id}
                sx={{ display: "flex", gap: 1, mb: 1, alignItems: "center" }}
              >
                {/* Replaced TextField with a Select component */}
                <FormControl
                  variant="outlined"
                  size="small"
                  sx={{ flexGrow: 1 }}
                >
                  <InputLabel>{`နေရာ ${index + 1}`}</InputLabel>
                  <Select
                    label={`နေရာ ${index + 1}`}
                    name="location"
                    value={pc.locatio || ""}
                    onChange={(e) =>
                      handleEditPointChange(index, "location", e.target.value)
                    }
                  >
                    {Object.keys(groupedRoutes).flatMap((groupName) => [
                      <ListSubheader key={groupName}>
                        {groupName}
                      </ListSubheader>,
                      ...groupedRoutes[groupName].map((route) => (
                        <MenuItem key={route.id} value={route.route}>
                          {route.route}
                        </MenuItem>
                      )),
                    ])}
                  </Select>
                </FormControl>
                <TextField
                  label={`ဝန်ဆောင်ခ ${index + 1}`}
                  type="number"
                  name="charge"
                  value={pc.charge || ""}
                  onChange={(e) =>
                    handleEditPointChange(index, "charge", e.target.value)
                  }
                  variant="outlined"
                  size="small"
                  sx={{ width: "120px" }}
                />
                <IconButton
                  color="error"
                  size="small"
                  onClick={() => handleEditRemovePointChange(index)}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}
            <Button
              variant="outlined"
              size="small"
              onClick={handleEditAddPointChange}
              startIcon={<AddIcon />}
              sx={{ mt: 1 }}
            >
              ပွိုင့်ချိန်း ထပ်ထည့်မည်
            </Button>
          </div>

          {/* Edit Dialog - Remarks */}
          <TextField
            label="မှတ်ချက် (Remarks)"
            name="remarks"
            multiline
            rows={3}
            value={editFormData.remarks || ""}
            onChange={handleEditChange}
            fullWidth
            variant="outlined"
            size="small"
            sx={{ gridColumn: "1 / -1" }}
          />
        </Box>

        {/* Total Charge Breakdown and Grand Total for Edit Dialog */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            mt: 3,
          }}
        >
          <Typography variant="body1" sx={{ mr: 2, color: "text.secondary" }}>
            လမ်းကြောင်းခ: {formatMMK(editFormData.routeCharge)}
          </Typography>
          <Typography variant="body1" sx={{ mr: 2, color: "text.secondary" }}>
            အခွံတင်/ချ: {formatMMK(editFormData.emptyCharge)}
          </Typography>
          {editFormData.overnightCharges > 0 && (
            <Typography variant="body1" sx={{ mr: 2, color: "text.secondary" }}>
              အသားအိပ်ခ: {formatMMK(editFormData.overnightCharges)}
            </Typography>
          )}
          {editFormData.dayOverCharges > 0 && (
            <Typography variant="body1" sx={{ mr: 2, color: "text.secondary" }}>
              နေ့ကျော်ခ: {formatMMK(editFormData.dayOverCharges)}
            </Typography>
          )}
          {editFormData.pointChangeTotalCharge > 0 && (
            <Typography variant="body1" sx={{ mr: 2, color: "text.secondary" }}>
              ပွိုင့်ချိန်းခ: {formatMMK(editFormData.pointChangeTotalCharge)}
            </Typography>
          )}
          <Typography variant="h6" sx={{ mr: 2, color: "text.primary", mt: 1 }}>
            စုစုပေါင်း: {formatMMK(editFormData.totalCharge)}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary">
          <CloseIcon /> မလုပ်တော့ပါ
        </Button>
        <Button onClick={onSave} color="primary" variant="contained">
          <SaveIcon />
          သိမ်းဆည်းမည်
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditTripDialog;
