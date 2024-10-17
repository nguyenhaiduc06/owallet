import React, {
  Children,
  FunctionComponent,
  isValidElement,
  PropsWithChildren,
} from "react";
import { ColumnsProps } from "./types";

import { Column } from "./column";
import { Gutter } from "../gutter";
import { View } from "react-native";
import { useStyle } from "../../styles";
import { flattenFragment } from "@utils/fragment";

export const Columns: FunctionComponent<PropsWithChildren<ColumnsProps>> = ({
  children,
  sum,
  columnAlign,
  alignY,
  gutter,
}) => {
  const array = Children.toArray(flattenFragment(children));
  const style = useStyle();

  let columnWeightSum = 0;
  array.forEach((child) => {
    if (isValidElement(child) && child.type === Column) {
      const weight = child.props.weight;
      if (weight) {
        columnWeightSum += weight;
      }
    }
  });

  const remainingWeight = Math.max(sum - columnWeightSum, 0);
  const alignItems = (() => {
    switch (alignY) {
      case "top":
        return "items-start";
      case "bottom":
        return "items-end";
      case "center":
        return "items-center";
      default:
    }
  })();

  return (
    <View
      style={style.flatten(["flex-row"], [alignItems && (alignItems as any)])}
    >
      {remainingWeight > 0
        ? (() => {
            if (columnAlign === "right") {
              return <Column weight={remainingWeight} />;
            }

            if (columnAlign === "center") {
              return <Column weight={remainingWeight / 2} />;
            }
          })()
        : null}
      {array.map((child, i) => {
        if (isValidElement(child) && child.type === Gutter) {
          return <React.Fragment key={i}>{child}</React.Fragment>;
        }

        if (!gutter || i === array.length - 1) {
          return <React.Fragment key={i}>{child}</React.Fragment>;
        }

        if (i + 1 < array.length) {
          const next = array[i + 1];
          if (isValidElement(next) && next.type === Gutter) {
            return <React.Fragment key={i}>{child}</React.Fragment>;
          }
        }

        return (
          <React.Fragment key={i}>
            {child}
            <Gutter size={gutter} direction="horizontal" />
          </React.Fragment>
        );
      })}
      {remainingWeight > 0
        ? (() => {
            if (columnAlign === "center") {
              return <Column weight={remainingWeight / 2} />;
            }

            if (columnAlign !== "right" && columnWeightSum !== 0) {
              return <Column weight={remainingWeight} />;
            }

            return null;
          })()
        : null}
    </View>
  );
};
