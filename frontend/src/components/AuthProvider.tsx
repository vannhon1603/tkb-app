"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { UserProfile } from "@/types";
import toast from "react-hot-toast";

const nativeFetch = typeof window !== "undefined" ? window.fetch.bind(window) : undefined;

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  isGoogleUser: boolean;
  login: (token: string, profile: UserProfile) => void;
  loginWithGoogle: (idToken: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  isGoogleUser: false,
  login: () => {},
  loginWithGoogle: async () => false,
  logout: () => {},
});

// Helper to decode JWT on client safely without extra dependencies
const decodeJWT = (jwt: string): any => {
  try {
    const base64Url = jwt.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("Failed to decode JWT:", e);
    return null;
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore token & profile on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("auth_token");
    const savedUser = localStorage.getItem("auth_user");

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Failed to parse stored user", e);
        setToken(null);
        setUser(null);
      }
    } else {
      setToken(null);
      setUser(null);
    }
    setLoading(false);
  }, []);


  // Listen for global 401 unauthorized events to clear session
  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };
    window.addEventListener("auth_unauthorized", handleUnauthorized);
    return () => window.removeEventListener("auth_unauthorized", handleUnauthorized);
  }, []);

  // Intercept window.fetch globally to attach Authorization headers
  useEffect(() => {
    if (typeof window === "undefined" || !nativeFetch) return;

    window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
      const storedToken = localStorage.getItem("auth_token");
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      const requestUrl =
        typeof input === "string"
          ? input
          : input instanceof URL
          ? input.toString()
          : input.url;

      const isApiRequest =
        requestUrl.startsWith(backendUrl) ||
        requestUrl.startsWith("/api") ||
        requestUrl.includes("/api/");

      if (storedToken && isApiRequest) {
        init = init || {};
        const headers = new Headers(init.headers || {});
        if (!headers.has("Authorization")) {
          headers.set("Authorization", `Bearer ${storedToken}`);
        }
        init.headers = headers;
      }

      try {
        const response = await nativeFetch(input, init);
        if (response.status === 401 && storedToken && storedToken !== "demo_session_token") {
          window.dispatchEvent(new Event("auth_unauthorized"));
        }
        return response;
      } catch (error) {
        throw error;
      }
    };

    return () => {
      window.fetch = nativeFetch;
    };
  }, []);

  const login = (authToken: string, profile: UserProfile) => {
    localStorage.setItem("auth_token", authToken);
    localStorage.setItem("auth_user", JSON.stringify(profile));
    setToken(authToken);
    setUser(profile);
  };

  const loginWithGoogle = async (idToken: string): Promise<boolean> => {
    const beUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
    
    // First, decode client side for fast instant feedback
    const decoded = decodeJWT(idToken);
    let profile: UserProfile = {
      id: decoded?.sub || `google_${Date.now()}`,
      name: decoded?.name || decoded?.given_name || "Người dùng Google",
      email: decoded?.email || "",
      picture: decoded?.picture || "",
      avatar: decoded?.picture || "",
      role: "user",
    };

    try {
      // Sync with backend verification
      const res = await nativeFetch!(`${beUrl}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: idToken }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          profile = {
            id: data.user.id || profile.id,
            name: data.user.name || profile.name,
            email: data.user.email || profile.email,
            picture: data.user.picture || profile.picture,
            avatar: data.user.picture || profile.avatar,
            role: data.user.role || "user",
          };
        }
      }
    } catch (e) {
      console.warn("Backend Google verification skipped/failed, using decoded token:", e);
    }

    login(idToken, profile);
    toast.success(`Đăng nhập Google thành công: ${profile.name}`);
    return true;
  };

  const logout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    setToken(null);
    setUser(null);
    toast.success("Đã đăng xuất");
  };

  const isGoogleUser = Boolean(user && user.picture && user.email && token !== "demo_session_token");

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isGoogleUser,
        login,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

