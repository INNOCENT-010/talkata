import { create } from "zustand"

interface AudioStore {
  playingId: string | null
  audio: HTMLAudioElement | null
  play: (id: string, url: string, onEnd?: () => void) => void
  stop: () => void
  toggle: (id: string, url: string) => void
}

export const useAudioStore = create<AudioStore>((set, get) => ({
  playingId: null,
  audio: null,

  stop: () => {
    const { audio } = get()
    if (audio) {
      audio.pause()
      audio.src = ""
    }
    set({ playingId: null, audio: null })
  },

  play: (id: string, url: string, onEnd?: () => void) => {
    get().stop()
    const audio = new Audio(url)
    audio.play()
    audio.onended = () => {
      set({ playingId: null, audio: null })
      onEnd?.()
    }
    set({ playingId: id, audio })
  },

  toggle: (id: string, url: string) => {
    const { playingId, play, stop } = get()
    if (playingId === id) {
      stop()
    } else {
      play(id, url)
    }
  }
}))