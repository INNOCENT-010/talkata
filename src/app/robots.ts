import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/admin/", "/dashboard/", "/history/", "/generate/", "/credits/", "/login", "/register", "/forgot-password", "/reset-password", "/auth/"] }], sitemap: "https://talkata.space/sitemap.xml", host: "https://talkata.space" }
}
