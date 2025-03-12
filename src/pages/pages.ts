import { FC, JSX } from "react";
import { HomePage } from "./HomePage.tsx";
import { IconType } from "react-icons";
import { CameraPage } from "./CameraPage.tsx";
import { GalleryPage } from "./GalleryPage.tsx";
import {
  IoCameraOutline,
  IoHomeOutline,
  IoImagesOutline,
} from "react-icons/io5";

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
    name: "Gallery",
    path: "/gallery",
    component: GalleryPage,
    icon: IoImagesOutline,
  },
];
