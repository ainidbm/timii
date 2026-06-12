import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Timii",
    short_name: "Timii",
    description: "随时随地找人一起连线学习",
    start_url: "/",
    display: "standalone",
    background_color: "#080D0F",
    theme_color: "#080D0F",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}

