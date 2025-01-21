import { InExtensionMessageRequester } from "@owallet/router-extension";
import React, {
  createContext,
  FunctionComponent,
  PropsWithChildren,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";
import { ThemeProvider } from "styled-components";
import { SetThemeOptionMsg } from "@owallet/background";
import { BACKGROUND_PORT } from "@owallet/router";

export type ThemeOption = "dark" | "light" | "auto";

interface Theme {
  option: ThemeOption;
  setTheme: (option: ThemeOption) => void;
}

const initOption = () => {
  return "light";
  const theme = localStorage.getItem("theme-option");

  if (!theme) {
    return "light";
  }

  return theme as ThemeOption;
};

const AppThemeContext = createContext<Theme | null>(null);

export const useAppTheme = () => {
  const theme = useContext(AppThemeContext);

  if (!theme) {
    throw new Error("You have forgot to use theme provider");
  }

  return theme;
};

export const AppThemeProvider: FunctionComponent<PropsWithChildren> = ({
  children,
}) => {
  const [option, _setOption] = useState<ThemeOption>(() => initOption());
  const [displayTheme, setDisplayTheme] = useState<"dark" | "light">(() => {
    if (!option) {
      return "light";
    }

    if (option === "auto") {
      return "light";

      return window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark";
    }

    return option;
  });

  // Sync the theme option to the background script.
  useEffect(() => {
    new InExtensionMessageRequester().sendMessage(
      BACKGROUND_PORT,
      new SetThemeOptionMsg(option)
    );
  }, [option]);

  const setTheme = (option: ThemeOption) => {
    localStorage.setItem("theme-option", option);

    if (option === "auto") {
      setDisplayTheme("light");
      // setDisplayTheme(
      //   window.matchMedia("(prefers-color-scheme: light)").matches
      //     ? "light"
      //     : "dark"
      // );
    } else {
      setDisplayTheme("light");
      // setDisplayTheme(option);
    }
    _setOption("light");
    // _setOption(option);
  };

  useLayoutEffect(() => {
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (event) => {
        const newColorScheme = event.matches ? "dark" : "light";

        if (option === "auto") {
          // setDisplayTheme(newColorScheme);
          setDisplayTheme("light");
        }
      });
  }, [option]);

  return (
    <AppThemeContext.Provider
      value={{
        option: "light",
        setTheme,
      }}
    >
      <ThemeProvider theme={{ mode: displayTheme }}>{children}</ThemeProvider>
    </AppThemeContext.Provider>
  );
};
