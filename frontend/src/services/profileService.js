import api from "./api";
import session from "./session";

class ProfileService {
  // The old token stops working, so the fresh one from the response replaces it
  static async changePassword(currentPassword, newPassword) {
    const response = await api.put("/profile/password", { currentPassword, newPassword });
    session.updateToken(response.data.data.token);
    return response.data;
  }
}

export default ProfileService;
