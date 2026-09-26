import { hasLabAccess } from "@/lib/lab-access"
import LabGate from "@/components/labs/LabGate"
import MusicLab from "@/components/labs/MusicLab"
export const dynamic = "force-dynamic"
export default async function MusicPage() {
  if (!await hasLabAccess()) return <LabGate title="Music for your story" description="Turn your story into a soundtrack, review music for each scene, and bring narration and music together. Private testing is underway." />
  return <MusicLab />
}
