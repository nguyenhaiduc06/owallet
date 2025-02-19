import React from "react";
import { Text } from "react-native";
import { Box } from "../../components/box";
import { useStyle } from "../../styles";
import { Columns } from "../../components/column";
import { registerModal } from "@src/modals/base";
import OWIcon from "@components/ow-icon/ow-icon";
import { Gutter } from "@components/gutter";
// import {InformationOutlinedIcon} from '../../components/icon/information-outlined';
// import {registerCardModal} from './card';
// import {Gutter} from '../gutter';
export interface InformationModalProps {
  title: string;
  paragraph: string;
  bottomButton?: React.ReactElement;
}

export const InformationModal = registerModal(
  ({ title, paragraph, bottomButton }: InformationModalProps) => {
    const style = useStyle();
    return (
      <Box paddingX={12} paddingBottom={40}>
        <Box>
          <Box>
            <Box paddingBottom={21} paddingTop={9} paddingX={8} alignY="center">
              <Columns sum={1} gutter={10} alignY="center">
                {/*<InformationOutlinedIcon*/}
                {/*  size={24}*/}
                {/*  color={style.get('color-text-low').color}*/}
                {/*/>*/}
                <OWIcon
                  name={"tdesignpersonal-information"}
                  size={24}
                  color={style.get("color-text-low").color}
                />
                <Text style={style.flatten(["h4", "color-text-high"])}>
                  {title}
                </Text>
              </Columns>
            </Box>
            <Text
              style={style.flatten([
                "body2",
                "color-text-middle",
                "padding-x-16",
              ])}
            >
              {paragraph}
            </Text>
            {bottomButton ? (
              <React.Fragment>
                <Gutter size={20} />
                {bottomButton}
              </React.Fragment>
            ) : null}
          </Box>
        </Box>
      </Box>
    );
  }
);
