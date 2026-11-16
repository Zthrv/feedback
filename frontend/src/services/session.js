const TOKEN_KEY = "token";
const USER_KEY = "user";

const listeners = new Set();

function notify() {
  listeners.forEach((listener) => listener());
}

// "Remember me" sessions live in localStorage, others in sessionStorage (cleared with the tab)
function activeStorage() {
  return localStorage.getItem(TOKEN_KEY) !== null ? localStorage : sessionStorage;
}

const session = {
  getToken() {
    return activeStorage().getItem(TOKEN_KEY);
  },

  // Raw JSON string, so it can be used as a stable snapshot
  getUserRaw() {
    return activeStorage().getItem(USER_KEY);
  },

  save(token, user, remember) {
    session.clear(false);
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(TOKEN_KEY, token);
    storage.setItem(USER_KEY, JSON.stringify(user));
    notify();
  },

  updateToken(token) {
    activeStorage().setItem(TOKEN_KEY, token);
    notify();
  },

  clear(shouldNotify = true) {
    [localStorage, sessionStorage].forEach((storage) => {
      storage.removeItem(TOKEN_KEY);
      storage.removeItem(USER_KEY);
    });

    if (shouldNotify) notify();
  },

  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export default session;
