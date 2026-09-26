"use client"
import { useEffect, useRef, useState } from "react"
import LabHeader from "./LabHeader"
import { download, parsePlan, parseTranscript, readJson, timestamp, type MusicPlan, type Transcript } from "@/lib/lab-formats"

export default function MusicLab() {
  const [story, setStory] = useState("")
  const [transcript, setTranscript] = useState<Transcript | null>(null)
  const [direction, setDirection] = useState("Instrumental cinematic background, restrained melody, space for narration.")
  const [plan, setPlan] = useState<MusicPlan | null>(null)
  const [error, setError] = useState("")
  const [audio, setAudio] = useState<Record<number, string>>({})
  const urls = useRef<Record<number, string>>({})
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("talkata-story-transcript")
      if (raw) { setTranscript(parseTranscript(JSON.parse(raw))); sessionStorage.removeItem("talkata-story-transcript") }
    } catch { setError("Could not open the transferred transcript. Please import its JSON.") }
    return () => Object.values(urls.current).forEach(URL.revokeObjectURL)
  }, [])
  const importFile = async (file: File, kind: "transcript" | "plan") => {
    try {
      const value = await readJson(file)
      if (kind === "transcript") { setTranscript(parseTranscript(value)); setStory("") }
      else {
        const next = parsePlan(value)
        Object.values(urls.current).forEach(URL.revokeObjectURL); urls.current = {}; setAudio({}); setPlan(next)
      }
      setError("")
    } catch (err) { setError(err instanceof Error ? err.message : "Could not import file.") }
  }
  return <div className="mx-auto max-w-5xl min-w-0">
    <LabHeader title="Story Music" description="Let a self-hosted story planner suggest the mood and music for each part of your narration. Review the plan before generating cues." />
    <p className="mb-6 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm leading-6 text-amber-100/80">Notebook testing: export a story brief to Kaggle, import its music plan, then audition generated cues here. Live generation and automatic mixing are not connected. Download your work before leaving this tab.</p>
    <section className="rounded-2xl border border-white/10 p-5">
      <h2 className="font-medium">1. Your story</h2>
      <div className="my-4 flex flex-wrap gap-4"><label className="text-sm text-white/60">Import a transcript<input className="mt-2 block max-w-full text-sm" type="file" accept=".json,application/json" onChange={e => { const file = e.target.files?.[0]; if (file) void importFile(file, "transcript"); e.target.value = "" }} /></label>
      {transcript && <button className="text-sm text-violet-300" onClick={() => { setStory(transcript.segments.map(s => s.text).join("\n\n")); setTranscript(null) }}>Switch to editable script (removes timing)</button>}</div>
      {transcript ? <div className="max-h-52 overflow-auto rounded-xl bg-white/[.03] p-4 text-sm leading-6"><p className="mb-2 text-violet-300">Timed transcript / {transcript.segments.length} segments</p>{transcript.segments.map(s => s.text).join(" ")}</div> : <textarea aria-label="Story script" placeholder="Paste your story here. A timed transcript gives more accurate scene boundaries." value={story} onChange={e => setStory(e.target.value)} maxLength={20000} rows={7} className="w-full rounded-xl border border-white/10 bg-transparent p-4 text-sm leading-6" />}
      <label className="mt-4 block text-sm text-white/60">Musical direction<textarea value={direction} maxLength={1000} onChange={e => setDirection(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-transparent p-3 text-sm" /></label>
      <button disabled={!transcript && !story.trim()} onClick={() => download("story-brief.json", JSON.stringify({ version: 1, story: transcript ? "" : story, transcript, direction }, null, 2), "application/json")} className="mt-3 rounded-xl bg-violet-600 px-5 py-3 text-sm font-medium disabled:opacity-40">Export brief for Kaggle</button>
    </section>
    <section className="mt-5 rounded-2xl border border-white/10 p-5">
      <h2 className="font-medium">2. Review the suggested score</h2><p className="my-3 text-sm text-white/40">Import music-plan.json from the notebook. Edit each cue before generating it.</p>
      <label className="text-sm text-white/60">Music plan JSON<input type="file" accept=".json,application/json" className="mt-2 block max-w-full text-sm" onChange={e => { const file = e.target.files?.[0]; if (file) void importFile(file, "plan"); e.target.value = "" }} /></label>
      {plan && <div className="mt-5 space-y-4"><p className="text-sm leading-6 text-violet-200">{plan.theme}</p><p className="text-xs text-white/45">{plan.timing === "estimated" ? "Estimated timing: align these cues to your finished narration before mixing." : "Boundaries use transcript timestamps. Review scene choices before rendering."}</p>
        {plan.cues.map((cue, i) => <article key={i} className="rounded-xl bg-white/[.03] p-4">
          <div className="flex flex-wrap justify-between gap-2"><h3 className="font-medium">{i + 1}. {cue.title}</h3><span className="text-xs text-white/40">{timestamp(cue.start)} - {timestamp(cue.end)}</span></div><p className="mt-1 text-xs text-violet-300">{cue.mood}</p>
          <label className="mt-3 block text-xs text-white/50">Generation prompt<textarea maxLength={512} value={cue.prompt} onChange={e => setPlan({ ...plan, cues: plan.cues.map((c, n) => n === i ? { ...c, prompt: e.target.value } : c) })} className="mt-2 w-full rounded-lg border border-white/10 bg-transparent p-3 text-sm leading-6" /></label>
          <label className="mt-3 block text-xs text-white/50">Audition a generated cue<input type="file" accept="audio/*" className="mt-2 block max-w-full text-xs" onChange={e => {
            const file = e.target.files?.[0]; if (!file) return
            if (file.size > 100 * 1024 * 1024) { setError("Choose a cue smaller than 100 MB."); return }
            if (urls.current[i]) URL.revokeObjectURL(urls.current[i])
            const url = URL.createObjectURL(file); urls.current[i] = url; setAudio({ ...urls.current }); setError("")
          }} /></label>{audio[i] && <audio controls className="mt-3 w-full" src={audio[i]} />}
        </article>)}
        <button onClick={() => download("music-plan.json", JSON.stringify(plan, null, 2), "application/json")} className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-medium">Export reviewed plan</button>
      </div>}
    </section>
    {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
  </div>
}
