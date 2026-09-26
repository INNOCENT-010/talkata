"use client"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import LabHeader from "./LabHeader"
import { download, parseTranscript, readJson, subtitles, timestamp, type Transcript } from "@/lib/lab-formats"

export default function TranscriptionLab() {
  const router = useRouter()
  const [transcript, setTranscript] = useState<Transcript | null>(null)
  const [audio, setAudio] = useState<string | null>(null)
  const [error, setError] = useState("")
  const audioRef = useRef<HTMLAudioElement>(null)
  useEffect(() => () => { if (audio) URL.revokeObjectURL(audio) }, [audio])
  const save = (kind: "txt" | "srt" | "vtt" | "json") => {
    if (!transcript) return
    download(`talkata-transcript.${kind}`, kind === "json" ? JSON.stringify(transcript, null, 2) : kind === "txt" ? transcript.segments.map(s => s.text).join("\n\n") : subtitles(transcript.segments, kind), kind === "json" ? "application/json" : "text/plain")
  }
  return <div className="mx-auto max-w-5xl min-w-0">
    <LabHeader title="Transcription" description="Turn recordings into editable text and subtitles. Keep your transcript, or use it to plan music for your story." />
    <div className="mb-6 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm leading-6 text-amber-100/80">Notebook testing: run transcription in Kaggle, then import its transcript JSON here. Live audio processing is not connected yet. Files stay in this browser tab; download your work before leaving.</div>
    <div className="grid gap-4 md:grid-cols-2">
      <section className="rounded-2xl border border-white/10 p-5">
        <h2 className="font-medium">1. Listen to your recording</h2><p className="my-3 text-sm text-white/45">Select the same recording you use in Kaggle. This is a local preview, not an upload.</p>
        <label className="text-sm text-white/70">Audio file<input type="file" accept="audio/*" className="mt-2 block w-full min-w-0 text-sm" onChange={e => {
          const file = e.target.files?.[0]; if (!file) return
          if (file.size > 250 * 1024 * 1024) { setError("Choose a recording under 250 MB for browser preview."); return }
          setAudio(URL.createObjectURL(file)); setError("")
        }} /></label>
        {audio && <audio ref={audioRef} className="mt-4 w-full" controls src={audio} />}
      </section>
      <section className="rounded-2xl border border-white/10 p-5">
        <h2 className="font-medium">2. Import your transcript</h2><p className="my-3 text-sm text-white/45">Choose the transcript.json produced by the Talkata notebook. Timestamps are retained for subtitle export.</p>
        <label className="text-sm text-white/70">Transcript JSON<input type="file" accept=".json,application/json" className="mt-2 block w-full min-w-0 text-sm" onChange={async e => {
          const file = e.target.files?.[0]; if (!file) return
          try { setTranscript(parseTranscript(await readJson(file))); setError("") }
          catch (err) { setError(err instanceof Error ? err.message : "Could not import transcript.") }
          e.target.value = ""
        }} /></label>
      </section>
    </div>
    {error && <p role="alert" className="my-4 text-sm text-red-300">{error}</p>}
    {transcript ? <section className="mt-6 rounded-2xl border border-white/10 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-medium">Review transcript <span className="text-sm font-normal text-white/40">{transcript.language} / {transcript.segments.length} segments</span></h2><div className="flex flex-wrap gap-2">{(["txt", "srt", "vtt", "json"] as const).map(kind => <button key={kind} onClick={() => save(kind)} className="rounded-lg border border-white/15 px-3 py-2 text-xs uppercase">Download {kind}</button>)}</div></div>
      <p className="mt-3 text-sm text-white/40">Correct words before exporting. Click a timestamp to seek in your recording.</p>
      <div className="mt-4 max-h-[55vh] space-y-3 overflow-y-auto">{transcript.segments.map((segment, i) => <div key={i} className="rounded-xl bg-white/[.03] p-3">
        <button className="mb-2 text-xs text-violet-300 disabled:text-white/40" disabled={!audio} onClick={() => { if (audioRef.current) audioRef.current.currentTime = segment.start }}>{timestamp(segment.start)} - {timestamp(segment.end)}</button>
        <textarea aria-label={`Transcript segment ${i + 1}`} maxLength={5000} value={segment.text} onChange={e => setTranscript({ ...transcript, segments: transcript.segments.map((s, n) => n === i ? { ...s, text: e.target.value } : s) })} className="w-full rounded-lg border border-white/10 bg-transparent p-3 text-sm leading-6" />
      </div>)}</div>
      <button className="mt-5 rounded-xl bg-violet-600 px-5 py-3 text-sm font-medium" onClick={() => {
        try { sessionStorage.setItem("talkata-story-transcript", JSON.stringify(transcript)); router.push("/music") }
        catch { setError("Browser storage is full. Download JSON and import it in Story Music instead.") }
      }}>Use transcript for story music</button>
    </section> : <div className="mt-6 rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-white/40">Your transcript and downloads will appear here after import.</div>}
  </div>
}
