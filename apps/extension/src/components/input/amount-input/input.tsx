import React, { FunctionComponent, useEffect, useRef, useState } from "react";
import { observer } from "mobx-react-lite";
import {
  EmptyAmountError,
  IAmountConfig,
  ZeroAmountError,
} from "@owallet/hooks";
import { TextInput } from "../text-input";
import { useStore } from "../../../stores";
import { CoinPretty, Dec, DecUtils } from "@owallet/unit";
import { Box } from "../../box";
import { Body2, Body3, Button2 } from "../../typography";
import { ColorPalette } from "../../../styles";
import { VerticalCollapseTransition } from "../../transition/vertical-collapse";
import { Columns } from "../../column";
import { FormattedMessage, useIntl } from "react-intl";
import { useTheme } from "styled-components";

export const AmountInput: FunctionComponent<{
  amountConfig: IAmountConfig;
}> = observer(({ amountConfig }) => {
  if (amountConfig.amount.length !== 1) {
    throw new Error(
      `Amount input component only handles single amount: ${amountConfig.amount
        .map((a) => a.toString())
        .join(",")}`
    );
  }

  const { chainStore, priceStore } = useStore();
  const intl = useIntl();

  const price = (() => {
    return priceStore.calculatePrice(amountConfig.amount[0]);
  })();
  const [priceValue, setPriceValue] = useState("");
  const [isPriceBased, setIsPriceBased] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // it frustrating when scrolling inside a number input field unintentionally changes its value
    // we should prevent default behavior of the wheel event
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
    };

    if (inputRef.current) {
      inputRef.current.addEventListener("wheel", handleWheel, {
        passive: false,
      });
    }

    return () => {
      if (inputRef.current) {
        inputRef.current.removeEventListener("wheel", handleWheel);
      }
    };
  }, []);

  const [renderPriceSymbol, setRenderPriceSymbol] = useState(isPriceBased);
  useEffect(() => {
    if (isPriceBased) {
      setRenderPriceSymbol(true);
    }
  }, [isPriceBased]);

  return (
    <TextInput
      ref={inputRef}
      label={intl.formatMessage({
        id: "components.input.amount-input.amount-label",
      })}
      border={false}
      type="number"
      value={(() => {
        if (isPriceBased) {
          if (amountConfig.fraction != 0) {
            return price?.toDec().toString(price?.options.maxDecimals);
          }
          return priceValue;
        } else {
          return amountConfig.value;
        }
      })()}
      onChange={(e) => {
        e.preventDefault();

        if (isPriceBased) {
          if (price) {
            let value = e.target.value;
            if (value.startsWith(".")) {
              value = "0" + value;
            }
            if (value.trim().length === 0) {
              amountConfig.setValue("");
              setPriceValue(value);
              return;
            }
            if (/^\d+(\.\d+)*$/.test(value)) {
              let dec: Dec;
              try {
                dec = new Dec(value);
              } catch (e) {
                console.log(e);
                return;
              }
              if (dec.lte(new Dec(0))) {
                setPriceValue(value);
                return;
              }

              const onePrice = priceStore.calculatePrice(
                new CoinPretty(
                  amountConfig.amount[0].currency,
                  DecUtils.getTenExponentN(
                    amountConfig.amount[0].currency.coinDecimals
                  )
                )
              );

              if (!onePrice) {
                // Can't be happen
                return;
              }
              const onePriceDec = onePrice.toDec();
              const expectedAmount = dec.quo(onePriceDec);

              setPriceValue(value);
              amountConfig.setValue(
                expectedAmount.toString(
                  amountConfig.amount[0].currency.coinDecimals
                )
              );
            }
          }
        } else {
          amountConfig.setValue(e.target.value);
        }
      }}
      left={
        renderPriceSymbol ? (
          <PriceSymbol
            show={isPriceBased}
            onTransitionEnd={() => {
              if (!isPriceBased) {
                setRenderPriceSymbol(false);
              }
            }}
          />
        ) : null
      }
      right={(() => {
        if (
          // In the case of terra classic, tax is applied in proportion to the amount.
          // However, in this case, the tax itself changes the fee,
          // so if you use the max function, it will fall into infinite repetition.
          // We currently disable if chain is terra classic because we can't handle it properly.
          chainStore.hasChain(amountConfig.chainId) &&
          chainStore
            .getChain(amountConfig.chainId)
            .hasFeature("terra-classic-fee")
        ) {
          return undefined;
        }

        return <MaxButton amountConfig={amountConfig} />;
      })()}
      bottom={
        price ? (
          <BottomPriceButton
            text={(() => {
              if (isPriceBased) {
                return amountConfig.amount[0]
                  .trim(true)
                  .maxDecimals(6)
                  .inequalitySymbol(true)
                  .shrink(true)
                  .toString();
              } else {
                return price.toString();
              }
            })()}
            onClick={() => {
              if (!isPriceBased) {
                if (price.toDec().lte(new Dec(0))) {
                  setPriceValue("");
                } else {
                  setPriceValue(
                    price.toDec().toString(price.options.maxDecimals).toString()
                  );
                }
              }
              setIsPriceBased(!isPriceBased);

              inputRef.current?.focus();
            }}
          />
        ) : null
      }
      error={(() => {
        const uiProperties = amountConfig.uiProperties;

        const err = uiProperties.error || uiProperties.warning;

        if (err instanceof EmptyAmountError) {
          return;
        }

        if (err instanceof ZeroAmountError) {
          return;
        }

        if (err) {
          return err.message || err.toString();
        }
      })()}
    />
  );
});

