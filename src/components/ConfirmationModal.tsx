import { Modal, Box, Typography, Button, Stack } from "@mui/material";
import { FC } from "react";

interface ConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
}

export const ConfirmationModal: FC<ConfirmationModalProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  description,
}) => {
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
        <Typography id="confirmation-modal-description" sx={{ mt: 2 }}>
          {description}
        </Typography>
        <Stack
          direction="row"
          spacing={2}
          justifyContent="space-between"
          sx={{ mt: 3 }}
        >
          <Button variant="outlined" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="contained" color="error" onClick={onConfirm}>
            Confirm
          </Button>
        </Stack>
      </Box>
    </Modal>
  );
};
