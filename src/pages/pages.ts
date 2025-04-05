import { FC, JSX } from "react";
import { IconType } from "react-icons";
import { CameraPage } from "./CameraPage/CameraPage.tsx";
import { MealListPage } from "./MealListPage/MealListPage.tsx";
import {
  IoCameraOutline,
  IoHomeOutline,
  IoImagesOutline,
  IoPeopleOutline,
  IoSettingsOutline,
  IoAnalyticsOutline,
} from "react-icons/io5";
import { SettingsPage } from "./Admin/Settings.tsx";
import { HomePage } from "./HomePage.tsx";
import AdminPage from "./Admin/AdminPage.tsx";
import { UserSettings } from "./UserSettings.tsx";
import { AnalyzePage } from "./Analyze/AnalyzePage.tsx";
import { FeatureFlagKeys } from "../components/FeatureFlags/types/featureFlagKeys.ts";

export type Role = "ADMIN" | "CONTROLL" | "SUBJECT";

// src/types/navigation.ts

export interface Page {
  name: string;
  path: string;
  component: (() => JSX.Element) | FC;
  icon: IconType;
  roles?: Role[]; // Add roles array - Optional: if undefined, maybe accessible by all logged-in users? Or specify explicitly.
  featureFlag?: FeatureFlagKeys; // Optional feature flag for conditional rendering
}

export const pages: Page[] = [
  {
    name: "Home",
    path: "/",
    component: HomePage,
    icon: IoHomeOutline,
    roles: ["ADMIN", "CONTROLL", "SUBJECT"], // Accessible by all roles
  },
  {
    name: "Camera",
    path: "/camera",
    component: CameraPage,
    icon: IoCameraOutline,
    roles: ["ADMIN", "CONTROLL", "SUBJECT"],
  },
  {
    name: "Meals",
    path: "/meals",
    component: MealListPage,
    icon: IoImagesOutline,
    roles: ["ADMIN", "CONTROLL", "SUBJECT"],
  },
  {
    name: "Meal Analysis",
    path: "/analyze",
    component: AnalyzePage,
    icon: IoAnalyticsOutline,
    roles: ["ADMIN", "SUBJECT"],
    featureFlag: "meal-analysis", // Example feature flag
  },
  {
    name: "Settings",
    path: "/settings",
    component: UserSettings,
    icon: IoSettingsOutline,
    roles: ["ADMIN", "CONTROLL", "SUBJECT"],
  },
  {
    name: "Admin Settings",
    path: "/admin/settings",
    component: SettingsPage,
    icon: IoSettingsOutline,
    roles: ["ADMIN"],
  },
  {
    name: "User management",
    path: "/admin/users",
    component: AdminPage,
    icon: IoPeopleOutline,
    roles: ["ADMIN"], // Only ADMIN
  },
];
