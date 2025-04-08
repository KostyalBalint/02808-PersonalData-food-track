// src/pages/AdminPage.tsx
import React, { useEffect, useState } from "react";
import { collection, doc, getDocs, query, updateDoc } from "firebase/firestore";
import {
  DataGrid,
  GridActionsCellItem,
  GridColDef,
  GridRowParams,
} from "@mui/x-data-grid";
import {
  Alert,
  Box,
  CircularProgress,
  Container,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Tooltip,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import CheckIcon from "@mui/icons-material/Check";
import LoginIcon from "@mui/icons-material/Login"; // Icon for impersonate
import { useAuth } from "../../../context/AuthContext.tsx";
import { Role } from "../../pages.ts";
import { db } from "../../../firebaseConfig.ts";
import { useSnackbar } from "notistack";

// Define a type for the user data fetched from Firestore for the table
interface UserData {
  id: string; // Firestore document ID (which is user.uid)
  email: string | null;
  displayName: string | null;
  role: Role;
}

const UserManagement: React.FC = () => {
  // Get auth context values needed for impersonation
  const {
    isAdmin,
    actualUserProfile, // The admin's own profile
    startImpersonation,
    isImpersonating, // To potentially disable actions while already impersonating
  } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [editRowId, setEditRowId] = useState<string | null>(null); // Track which row is being edited

  const availableRoles: Role[] = ["ADMIN", "CONTROLL", "SUBJECT"]; // All possible roles

  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        const usersCollectionRef = collection(db, "users");
        const q = query(usersCollectionRef);
        const querySnapshot = await getDocs(q);

        const usersData = querySnapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              email: doc.data().email || "N/A",
              displayName: doc.data().displayName || "N/A",
              role: doc.data().role || "SUBJECT",
            }) as UserData,
        );

        setUsers(usersData);
      } catch (err) {
        console.error("Error fetching users:", err);
        setError("Failed to load users. Check console for details.");
        enqueueSnackbar("Error fetching users", { variant: "error" });
      } finally {
        setLoading(false);
      }
    };

    if (isAdmin) {
      fetchUsers();
    } else {
      setError("You do not have permission to view this page.");
      setLoading(false);
    }
  }, [isAdmin, enqueueSnackbar]); // Add enqueueSnackbar dependency

  const handleRoleChange = async (id: string, newRole: Role) => {
    console.log(`Attempting to change role for user ${id} to ${newRole}`);
    const userDocRef = doc(db, "users", id);
    try {
      await updateDoc(userDocRef, {
        role: newRole,
      });

      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === id ? { ...user, role: newRole } : user,
        ),
      );
      setEditRowId(null);
      enqueueSnackbar(`Role updated successfully for user ${id}`, {
        variant: "success",
      });
      console.log(`Successfully updated role for user ${id} to ${newRole}`);
      // Potentially trigger cloud function for custom claims here
    } catch (err) {
      console.error("Error updating user role:", err);
      setError(`Failed to update role for user ${id}.`);
      enqueueSnackbar(`Error updating role for user ${id}`, {
        variant: "error",
      });
    }
  };

  const handleStartImpersonation = async (targetUid: string) => {
    if (!isAdmin) {
      enqueueSnackbar("Permission Denied.", { variant: "error" });
      return;
    }
    if (isImpersonating) {
      enqueueSnackbar("Stop current impersonation session first.", {
        variant: "warning",
      });
      return;
    }
    if (actualUserProfile?.uid === targetUid) {
      enqueueSnackbar("You cannot impersonate yourself.", { variant: "info" });
      return;
    }

    try {
      await startImpersonation(targetUid);
      enqueueSnackbar(`Started impersonating user ${targetUid}`, {
        variant: "info",
      });
      // Optional: Navigate away or refresh page if needed,
      // but usually the context change handles UI updates.
    } catch (error) {
      console.error("Failed to start impersonation:", error);
      enqueueSnackbar("Failed to start impersonation. See console.", {
        variant: "error",
      });
    }
  };

  const columns: GridColDef<UserData>[] = [
    // Add UserData type here
    { field: "id", headerName: "User ID (UID)", width: 250 },
    {
      field: "displayName",
      headerName: "Display Name",
      width: 200,
      editable: false,
    },
    { field: "email", headerName: "Email", width: 250, editable: false },
    {
      field: "role",
      headerName: "Role",
      width: 150,
      renderCell: (params) => {
        // If this row is being edited, show the Select component
        if (params.id === editRowId) {
          return (
            <Select
              value={params.value}
              onChange={(event: SelectChangeEvent<Role>) => {
                handleRoleChange(
                  params.id.toString(),
                  event.target.value as Role,
                );
              }}
              size="small"
              sx={{ width: "100%" }}
              onBlur={() => setEditRowId(null)}
              autoFocus
              disabled={isImpersonating} // Disable role editing while impersonating
            >
              {availableRoles.map((roleOption) => (
                <MenuItem key={roleOption} value={roleOption}>
                  {roleOption}
                </MenuItem>
              ))}
            </Select>
          );
        }
        return params.value;
      },
    },
    {
      field: "actions",
      type: "actions",
      headerName: "Actions",
      width: 150, // Increased width for two icons
      cellClassName: "actions",
      getActions: (params: GridRowParams<UserData>) => {
        // Use GridRowParams<UserData>
        const isInEditMode = editRowId === params.id;
        const isCurrentUser = actualUserProfile?.uid === params.id;
        // Optional: Prevent impersonating other admins
        // const isTargetAdmin = params.row.role === 'ADMIN';

        const actions = [];

        if (isInEditMode) {
          actions.push(
            <GridActionsCellItem
              key={`edit-${params.id}`}
              icon={<CheckIcon />}
              label="Editing"
              sx={{ color: "primary.main" }}
              disabled
            />,
          );
        } else {
          actions.push(
            <GridActionsCellItem
              key={`edit-action-${params.id}`}
              icon={<EditIcon />}
              label="Edit Role"
              className="textPrimary"
              onClick={() => setEditRowId(params.id.toString())}
              color="inherit"
              disabled={isImpersonating} // Disable role editing while impersonating
            />,
          );
        }

        // Add Impersonate Button
        actions.push(
          <Tooltip
            title={
              isCurrentUser
                ? "Cannot impersonate yourself"
                : isImpersonating
                  ? "Stop current session first"
                  : "Impersonate User"
            }
          >
            {/* Wrap in span for tooltip when disabled */}
            <span>
              <GridActionsCellItem
                key={`impersonate-${params.id}`}
                icon={<LoginIcon />}
                label="Impersonate"
                onClick={() => handleStartImpersonation(params.id.toString())}
                disabled={
                  isCurrentUser || isImpersonating /*|| isTargetAdmin */
                } // Disable if it's the admin themselves, or already impersonating (or target is admin)
                color="primary"
              />
            </span>
          </Tooltip>,
        );

        return actions;
      },
    },
  ];

  if (!isAdmin && !loading && !isImpersonating) {
    // Allow page view if impersonating
    return (
      <Alert severity="error">
        Access Denied: You must be an ADMIN to manage users.
      </Alert>
    );
  }

  if (loading) {
    return <CircularProgress />;
  }

  if (error && !isImpersonating) {
    // Don't show fetch error if admin is just impersonating
    return <Alert severity="error">{error}</Alert>;
  }

  // Show a different message if the admin is viewing this page while impersonating
  if (isImpersonating) {
    return (
      <Container>
        <Alert severity="info" sx={{ mt: 2 }}>
          Currently impersonating. User management actions are disabled.{" "}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault(); /* Stop impersonation logic is in the banner */
            }}
          >
            (Stop Impersonating)
          </a>
        </Alert>
        <Paper sx={{ p: 2, mt: 2 }}>
          {/* Optionally show a read-only view of users or hide the table */}
          <Typography variant="h6" gutterBottom>
            User List (Read-only during impersonation)
          </Typography>
          <DataGrid
            rows={users}
            columns={columns} // Columns will show disabled actions
            pageSizeOptions={[10, 25, 50]}
            checkboxSelection={false}
            sx={{ pointerEvents: "none", opacity: 0.7 }} // Make grid visually disabled
          />
        </Paper>
      </Container>
    );
  }

  // Default view for Admin not impersonating
  return (
    <Box sx={{ width: "100%" }}>
      <Typography variant="h4" gutterBottom>
        Manage Users
      </Typography>
      <DataGrid
        rows={users}
        columns={columns}
        pageSizeOptions={[10, 25, 50]}
        initialState={{
          pagination: {
            paginationModel: { pageSize: 10 },
          },
        }}
        checkboxSelection={false}
      />
    </Box>
  );
};

export default UserManagement;