const PriceSymbol: FunctionComponent<{
  show: boolean;
  onTransitionEnd: () => void;
}> = observer(({ show, onTransitionEnd }) => {
  const { priceStore } = useStore();
  const theme = useTheme();

  const [hasInit, setHasInit] = useState(false);

  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    if (hasInit) {
      setCollapsed(!show);
    }
  }, [hasInit, show]);

  const fiatCurrency = priceStore.getFiatCurrency(priceStore.defaultVsCurrency);

  if (!fiatCurrency) {
    return null;
  }

  return (
    <Box position="relative" alignY="center">
      <Body2
        color={
          theme.mode === "light"
            ? ColorPalette["gray-400"]
            : ColorPalette["gray-50"]
        }
        style={{
          opacity: 0,
        }}
      >
        {fiatCurrency.symbol}
      </Body2>
      <Box position="absolute" width="100%">
        <VerticalCollapseTransition
          transitionAlign="center"
          collapsed={collapsed}
          onResize={() => {
            setHasInit(true);
          }}
          onTransitionEnd={onTransitionEnd}
        >
          <Body2
            color={
              theme.mode === "light"
                ? ColorPalette["gray-400"]
                : ColorPalette["gray-50"]
            }
          >
            {fiatCurrency.symbol}
          </Body2>
        </VerticalCollapseTransition>
      </Box>
    </Box>
  );
});

const BottomPriceButton: FunctionComponent<{
  text: string;
  onClick: () => void;
}> = ({ text, onClick }) => {
  const theme = useTheme();

  return (
    <Box marginTop="0.375rem" marginLeft="0.375rem" alignX="left">
      <Box
        color={
          theme.mode === "light"
            ? ColorPalette["gray-400"]
            : ColorPalette["gray-300"]
        }
        hover={{
          color:
            theme.mode === "light"
              ? ColorPalette["gray-300"]
              : ColorPalette["gray-200"],
        }}
        onClick={(e) => {
          e.preventDefault();

          onClick();
        }}
        cursor="pointer"
      >
        <Columns sum={1} alignY="center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="1.125rem"
            height="1.125rem"
            fill="none"
            viewBox="0 0 20 20"
          >
            <path
              fill="currentColor"
              fillRule="evenodd"
              d="M13.2 2.24a.75.75 0 00.04 1.06l2.1 1.95H6.75a.75.75 0 000 1.5h8.59l-2.1 1.95a.75.75 0 101.02 1.1l3.5-3.25a.75.75 0 000-1.1l-3.5-3.25a.75.75 0 00-1.06.04zm-6.4 8a.75.75 0 00-1.06-.04l-3.5 3.25a.75.75 0 000 1.1l3.5 3.25a.75.75 0 101.02-1.1l-2.1-1.95h8.59a.75.75 0 000-1.5H4.66l2.1-1.95a.75.75 0 00.04-1.06z"
              clipRule="evenodd"
            />
          </svg>
          <Body3
            style={{
              marginLeft: "0.3rem",
            }}
          >
            {text}
          </Body3>
        </Columns>
      </Box>
    </Box>
  );
};

const MaxButton: FunctionComponent<{
  amountConfig: IAmountConfig;
}> = observer(({ amountConfig }) => {
  const isMax = amountConfig.fraction === 1;
  const theme = useTheme();

  return (
    <Box
      cursor="pointer"
      height="1.625rem"
      alignX="center"
      alignY="center"
      paddingX="0.5rem"
      color={
        isMax
          ? theme.mode === "light"
            ? ColorPalette["purple-400"]
            : ColorPalette["gray-300"]
          : theme.mode === "light"
          ? ColorPalette["purple-400"]
          : ColorPalette["gray-10"]
      }
      backgroundColor={
        theme.mode === "light"
          ? ColorPalette["purple-50"]
          : ColorPalette["gray-500"]
      }
      borderRadius="0.25rem"
      borderWidth={"1px"}
      borderColor={
        isMax
          ? theme.mode === "light"
            ? ColorPalette["purple-200"]
            : ColorPalette["gray-300"]
          : theme.mode === "light"
          ? ColorPalette["purple-50"]
          : ColorPalette["gray-500"]
      }
      hover={{
        color: isMax
          ? theme.mode === "light"
            ? ColorPalette["purple-500"]
            : ColorPalette["gray-300"]
          : theme.mode === "light"
          ? ColorPalette["purple-400"]
          : ColorPalette["white"],
        backgroundColor: isMax
          ? theme.mode === "light"
            ? ColorPalette["purple-100"]
            : ColorPalette["gray-500"]
          : theme.mode === "light"
          ? ColorPalette["purple-100"]
          : ColorPalette["gray-550"],
        borderColor: isMax
          ? theme.mode === "light"
            ? ColorPalette["purple-300"]
            : ColorPalette["gray-400"]
          : theme.mode === "light"
          ? ColorPalette["purple-100"]
          : ColorPalette["gray-550"],
      }}
      onClick={(e) => {
        e.preventDefault();

        if (amountConfig.fraction > 0) {
          amountConfig.setFraction(0);
        } else {
          amountConfig.setFraction(1);
        }
      }}
    >
      <Button2
        style={{
          fontSize: "0.85rem",
        }}
      >
        <FormattedMessage id="components.input.amount-input.max-button" />
      </Button2>
    </Box>
  );
});
