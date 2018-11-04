import {
  formatTranslationMessages,
} from "./i18n";

const enMessages = {
  "muziq.general.actions.logIn": "Log in",
  "muziq.components.TopNavigation.links.home": "Home",
};

describe("i18n", () => {
  describe("formatTranslationMessages", () => {
    it("should default to `en` locale messages", () => {
      const messages = formatTranslationMessages("de", {
        "muziq.general.actions.logIn": undefined,
        "muziq.components.TopNavigation.links.home": "Startseite",
      });
			
      expect(messages).toEqual({
        "muziq.general.actions.logIn": enMessages["muziq.general.actions.logIn"],
        "muziq.components.TopNavigation.links.home": "Startseite",
      });
    });
  });

  describe("translationMessages", () => {
    it("should contain locale messages for all app locales", async () => {
      jest.resetModules();

      jest.doMock("@app/translations/en", () => {
        return enMessages;
      });

      const { translationMessages } = await import("./i18n");

      expect(translationMessages).toEqual({
        en: enMessages,
      });
    });
  });
});
