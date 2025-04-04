import {
  Box,
  Button,
  ButtonProps,
  Card,
  CardContent,
  Container,
  Divider,
  ListItemText,
  Stack,
  styled,
  Typography,
} from "@mui/material";
import { DemographicsForm } from "../components/DqqCalculator/DemographicsForm.tsx";
import { IoLogOutOutline } from "react-icons/io5";
import { auth } from "../firebaseConfig.ts";
import { useNavigate } from "react-router-dom";
import { grey } from "@mui/material/colors";

const ColorButton = styled(Button)<ButtonProps>(({ theme }) => ({
  color: theme.palette.getContrastText(grey[200]),
  backgroundColor: grey[200],
  "&:hover": {
    backgroundColor: grey[300],
  },
}));

export const UserSettings = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await auth.signOut();
    navigate("/login");
  };

  return (
    <Container maxWidth="xl">
      <Typography variant="h4" textAlign="center" mt={5} mb={4}>
        User Settings
      </Typography>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            <Box>
              <DemographicsForm />
            </Box>
            <Divider />

            <ColorButton sx={{ flexGrow: 0 }} onClick={handleLogout}>
              <Stack direction="row" gap={2} alignItems="center">
                <Typography fontSize={22} lineHeight={0}>
                  <IoLogOutOutline />
                </Typography>
                <ListItemText primary="Logout" />
              </Stack>
            </ColorButton>
          </Stack>
        </CardContent>
      </Card>
    </Container>
  );
};
