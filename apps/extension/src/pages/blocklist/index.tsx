import React, { FunctionComponent, useLayoutEffect } from "react";
import ReactDOM from "react-dom";
import { Box } from "../../components/box";
import styled from "styled-components";
import { ColorPalette, GlobalStyle } from "../../styles";
import { AppThemeProvider } from "../../theme";

const Styles = {
  Inner: styled.div`
    display: flex;
    align-items: center;

    text-align: left;
    padding: 1.5rem;
    max-width: 64rem;

    gap: 3.375rem;

    @media screen and (max-height: 48rem) {
      flex-direction: column;
      text-align: center;
    }
  `,
  Image: styled.img`
    @media screen and (max-height: 48rem) {
      margin: 0 auto;
      max-width: max(60%, 16.25rem);
    }
  `,
  Title: styled.div`
    font-weight: 600;
    font-size: 3rem;
    margin: 0;
    color: ${(props) =>
      props.theme.mode === "light"
        ? ColorPalette["gray-700"]
        : ColorPalette["gray-10"]};

    @media screen and (max-height: 48rem) {
      font-size: 2rem;
    }
  `,
  Description: styled.div`
    font-weight: 400;
    font-size: 1rem;
    margin: 1.75rem 0;
    color: ${(props) =>
      props.theme.mode === "light"
        ? ColorPalette["gray-300"]
        : ColorPalette["gray-100"]};

    @media screen and (max-height: 48rem) {
      max-width: max(75%, 20rem);
      margin: 1.25rem auto;
    }
  `,
  Link: styled.button`
    appearance: none;
    border: 0;
    padding: 0;
    background: transparent;
    text-decoration: underline;
    font-weight: 400;
    font-size: 16px;
    line-height: 19px;
    letter-spacing: -0.005em;
    color: ${(props) =>
      props.theme.mode === "light"
        ? ColorPalette["gray-600"]
        : ColorPalette["gray-50"]};

    display: flex;
    justify-content: center;
  `,
};

export const BlocklistPage: FunctionComponent = () => {
  const origin =
    new URLSearchParams(window.location.search).get("origin") || "";

  useLayoutEffect(() => {
    const onRedirectMessage = (e: any) => {
      try {
        if (e.data.type !== "blocklist-url-temp-allowed") {
          return;
        }
        const redirectUrl = new URL(e.data.origin);

        // Validate url
        const url = new URL(origin);
        if (redirectUrl.origin !== url.origin) {
          throw new Error("origin unmatched");
        }

        window.location.replace(origin);
      } catch (e) {
        console.log(e);
        alert(e.message || e.toString());
      }
    };

    window.addEventListener("message", onRedirectMessage);

    return () => {
      window.removeEventListener("message", onRedirectMessage);
    };
  }, [origin]);

  return (
    <Box width="100vw" height="100vh" alignX="center" alignY="center">
      <Styles.Inner>
        <Styles.Image
          src={require("../../public/assets/img/blocklist.svg")}
          alt=""
        />
        <Box>
          <Styles.Title>SECURITY ALERT</Styles.Title>
          <Styles.Description>
            OWallet has detected that this domain has been flagged as a phishing
            site. To protect the safety of your assets, we recommend you exit
            this website immediately.
          </Styles.Description>
          <Styles.Link>
            <div
              onClick={(e) => {
                e.preventDefault();

                window.postMessage(
                  {
                    type: "allow-temp-blocklist-url",
                    origin,
                  },
                  window.location.origin
                );
              }}
              style={{
                cursor: "pointer",
              }}
            >
              Continue to {origin} (unsafe)
            </div>
          </Styles.Link>
        </Box>
      </Styles.Inner>
    </Box>
  );
};

ReactDOM.render(
  <React.Fragment>
    <AppThemeProvider>
      <GlobalStyle />
      <BlocklistPage />
    </AppThemeProvider>
  </React.Fragment>,
  document.getElementById("app")
);
