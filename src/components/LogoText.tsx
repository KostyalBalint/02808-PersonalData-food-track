import { Typography } from "@mui/material";
import { TypographyProps } from "@mui/material/Typography/Typography";
import { FC } from "react";

export const LogoText: FC<TypographyProps> = (props) => {
  return (
    <Typography
      component="span"
      variant="h1"
      fontWeight={600}
      sx={{
        backgroundImage: `linear-gradient( to left, #455bed, #181773)`,
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
