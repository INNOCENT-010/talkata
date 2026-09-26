import { hasLabAccess } from "@/lib/lab-access"
import LabGate from "@/components/labs/LabGate"
import TranscriptionLab from "@/components/labs/TranscriptionLab"
export const dynamic = "force-dynamic"
export default async function TranscriptionPage() {
  if (!await hasLabAccess()) return <LabGate title="Your audio, in words" description="Transcribe recordings, review the text, download transcripts and subtitles, then create a soundtrack for your story. Coming soon to Talkata." />
  return <TranscriptionLab />
}
