export const LOGIN = "@@muziq/AUTH/LOGIN";

export function login({ provider }) {
  return {
    type: LOGIN,
    payload: {
      provider,
    },
  };
}

export const LOGOUT = "@@muziq/AUTH/LOGOUT";

export function logout() {
  return {
    type: LOGOUT,
  };
}
