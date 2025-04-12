// src/context/AuthContext.tsx
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Role } from "../pages/pages.ts"; // Assuming Role enum/type exists
import { auth, db } from "../firebaseConfig.ts";
import {
  DqqDemographics,
  initialDemographicsState,
} from "../components/DqqCalculator/dqqQuestions.ts";
import { useNavigate } from "react-router-dom";

export interface AimedFoodGroup {
  min?: number;
  max?: number;
}

export interface UserNutritionSettings {
  protein?: AimedFoodGroup;
  carbohydrates?: AimedFoodGroup;
  fruits?: AimedFoodGroup;
  vegetables?: AimedFoodGroup;
  dairy: AimedFoodGroup;
  fats?: AimedFoodGroup;
  sweets?: AimedFoodGroup;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: Role;
  demographics?: DqqDemographics;
  nutritionSettings?: UserNutritionSettings;
  // Add other profile fields as needed
}

interface AuthContextProps {
  /** The *effective* user profile being displayed (could be impersonated user) */
  userProfile: UserProfile | null;
  /** The actual Firebase user object logged in (always the admin if impersonating) */
  currentUser: FirebaseUser | null;
  /** The profile of the *actual* logged-in user (always the admin if impersonating) */
  actualUserProfile: UserProfile | null;
  loading: boolean;
  /** Is the *actual* logged-in user an admin? */
  isAdmin: boolean;
  /** Is an impersonation session active? */
  isImpersonating: boolean;
  /** Convenience flag for the *effective* user's demographics */
  demographicsComplete: boolean;
  /** Refetches the profile of the *effective* user */
  reFetchUserProfile: () => Promise<void>;
  /** Starts impersonating the user with the given UID (Admin only) */
  startImpersonation: (targetUid: string) => Promise<void>;
  /** Stops the current impersonation session */
  stopImpersonation: () => void;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  // State for the actual logged-in user
  const [actualUser, setActualUser] = useState<FirebaseUser | null>(null);
  const [actualUserProfile, setActualUserProfile] =
    useState<UserProfile | null>(null);

  // State for impersonation
  const [impersonatedUserUid, setImpersonatedUserUid] = useState<string | null>(
    null,
  );
  const [impersonatedUserProfile, setImpersonatedUserProfile] =
    useState<UserProfile | null>(null);

  // Loading states
  const [authLoading, setAuthLoading] = useState(true); // Initial auth check
  const [profileLoading, setProfileLoading] = useState(false); // Profile fetching
  const [impersonationLoading, setImpersonationLoading] = useState(false); // Impersonation fetch

  const navigate = useNavigate();

