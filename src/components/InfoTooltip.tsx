import React, { PropsWithChildren } from "react";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import { styled } from "@mui/material/styles";

interface InfoTooltipProps {
  size?: "small" | "medium" | "large";
}

const CircleIconButton = styled(IconButton)(({ theme }) => ({
  borderRadius: "50%",
  backgroundColor: theme.palette.action.hover,
  padding: 4,
  width: 32,
  height: 32,
  "&:hover": {
    backgroundColor: theme.palette.action.selected,
  },
}));

export const InfoTooltip: React.FC<PropsWithChildren<InfoTooltipProps>> = ({
  size = "medium",
  children,
}) => {
  return (
    <Tooltip title={<div>{children}</div>} arrow placement="top">
      <CircleIconButton size={size}>
        <InfoOutlinedIcon fontSize={size === "small" ? "small" : "medium"} />
      </CircleIconButton>
    </Tooltip>
  );
};
