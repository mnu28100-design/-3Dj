import { create } from 'zustand'

export const useGame = create((set) => ({
  engine: null,
  state: null,
  screen: 'loading',
  loading: { percent: null, loaded: 0, total: 4, name: '' },
  error: '',
  lan: { status: 'offline', id: null, room: null, snapshot: null, results: null, error: '', ping: null, loss: 0, notice: null, spectatorId: null },
  setEngine: (engine) => set({ engine, state: engine.snapshot(), screen: 'menu' }),
  setState: (state) => set({ state }),
  setScreen: (screen) => set({ screen }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setLan: (patch) => set((state) => ({ lan: { ...state.lan, ...patch } })),
}))
