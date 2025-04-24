import { FC, JSX } from "react";
import { IconType } from "react-icons";
import { CameraPage } from "./CameraPage/CameraPage.tsx";
import { MealListPage } from "./MealListPage/MealListPage.tsx";
import {
  IoAnalyticsOutline,
  IoCameraOutline,
  IoHomeOutline,
  IoImagesOutline,
  IoSettingsOutline,
} from "react-icons/io5";
import { HomePage } from "./HomePage.tsx";
import { Settings } from "./Settings/Settings.tsx";
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
    roles: ["ADMIN", "SUBJECT", "CONTROLL"],
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
  },
  {
    name: "Settings",
    path: "/settings",
    component: Settings,
    icon: IoSettingsOutline,
    roles: ["ADMIN", "CONTROLL", "SUBJECT"],
  },
];
