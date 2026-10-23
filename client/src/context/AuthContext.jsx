
import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() =>
    sessionStorage.getItem("eventease_token")
  );

  const [user, setUser] = useState(() => {
    const savedUser = sessionStorage.getItem("eventease_user");

    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  function login(authData) {
    sessionStorage.setItem("eventease_token", authData.token);
    sessionStorage.setItem("eventease_user", JSON.stringify(authData.user));

    setToken(authData.token);
    setUser(authData.user);
  }

  function logout() {
    sessionStorage.removeItem("eventease_token");
    sessionStorage.removeItem("eventease_user");

    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{ token, user, isAuthenticated: Boolean(token), login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
