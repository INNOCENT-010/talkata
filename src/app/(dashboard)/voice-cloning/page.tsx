import { Construction, Wand2 } from "lucide-react"
import Link from "next/link"

export default function VoiceCloningPage() {
  return (
    <div className="mx-auto flex min-h-[65vh] max-w-xl items-center justify-center px-4 text-center">
      <div className="rounded-2xl border border-violet-500/20 bg-violet-600/10 p-8">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/20">
          <Construction className="h-7 w-7 text-violet-300" />
        </div>
        <div className="mb-2 flex items-center justify-center gap-2 text-violet-300">
          <Wand2 className="h-4 w-4" />
          <span className="text-sm font-medium">Under construction</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Voice cloning is being refined</h1>
        <p className="mt-3 text-sm leading-6 text-white/55">
          We’re improving voice cloning before reopening it. Text-to-speech remains available now.
        </p>
        <Link href="/generate" className="mt-6 inline-flex rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500">
          Create speech instead
        </Link>
      </div>
    </div>
  )
}
