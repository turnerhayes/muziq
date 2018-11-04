export const CHANGE_SETTING = "@@muziq/SETTINGS/CHANGE";

export function changeSetting(settingValues) {
  return {
    type: CHANGE_SETTING,
    payload: settingValues
  };
}
