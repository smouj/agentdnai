/**
 * AgentDNAI App Store
 * 
 * Client-side state management for navigation and app state.
 */

import { create } from 'zustand';

export type AppView =
  | 'home'
  | 'dashboard'
  | 'agents'
  | 'agent-detail'
  | 'audit'
  | 'tokens'
  | 'policies'
  | 'settings';

interface AppState {
  currentView: AppView;
  selectedAgentId: string | null;
  sidebarOpen: boolean;

  setView: (view: AppView) => void;
  selectAgent: (agentId: string) => void;
  setSidebarOpen: (open: boolean) => void;
  navigateToAgent: (agentId: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'home',
  selectedAgentId: null,
  sidebarOpen: true,

  setView: (view) => set({ currentView: view, selectedAgentId: view === 'agent-detail' ? undefined : null }),
  selectAgent: (agentId) => set({ selectedAgentId: agentId, currentView: 'agent-detail' }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  navigateToAgent: (agentId) => set({ selectedAgentId: agentId, currentView: 'agent-detail' }),
}));
