import { Modal, Box, Button, Stack } from "@mui/material";
import { FC, useState } from "react";
import { DateTimePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { Dayjs } from "dayjs";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
interface MealDatePickerModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (name: Dayjs) => void;
  originalDate: Dayjs;
}

export const DatePickerModal: FC<MealDatePickerModalProps> = ({
  open,
  onClose,
  onConfirm,
  originalDate,
}) => {
  const [date, setDate] = useState<Dayjs>(originalDate);

  const handleConfirm = () => {
    onConfirm(date); // Send it back
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="confirmation-modal-title"
      aria-describedby="confirmation-modal-description"
    >
      <Box
        sx={{
          p: 3,
          bgcolor: "background.paper",
          boxShadow: 24,
          mx: "auto",
          my: "10%",
          maxWidth: 400,
        }}
      >
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DateTimePicker
            label="Change meal date"
            defaultValue={originalDate}
            value={date}
            onChange={(newDate) => newDate && setDate(newDate)}
          />
        </LocalizationProvider>
        <Stack
          direction="row"
          spacing={2}
          justifyContent="space-between"
          sx={{ mt: 3 }}
        >
          <Button variant="outlined" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="info"
            onClick={() => {
              handleConfirm();
              onClose();
            }}
          >
            Confirm
          </Button>
        </Stack>
      </Box>
    </Modal>
  );
};
