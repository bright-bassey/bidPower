import React, { useState, useEffect, useCallback } from "react";
import { createAuctionInvoice } from "../../../services/invoice.service";
import InvoiceModal from "./InvoiceModal";

interface AuctionWinnerControllerProps {
  isActive: boolean;
  isUserWinner: boolean;
  userId: string;
  roomId: string;
  roomName: string;
  winningBid: number;
}

/**
 * This component manages the invoice creation and modal display for auction winners
 */
const AuctionWinnerController: React.FC<AuctionWinnerControllerProps> = ({
  isActive,
  isUserWinner,
  userId,
  roomId,
  roomName,
  winningBid,
}) => {
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);

  // Create an invoice for the winner if conditions are met
  const createInvoiceForWinner = useCallback(async () => {
    // Only create invoice if all conditions are met
    if (
      !isActive ||
      !isUserWinner ||
      !userId ||
      !roomId ||
      winningBid <= 0 ||
      invoiceId ||
      isCreatingInvoice
    ) {
      return;
    }

    try {
      setIsCreatingInvoice(true);
      setError(null);

      console.log("Creating invoice for auction winner:", {
        roomId,
        userId,
        winningBid,
        roomName,
      });

      const invoice = await createAuctionInvoice(
        roomId,
        userId,
        winningBid,
        roomName
      );

      // Save the invoice ID and show the modal
      setInvoiceId(invoice._id);
      setShowModal(true);

      console.log("Invoice created successfully:", invoice);
    } catch (err) {
      console.error("Failed to create invoice for winner:", err);
      setError(err instanceof Error ? err.message : "Failed to create invoice");
    } finally {
      setIsCreatingInvoice(false);
    }
  }, [
    isActive,
    isUserWinner,
    userId,
    roomId,
    winningBid,
    roomName,
    invoiceId,
    isCreatingInvoice,
  ]);

  // Attempt to create an invoice when the component becomes active
  useEffect(() => {
    if (isActive && isUserWinner && !invoiceId && !isCreatingInvoice) {
      createInvoiceForWinner();
    }
  }, [
    isActive,
    isUserWinner,
    invoiceId,
    isCreatingInvoice,
    createInvoiceForWinner,
  ]);

  // Handle manual invoice display request
  const handleShowInvoice = useCallback(() => {
    if (invoiceId) {
      // If we already have an invoice, just show it
      setShowModal(true);
    } else if (!isCreatingInvoice) {
      // Otherwise try to create one
      createInvoiceForWinner();
    }
  }, [invoiceId, isCreatingInvoice, createInvoiceForWinner]);

  // Close the modal
  const handleCloseModal = useCallback(() => {
    setShowModal(false);
  }, []);

  // Render a button to view the invoice for winners
  return (
    <>
      {isUserWinner && (
        <>
          {error && <div className="text-red-500 text-sm mb-2">{error}</div>}

          <button
            onClick={handleShowInvoice}
            disabled={isCreatingInvoice}
            className={`mt-3 w-full ${
              isCreatingInvoice
                ? "bg-gray-400 cursor-wait"
                : "bg-blue-500 hover:bg-blue-600"
            } text-white px-4 py-2 rounded-md text-sm font-medium transition-colors`}
          >
            {isCreatingInvoice
              ? "Creating Invoice..."
              : invoiceId
              ? "View Invoice & Payment"
              : "Generate Invoice"}
          </button>
        </>
      )}

      {/* Invoice Modal */}
      <InvoiceModal
        invoiceId={invoiceId}
        isOpen={showModal}
        onClose={handleCloseModal}
      />
    </>
  );
};

export default AuctionWinnerController;
