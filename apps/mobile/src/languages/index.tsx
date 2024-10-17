import React, {
  createContext,
  FunctionComponent,
  PropsWithChildren,
  useContext,
  useLayoutEffect,
  useState,
} from "react";
import { IntlProvider } from "react-intl";
import MessagesEn from "./en.json";
import MessagesKo from "./ko.json";
import { useStore } from "../stores";
import { observer } from "mobx-react-lite";
import { I18nManager, Platform, Settings } from "react-native";

export type IntlMessage = Record<string, string>;
export type IntlMessages = {
  [lang: string]: Record<string, string> | undefined;
};

const messages: IntlMessages = {
  en: MessagesEn,
  ko: MessagesKo,
};

const getMessages = (language: string): IntlMessage => {
  return Object.assign({}, MessagesEn, messages[language]);
};

interface Language {
  language: string;
  languageFullName: string;
  getLanguageFullName: (language: string) => string;
  setLanguage: (language: string) => void;
  automatic: boolean;
  clearLanguage: () => void;
}

const defaultLangMap: Record<string, string> = {
  ko: "ko",
  en: "en",
};

const initLanguage = (): string => {
  let language = "en";

  if (Platform.OS === "ios") {
    const settings = Settings.get("AppleLocale");
    const locale: string = settings || settings?.[0];
    if (locale) {
      language = locale.split("-")[0];
    }
  } else {
    const locale = I18nManager.getConstants().localeIdentifier;
    if (locale) {
      language = locale.split("_")[0];
    }
  }

  if (!defaultLangMap[language]) {
    return "en";
  }

  return language;
};

const LanguageContext = createContext<Language | null>(null);

export const useLanguage = (): Language => {
  const lang = useContext(LanguageContext);
  if (!lang) {
    throw new Error("You have forgot to use language provider");
  }
  return lang;
};

export const AppIntlProvider: FunctionComponent = observer(({ children }) => {
  const { uiConfigStore } = useStore();
  const language = uiConfigStore.language;
  const isAutomatic = uiConfigStore.languageIsAutomatic;

  const [messages, setMessages] = useState(
    isAutomatic
      ? getMessages(initLanguage())
      : getMessages(uiConfigStore.language)
  );
  useLayoutEffect(() => {
    if (isAutomatic) {
      uiConfigStore.selectLanguageOptions({
        language: initLanguage(),
        isAutomatic,
      });
    }
    setMessages(getMessages(language));
  }, [isAutomatic, language, uiConfigStore]);

  const clearLanguage = () => {
    const language = initLanguage();
    uiConfigStore.selectLanguageOptions({ language, isAutomatic: true });
  };

  const setLanguage = (language: string) => {
    uiConfigStore.selectLanguageOptions({ language, isAutomatic: false });
  };

  const getLanguageFullName = (language: string) => {
    switch (language) {
      case "ko":
        return "한국어";
      default:
        return "English";
    }
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        getLanguageFullName,
        languageFullName: getLanguageFullName(language),
        setLanguage,
        automatic: isAutomatic,
        clearLanguage,
      }}
    >
      <IntlProvider locale={language} messages={messages}>
        {children}
      </IntlProvider>
    </LanguageContext.Provider>
  );
});
