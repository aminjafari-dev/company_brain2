import { create } from 'zustand';
import type { MatchedFile } from '../types';

interface UiState {
  viewingFile: MatchedFile | null;
  isDependencyGraphOpen: boolean;
  isSearchOpen: boolean;
  setViewingFile: (file: MatchedFile | null) => void;
  setDependencyGraphOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  viewingFile: null,
  isDependencyGraphOpen: false,
  isSearchOpen: false,
  setViewingFile: (file) => set({ viewingFile: file }),
  setDependencyGraphOpen: (open) => set({ isDependencyGraphOpen: open }),
  setSearchOpen: (open) => set({ isSearchOpen: open }),
}));
