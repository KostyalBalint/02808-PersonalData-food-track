// src/pages/AdminPage.tsx
import React, { useEffect, useState } from "react";
import { collection, doc, getDocs, query, updateDoc } from "firebase/firestore";
import { DataGrid, GridActionsCellItem, GridColDef } from "@mui/x-data-grid";
import {
  Alert,
  Box,
  CircularProgress,
  Container,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit"; // For potential future inline edit
import CheckIcon from "@mui/icons-material/Check";
import { useAuth } from "../../context/AuthContext.tsx";
import { Role } from "../pages.ts";
import { db } from "../../firebaseConfig.ts";

// Define a type for the user data fetched from Firestore for the table
interface UserData {
  id: string; // Firestore document ID (which is user.uid)
  email: string | null;
  displayName: string | null;
  role: Role;
}

const AdminPage: React.FC = () => {
  const { isAdmin } = useAuth(); // Get admin status from context
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [editRowId, setEditRowId] = useState<string | null>(null); // Track which row is being edited

  const availableRoles: Role[] = ["ADMIN", "CONTROLL", "SUBJECT"]; // All possible roles

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        // Query Firestore for all documents in the 'users' collection
        const usersCollectionRef = collection(db, "users");
        const q = query(usersCollectionRef); // Add ordering or filtering if needed
        const querySnapshot = await getDocs(q);

        const usersData = querySnapshot.docs.map(
          (doc) =>
            ({
              id: doc.id, // Use Firestore document ID as the DataGrid row id
              email: doc.data().email || "N/A",
              displayName: doc.data().displayName || "N/A",
              role: doc.data().role || "SUBJECT", // Default if missing
            }) as UserData,
        );

        setUsers(usersData);
      } catch (err) {
        console.error("Error fetching users:", err);
        setError("Failed to load users. Check console for details.");
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if the current user is an Admin
    if (isAdmin) {
      fetchUsers();
    } else {
      setError("You do not have permission to view this page.");
      setLoading(false);
    }
  }, [isAdmin]); // Re-run if admin status changes (unlikely after load, but good practice)

  const handleRoleChange = async (id: string, newRole: Role) => {
    console.log(`Attempting to change role for user ${id} to ${newRole}`);
    const userDocRef = doc(db, "users", id);
    try {
      // Update the role field in Firestore
      await updateDoc(userDocRef, {
        role: newRole,
      });

      // Update the local state to reflect the change immediately
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === id ? { ...user, role: newRole } : user,
        ),
      );
      setEditRowId(null); // Exit edit mode for this row
      console.log(`Successfully updated role for user ${id} to ${newRole}`);

      // *** IMPORTANT: Cloud Functions for Custom Claims ***
      // If using custom claims, you would trigger a Cloud Function here
      // (or have one triggered automatically by the Firestore write)
      // to update the user's custom claims.
      // Example: callCloudFunction('updateUserRole', { uid: id, newRole: newRole });
    } catch (error) {
      console.error("Error updating user role:", error);
      setError(`Failed to update role for user ${id}.`);
      // Optionally revert local state change or show specific error
    }
  };

  const columns: GridColDef[] = [
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
                // Immediately attempt to save when a new role is selected
                handleRoleChange(
                  params.id.toString(),
                  event.target.value as Role,
                );
              }}
              size="small"
              sx={{ width: "100%" }}
              onBlur={() => setEditRowId(null)} // Optionally exit edit mode on blur if no change
              autoFocus
            >
              {availableRoles.map((roleOption) => (
                <MenuItem key={roleOption} value={roleOption}>
                  {roleOption}
                </MenuItem>
              ))}
            </Select>
          );
        }
        // Otherwise, just display the role text
        return params.value;
      },
    },
    {
      field: "actions",
      type: "actions",
      headerName: "Actions",
      width: 100,
      cellClassName: "actions",
      getActions: ({ id }) => {
        const isInEditMode = editRowId === id;

        if (isInEditMode) {
          // While editing, maybe show a cancel/confirm, but here we auto-save on change
          // So just show a "being edited" indicator or nothing actionable
          return [
            <GridActionsCellItem
              icon={<CheckIcon />}
              label="Editing"
              sx={{ color: "primary.main" }}
              disabled // Indicates editing state, action is handled by Select onChange
            />,
          ];
        }

        return [
          <GridActionsCellItem
            icon={<EditIcon />}
            label="Edit Role"
            className="textPrimary"
            onClick={() => setEditRowId(id.toString())} // Enter edit mode for this row
            color="inherit"
          />,
        ];
      },
    },
  ];

  if (!isAdmin && !loading) {
    return (
      <Alert severity="error">
        Access Denied: You must be an ADMIN to manage users.
      </Alert>
    );
  }

  if (loading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Container>
      <Paper sx={{ p: 2, mt: 5 }}>
        <Box sx={{ width: "100%" }}>
          <Typography variant="h4" gutterBottom>
            Manage User Roles
          </Typography>
          <DataGrid
            rows={users}
            columns={columns}
            pageSizeOptions={[10, 25, 50]}
            checkboxSelection={false} // Disable checkbox selection unless needed
            // Optional: Handle row edit stop if needed for more complex scenarios
            // onEditCellPropsChange={(params) => console.log("Edit props change", params)}
            // processRowUpdate might be useful if not auto-saving on change
          />
        </Box>
      </Paper>
    </Container>
  );
};

export default AdminPage;
