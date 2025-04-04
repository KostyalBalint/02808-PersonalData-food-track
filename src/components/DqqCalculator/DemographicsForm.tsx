// src/components/DqqCalculator/DemographicsForm.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  Grid,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from "@mui/material";
import { db } from "../../firebaseConfig"; // Adjust path
import {
  doc,
  DocumentReference,
  DocumentSnapshot,
  FirestoreError,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { debounce } from "../../utils/debounce"; // Adjust path
import { DqqDemographics, initialDemographicsState } from "./dqqQuestions";
import { useAuth, UserProfile } from "../../context/AuthContext.tsx";

interface DemographicsFormProps {
  // Optional callbacks for external feedback if needed
  onSaveStatusChange?: (isSaving: boolean) => void;
  onError?: (error: string | null) => void;
}

export function DemographicsForm({
  onSaveStatusChange,
  onError,
}: DemographicsFormProps) {
  // --- State ---
  // Local form state (strings for controlled inputs)
  const [localAge, setLocalAge] = useState<string>("");
  const [localGender, setLocalGender] = useState<"0" | "1" | null>(null);
  // State derived from Firestore
  const [dbDemographics, setDbDemographics] = useState<
    Partial<DqqDemographics>
  >(initialDemographicsState);
  // Component status state
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { userProfile, reFetchUserProfile } = useAuth();

  const userDocRef = useMemo(
    () =>
      doc(
        db,
        "users",
        userProfile?.uid ?? "no-user",
      ) as DocumentReference<UserProfile>,
    [userProfile?.uid],
  );

  // --- Firestore Listener ---
  useEffect(() => {
    if (!userProfile) {
      setError("No User ID provided.");
      setIsLoading(false);
      setDbDemographics(initialDemographicsState);
      setLocalAge("");
      setLocalGender(null);
      return;
    }

    setIsLoading(true);
    setError(null); // Clear previous errors

    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnap: DocumentSnapshot<UserProfile>) => {
        const data = docSnap.data();
        const fetchedDemographics =
          data?.demographics ?? initialDemographicsState;
        setDbDemographics(fetchedDemographics);

        // Update local form state only if it differs from the just-fetched DB state
        // to avoid overwriting user input during debounced save
        const dbAgeString =
          fetchedDemographics.Age === null
            ? ""
            : String(fetchedDemographics.Age);
        const dbGenderString =
          fetchedDemographics.Gender === null
            ? null
            : (String(fetchedDemographics.Gender) as "0" | "1");

        setLocalAge((prev) =>
          prev !== dbAgeString && !isSaving ? dbAgeString : prev,
        );
        setLocalGender((prev) =>
          prev !== dbGenderString && !isSaving ? dbGenderString : prev,
        );

        setIsLoading(false);
        console.log(
          "DemographicsForm: Data updated from Firestore",
          fetchedDemographics,
        );
        reFetchUserProfile();
      },
      (err: FirestoreError) => {
        console.error("DemographicsForm: Error fetching data:", err);
        setError(`Failed to load demographics: ${err.message}.`);
        onError?.(`Failed to load demographics: ${err.message}.`);
        setIsLoading(false);
      },
    );

    return () => unsubscribe();
  }, [userProfile?.uid, userDocRef, isSaving, onError]); // Rerun if userId, changes, exclude isSaving? careful interaction

  // --- Debounced Save Function ---
  const debouncedSaveDemographics = useCallback(
    debounce(async (ageToSave: number | null, genderToSave: 0 | 1 | null) => {
      if (!userProfile?.uid) return;

      // Prevent saving if data hasn't actually changed from DB version
      if (
        ageToSave === dbDemographics.Age &&
        genderToSave === dbDemographics.Gender
      ) {
        console.log("DemographicsForm: Save skipped, no change detected.");
        return;
      }

      setIsSaving(true);
      onSaveStatusChange?.(true);
      setError(null); // Clear previous errors on new save attempt
      onError?.(null);
      console.log("DemographicsForm: Saving...", {
        Age: ageToSave,
        Gender: genderToSave,
      });

      try {
        const updatePayload: { [key: string]: any } = {
          "demographics.Age": ageToSave,
          "demographics.Gender": genderToSave,
        };
        await updateDoc(userDocRef, updatePayload);
        console.log("DemographicsForm: Save successful.");
      } catch (err) {
        console.error("DemographicsForm: Error saving data:", err);
        const firestoreError = err as FirestoreError;
        const errorMsg = `Failed to save demographics: ${firestoreError.message}.`;
        setError(errorMsg);
        onError?.(errorMsg);
      } finally {
        setIsSaving(false);
        onSaveStatusChange?.(false);
      }
    }, 1500), // 1.5 second debounce
    [userProfile?.uid, userDocRef, dbDemographics, onSaveStatusChange, onError], // Include dbDemographics to compare changes
  );

  // --- Input Handlers ---
  const handleAgeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (value === "" || /^\d+$/.test(value)) {
      setLocalAge(value); // Update local state immediately
      const ageNum = value === "" ? null : parseInt(value, 10);
      const genderNum =
        localGender === null ? null : (parseInt(localGender, 10) as 0 | 1);
      // Trigger debounced save with the new age value
      if (!isNaN(ageNum as number) || ageNum === null) {
        debouncedSaveDemographics(ageNum, genderNum);
      }
    }
  };

  const handleGenderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value as "0" | "1";
    setLocalGender(value); // Update local state immediately
    const ageNum = localAge === "" ? null : parseInt(localAge, 10);
    const genderNum = value === null ? null : (parseInt(value, 10) as 0 | 1);
    // Trigger debounced save with the new gender value
    if (!isNaN(ageNum as number) || ageNum === null) {
      debouncedSaveDemographics(ageNum, genderNum);
    }
  };

  // --- Render Logic ---
  if (isLoading) {
    return (
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "150px",
          }}
        >
          <CircularProgress size={24} sx={{ mr: 1 }} />
          <Typography color="textSecondary">Loading Demographics...</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 1,
        }}
      >
        <Typography variant="h6" component="h2">
          Participant Demographics
        </Typography>
        {isSaving && <CircularProgress size={20} />}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Grid container spacing={2}>
        <Grid
          size={{
            xs: 6,
          }}
        >
          <TextField
            fullWidth
            label="Age (years)"
            name="Age"
            type="text"
            inputMode="numeric"
            value={localAge}
            onChange={handleAgeChange}
            variant="outlined"
            size="small"
            required
            disabled={isSaving}
          />
        </Grid>
        <Grid
          size={{
            xs: 6,
          }}
        >
          <FormControl
            component="fieldset"
            size="small"
            required
            disabled={isSaving}
          >
            <FormLabel component="legend">Gender</FormLabel>
            <RadioGroup
              row
              name="Gender"
              value={localGender ?? ""}
              onChange={handleGenderChange}
            >
              <FormControlLabel
                value="1"
                control={<Radio size="small" />}
                label="Female"
              />
              <FormControlLabel
                value="0"
                control={<Radio size="small" />}
                label="Male"
              />
            </RadioGroup>
            {!localGender && <FormHelperText error>Required</FormHelperText>}{" "}
            {/* Indicate required */}
          </FormControl>
        </Grid>
      </Grid>
    </>
  );
}
