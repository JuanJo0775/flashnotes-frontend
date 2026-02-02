import { create } from 'zustand';

interface UiStore {
    isSidebarOpen: boolean;
    activeModal: string | null;
    toastMessage: string | null;
    toggleSidebar: () => void;
    openModal: (modal: string) => void;
    closeModal: () => void;
    showToast: (message: string) => void;
    hideToast: () => void;
}

export const useUiStore = create<UiStore>((set) => ({
    isSidebarOpen: true,
    activeModal: null,
    toastMessage: null,
    toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
    openModal: (modal) => set({ activeModal: modal }),
    closeModal: () => set({ activeModal: null }),
    showToast: (message) => set({ toastMessage: message }),
    hideToast: () => set({ toastMessage: null }),
}));