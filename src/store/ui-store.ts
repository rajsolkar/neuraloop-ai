import { create } from "zustand";

interface UiState {
  /** Whether the "Create workflow" dialog is open. */
  createDialogOpen: boolean;
  /** Mobile sidebar drawer open state. */
  mobileSidebarOpen: boolean;
  /** Controls the responsive canvas drawers (independent of sidebar). */
  nodeLibraryOpen: boolean;
  inspectorOpen: boolean;
  /** Track when the active route changes so drawers close. */
  closeAllForNavigation: () => void;

  setCreateDialogOpen: (open: boolean) => void;
  setMobileSidebarOpen: (open: boolean) => void;
  setNodeLibraryOpen: (open: boolean) => void;
  setInspectorOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  createDialogOpen: false,
  mobileSidebarOpen: false,
  nodeLibraryOpen: false,
  inspectorOpen: false,

  closeAllForNavigation: () =>
    set({
      createDialogOpen: false,
      mobileSidebarOpen: false,
      nodeLibraryOpen: false,
      inspectorOpen: false,
    }),

  setCreateDialogOpen: (open) => set({ createDialogOpen: open }),
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
  setNodeLibraryOpen: (open) => set({ nodeLibraryOpen: open }),
  setInspectorOpen: (open) => set({ inspectorOpen: open }),
}));