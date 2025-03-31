import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { getAllItems, deleteItem } from "../utils/api";
import { Item } from "../types/item";
import { DataGrid, GridColDef, GridToolbar, GridRowSelectionModel } from '@mui/x-data-grid'; // Import DataGrid components

// MUI Imports
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
// Removed Table imports: Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Button from "@mui/material/Button";
// Removed Checkbox import as DataGrid handles it

// MUI Icons
import DeleteIcon from "@mui/icons-material/Delete";
// Removed LinkIcon as row click handles navigation
// Removed Map import if not used elsewhere on this page

/**
 * Admin page component for viewing and managing all hidden items using DataGrid.
 * Requires an 'admin_key' query parameter in the URL for authorization.
 */
export default function AdminPage() {
  const [items, setItems] = useState<Item[]>([]); // List of all items fetched
  const [selectedItems, setSelectedItems] = useState<GridRowSelectionModel>([]); // Use GridRowSelectionModel (string[] or number[])
  const [isLoading, setIsLoading] = useState(true); // Loading state for fetching items
  const [error, setError] = useState<string | null>(null); // Error message during item fetch
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null); // ID of the item currently targeted for single deletion confirmation
  const [isDeleting, setIsDeleting] = useState(false); // Loading state for single item deletion
  const [deleteError, setDeleteError] = useState<string | null>(null); // Error message for single item deletion
  const [bulkDeleteError, setBulkDeleteError] = useState<string | null>(null); // Error message for bulk delete operation
  const [isBulkDeleting, setIsBulkDeleting] = useState(false); // Loading state for bulk delete operation
  const [showBulkConfirm, setShowBulkConfirm] = useState(false); // Controls visibility of the bulk delete confirmation dialog

  // Get admin_key from URL query parameters
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const adminKey = searchParams.get("admin_key");

  const fetchItems = useCallback(async () => {
    if (!adminKey) {
      setError(
        "Admin key is missing from URL. Please provide ?admin_key=YOUR_KEY",
      );
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await getAllItems(adminKey); // Pass adminKey
      // No need for manual sorting here, DataGrid handles it
      setItems(response.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load items");
    } finally {
      setIsLoading(false);
    }
  }, [adminKey]); // Dependency is just adminKey now

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleDeleteClick = (event: React.MouseEvent, itemId: string) => {
    event.stopPropagation(); // Prevent row click navigation when clicking delete
    setDeleteItemId(itemId);
    setDeleteError(null); // Clear previous delete error
  };

  const handleCloseDeleteDialog = () => {
    setDeleteItemId(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteItemId || !adminKey) return; // Simplified check

    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteItem(deleteItemId, adminKey); // Pass adminKey
      // DataGrid will update automatically if 'items' state changes
      setItems((prevItems) =>
        prevItems.filter((item) => item.item_id !== deleteItemId),
      );
      setDeleteItemId(null); // Close dialog
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete item",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // --- Bulk Delete Handler ---
  const handleConfirmBulkDelete = async () => {
    if (!adminKey) {
      setBulkDeleteError("Admin key is missing from URL. Cannot delete items.");
      return;
    }
    if (selectedItems.length === 0) return;

    setIsBulkDeleting(true);
    setBulkDeleteError(null);
    const errors: string[] = [];
    const successfullyDeleted: string[] = [];
    const itemsToDelete = selectedItems as string[]; // Cast selection model

    // Use Promise.allSettled to attempt all deletions even if some fail
    const results = await Promise.allSettled(
      itemsToDelete.map((id) => deleteItem(id, adminKey)),
    );

    results.forEach((result, index) => {
      const itemId = itemsToDelete[index];
      if (result.status === "fulfilled") {
        successfullyDeleted.push(itemId);
      } else {
        // Attempt to extract a meaningful error message
        let errMsg = `Failed to delete item ${itemId}`;
        if (result.reason instanceof Error) {
          errMsg = `${errMsg}: ${result.reason.message}`;
        } else if (typeof result.reason === "string") {
          errMsg = `${errMsg}: ${result.reason}`;
        }
        errors.push(errMsg);
        console.error(`Failed to delete item ${itemId}:`, result.reason);
      }
    });

    // Update local state: remove successfully deleted items
    if (successfullyDeleted.length > 0) {
      setItems((prevItems) =>
        prevItems.filter((item) => !successfullyDeleted.includes(item.item_id)),
      );
    }

    // Clear selection (DataGrid selection model is controlled)
    setSelectedItems([]);

    // Handle errors
    if (errors.length > 0) {
      setBulkDeleteError(
        `Errors occurred during bulk delete:\n- ${errors.join("\n- ")}`,
      );
    }

    setIsBulkDeleting(false);
    setShowBulkConfirm(false); // Close confirmation dialog
  };
  // --- End Bulk Delete Handler ---

  // --- DataGrid Column Definitions ---
  const columns: GridColDef[] = [
    // Selection checkbox column is added automatically by `checkboxSelection` prop
    {
      field: 'created_at',
      headerName: 'Created At',
      width: 180,
      resizable: true,
      type: 'dateTime', // Use dateTime type for better sorting/filtering
      valueGetter: (value) => value ? new Date(value) : null, // Convert string to Date object
      renderCell: (params) => params.value ? params.value.toLocaleString() : '', // Format for display
    },
    {
      field: 'title',
      headerName: 'Title',
      width: 200,
      resizable: true,
    },
    {
      field: 'visibility',
      headerName: 'Visibility',
      width: 100,
      resizable: true,
    },
    {
      field: 'category',
      headerName: 'Category',
      width: 150,
      resizable: true,
      valueGetter: (value) => value || 'N/A', // Handle null/empty categories
    },
    {
      field: 'item_id',
      headerName: 'Item ID',
      width: 280,
      resizable: true,
      renderCell: (params) => <code>{params.value}</code>, // Render ID as code
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      align: 'center',
      renderCell: (params) => (
        <Tooltip title="Delete Item">
          {/* IconButton needs to stop propagation */}
          <IconButton
            size="small"
            color="error"
            onClick={(event) => handleDeleteClick(event, params.row.item_id)}
            aria-label="delete item"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  return (
    <Container maxWidth="lg">
      {/* Title and Bulk Delete Button Area */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
          mt: 2,
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 0 }}>
          Admin Panel - All Items
        </Typography>
        {selectedItems.length > 0 && (
          <Button
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => setShowBulkConfirm(true)} // Open bulk delete confirmation
            disabled={isBulkDeleting}
          >
            Delete Selected ({selectedItems.length})
          </Button>
        )}
      </Box>

      {/* Loading Indicator */}
      {isLoading && (
        <Box sx={{ display: "flex", justifyContent: "center", my: 5 }}>
          <CircularProgress />
        </Box>
      )}

      {error && !isLoading && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {!isLoading && !error && (
        <Box sx={{ height: 650, width: '100%' }}> {/* DataGrid needs explicit height */}
          <DataGrid
            rows={items}
            columns={columns}
            getRowId={(row) => row.item_id} // Use item_id as the unique ID
            checkboxSelection // Enable checkboxes
            onRowSelectionModelChange={(newSelectionModel) => {
              setSelectedItems(newSelectionModel); // Update state on selection change
            }}
            rowSelectionModel={selectedItems} // Control selection state
            disableRowSelectionOnClick // Prevent selection when clicking cells
            slots={{ toolbar: GridToolbar }} // Add the toolbar
            slotProps={{
              toolbar: {
                showQuickFilter: true, // Enable the quick filter search bar
                printOptions: { disableToolbarButton: true }, // Optional: hide print
                csvOptions: { disableToolbarButton: true }, // Optional: hide CSV export
              },
            }}
            initialState={{ // Optional: Set initial sorting
              sorting: {
                sortModel: [{ field: 'created_at', sort: 'desc' }],
              },
            }}
          />
        </Box>
      )}

      {/* Delete Confirmation Dialog (Single) */}
      <Dialog
        open={!!deleteItemId}
        onClose={handleCloseDeleteDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete item <code>{deleteItemId}</code>?
            This action cannot be undone.
          </DialogContentText>
          {deleteError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {deleteError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            autoFocus
            disabled={isDeleting}
          >
            {isDeleting ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              "Delete"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog
        open={showBulkConfirm}
        onClose={() => setShowBulkConfirm(false)}
        aria-labelledby="bulk-delete-dialog-title"
        aria-describedby="bulk-delete-dialog-description"
      >
        <DialogTitle id="bulk-delete-dialog-title">
          Confirm Bulk Deletion
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="bulk-delete-dialog-description">
            Are you sure you want to delete the selected {selectedItems.length}{" "}
            item(s)? This action cannot be undone.
          </DialogContentText>
          {bulkDeleteError && (
            // Use pre-wrap to preserve newlines in the error message
            <Alert severity="error" sx={{ mt: 2, whiteSpace: "pre-wrap" }}>
              {bulkDeleteError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setShowBulkConfirm(false)}
            disabled={isBulkDeleting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmBulkDelete}
            color="error"
            autoFocus
            disabled={isBulkDeleting}
          >
            {isBulkDeleting ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              "Delete Selected"
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
