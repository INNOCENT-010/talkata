import type { Metadata } from "next"
import { Mic2 } from "lucide-react"
import ServicePage from "@/components/marketing/ServicePage"

export const metadata: Metadata = { title: "Nigerian Text to Speech", description: "Create clear voiceovers for Nigerian audiences with Talkata text to speech.", alternates: { canonical: "/nigerian-text-to-speech" } }

export default function NigerianTextToSpeechPage() { return <ServicePage eyebrow="Nigerian text to speech" title="Make audio that meets your audience where they are." intro="Talkata gives Nigerian creators, teams, and developers a practical way to turn written material into audio for local and global audiences." icon={Mic2} steps={["Write names, places, and terms exactly as they should be read.", "Test a short section before generating a longer recording.", "Keep the version that sounds right and use it in your production." ]} sections={[{ title: "Creator work", body: "Build voiceovers for stories, commentary, education, and community content without adding a recording bottleneck." }, { title: "Business communication", body: "Turn updates, training material, and product messages into audio that can be shared quickly." }, { title: "Developer products", body: "Add spoken output to tools built for customers who prefer to listen instead of read." }]} /> }
