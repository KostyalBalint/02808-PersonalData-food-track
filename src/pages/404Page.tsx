import React from "react";
import { Button, Container, Typography } from "@mui/material";
import { IoHomeOutline } from "react-icons/io5";

export const Page404: React.FC = () => {
  const handleGoHome = () => {
    window.location.href = "/";
  };

  return (
    <Container
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
        textAlign: "center",
      }}
    >
      <Typography variant="h1" style={{ fontWeight: "bold" }}>
        404 Not found
      </Typography>
      <Container maxWidth="sm">
        <img
          src="./undraw_feeling-blue.svg"
          alt="Feeling blue"
          style={{ width: "100%" }}
        />
      </Container>
      <Typography variant="h5" style={{ margin: "20px 0" }}>
        Oops! Looks like you took a wrong turn.
      </Typography>
      <Button
        variant="contained"
        startIcon={<IoHomeOutline />}
        color="secondary"
        onClick={handleGoHome}
        style={{ textTransform: "none" }}
      >
        Take Me Home
      </Button>
    </Container>
  );
};
