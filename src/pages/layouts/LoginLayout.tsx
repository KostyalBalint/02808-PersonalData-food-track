import {
  Backdrop,
  Box,
  Card,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import { FC, PropsWithChildren } from "react";
import { LogoText } from "../../components/LogoText.tsx";

type LoginLayoutProps = {
  loading?: boolean;
};

export const LoginLayout: FC<PropsWithChildren<LoginLayoutProps>> = (props) => {
  return (
    <>
      <Box
        sx={{
          height: "100vh",
          width: "100vw",
          background:
            "url(https://images.pexels.com/photos/793759/pexels-photo-793759.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "brightness(0.5)",
          position: "absolute",
        }}
      />
      <Box
        sx={{
          height: "100vh",
          width: "100vw",
          position: "absolute",
        }}
      >
        <Stack
          direction="column"
          justifyContent="center"
          alignItems="center"
          sx={{ height: "100%" }}
        >
          <Card
            sx={{
              p: 2,
              width: {
                xs: "90%",
                sm: "50%",
                md: "30%",
                lg: "20%",
              },
              height: "auto",
            }}
          >
            <Stack justifyContent="center" gap={2} height="100%">
              <Typography variant="h1" textAlign="center">
                Login to <LogoText />
              </Typography>

              {props.children}
            </Stack>
          </Card>
        </Stack>
      </Box>
      <Backdrop
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={props.loading ?? false}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
    </>
  );
};
