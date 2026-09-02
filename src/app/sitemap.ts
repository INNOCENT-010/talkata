import type { MetadataRoute } from "next"

const baseUrl = "https://talkata.space"

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/text-to-speech", "/ai-voice-generator", "/nigerian-text-to-speech", "/developer-api", "/pricing", "/terms", "/privacy"].map((path) => ({ url: `${baseUrl}${path}`, lastModified: new Date(), changeFrequency: path === "" ? "weekly" : "monthly", priority: path === "" ? 1 : 0.8 }))
}
