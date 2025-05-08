import React, { useState } from "react";
import {
  Button,
  Box,
  CircularProgress,
  Alert,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  LinearProgress, // Added for better progress indication
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import FolderZipIcon from "@mui/icons-material/FolderZip";
import ErrorIcon from "@mui/icons-material/Error";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import {
  getFirestore,
  collection,
  getDocs,
  DocumentData,
  QuerySnapshot,
} from "firebase/firestore";
import { getApp } from "firebase/app";

interface FirestoreCollectionExporterProps {
  /**
   * An array of the names of the ROOT-LEVEL collections to export.
   * Subcollections within these documents will NOT be exported by this component.
   */
  collectionNames: string[];
  /**
   * Prefix for the downloaded filename. Timestamp will be appended.
   * Defaults to 'firestore-export'.
   */
  fileNamePrefix?: string;
}

interface ExportProgress {
  [collectionName: string]: "pending" | "loading" | "success" | "error";
}

const FirestoreCollectionExporter: React.FC<
  FirestoreCollectionExporterProps
> = ({ collectionNames, fileNamePrefix = "firestore-export" }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState<ExportProgress>({});
  const [overallProgress, setOverallProgress] = useState<number>(0); // 0 to 100

  // --- Helper Function to Trigger Download ---
  const downloadJsonFile = (data: any, filename: string): void => {
    try {
      // Use a structure that clearly separates collections
      const exportData = {
        exportedAt: new Date().toISOString(),
        collections: data, // data should be { collectionName: { docId: docData, ... }, ... }
      };

      const jsonString = JSON.stringify(exportData, null, 2); // Pretty print JSON
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link); // Required for Firefox
      link.click();

      // Clean up
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setSuccessMessage(`Successfully exported data to ${filename}`);
      setError(null); // Clear previous errors on success
    } catch (err) {
      console.error("Error creating or downloading file:", err);
      setError("Failed to create or download the export file.");
      setSuccessMessage(null);
    }
  };

  // --- Fetch Data for a Single Collection ---
  const fetchCollectionData = async (
    db: any,
    collectionName: string,
  ): Promise<{ [docId: string]: DocumentData }> => {
    const collectionRef = collection(db, collectionName);
    const querySnapshot: QuerySnapshot<DocumentData> =
      await getDocs(collectionRef);
    const collectionData: { [docId: string]: DocumentData } = {};
    querySnapshot.forEach((doc) => {
      // NOTE: This does NOT fetch subcollections within the document.
      collectionData[doc.id] = doc.data();
    });
    return collectionData;
  };

  // --- Main Export Handler ---
  const handleExportClick = async (): Promise<void> => {
    if (!collectionNames || collectionNames.length === 0) {
      setError("No collection names provided to export.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    setOverallProgress(0);

    // Initialize progress state
    const initialProgress = collectionNames.reduce((acc, name) => {
      acc[name] = "pending";
      return acc;
    }, {} as ExportProgress);
    setProgress(initialProgress);

    const exportedData: {
      [collectionName: string]: { [docId: string]: DocumentData };
    } = {};
    let collectionsProcessed = 0;

    try {
      const app = getApp(); // Ensure Firebase is initialized
      const db = getFirestore(app);

      console.log(
        `Starting Firestore export for collections: ${collectionNames.join(", ")}`,
      );

      for (const collectionName of collectionNames) {
        setProgress((prev) => ({ ...prev, [collectionName]: "loading" }));
        try {
          console.log(`Fetching collection: ${collectionName}...`);
          exportedData[collectionName] = await fetchCollectionData(
            db,
            collectionName,
          );
          setProgress((prev) => ({ ...prev, [collectionName]: "success" }));
          console.log(`Successfully fetched collection: ${collectionName}`);
        } catch (collectionError: any) {
          console.error(
            `Failed to fetch collection ${collectionName}:`,
            collectionError,
          );
          setProgress((prev) => ({ ...prev, [collectionName]: "error" }));
          // Decide if you want to stop the whole export on one collection error,
          // or continue and just skip the failed one. Here, we continue.
          // setError(`Failed to export collection '${collectionName}': ${collectionError.message}`); // Could set an error, but might be overridden by success later
        }
        collectionsProcessed++;
        setOverallProgress(
          Math.round((collectionsProcessed / collectionNames.length) * 100),
        );
      }

      // Check if at least some data was exported before downloading
      if (Object.keys(exportedData).length > 0) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = `${fileNamePrefix}-${timestamp}.json`;
        downloadJsonFile(exportedData, filename);
      } else if (!error) {
        // If no data AND no specific error was already set
        setError(
          "Export finished, but no data was found or exported successfully.",
        );
      }
    } catch (err: any) {
      console.error("Firestore data export failed:", err);
      setError(`Export failed: ${err.message || "An unknown error occurred."}`);
      // Mark all remaining pending/loading as error
      setProgress((prev) => {
        const updatedProgress = { ...prev };
        collectionNames.forEach((name) => {
          if (
            updatedProgress[name] === "pending" ||
            updatedProgress[name] === "loading"
          ) {
            updatedProgress[name] = "error";
          }
        });
        return updatedProgress;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getProgressIcon = (
    status: "pending" | "loading" | "success" | "error",
  ) => {
    switch (status) {
      case "loading":
        return <CircularProgress size={20} />;
      case "success":
        return <CheckCircleIcon color="success" />;
      case "error":
        return <ErrorIcon color="error" />;
      case "pending":
      default:
        return <FolderZipIcon color="disabled" />;
    }
  };

  return (
    <Box
      sx={{
        padding: 2,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
      }}
    >
      <Typography variant="h6" gutterBottom>
        Firestore Collection Exporter
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Export specified top-level Firestore collections as a JSON file.
        <br />
        <strong style={{ color: "orange" }}>Warning:</strong> This exports only
        the specified collections and their documents. Subcollections are{" "}
        <strong style={{ color: "red" }}>NOT</strong> exported. For full
        backups, use the gCloud console or CLI export feature. Client-side
        export can be slow and costly for large collections.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {successMessage &&
        !isLoading && ( // Don't show success during loading of next batch if any
          <Alert severity="success" sx={{ mb: 2 }}>
            {successMessage}
          </Alert>
        )}

      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2">Collections to Export:</Typography>
        {collectionNames.length > 0 ? (
          <List dense>
            {collectionNames.map((name) => (
              <ListItem key={name} disablePadding sx={{ pl: 1 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  {progress[name]
                    ? getProgressIcon(progress[name])
                    : getProgressIcon("pending")}
                </ListItemIcon>
                <ListItemText
                  primary={name}
                  secondary={
                    progress[name] === "error"
                      ? "Export failed"
                      : progress[name] === "success"
                        ? "Exported"
                        : ""
                  }
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography variant="body2" color="text.secondary">
            (No collections specified)
          </Typography>
        )}
      </Box>

      {isLoading && (
        <Box sx={{ width: "100%", mb: 2 }}>
          <LinearProgress variant="determinate" value={overallProgress} />
          <Typography variant="caption" display="block" textAlign="center">
            {overallProgress}% Complete
          </Typography>
        </Box>
      )}

      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleExportClick}
          disabled={isLoading || collectionNames.length === 0}
          startIcon={
            isLoading ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <DownloadIcon />
            )
          }
        >
          {isLoading ? "Exporting..." : "Export Selected Collections"}
        </Button>
      </Box>
    </Box>
  );
};

export default FirestoreCollectionExporter;
