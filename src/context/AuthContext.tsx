// src/context/AuthContext.tsx
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Role } from "../pages/pages.ts";
import { auth, db } from "../firebaseConfig.ts";

interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: Role;
  // Add other profile fields as needed
}

interface AuthContextProps {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean; // Convenience flag
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

  const value = {
    currentUser,
    userProfile,
    loading,
    isAdmin,
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
