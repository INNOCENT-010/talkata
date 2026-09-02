import type { Metadata } from "next"
import { AudioLines } from "lucide-react"
import ServicePage from "@/components/marketing/ServicePage"

export const metadata: Metadata = { title: "AI Voice Generator", description: "Generate polished voiceovers from text for content, products, and internal work.", alternates: { canonical: "/ai-voice-generator" } }

export default function VoiceGeneratorPage() { return <ServicePage eyebrow="Voice generator" title="A direct route from script to voiceover." intro="Write the message once. Talkata handles the audio pass so you can spend time on the edit, delivery, and distribution." icon={AudioLines} steps={["Write the script as you want it spoken.", "Select a voice and make a first generation.", "Check the pacing, revise the text if needed, and export the final file."]} sections={[{ title: "Product teams", body: "Use audio in product demos, onboarding, feature updates, and support material without delaying a release." }, { title: "Independent creators", body: "Produce narration for channels, reels, podcasts, and series with a repeatable workflow." }, { title: "Editorial teams", body: "Prepare audio cuts of published work without assigning every recording to a separate production step." }]} /> }
