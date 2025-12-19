import React, { createContext, useContext, useState, ReactNode } from 'react';

export type UserRole = 'admin' | 'referee' | 'captain';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  login: (role: UserRole) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const mockUsers: Record<UserRole, User> = {
  admin: {
    id: 'admin-1',
    name: 'Sarah Mitchell',
    email: 'admin@university.edu',
    role: 'admin',
  },
  referee: {
    id: 'ref-1',
    name: 'Marcus Chen',
    email: 'referee@university.edu',
    role: 'referee',
  },
  captain: {
    id: 'captain-1',
    name: 'James Rodriguez',
    email: 'captain@university.edu',
    role: 'captain',
  },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = (role: UserRole) => {
    setUser(mockUsers[role]);
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
