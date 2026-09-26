export type Segment = { start: number; end: number; text: string }
export type Transcript = { version: 1; language: string; segments: Segment[] }
export type Cue = { title: string; start: number; end: number; mood: string; prompt: string }
export type MusicPlan = { version: 1; timing: "transcript" | "estimated"; theme: string; cues: Cue[] }

const record = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error("Expected a JSON object.")
  return v as Record<string, unknown>
}
const str = (v: unknown, max: number) => {
  if (typeof v !== "string" || v.length > max) throw new Error("Invalid or oversized text field.")
  return v
}
const seconds = (v: unknown) => {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 86400) throw new Error("Invalid audio timestamp.")
  return v
}
export function parseTranscript(value: unknown): Transcript {
  const d = record(value)
  if (d.version !== 1 || !Array.isArray(d.segments) || !d.segments.length || d.segments.length > 3000) throw new Error("Use a Talkata transcript JSON with 1-3000 segments.")
  let lastEnd = 0
  const segments = d.segments.map(v => {
    const s = record(v), start = seconds(s.start), end = seconds(s.end)
    if (end <= start || start < lastEnd) throw new Error("Transcript segments must be ordered and must not overlap.")
    lastEnd = end
    return { start, end, text: str(s.text, 5000) }
  })
  return { version: 1, language: str(d.language, 64), segments }
}
export function parsePlan(value: unknown): MusicPlan {
  const d = record(value)
  if (d.version !== 1 || !["transcript", "estimated"].includes(String(d.timing)) || !Array.isArray(d.cues) || !d.cues.length || d.cues.length > 24) throw new Error("Use a Talkata music-plan JSON with 1-24 cues.")
  let lastEnd = 0
  const cues = d.cues.map(v => {
    const c = record(v), start = seconds(c.start), end = seconds(c.end)
    if (end <= start || start < lastEnd) throw new Error("Music cues must be ordered and must not overlap.")
    lastEnd = end
    return { title: str(c.title, 120), start, end, mood: str(c.mood, 120), prompt: str(c.prompt, 512) }
  })
  return { version: 1, timing: d.timing as MusicPlan["timing"], theme: str(d.theme, 1000), cues }
}
export function timestamp(seconds: number, separator = ".") {
  const ms = Math.round(seconds * 1000)
  return `${String(Math.floor(ms / 3600000)).padStart(2, "0")}:${String(Math.floor(ms / 60000) % 60).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}${separator}${String(ms % 1000).padStart(3, "0")}`
}
export function subtitles(segments: Segment[], type: "srt" | "vtt") {
  return (type === "vtt" ? "WEBVTT\n\n" : "") + segments.map((s, i) => {
    const text = s.text.replace(/\r?\n\s*\r?\n/g, "\n").replace(/-->/g, "->").replace(/[<>]/g, "")
    return `${type === "srt" ? `${i + 1}\n` : ""}${timestamp(s.start, type === "srt" ? "," : ".")} --> ${timestamp(s.end, type === "srt" ? "," : ".")}\n${text}\n`
  }).join("\n")
}
export function download(name: string, value: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([value], { type: `${type};charset=utf-8` }))
  const a = document.createElement("a"); a.href = url; a.download = name; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export async function readJson(file: File) {
  if (file.size > 2 * 1024 * 1024) throw new Error("JSON files must be smaller than 2 MB.")
  try { return JSON.parse(await file.text()) as unknown } catch { throw new Error("This file is not valid JSON.") }
}