  // --- Fetch User Profile Logic ---
  const fetchUserProfile = useCallback(
    async (uid: string): Promise<UserProfile | null> => {
      console.log(`Fetching profile for UID: ${uid}`);
      const userRef = doc(db, "users", uid);
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) {
        return docSnap.data() as UserProfile;
      } else {
        console.warn(`User profile not found in Firestore for UID: ${uid}`);
        return null; // Indicate profile not found
      }
    },
    [],
  );

  // --- Effect for Auth State Changes ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("Auth state changed:", user?.uid);
      setActualUser(user);
      // Reset impersonation whenever the actual user changes/logs out
      setImpersonatedUserUid(null);
      setImpersonatedUserProfile(null);
      setActualUserProfile(null); // Clear previous actual profile

      if (user) {
        setProfileLoading(true);
        try {
          let profile = await fetchUserProfile(user.uid);

          if (!profile) {
            // User exists in Auth, but not Firestore? Create profile.
            console.log("Creating Firestore profile for new user:", user.uid);
            const newUserProfile: UserProfile = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              role: "SUBJECT", // Assign default role
            };
            await setDoc(doc(db, "users", user.uid), newUserProfile);
            profile = newUserProfile; // Use the newly created profile
          }
          setActualUserProfile(profile);
        } catch (error) {
          console.error("Error fetching/creating user profile:", error);
          // Handle error appropriately (e.g., logout user, show error message)
          setActualUserProfile(null); // Ensure profile is null on error
        } finally {
          setProfileLoading(false);
        }
      } else {
        // User is signed out
        setActualUserProfile(null);
      }
      setAuthLoading(false); // Initial auth check complete
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [fetchUserProfile]); // Add fetchUserProfile as dependency

  // --- Impersonation Functions ---
  const startImpersonation = useCallback(
    async (targetUid: string) => {
      // Security Check: Only admins can impersonate
      if (actualUserProfile?.role !== "ADMIN") {
        console.error("Permission denied: Only admins can impersonate.");
        return;
      }
      if (actualUser?.uid === targetUid) {
        console.warn("Admin cannot impersonate themselves.");
        return; // Or stop impersonation if already impersonating someone else
      }

      console.log(
        `Admin ${actualUser?.uid} attempting to impersonate ${targetUid}`,
      );
      setImpersonationLoading(true);
      setImpersonatedUserProfile(null); // Clear previous impersonation first

      try {
        const targetProfile = await fetchUserProfile(targetUid);
        if (targetProfile) {
          // Prevent admin impersonating another admin (optional, based on requirements)
          // if (targetProfile.role === 'ADMIN') {
          //   console.error("Admins cannot impersonate other admins.");
          //   setImpersonationLoading(false);
          //   return;
          // }
          setImpersonatedUserUid(targetUid);
          setImpersonatedUserProfile(targetProfile);
          console.log(`Successfully started impersonating ${targetUid}`);
        } else {
          // Handle case where target user doesn't exist
          console.error(
            `Impersonation failed: User profile ${targetUid} not found.`,
          );
          setImpersonatedUserUid(null); // Ensure state is reset
        }
      } catch (error) {
        console.error("Error fetching impersonated user profile:", error);
        setImpersonatedUserUid(null); // Ensure state is reset
      } finally {
        setImpersonationLoading(false);
      }
    },
    [actualUser, actualUserProfile, fetchUserProfile],
  );

  const stopImpersonation = useCallback(() => {
    console.log(`Admin ${actualUser?.uid} stopping impersonation.`);
    setImpersonatedUserUid(null);
    setImpersonatedUserProfile(null);
    navigate("/settings");
  }, [actualUser]);

  // --- Derived State ---

  // The *effective* user profile (either the actual user or the impersonated one)
  const effectiveUserProfile = useMemo(() => {
    return impersonatedUserUid ? impersonatedUserProfile : actualUserProfile;
  }, [impersonatedUserUid, impersonatedUserProfile, actualUserProfile]);

  // The *effective* currentUser (usually the same as actualUser, but conceptually helps)
  // In this setup, components should rely more on `effectiveUserProfile`
  const effectiveCurrentUser = useMemo(() => {
    // For most purposes, the actualUser (FirebaseUser) is sufficient,
    // as permissions checks etc., often rely on the profile.
    // If direct FirebaseUser properties of the impersonated user were needed,
    // this would require a more complex setup (e.g., custom tokens).
    return actualUser;
  }, [actualUser]);

  const isAdmin = useMemo(
    () => actualUserProfile?.role === "ADMIN",
    [actualUserProfile],
  );
  const isImpersonating = useMemo(
    () => impersonatedUserUid !== null,
    [impersonatedUserUid],
  );

  const currentDemographics = useMemo(
    () => effectiveUserProfile?.demographics ?? initialDemographicsState,
    [effectiveUserProfile],
  );

  const demographicsComplete = useMemo(() => {
    // Check if demographics object exists and has the required fields non-null/defined
    return (
      currentDemographics?.Age !== null &&
      currentDemographics?.Age !== undefined &&
      !isNaN(Number(currentDemographics?.Age)) &&
      currentDemographics?.Gender !== null &&
      currentDemographics?.Gender !== undefined
    );
  }, [currentDemographics]);

  // --- Function to Refetch the *Effective* User's Profile ---
  const reFetchUserProfile = useCallback(async () => {
    const uidToFetch = impersonatedUserUid ?? actualUser?.uid;
    if (!uidToFetch) {
      console.log(
        "Cannot refetch profile: No user logged in or being impersonated.",
      );
      return;
    }

    console.log(`Re-fetching profile for effective UID: ${uidToFetch}...`);
    setProfileLoading(true); // Use general profile loading indicator
    try {
      const profile = await fetchUserProfile(uidToFetch);
      if (profile) {
        if (isImpersonating) {
          setImpersonatedUserProfile(profile);
        } else {
          setActualUserProfile(profile);
        }
      } else {
        // Handle profile not found during refetch
        console.error(`Refetch failed: Profile not found for ${uidToFetch}`);
        if (isImpersonating) {
          stopImpersonation(); // Stop impersonation if target user disappears
        } else {
          setActualUserProfile(null); // Clear actual profile if it disappears
          // Optionally sign out the user here if their profile is gone
          // await auth.signOut();
        }
      }
    } catch (error) {
      console.error("Error re-fetching user profile:", error);
    } finally {
      setProfileLoading(false);
    }
  }, [
    impersonatedUserUid,
    actualUser?.uid,
    fetchUserProfile,
    isImpersonating,
    stopImpersonation,
  ]);

  // --- Overall Loading State ---
  const loading = useMemo(
    () => authLoading || profileLoading || impersonationLoading,
    [authLoading, profileLoading, impersonationLoading],
  );

  // --- Context Value ---
  const value = useMemo(
    () => ({
      currentUser: effectiveCurrentUser, // Provide the actual Firebase user
      userProfile: effectiveUserProfile, // Provide the effective profile (admin's or impersonated)
      actualUserProfile: actualUserProfile, // Provide admin's own profile always
      loading,
      isAdmin, // Based on the actual user
      isImpersonating,
      demographicsComplete, // Based on the effective profile
      reFetchUserProfile,
      startImpersonation,
      stopImpersonation,
    }),
    [
      effectiveCurrentUser,
      effectiveUserProfile,
      actualUserProfile,
      loading,
      isAdmin,
      isImpersonating,
      demographicsComplete,
      reFetchUserProfile,
      startImpersonation,
      stopImpersonation,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {/* Render children only when initial auth check is done */}
      {!authLoading && children}
    </AuthContext.Provider>
  );
};

// --- Hook to use Auth Context ---
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
