import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mây VSTEP · Góc học của Gùa",
    short_name: "Mây VSTEP",
    description:
      "Góc luyện VSTEP cá nhân với kế hoạch vừa sức, ôn lỗi sai và bốn kỹ năng.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fff8fb",
    theme_color: "#fff8fb",
    lang: "vi",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
