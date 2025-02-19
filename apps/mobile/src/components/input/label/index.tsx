import React, { FunctionComponent } from "react";
import { useStyle } from "../../../styles";
import { Text } from "react-native";
import { SVGLoadingIcon } from "../../spinner";
import { Columns } from "../../column";
import OWText from "@components/text/ow-text";

export const Label: FunctionComponent<{
  content: string;
  isLoading?: boolean;
}> = ({ content, isLoading }) => {
  const style = useStyle();
  return (
    <Columns sum={1} gutter={4} alignY="center">
      <OWText
        style={style.flatten([
          "margin-left-8",
          "margin-bottom-6",
          "subtitle3",
          // "color-gray-100",
        ])}
      >
        {content}
      </OWText>
      {isLoading ? (
        <SVGLoadingIcon size={16} color={style.get("color-gray-300").color} />
      ) : null}
    </Columns>
  );
};
