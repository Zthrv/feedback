import axios from "axios";

import session from "./session";

const api = axios.create({
  // Same host the page was loaded from, so API calls also go through Burp
  baseURL: import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000/api`,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = session.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const RETRY_DELAYS = [1000, 2000, 3000];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // No answer at all (server restarting): retry reads a few times, never writes
    const config = error.config;

    if (!error.response && config?.method === "get") {
      const attempt = config.retryAttempt || 0;

      if (attempt < RETRY_DELAYS.length) {
        await wait(RETRY_DELAYS[attempt]);
        return api({ ...config, retryAttempt: attempt + 1 });
      }
    }

    // Expired or invalid session: back to the login page
    const isAuthRequest = config?.url?.startsWith("/auth/");

    if (error.response?.status === 401 && !isAuthRequest) {
      session.clear();
      window.location.assign("/");
    }

    return Promise.reject(error);
  }
);

export default api;
