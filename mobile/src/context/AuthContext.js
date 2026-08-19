import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiClient, saveToken, getToken, clearToken, extractErrorMessage } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (token) {
        try {
          const { data } = await apiClient.get('/auth/me');
          setEmployee(data.employee);
        } catch (err) {
          await clearToken();
        }
      }
      setLoading(false);
    })();
  }, []);

  async function login(email, password) {
    try {
      const { data } = await apiClient.post('/auth/login', { email, password });
      await saveToken(data.token);
      setEmployee(data.employee);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: extractErrorMessage(err, 'No se pudo iniciar sesión') };
    }
  }

  async function logout() {
    await clearToken();
    setEmployee(null);
  }

  const value = useMemo(
    () => ({ employee, loading, login, logout }),
    [employee, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
