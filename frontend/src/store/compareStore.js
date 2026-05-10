// frontend/src/store/compareStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCompareStore = create(
  persist(
    (set, get) => ({
      compareList: [],
      addTool: (tool) => {
        const { compareList } = get();
        if (compareList.length < 4 && !compareList.find(t => t._id === tool._id)) {
          set({ compareList: [...compareList, tool] });
        }
      },
      removeTool: (toolId) => {
        set({ compareList: get().compareList.filter(t => t._id !== toolId) });
      },
      clearCompare: () => set({ compareList: [] }),
    }),
    {
      name: 'ai-radar-compare-storage',
    }
  )
);
