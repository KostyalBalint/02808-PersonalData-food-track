import { Card, CardHeader, Container, Grid2 } from "@mui/material";
import { useAuth } from "../hooks/useAuth.tsx";

export const HomePage = () => {
  const { user } = useAuth();

  return (
    <Container sx={{ mt: 2 }}>
      <Grid2 container spacing={2}>
        <Grid2 size={{ xs: 12 }}>
          <Card>
            <CardHeader title={`Hi, ${user?.displayName}`} />
          </Card>
        </Grid2>
        <Grid2 size={{ xs: 12, md: 6, lg: 4 }}>
          <Card>
            <CardHeader title="Last weeks nutition intake" />
          </Card>
        </Grid2>
        <Grid2 size={{ xs: 12, md: 6, lg: 4 }}>
          <Card>
            <CardHeader title="Meal timing histogram" />
          </Card>
        </Grid2>
      </Grid2>
    </Container>
  );
};
