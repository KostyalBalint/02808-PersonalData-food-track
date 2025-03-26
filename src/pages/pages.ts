import { FC, JSX } from "react";
import { HomePage } from "./HomePage.tsx";
import { IconType } from "react-icons";
import { CameraPage } from "./CameraPage.tsx";
import { MealListPage } from "./GalleryPage/MealListPage.tsx";
import {
  IoCameraOutline,
  IoHomeOutline,
  IoImagesOutline,
  IoSettingsOutline,
} from "react-icons/io5";
import { SettingsPage } from "./Settings.tsx";

interface Page {
  name: string;
  path: string;
  component: (() => JSX.Element) | FC;
  icon: IconType;
}

export const pages: Page[] = [
  {
    name: "Home",
    path: "/",
    component: HomePage,
    icon: IoHomeOutline,
  },
  {
    name: "Camera",
    path: "/camera",
    component: CameraPage,
    icon: IoCameraOutline,
  },
  {
    name: "Meals",
    path: "/meals",
    component: MealListPage,
    icon: IoImagesOutline,
  },
  {
    name: "Settings",
    path: "/settings",
    component: SettingsPage,
    icon: IoSettingsOutline,
  },
];
