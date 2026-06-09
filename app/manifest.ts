import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KroniX",
    short_name: "KroniX",
    description: "KroniX App Clientes",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    theme_color: "#0b1220",
    background_color: "#ffffff",
    lang: "es-CO",
    categories: ["shopping", "food", "business"],
    icons: [
  {
    src: "/icons/kronix-icon.png",
    sizes: "192x192",
    type: "image/png",
    purpose: "any",
  },
  {
    src: "/icons/kronix-icon.png",
    sizes: "512x512",
    type: "image/png",
    purpose: "any",
  },
  {
    src: "/icons/kronix-icon.png",
    sizes: "192x192",
    type: "image/png",
    purpose: "maskable",
  },
  {
    src: "/icons/kronix-icon.png",
    sizes: "512x512",
    type: "image/png",
    purpose: "maskable",
  },
  {
    src: "/icons/apple-touch-icon.png",
    sizes: "180x180",
    type: "image/png",
    purpose: "any",
  },
],
  };
}