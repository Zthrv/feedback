import api from "./api";
import session from "./session";

class AuthService {
  static async login(email, password, remember = false) {
    const response = await api.post("/auth/login", { email, password });
    const { token, user } = response.data.data;
    session.save(token, user, remember);
    return response.data;
  }

  // Revoke the token on the server, then clear the session.
  // The token is passed directly because the session is cleared before the request goes out.
  static logout() {
    const token = session.getToken();

    if (token) {
      api
        .post("/auth/logout", null, { headers: { Authorization: `Bearer ${token}` } })
        .catch(() => {});
    }

    session.clear();
  }

  static async forgotPassword(email) {
    return (await api.post("/auth/forgot-password", { email })).data;
  }

  // Set a new password using the token from a reset link
  static async resetPassword(token, password) {
    return (await api.post("/auth/reset-password", { token, password })).data;
  }
}

export default AuthService;
