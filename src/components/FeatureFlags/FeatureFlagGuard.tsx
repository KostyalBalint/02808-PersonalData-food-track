// src/components/FeatureFlagGuard.tsx
import React, { useState, useEffect, ReactNode } from "react";
import {
  doc,
  onSnapshot,
  DocumentSnapshot,
  DocumentReference,
} from "firebase/firestore";
import { Box, Tooltip } from "@mui/material";
import { FeatureFlagKeys } from "./types/featureFlagKeys.ts";
import { db } from "../../firebaseConfig.ts";
import { FeatureFlagData } from "./types/featureFlags.ts"; // Import Box for styling and Tooltip

const FEATURE_FLAGS_COLLECTION = "featureFlags";

interface FeatureFlagGuardProps {
  /** The specific feature flag key to check (must be defined in FeatureFlagKeys type) */
  flagKey?: FeatureFlagKeys;
  /** Content to render if the feature flag is enabled (or in dev mode) */
  children: ReactNode;
  /** Optional: Rendered while the flag value is loading (in production) */
  fallback?: ReactNode;
}

const FeatureFlagGuard: React.FC<FeatureFlagGuardProps> = ({
  flagKey,
  children,
  fallback = null,
}) => {
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Determine if running in development mode using Vite's import.meta.env
  // import.meta.env.DEV is true during `vite dev`, false after `vite build`
  const isDevelopment = import.meta.env.DEV;

  useEffect(() => {
    // --- Development Mode (import.meta.env.DEV is true) ---
    if (isDevelopment) {
      setIsLoading(false); // Not loading flag status for rendering decision
      setIsAllowed(true); // Assume allowed for dev rendering
      setError(null);
      return; // Skip Firestore subscription in dev
    }

    // --- Production Mode (import.meta.env.DEV is false) ---
    setIsLoading(true);
    setError(null);
    setIsAllowed(null);

    if (!flagKey) {
      console.warn("FeatureFlagGuard: No flagKey provided.");
      setError("No flag key specified.");
      setIsLoading(false);
      setIsAllowed(false);
      return;
    }

    const flagRef = doc(
      db,
      FEATURE_FLAGS_COLLECTION,
      flagKey,
    ) as DocumentReference<FeatureFlagData>;

    const unsubscribe = onSnapshot(
      flagRef,
      (docSnap: DocumentSnapshot<FeatureFlagData>) => {
        if (docSnap.exists()) {
          const flagData = docSnap.data();
          setIsAllowed(!!flagData?.value);
        } else {
          console.warn(
            `FeatureFlagGuard: Flag key "${flagKey}" not found in Firestore.`,
          );
          setIsAllowed(false);
        }
        setIsLoading(false);
      },
      (err) => {
        console.error(`Error fetching feature flag "${flagKey}":`, err);
        setError(`Failed to load flag "${flagKey}".`);
        setIsLoading(false);
        setIsAllowed(false);
      },
    );

    return () => unsubscribe();
    // Re-run effect if flagKey changes or if the mode somehow changes (unlikely during runtime)
  }, [flagKey, isDevelopment]);

  if (!flagKey) {
    return children;
  }

  // --- Development Rendering ---
  if (isDevelopment) {
    // Always render children, wrapped in a styled Box with a Tooltip
    return (
      <Tooltip
        title={`Dev Only: Feature Flag "${flagKey}" (Content always shown via import.meta.env.DEV)`}
        arrow
      >
        <Box
          sx={{
            border: "2px dashed red",
            padding: "4px",
            margin: "2px 0",
            backgroundColor: "rgba(255, 0, 0, 0.05)",
            // Consider 'display: inline-block' or 'display: contents' if block layout is disruptive
            // display: 'inline-block',
          }}
        >
          {children}
        </Box>
      </Tooltip>
    );
  }

  // --- Production Rendering (Original Logic) ---
  if (isLoading) {
    return <>{fallback}</>;
  }

  if (error) {
    console.error(`FeatureFlagGuard Error for key "${flagKey}": ${error}`);
    return null; // Or render an error indicator
  }

  // Render children only if the flag is explicitly true in production
  return isAllowed === true ? <>{children}</> : null;
};

export default FeatureFlagGuard;
