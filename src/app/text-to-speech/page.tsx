import type { Metadata } from "next"
import { FileText } from "lucide-react"
import ServicePage from "@/components/marketing/ServicePage"

export const metadata: Metadata = { title: "Text to Speech", description: "Turn scripts, articles, and written content into clear audio with Talkata.", alternates: { canonical: "/text-to-speech" } }

export default function TextToSpeechPage() { return <ServicePage eyebrow="Text to speech" title="Turn written work into clear audio." intro="Use Talkata to make voiceovers from scripts, articles, training material, and product copy. Review the audio before you publish it." icon={FileText} steps={["Paste the final text or the section you want to record.", "Choose a voice that suits the subject and the listener.", "Generate the audio, listen through, then download the file."]} sections={[{ title: "For video work", body: "Record explainers, tutorials, product walkthroughs, and short form clips without waiting on a studio session." }, { title: "For learning material", body: "Make course notes, lessons, and written guides easier to consume when reading is not practical." }, { title: "For published writing", body: "Give a story, article, or newsletter an audio version that readers can take with them." }]} /> }
