import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../utils/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState("");

  async function refreshUser() {
    const result = await api("/auth/me");
    setUser(result.user);
    setConnectionError("");
    return result.user;
  }

  async function signOut() {
    try {
      await api("/auth/logout", { method: "POST" });
      setUser(null);
      setConnectionError("");
    } catch (error) {
      setConnectionError(error.message);
    }
  }

  useEffect(() => {
    api("/auth/me")
      .then(({ user: current }) => setUser(current))
      .catch((error) => {
        if (error.status !== 401) {
          setConnectionError(`Could not connect to the API: ${error.message}`);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, refreshUser, signOut, loading, connectionError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider.");
  return context;
}
