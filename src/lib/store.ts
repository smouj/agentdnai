/**
 * AgentDNAI App Store
 * 
 * Client-side state management for navigation and app state.
 */

import { create } from 'zustand';

export type AppView =
  | 'home'
  | 'login'
  | 'register'
  | 'onboarding'
  | 'dashboard'
  | 'agents'
  | 'agent-detail'
  | 'approvals'
  | 'audit'
  | 'policies'
  | 'settings'
  | 'docs';

interface UserInfo {
  id: string;
  email: string;
  name: string;
}

interface AppState {
  currentView: AppView;
  selectedAgentId: string | null;
  sidebarOpen: boolean;
  sessionToken: string | null;
  user: UserInfo | null;

  setView: (view: AppView) => void;
  selectAgent: (agentId: string) => void;
  setSidebarOpen: (open: boolean) => void;
  navigateToAgent: (agentId: string) => void;
  setSession: (token: string | null, user: UserInfo | null) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'home',
  selectedAgentId: null,
  sidebarOpen: true,
  sessionToken: typeof window !== 'undefined' ? localStorage.getItem('agentdnai_token') : null,
  user: null,

  setView: (view) => set({ currentView: view }),
  selectAgent: (agentId) => set({ selectedAgentId: agentId, currentView: 'agent-detail' }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  navigateToAgent: (agentId) => set({ selectedAgentId: agentId, currentView: 'agent-detail' }),
  setSession: (token, user) => {
    if (token) {
      localStorage.setItem('agentdnai_token', token);
    } else {
      localStorage.removeItem('agentdnai_token');
    }
    set({ sessionToken: token, user });
  },
  logout: () => {
    localStorage.removeItem('agentdnai_token');
    set({ sessionToken: null, user: null, currentView: 'home' });
  },
}));
