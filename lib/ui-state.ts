"use client"

import { create } from "zustand"

import type { Category, Routine } from "@/lib/types"

export interface ConfirmState {
  title: string
  body: string
  label: string
  tone?: "danger" | "warning" | "primary"
  action: () => void | Promise<void>
}

interface RoutineFlowUiState {
  routineModal: Routine | "new" | null
  categoryModal: Category | "new" | null
  confirm: ConfirmState | null
  setRoutineModal: (value: Routine | "new" | null) => void
  setCategoryModal: (value: Category | "new" | null) => void
  setConfirm: (value: ConfirmState | null) => void
}

export const useRoutineFlowUi = create<RoutineFlowUiState>()((set) => ({
  routineModal: null,
  categoryModal: null,
  confirm: null,
  setRoutineModal: (routineModal) => set({ routineModal }),
  setCategoryModal: (categoryModal) => set({ categoryModal }),
  setConfirm: (confirm) => set({ confirm }),
}))
