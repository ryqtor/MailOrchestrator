export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
}

export const defaultUser: UserProfile = {
  id: 'usr_reachinbox_default',
  name: 'Mitrajit Lead Engineer',
  email: 'mitrajit@reachinbox.ai',
  avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ReachInbox',
};

export const getStoredUser = (): UserProfile => {
  if (typeof window === 'undefined') return defaultUser;
  const stored = localStorage.getItem('reachinbox_user');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return defaultUser;
    }
  }
  return defaultUser;
};

export const setStoredUser = (user: UserProfile) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('reachinbox_user', JSON.stringify(user));
  }
};

export const clearStoredUser = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('reachinbox_user');
  }
};
