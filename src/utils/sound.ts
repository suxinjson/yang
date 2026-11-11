// Web Audio API Sound Synthesizer for Couple's Matching Game
// Zero external audio files required, instant playback on mobile!

class SoundManager {
  private ctx: AudioContext | null = null
  public enabled: boolean = true

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
  }

  // Click / Tile Pick sound
  playClick() {
    if (!this.enabled) return
    this.initCtx()
    if (!this.ctx) return

    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(480, this.ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(720, this.ctx.currentTime + 0.08)

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08)

    osc.connect(gain)
    gain.connect(this.ctx.destination)

    osc.start()
    osc.stop(this.ctx.currentTime + 0.09)
  }

  // Card into slot sound
  playSlot() {
    if (!this.enabled) return
    this.initCtx()
    if (!this.ctx) return

    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(520, this.ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(380, this.ctx.currentTime + 0.1)

    gain.gain.setValueAtTime(0.18, this.ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1)

    osc.connect(gain)
    gain.connect(this.ctx.destination)

    osc.start()
    osc.stop(this.ctx.currentTime + 0.11)
  }

  // Match 3 elimination chime (Ding-Ding-Dang!)
  playMatch() {
    if (!this.enabled) return
    this.initCtx()
    if (!this.ctx) return

    const notes = [523.25, 659.25, 783.99, 1046.50] // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator()
      const gain = this.ctx!.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + idx * 0.06)

      gain.gain.setValueAtTime(0.25, this.ctx!.currentTime + idx * 0.06)
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + idx * 0.06 + 0.25)

      osc.connect(gain)
      gain.connect(this.ctx!.destination)

      osc.start(this.ctx!.currentTime + idx * 0.06)
      osc.stop(this.ctx!.currentTime + idx * 0.06 + 0.28)
    })
  }

  // Magic Power-Up (Shuffle / Undo / Move)
  playPowerUp() {
    if (!this.enabled) return
    this.initCtx()
    if (!this.ctx) return

    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(300, this.ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.25)

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25)

    osc.connect(gain)
    gain.connect(this.ctx.destination)

    osc.start()
    osc.stop(this.ctx.currentTime + 0.26)
  }

  // Boyfriend Superhero Rescue Fanfare!
  playRescue() {
    if (!this.enabled) return
    this.initCtx()
    if (!this.ctx) return

    const notes = [440, 554.37, 659.25, 880] // A4, C#5, E5, A5 fanfare
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator()
      const gain = this.ctx!.createGain()

      osc.type = 'square'
      osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + idx * 0.08)

      gain.gain.setValueAtTime(0.18, this.ctx!.currentTime + idx * 0.08)
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + idx * 0.08 + 0.3)

      osc.connect(gain)
      gain.connect(this.ctx!.destination)

      osc.start(this.ctx!.currentTime + idx * 0.08)
      osc.stop(this.ctx!.currentTime + idx * 0.08 + 0.32)
    })
  }

  // Victory celebration tune
  playWin() {
    if (!this.enabled) return
    this.initCtx()
    if (!this.ctx) return

    const melody = [523.25, 523.25, 523.25, 659.25, 783.99, 1046.50]
    melody.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator()
      const gain = this.ctx!.createGain()

      osc.type = 'sine'
      const start = this.ctx!.currentTime + idx * 0.12
      osc.frequency.setValueAtTime(freq, start)

      gain.gain.setValueAtTime(0.25, start)
      gain.gain.exponentialRampToValueAtTime(0.01, start + 0.3)

      osc.connect(gain)
      gain.connect(this.ctx!.destination)

      osc.start(start)
      osc.stop(start + 0.35)
    })
  }

  // Defeat / Warning sound
  playFail() {
    if (!this.enabled) return
    this.initCtx()
    if (!this.ctx) return

    const freqs = [360, 320, 280]
    freqs.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator()
      const gain = this.ctx!.createGain()

      osc.type = 'sawtooth'
      const start = this.ctx!.currentTime + idx * 0.12
      osc.frequency.setValueAtTime(freq, start)

      gain.gain.setValueAtTime(0.12, start)
      gain.gain.exponentialRampToValueAtTime(0.01, start + 0.2)

      osc.connect(gain)
      gain.connect(this.ctx!.destination)

      osc.start(start)
      osc.stop(start + 0.22)
    })
  }
}

export const sound = new SoundManager()
