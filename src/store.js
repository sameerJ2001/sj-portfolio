import { create } from 'zustand'

// Flow: loader → enter() → camera swoops in on the loft (SJ-3PO is already working at the PC and turns to wave)
// → click an object → selectZone(id) → camera flies there → arrive(id) opens the panel
// → goHome() to back out.
export const useStore = create((set) => ({
  entered: false,
  activeZone: null, // zone the camera is flying to / at
  arrivedZone: null, // set once the camera lands — this opens the panel
  hoveredZone: null,
  lightsOn: true, // warm lamps on/off (neon always stays on)

  enter: () => set({ entered: true }),
  // Ignore re-selecting the zone you're already at (e.g. clicks that land on a screen you're using)
  selectZone: (id) => set((s) => (s.activeZone === id ? {} : { activeZone: id, arrivedZone: null })),
  arrive: (id) => set((s) => (s.activeZone === id ? { arrivedZone: id } : {})),
  goHome: () => set({ activeZone: null, arrivedZone: null }),
  setHovered: (id) => set({ hoveredZone: id }),
  toggleLights: () => set((s) => ({ lightsOn: !s.lightsOn })),
}))

// Handy for debugging in the browser console during development: __sj.getState()
if (import.meta.env.DEV) window.__sj = useStore
