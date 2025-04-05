import { Container, Typography } from "@mui/material";
import { DemographicsForm } from "../components/DqqCalculator/DemographicsForm.tsx";

export const UserSettings = () => {
  return (
    <Container maxWidth="xl">
      <Typography variant="h4" textAlign="center" mt={5} mb={4}>
        User Settings
      </Typography>
      <DemographicsForm />
    </Container>
  );
};
