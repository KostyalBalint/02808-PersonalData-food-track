import { Typography, useTheme } from "@mui/material";
import { TypographyProps } from "@mui/material/Typography/Typography";
import { FC } from "react";

export const LogoText: FC<TypographyProps> = (props) => {
  const theme = useTheme();
  return (
    <Typography
      component="span"
      variant="h1"
      fontWeight={600}
      sx={{
        backgroundImage: `linear-gradient( to left, ${theme.palette.primary.main}, ${theme.palette.warning.main})`,
        backgroundSize: "100%",
        backgroundRepeat: "repeat",
        backgroundClip: "text",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
      }}
      {...props}
    >
      NUTRITION
    </Typography>
  );
};
