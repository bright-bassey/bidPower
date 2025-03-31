import React, { useState } from "react";
import InvoiceModal from "./InvoiceModal";

interface InvoiceButtonProps {
  invoiceId: string;
  className?: string;
  buttonText?: string;
  children?: React.ReactNode;
}

const InvoiceButton: React.FC<InvoiceButtonProps> = ({
  invoiceId,
  className = "inline-flex items-center px-3 py-1.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
  buttonText = "View Invoice",
  children,
}) => {
  const [showModal, setShowModal] = useState(false);

  const handleOpenModal = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  return (
    <>
      <button type="button" className={className} onClick={handleOpenModal}>
        {children || buttonText}
      </button>

      <InvoiceModal
        invoiceId={showModal ? invoiceId : null}
        isOpen={showModal}
        onClose={handleCloseModal}
      />
    </>
  );
};

export default InvoiceButton;
