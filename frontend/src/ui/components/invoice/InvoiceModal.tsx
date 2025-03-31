import React, { useEffect, useState } from "react";
import { useInvoice } from "../../../context/invoice-context";
import { InvoiceStatus } from "../../../services/invoice.service";
import { Payment } from "../../../services/payment.service";
import { getPaymentsByInvoice } from "../../../services/payment.service";

interface InvoiceModalProps {
  invoiceId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const InvoiceModal: React.FC<InvoiceModalProps> = ({
  invoiceId,
  isOpen,
  onClose,
}) => {
  const { currentInvoice, loading, error, fetchInvoiceById, processPayment } =
    useInvoice();
  const [isLoading, setIsLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && invoiceId) {
      const loadInvoice = async () => {
        setIsLoading(true);
        setPaymentError(null);
        setPaymentSuccess(false);

        try {
          console.log("Fetching invoice details for:", invoiceId);
          await fetchInvoiceById(invoiceId);
          const invoicePayments = await getPaymentsByInvoice(invoiceId);
          setPayments(invoicePayments);
        } catch (err) {
          console.error("Failed to load invoice details:", err);
        } finally {
          setIsLoading(false);
        }
      };

      loadInvoice();
    }
  }, [invoiceId, isOpen, fetchInvoiceById]);

  const handlePayNow = async () => {
    if (!currentInvoice || !invoiceId) return;

    setIsProcessing(true);
    setPaymentError(null);

    try {
      await processPayment(invoiceId);
      const invoicePayments = await getPaymentsByInvoice(invoiceId);
      setPayments(invoicePayments);
      setPaymentSuccess(true);
    } catch (err) {
      console.error("Payment failed:", err);
      setPaymentError(
        err instanceof Error ? err.message : "Payment processing failed"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="relative bg-white rounded-lg shadow-xl mx-auto max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="absolute top-0 right-0 pt-4 pr-4">
          <button
            type="button"
            className="text-gray-400 hover:text-gray-500"
            onClick={onClose}
          >
            <span className="sr-only">Close</span>
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Invoice Details
        </h2>

        {isLoading || loading ? (
          <div className="flex justify-center items-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error || !currentInvoice ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            <p className="font-medium">Error loading invoice</p>
            <p className="mt-1">{error || "Invoice not found"}</p>
          </div>
        ) : (
          <div>
            {/* Success message if payment was successful */}
            {paymentSuccess && (
              <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
                <p className="font-medium">Payment successful!</p>
                <p>Your payment has been processed successfully.</p>
              </div>
            )}

            {/* Error message if payment failed */}
            {paymentError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                <p className="font-medium">Payment failed</p>
                <p>{paymentError}</p>
              </div>
            )}

            {/* Invoice header */}
            <div className="border-b border-gray-200 pb-4 mb-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  Invoice #{currentInvoice.invoiceNumber}
                </h3>
                <div>
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${
                        currentInvoice.status === InvoiceStatus.PAID
                          ? "bg-green-100 text-green-800"
                          : currentInvoice.status === InvoiceStatus.PROCESSING
                          ? "bg-blue-100 text-blue-800"
                          : currentInvoice.status === InvoiceStatus.CANCELLED ||
                            currentInvoice.status === InvoiceStatus.FAILED
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                  >
                    {currentInvoice.status}
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Created on{" "}
                {new Date(currentInvoice.createdAt).toLocaleDateString()} at{" "}
                {new Date(currentInvoice.createdAt).toLocaleTimeString()}
              </p>
            </div>

            {/* Invoice details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Total Amount
                </p>
                <p className="text-xl font-bold text-gray-900">
                  ${currentInvoice.totalAmount.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Status</p>
                <p className="text-base font-medium text-gray-900">
                  {currentInvoice.status}
                </p>
              </div>
            </div>

            {/* Line items */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Items</h4>
              <div className="border rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentInvoice.items?.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {item.description}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">
                          ${item.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    {/* Tax row */}
                    <tr className="bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-500">
                        Tax
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-500 text-right">
                        ${currentInvoice.tax.toFixed(2)}
                      </td>
                    </tr>
                    {/* Total row */}
                    <tr className="bg-gray-50">
                      <td className="px-4 py-3 text-sm font-bold text-gray-900">
                        Total
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                        ${currentInvoice.totalAmount.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payment history */}
            {payments.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-500 mb-2">
                  Payment History
                </h4>
                <div className="border rounded-md overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {payments.map((payment) => (
                        <tr key={payment._id}>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {new Date(payment.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            ${payment.amount.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                ${
                                  payment.status === "completed"
                                    ? "bg-green-100 text-green-800"
                                    : payment.status === "processing"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                            >
                              {payment.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Pay Now button - only show if invoice is pending and no successful payments */}
            {currentInvoice.status === InvoiceStatus.PENDING &&
              !payments.some((p) => p.status === "completed") && (
                <div className="flex justify-end mt-6">
                  <button
                    type="button"
                    className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                      isProcessing ? "opacity-75 cursor-not-allowed" : ""
                    }`}
                    onClick={handlePayNow}
                    disabled={isProcessing || paymentSuccess}
                  >
                    {isProcessing ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Processing...
                      </>
                    ) : (
                      "Pay Now"
                    )}
                  </button>
                </div>
              )}

            {/* Footer with close button */}
            <div className="flex justify-start mt-6">
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceModal;
