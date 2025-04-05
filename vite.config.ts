import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA, VitePWAOptions } from 'vite-plugin-pwa'
const manifestForPlugIn: Partial<VitePWAOptions> = {registerType:"prompt",
  manifest:{
    "name": "Food Track",
    "short_name": "FoodTrack",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#ffffff",
    "theme_color": "#ff6600",
    "icons": [
      {
      src: '/android-chrome-192x192.png',
      sizes:'192x192',
      type:'image/png',
      purpose:'favicon'
    },
    {
      src:'/android-chrome-512x512.png',
      sizes:'512x512',
      type:'image/png',
      purpose:'favicon'
    },
    {
      src: '/apple-touch-icon.png',
      sizes:'180x180',
      type:'image/png',
      purpose:'apple touch icon',
    },
    {
      src: '/android-chrome-512x512.png',
      sizes:'512x512',
      type:'image/png',
      purpose:'any maskable',
    }
    ]
  }
  
}


// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(),VitePWA(manifestForPlugIn)],
  
});
