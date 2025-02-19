import React, { FunctionComponent } from "react";
import { Box } from "../../../../components/box";
import { useNavigate } from "react-router";

export const ProfileButton: FunctionComponent = () => {
  const navigate = useNavigate();

  return (
    <Box
      paddingRight="1rem"
      cursor="pointer"
      onClick={() => {
        navigate("/wallet/select");
      }}
    >
      {/* <ProfileCircleIcon /> */}
      <img
        width={24}
        height={24}
        style={{
          borderRadius: 999,
        }}
        src={require("assets/images/default-avatar.png")}
      />
    </Box>
  );
};
