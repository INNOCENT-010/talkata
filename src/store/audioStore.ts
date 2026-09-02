import { create } from "zustand"

interface AudioStore {
  playingId: string | null
  audioId: string | null
  audio: HTMLAudioElement | null
  play: (id: string, url: string, onEnd?: () => void) => void
  stop: () => void
  toggle: (id: string, url: string) => void
  seek: (id: string, time: number) => void
}

export const useAudioStore = create<AudioStore>((set, get) => ({
  playingId: null,
  audioId: null,
  audio: null,

  stop: () => {
    const { audio } = get()
    if (audio) {
      audio.pause()
      audio.src = ""
    }
    set({ playingId: null, audioId: null, audio: null })
  },

  play: (id: string, url: string, onEnd?: () => void) => {
    get().stop()
    const audio = new Audio(url)
    audio.play()
    audio.onended = () => {
      set({ playingId: null, audioId: null, audio: null })
      onEnd?.()
    }
    set({ playingId: id, audioId: id, audio })
  },

  toggle: (id: string, url: string) => {
    const { audio, audioId, play, stop } = get()
    if (audioId === id && audio) {
      if (audio.paused) {
        audio.play()
        set({ playingId: id })
      } else {
        audio.pause()
        set({ playingId: null })
      }
    } else {
      stop()
      play(id, url)
    }
  },

  seek: (id: string, time: number) => {
    const { audio, audioId } = get()
    if (audio && audioId === id && Number.isFinite(audio.duration)) {
      audio.currentTime = Math.max(0, Math.min(time, audio.duration))
    }
  },
}))
