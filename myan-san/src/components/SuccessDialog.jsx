import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CloseIcon from "@mui/icons-material/Close";

// Success Dialog Component အဖြစ် ခွဲထုတ်လိုက်ပါ
const SuccessDialog = ({ open, onClose, message, updatedTrip }) => {
  // updatedTrip object မှာ data ပါမပါ စစ်မယ်
  const hasChanges = updatedTrip && Object.keys(updatedTrip).length > 0;
  // display အတွက် key name တွေကို လှအောင်ပြောင်းတဲ့ helper function
  const formatKey = (key) => {
    // camelCase ကို space ပိုင်းပေးမယ် (ဥပမာ- 'kmTravelled' -> 'km Travelled')
    const formattedKey = key.replace(/([A-Z])/g, " $1").trim();
    return formattedKey.charAt(0).toUpperCase() + formattedKey.slice(1);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      sx={{
        "& .MuiDialog-paper": {
          borderRadius: 3,
          boxShadow: "0 8px 16px rgba(0, 0, 0, 0.2)",
          textAlign: "center",
          p: 2, // Padding
          maxWidth: "400px",
        },
      }}
    >
      {/* ပိတ်တဲ့ ခလုတ်လေးထည့်မယ် */}
      <IconButton
        aria-label="close"
        onClick={onClose}
        sx={{
          position: "absolute",
          right: 8,
          top: 8,
          color: (theme) => theme.palette.grey[500],
        }}
      >
        <CloseIcon />
      </IconButton>

      <DialogContent>
        {/* အစိမ်းရောင် icon လေးထည့်မယ် */}
        <Box
          sx={{
            color: "success.main",
            mb: 2,
          }}
        >
          <CheckCircleOutlineIcon sx={{ fontSize: 60 }} />
        </Box>

        {/* ခေါင်းစဉ်ကို ပိုကြီးအောင်လုပ်မယ် */}
        <Typography
          variant="h5"
          component="div"
          sx={{ mb: 1, fontWeight: "bold" }}
        >
          အောင်မြင်ပါသည်!
        </Typography>
{/* 
        <DialogContentText sx={{ color: "text.secondary" }}>
          {message}
        </DialogContentText> */}

        {/* ပြောင်းလဲမှုရှိမှသာ ဒီအပိုင်းကို ပြပါမယ် */}
        {hasChanges && (
          <Box
            sx={{
              textAlign: "left",
              p: 1,
              border: "1px solid #ddd",
              borderRadius: 2,
              marginTop: 2,
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 1 }}>
              ပြောင်းလဲလိုက်သော အချက်များ:
            </Typography>
            {/* updatedTrip ထဲက key/value တွေကို တစ်ခုချင်းစီ loop ပတ်ပြီး ပြသမယ် */}
            {Object.entries(updatedTrip).map(([key, value]) => (
              <Typography key={key} variant="body2">
                {formatKey(key)}: {value}
              </Typography>
            ))}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ justifyContent: "center", pb: 2 }}>
        <Button
          onClick={onClose}
          variant="contained"
          color="success"
          sx={{
            borderRadius: 2,
            px: 4,
            py: 1,
            textTransform: "none",
          }}
        >
          OK
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SuccessDialog;
