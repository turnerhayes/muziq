export const UPDATE_USER_PROFILE = "@@muziq/USERS/UPDATE_PROFILE";

export function updateUserProfile({ user }) {
  return {
    type: UPDATE_USER_PROFILE,
    payload: { user },
  };
}


export const CHANGE_USER_PROFILE = "@@muziq/USERS/CHANGE";

export function changeUserProfile({ userID, updates }) {
  return {
    type: CHANGE_USER_PROFILE,
    payload: {
      userID,
      updates,
    },
  };
}
