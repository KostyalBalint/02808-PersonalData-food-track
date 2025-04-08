// src/components/FeatureFlagManager.tsx
import React, { useCallback, useEffect, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import DeleteIcon from "@mui/icons-material/Delete";
import { FeatureFlag, FeatureFlagData } from "./types/featureFlags.ts";
import { db } from "../../firebaseConfig.ts"; // Example for delete functionality

const FEATURE_FLAGS_COLLECTION = "featureFlags";

const FeatureFlagManager: React.FC = () => {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [newFlag, setNewFlag] = useState<
    Partial<FeatureFlagData & { key: string }>
  >({
    key: "",
    name: "",
    description: "",
    value: false,
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // --- Data Fetching ---
  useEffect(() => {
    setLoading(true);
    setError(null);

    const collectionRef = collection(db, FEATURE_FLAGS_COLLECTION);
    const unsubscribe = onSnapshot(
      collectionRef,
      (querySnapshot) => {
        const fetchedFlags: FeatureFlag[] = [];
        querySnapshot.forEach((doc) => {
          // Combine doc id (key) with document data
          fetchedFlags.push({
            key: doc.id,
            ...(doc.data() as FeatureFlagData),
          });
        });
        setFlags(fetchedFlags.sort((a, b) => a.name.localeCompare(b.name))); // Sort alphabetically
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching feature flags:", err);
        setError("Failed to load feature flags. Please try again later.");
        setLoading(false);
      },
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // --- Actions ---
  const handleToggleFlag = useCallback(
    async (key: string, currentValue: boolean) => {
      const flagRef = doc(db, FEATURE_FLAGS_COLLECTION, key);
      try {
        await updateDoc(flagRef, {
          value: !currentValue,
        });
        // State updates automatically via onSnapshot listener
      } catch (err) {
        console.error("Error toggling flag:", key, err);
        setError(`Failed to toggle flag "${key}".`);
        // Optionally revert UI optimistically if needed, though onSnapshot handles sync
      }
    },
    [],
  );

  const handleOpenDialog = () => {
    setNewFlag({ key: "", name: "", description: "", value: false }); // Reset form
    setFormError(null);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    if (isSubmitting) return; // Prevent closing while submitting
    setDialogOpen(false);
  };

  const handleNewFlagChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type, checked } = event.target as HTMLInputElement;
    setNewFlag((prev: any) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Validate Key: only alphanumeric and hyphens/underscores allowed
  const isValidKey = (key: string | undefined): boolean => {
    return !!key && /^[a-zA-Z0-9-_]+$/.test(key);
  };

  const handleCreateFlag = async () => {
    if (!newFlag.key || !newFlag.name || !newFlag.description) {
      setFormError("All fields (Key, Name, Description) are required.");
      return;
    }
    if (!isValidKey(newFlag.key)) {
      setFormError(
        "Key can only contain letters, numbers, hyphens (-), and underscores (_).",
      );
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    const flagRef = doc(db, FEATURE_FLAGS_COLLECTION, newFlag.key);

    try {
      // Check if key already exists (Firestore docs are unique by ID, but good practice)
      const existingFlagsQuery = query(
        collection(db, FEATURE_FLAGS_COLLECTION),
        where("__name__", "==", newFlag.key),
      );
      const existingDocs = await getDocs(existingFlagsQuery);

      if (!existingDocs.empty) {
        setFormError(
          `Flag key "${newFlag.key}" already exists. Please choose a unique key.`,
        );
        setIsSubmitting(false);
        return;
      }

      const flagData: FeatureFlagData = {
        name: newFlag.name,
        description: newFlag.description,
        value: newFlag.value || false, // Ensure boolean value
      };

      // Use setDoc to create document with specific ID (the key)
      await setDoc(flagRef, flagData);

      // Important: Remind user to update FeatureFlagKeys.ts
      console.warn(
        `Feature flag "${newFlag.key}" created. Remember to add "${newFlag.key}" to the FeatureFlagKeys type in src/types/FeatureFlagKeys.ts for strong typing in FeatureFlagGuard!`,
      );
      alert(
        `Feature flag "${newFlag.key}" created successfully! \n\nIMPORTANT: Add "${newFlag.key}" to the FeatureFlagKeys type definition in your project (src/types/FeatureFlagKeys.ts) to use it with the FeatureFlagGuard component.`,
      );

      handleCloseDialog();
    } catch (err) {
      console.error("Error creating flag:", err);
      setFormError("Failed to create flag. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Optional Delete Functionality
  const handleDeleteFlag = async (key: string, name: string) => {
    if (
      window.confirm(
        `Are you sure you want to delete the flag "${name}" (${key})? This action cannot be undone.`,
      )
    ) {
      const flagRef = doc(db, FEATURE_FLAGS_COLLECTION, key);
      try {
        await deleteDoc(flagRef);
        // Remind user to update type definition
        console.warn(
          `Feature flag "${key}" deleted. Remember to remove it from the FeatureFlagKeys type in src/types/FeatureFlagKeys.ts.`,
        );
        alert(
          `Flag "${name}" deleted. Remember to remove "${key}" from the FeatureFlagKeys type definition.`,
        );
        // State updates via onSnapshot
      } catch (err) {
        console.error("Error deleting flag:", key, err);
        setError(`Failed to delete flag "${name}".`);
      }
    }
  };

  // --- Rendering ---
  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h4" component="h1">
          Feature Flag Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddCircleOutlineIcon />}
          onClick={handleOpenDialog}
        >
          Create Flag
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", my: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }} aria-label="feature flags table">
            <TableHead>
              <TableRow sx={{ "& th": { fontWeight: "bold" } }}>
                <TableCell>Status</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Key</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {flags.length === 0 && !loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No feature flags found. Create one!
                  </TableCell>
                </TableRow>
              ) : (
                flags.map((flag) => (
                  <TableRow
                    key={flag.key}
                    sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                  >
                    <TableCell component="th" scope="row">
                      <Switch
                        checked={flag.value}
                        onChange={() => handleToggleFlag(flag.key, flag.value)}
                        inputProps={{ "aria-label": `toggle ${flag.name}` }}
                        color="primary"
                      />
                    </TableCell>
                    <TableCell>{flag.name}</TableCell>
                    <TableCell>
                      <code>{flag.key}</code>
                    </TableCell>
                    <TableCell>{flag.description}</TableCell>
                    <TableCell align="right">
                      {/* Add other actions like edit or delete here */}
                      <Tooltip title="Delete Flag">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteFlag(flag.key, flag.name)}
                          aria-label={`delete flag ${flag.name}`}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create Flag Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Feature Flag</DialogTitle>
        <DialogContent>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <TextField
            autoFocus
            margin="dense"
            id="key"
            name="key"
            label="Key (unique identifier, e.g., new-feature-x)"
            type="text"
            fullWidth
            variant="outlined"
            value={newFlag.key || ""}
            onChange={handleNewFlagChange}
            disabled={isSubmitting}
            helperText="Use letters, numbers, hyphens, underscores only."
            error={!!newFlag.key && !isValidKey(newFlag.key)} // Show error if invalid format
          />
          <TextField
            margin="dense"
            id="name"
            name="name"
            label="Name (user-friendly)"
            type="text"
            fullWidth
            variant="outlined"
            value={newFlag.name || ""}
            onChange={handleNewFlagChange}
            disabled={isSubmitting}
          />
          <TextField
            margin="dense"
            id="description"
            name="description"
            label="Description"
            type="text"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={newFlag.description || ""}
            onChange={handleNewFlagChange}
            disabled={isSubmitting}
          />
          <Box sx={{ mt: 2 }}>
            <Typography
              component="label"
              htmlFor="initial-value-switch"
              sx={{ mr: 1 }}
            >
              Initial Value:
            </Typography>
            <Switch
              id="initial-value-switch"
              name="value"
              checked={newFlag.value || false}
              onChange={handleNewFlagChange}
              disabled={isSubmitting}
            />
            <span>{newFlag.value ? "Enabled" : "Disabled"}</span>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateFlag}
            variant="contained"
            disabled={
              isSubmitting ||
              !isValidKey(newFlag.key) ||
              !newFlag.name ||
              !newFlag.description
            }
          >
            {isSubmitting ? <CircularProgress size={24} /> : "Create Flag"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FeatureFlagManager;
