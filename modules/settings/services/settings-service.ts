export const settingsService = {
  async getPreferences() {
    return { language: "ja" as const, notificationsEnabled: true };
  },
};
