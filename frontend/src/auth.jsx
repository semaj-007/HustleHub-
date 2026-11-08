import { createContext, useContext, useState, useCallback } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { request } from './api';
const AuthContext = createContext(null);
export function AuthProvider({ children, initialSession = null }) {
  // In-memory only: never persist JWTs in localStorage, sessionStorage, or URLs.
  const [session, setSession] = useState(initialSession);
  const logout = useCallback(() => setSession(null), []);
  const api = useCallback(
    async (path, options = {}) => {
      try {
        return await request(path, { ...options, token: session?.token });
      } catch (error) {
        if (error.status === 401) logout();
        throw error;
      }
    },
    [session, logout],
  );
  return (
    <AuthContext.Provider value={{ user: session?.user, api, setSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
export function Protected({ role, children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}
