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
import { DemographicsForm } from "../../components/DqqCalculator/DemographicsForm.tsx";
import { IoLogOutOutline } from "react-icons/io5";
import { auth } from "../../firebaseConfig.ts";
import { useNavigate } from "react-router-dom";
import { grey } from "@mui/material/colors";
import { InstallPWAButton } from "../../components/InstallPWAButton.tsx";
import { version } from "../../../package.json";
import { ProtectedComponent } from "../../context/ProtectedComponent.tsx";
import UserManagement from "./Admin/UserManagement.tsx";
import TriggerRecommendationButton from "./Admin/TriggerRecommendationButton.tsx";
import FeatureFlagManager from "../../components/FeatureFlags/FeatureFlagManager.tsx";
import { useSnackbar } from "notistack";
import ReindexDashboard from "./Admin/ReindexDashboard.tsx";

const ColorButton = styled(Button)<ButtonProps>(({ theme }) => ({
  color: theme.palette.getContrastText(grey[200]),
  backgroundColor: grey[200],
  "&:hover": {
    backgroundColor: grey[300],
  },
}));

export const Settings = () => {
  const navigate = useNavigate();

  const { enqueueSnackbar } = useSnackbar();

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
            <InstallPWAButton />
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 2, textAlign: "right", width: "100%" }}
            >{`Version: ${version}`}</Typography>
          </Stack>
        </CardContent>
      </Card>
      <ProtectedComponent allowedRoles={["ADMIN"]}>
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={3}>
              <Typography variant="h4" textAlign="center">
                Admin Settings
              </Typography>
              <Divider />
              <UserManagement />
              <Divider />
              <TriggerRecommendationButton
                onError={(e) =>
                  enqueueSnackbar({
                    variant: "error",
                    message: `Error: ${e}`,
                  })
                }
                onSuccess={() =>
                  enqueueSnackbar({
                    variant: "success",
                    message: "Recommendations generated successfully.",
                  })
                }
              />
              <Divider />
              <FeatureFlagManager />
              <Divider />
              <ReindexDashboard />
            </Stack>
          </CardContent>
        </Card>
      </ProtectedComponent>
    </Container>
  );
};
