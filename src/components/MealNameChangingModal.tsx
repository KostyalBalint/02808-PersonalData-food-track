import {
  Modal,
  Box,
  Typography,
  Button,
  Stack,
  TextField,
} from "@mui/material";
import { FC, useState } from "react";

interface MealNameChangingModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (name: string) => void;
  title: string;
  originalMealName: string;
}

export const MealNameChangingModal: FC<MealNameChangingModalProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  originalMealName,
}) => {
  const [mealName, setMealName] = useState(originalMealName); // Track name

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMealName(e.target.value);
  };

  const handleConfirm = () => {
    onConfirm(mealName); // Send it back
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
        <Typography id="confirmation-modal-title" variant="h6" component="h2">
          {title}
        </Typography>
        <TextField
          onChange={handleChange}
          id="standard-basic"
          variant="standard"
          defaultValue={originalMealName}
        />
        <Stack
          direction="row"
          spacing={2}
          justifyContent="space-between"
          sx={{ mt: 3 }}
        >
          <Button variant="outlined" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="contained" color="info" onClick={handleConfirm}>
            Confirm
          </Button>
        </Stack>
      </Box>
    </Modal>
  );
};
