import React, { FunctionComponent, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { observer } from "mobx-react-lite";
import { useForm } from "react-hook-form";
// import {Button} from '../../../components/button';
import { useStyle } from "../../../styles";
import { useNavigation } from "@react-navigation/native";
// import {StackNavProp} from '../../../navigation';
import { Bip44PathView, useBIP44PathState } from "../components/bip-path-44";
import { InteractionManager, Text } from "react-native";
import { Gutter } from "../../../components/gutter";
import { Box } from "../../../components/box";
import { App } from "@owallet/ledger-cosmos";
import { RectButton } from "../../../components/rect-button";
import { XAxis } from "../../../components/axis";
// import {ArrowDownFillIcon} from '../../../components/icon/arrow-donw-fill';
// import {SelectItemModal} from '../../../components/modal/select-item-modal';
import { ScrollViewRegisterContainer } from "../components/scroll-view-register-container";
import { VerticalCollapseTransition } from "../../../components/transition";
import { NamePasswordInput } from "../components/name-password-input";
// import {useEffectOnce} from '../../../hooks';
import OWIcon from "@components/ow-icon/ow-icon";
import { SelectItemModal } from "@src/modals/select-item-modal";
import { SCREENS } from "@common/constants";
import { useEffectOnce } from "@hooks/use-effect-once";
import { OWButton } from "@components/button";

export const ConnectHardwareWalletScreen: FunctionComponent = observer(() => {
  const intl = useIntl();
  const style = useStyle();
  const navigation = useNavigation();

  const bip44PathState = useBIP44PathState(true);
  const [isOpenBip44PathView, setIsOpenBip44PathView] = React.useState(false);
  const [isOpenSelectItemModal, setIsOpenSelectItemModal] = useState(false);

  const supportedApps: {
    key: App;
    title: string;
  }[] = [
    {
      key: "Cosmos",
      title: intl.formatMessage({
        id: "pages.register.name-password-hardware.connect-to-cosmos",
      }),
    },
    {
      key: "Terra",
      title: intl.formatMessage({
        id: "pages.register.name-password-hardware.connect-to-terra",
      }),
    },
    {
      key: "Secret",
      title: intl.formatMessage({
        id: "pages.register.name-password-hardware.connect-to-secret",
      }),
    },
  ];
  const [selectedApp, setSelectedApp] = React.useState<App>("Cosmos");

  const {
    control,
    handleSubmit,
    getValues,
    setFocus,
    formState: { errors },
  } = useForm<{
    name: string;
    password: string;
    confirmPassword: string;
  }>({
    defaultValues: {
      name: "",
      password: "",
      confirmPassword: "",
    },
  });

  useEffectOnce(() => {
    InteractionManager.runAfterInteractions(() => {
      setFocus("name");
    });
  });

  const onSubmit = handleSubmit(async (data) => {
    navigation.navigate(SCREENS.ConnectNewLedger, {
      name: data.name,
      password: data.password,
      stepPrevious: 1,
      stepTotal: 3,
      bip44Path: bip44PathState.getPath(),
      app: selectedApp,
    });
  });

  return (
    <ScrollViewRegisterContainer
      paragraph={`${intl.formatMessage({
        id: "pages.register.components.header.header-step.title",
      })} 1/3`}
      bottomButton={{
        text: intl.formatMessage({
          id: "button.next",
        }),
        size: "large",
        onPress: onSubmit,
      }}
      paddingX={20}
    >
      <NamePasswordInput
        control={control}
        errors={errors}
        getValues={getValues}
        setFocus={setFocus}
        onSubmit={onSubmit}
      />

      <Gutter size={16} />

      <Text style={style.flatten(["subtitle3", "color-gray-100"])}>
        <FormattedMessage id="pages.register.name-password-hardware.connect-to" />
      </Text>

      <Gutter size={6} />

      <RectButton
        style={style.flatten([
          "padding-x-16",
          "padding-y-16",
          "border-width-1",
          "border-color-gray-400",
          "border-radius-8",
        ])}
        onPress={() => {
          setIsOpenSelectItemModal(true);
        }}
      >
        <XAxis alignY="center">
          <Text style={style.flatten(["body2", "color-gray-50", "flex-1"])}>
            {supportedApps.find((item) => item.key === selectedApp)?.title}
          </Text>

          <OWIcon
            name={"arrow_down_2"}
            size={24}
            color={style.get("color-gray-300").color}
          />
        </XAxis>
      </RectButton>

      <Gutter size={16} />

      <VerticalCollapseTransition collapsed={isOpenBip44PathView}>
        <Box alignX="center">
          <OWButton
            label={intl.formatMessage({ id: "button.advanced" })}
            size="small"
            // color="secondary"
            onPress={() => {
              setIsOpenBip44PathView(true);
            }}
          />
        </Box>
      </VerticalCollapseTransition>
      {
        <VerticalCollapseTransition collapsed={!isOpenBip44PathView}>
          <Bip44PathView
            isLedger={true}
            state={bip44PathState}
            setIsOpen={setIsOpenBip44PathView}
          />
        </VerticalCollapseTransition>
      }
      <Gutter size={16} />

      <SelectItemModal
        isOpen={isOpenSelectItemModal}
        close={() => setIsOpenSelectItemModal(false)}
        items={supportedApps.map((item) => ({
          key: item.key,
          title: item.title,
          selected: item.key === selectedApp,
          onSelect: () => {
            setSelectedApp(item.key);
            setIsOpenSelectItemModal(false);
          },
        }))}
      />
    </ScrollViewRegisterContainer>
  );
});
