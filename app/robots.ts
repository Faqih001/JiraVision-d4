import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard", "/login", "/signup", "/forgot-password", "/reset-password", "/newsletter/confirm"],
      },
    ],
    sitemap: "https://jiravision.vercel.app/sitemap.xml",
  }
}
