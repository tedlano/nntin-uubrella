import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom"; // Import useSearchParams
import { getAllItems, deleteItem } from "../utils/api";
import { Item } from "../types/item";

// MUI Imports
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox"; // Import Checkbox

// MUI Icons
import DeleteIcon from "@mui/icons-material/Delete";
import LinkIcon from "@mui/icons-material/Link"; // For linking to item page

/**
 * Admin page component for viewing and managing all hidden items.
 * Requires an 'admin_key' query parameter in the URL for authorization.
 */
export default function AdminPage() {
  const [items, setItems] = useState<Item[]>([]); // List of all items fetched
  const [selectedItems, setSelectedItems] = useState<string[]>([]); // IDs of items selected for bulk actions
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
      // Sort items by creation date, newest first
      const sortedItems = response.items.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      setItems(sortedItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load items");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleDeleteClick = (itemId: string) => {
    setDeleteItemId(itemId);
    setDeleteError(null); // Clear previous delete error
  };

  const handleCloseDeleteDialog = () => {
    setDeleteItemId(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteItemId) return;
    if (!adminKey) {
      // Also check for adminKey here
      setDeleteError("Admin key is missing from URL. Cannot delete item.");
      return;
    }
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteItem(deleteItemId, adminKey); // Pass adminKey
      // Remove item from local state after successful deletion
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

  // --- Selection Handlers ---
  /**
   * Handles the click event on the 'select all' checkbox in the table header.
   * Selects or deselects all items based on the checkbox state.
   */
  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelecteds = items.map((n) => n.item_id);
      setSelectedItems(newSelecteds);
      return;
    }
    setSelectedItems([]);
  };

  /**
   * Handles the click event on an individual row's checkbox or the row itself.
   * Toggles the selection state of the clicked item.
   */
  const handleSelectOneClick = (
    event: React.ChangeEvent<HTMLInputElement>, // Keep original type, casting done at call site
    id: string,
  ) => {
    const selectedIndex = selectedItems.indexOf(id);
    let newSelected: string[] = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selectedItems, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selectedItems.slice(1));
    } else if (selectedIndex === selectedItems.length - 1) {
      newSelected = newSelected.concat(selectedItems.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selectedItems.slice(0, selectedIndex),
        selectedItems.slice(selectedIndex + 1),
      );
    }
    setSelectedItems(newSelected);
  };

  /** Checks if a given item ID is currently selected. */
  const isSelected = (id: string) => selectedItems.indexOf(id) !== -1;
  // --- End Selection Handlers ---

  // --- Bulk Delete Handler ---
  /**
   * Handles the confirmation of the bulk delete action.
   * Iterates through selected item IDs, calls the delete API for each,
   * updates state based on success/failure, and displays errors.
   */
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

    // Use Promise.allSettled to attempt all deletions even if some fail
    const results = await Promise.allSettled(
      selectedItems.map((id) => deleteItem(id, adminKey)),
    );

    results.forEach((result, index) => {
      const itemId = selectedItems[index];
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

    // Clear selection
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
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }} aria-label="all items table">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    color="primary"
                    indeterminate={
                      selectedItems.length > 0 &&
                      selectedItems.length < items.length
                    }
                    checked={
                      items.length > 0 && selectedItems.length === items.length
                    }
                    onChange={handleSelectAllClick}
                    inputProps={{
                      "aria-label": "select all items",
                    }}
                  />
                </TableCell>
                <TableCell>Created At</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Visibility</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Item ID</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => {
                const isItemSelected = isSelected(item.item_id);
                const labelId = `enhanced-table-checkbox-${item.item_id}`;

                return (
                  <TableRow
                    hover
                    onClick={(event) =>
                      handleSelectOneClick(event as any, item.item_id)
                    } // Cast event for simplicity, refine if needed
                    role="checkbox"
                    aria-checked={isItemSelected}
                    tabIndex={-1}
                    key={item.item_id}
                    selected={isItemSelected}
                    sx={{
                      cursor: "pointer",
                      "&:last-child td, &:last-child th": { border: 0 },
                    }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        color="primary"
                        checked={isItemSelected}
                        inputProps={{
                          "aria-labelledby": labelId,
                        }}
                      />
                    </TableCell>
                    <TableCell component="th" scope="row" id={labelId}>
                      {new Date(item.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>{item.title}</TableCell>
                    <TableCell>{item.visibility}</TableCell>
                    <TableCell>{item.category || "N/A"}</TableCell>
                    <TableCell>
                      <code>{item.item_id}</code>
                    </TableCell>
                    <TableCell align="right">
                      {/* TODO: Add link to item page if needed */}
                      {/* <Tooltip title="View Item">
                                            <IconButton size="small" component="a" href={`/items/${item.item_id}`} target="_blank">
                                                <LinkIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip> */}
                      <Tooltip title="Delete Item">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteClick(item.item_id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ); // Add closing parenthesis for the return statement
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Delete Confirmation Dialog */}
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
