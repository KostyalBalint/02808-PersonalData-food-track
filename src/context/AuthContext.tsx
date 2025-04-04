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
import { Role } from "../pages/pages.ts";
import { auth, db } from "../firebaseConfig.ts";
import {
  DqqDemographics,
  initialDemographicsState,
} from "../components/DqqCalculator/dqqQuestions.ts";

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: Role;
  demographics?: DqqDemographics;
  // Add other profile fields as needed
}

interface AuthContextProps {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean; // Convenience flag
  demographicsComplete: boolean;
  reFetchUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // User is signed in, get their profile from Firestore
        const userRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userRef);

        if (docSnap.exists()) {
          setUserProfile(docSnap.data() as UserProfile);
        } else {
          // User exists in Auth, but not Firestore? Create profile.
          console.log("Creating Firestore profile for new user:", user.uid);
          const newUserProfile: UserProfile = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            role: "SUBJECT", // Assign default role
            // createdAt: serverTimestamp() // Requires importing serverTimestamp
          };
          try {
            await setDoc(userRef, newUserProfile);
            setUserProfile(newUserProfile);
          } catch (error) {
            console.error("Error creating user profile:", error);
            // Handle error appropriately
          }
        }
      } else {
        // User is signed out
        setUserProfile(null);
      }
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const isAdmin = userProfile?.role === "ADMIN";

  const currentDemographics =
    userProfile?.demographics ?? initialDemographicsState;

  const demographicsComplete = useMemo(() => {
    return (
      currentDemographics?.Age !== null &&
      currentDemographics?.Age !== undefined &&
      !isNaN(Number(currentDemographics?.Age)) &&
      currentDemographics?.Gender !== null &&
      currentDemographics?.Gender !== undefined
    );
  }, [currentDemographics]);

  const reFetchUserProfile = useCallback(async () => {
    console.log("Re-fetching user profile from Firestore...");
    if (currentUser) {
      const userRef = doc(db, "users", currentUser.uid);
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) {
        setUserProfile(docSnap.data() as UserProfile);
      } else {
        console.error("User profile not found in Firestore.");
      }
    }
  }, []);

  const value = {
    currentUser,
    userProfile,
    loading,
    isAdmin,
    demographicsComplete,
    reFetchUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
