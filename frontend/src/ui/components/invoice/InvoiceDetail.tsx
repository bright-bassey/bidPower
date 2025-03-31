import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useInvoice } from "../../../context/invoice-context";
import { Invoice, InvoiceStatus } from "../../../services/invoice.service";
import { Payment } from "../../../services/payment.service";
import { getPaymentsByInvoice } from "../../../services/payment.service";

const InvoiceDetail: React.FC = () => {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const { currentInvoice, loading, error, fetchInvoiceById, processPayment } =
    useInvoice();
  const [isLoading, setIsLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useEffect(() => {
    const loadInvoice = async () => {
      if (!invoiceId) return;

      setIsLoading(true);
      try {
        await fetchInvoiceById(invoiceId);
        // Also fetch related payments
        const invoicePayments = await getPaymentsByInvoice(invoiceId);
        setPayments(invoicePayments);
      } catch (err) {
        console.error("Failed to load invoice details:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadInvoice();
  }, [invoiceId, fetchInvoiceById]);

  const handlePayNow = async () => {
    if (!currentInvoice || !invoiceId) return;

    setIsProcessing(true);
    setPaymentError(null);

    try {
      await processPayment(invoiceId);
      // Refresh the payments list
      const invoicePayments = await getPaymentsByInvoice(invoiceId);
      setPayments(invoicePayments);
    } catch (err) {
      console.error("Payment failed:", err);
      setPaymentError(
        err instanceof Error ? err.message : "Payment processing failed"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="flex justify-center items-center py-10">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !currentInvoice) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
        <p className="font-medium">Error loading invoice</p>
        <p className="mt-1">{error || "Invoice not found"}</p>
      </div>
    );
  }

  const invoice: Invoice = currentInvoice;
  const isPaid = invoice.status === InvoiceStatus.PAID;
  const isProcessingStatus = invoice.status === InvoiceStatus.PROCESSING;
  const isCancelled = invoice.status === InvoiceStatus.CANCELLED;
  const isFailed = invoice.status === InvoiceStatus.FAILED;

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="border-b border-gray-200 px-4 py-5 sm:px-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Invoice #{invoice.invoiceNumber}
          </h3>
          <div>
            <span
              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
              ${
                isPaid
                  ? "bg-green-100 text-green-800"
                  : isProcessingStatus
                  ? "bg-blue-100 text-blue-800"
                  : isCancelled
                  ? "bg-red-100 text-red-800"
                  : isFailed
                  ? "bg-red-100 text-red-800"
                  : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {invoice.status}
            </span>
          </div>
        </div>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Created on {new Date(invoice.createdAt).toLocaleDateString()} at{" "}
          {new Date(invoice.createdAt).toLocaleTimeString()}
        </p>
      </div>

      <div className="px-4 py-5 sm:p-6">
        <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
          <div className="sm:col-span-1">
            <dt className="text-sm font-medium text-gray-500">Total Amount</dt>
            <dd className="mt-1 text-xl font-semibold text-gray-900">
              ${invoice.totalAmount.toFixed(2)}
            </dd>
          </div>

          <div className="sm:col-span-1">
            <dt className="text-sm font-medium text-gray-500">Base Amount</dt>
            <dd className="mt-1 text-sm text-gray-900">
              ${invoice.amount.toFixed(2)}
            </dd>
          </div>

          <div className="sm:col-span-1">
            <dt className="text-sm font-medium text-gray-500">Tax</dt>
            <dd className="mt-1 text-sm text-gray-900">
              ${invoice.tax.toFixed(2)}
            </dd>
          </div>

          {isPaid && invoice.paidAt && (
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Paid On</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(invoice.paidAt).toLocaleDateString()} at{" "}
                {new Date(invoice.paidAt).toLocaleTimeString()}
              </dd>
            </div>
          )}
        </dl>

        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-500">Items</h4>
          <ul className="mt-2 divide-y divide-gray-200 border-t border-b border-gray-200">
            {invoice.items.map((item, idx) => (
              <li key={idx} className="py-3 flex justify-between">
                <div className="text-sm text-gray-900">{item.description}</div>
                <div className="text-sm font-medium text-gray-900">
                  ${item.amount.toFixed(2)}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {payments.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-500">
              Payment History
            </h4>
            <ul className="mt-2 divide-y divide-gray-200 border-t border-b border-gray-200">
              {payments.map((payment) => (
                <li key={payment._id} className="py-3">
                  <div className="flex justify-between">
                    <div className="text-sm text-gray-900">
                      Payment via {payment.paymentMethod}
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      ${payment.amount.toFixed(2)}
                    </div>
                  </div>
                  <div className="flex justify-between mt-1">
                    <div className="text-xs text-gray-500">
                      {new Date(payment.createdAt).toLocaleDateString()} at{" "}
                      {new Date(payment.createdAt).toLocaleTimeString()}
                    </div>
                    <div>
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
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {paymentError && (
          <div className="mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            <p className="font-medium">Payment Error</p>
            <p className="mt-1">{paymentError}</p>
          </div>
        )}

        {invoice.status === InvoiceStatus.PENDING && (
          <div className="mt-6">
            <button
              type="button"
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                isProcessing ? "opacity-75 cursor-not-allowed" : ""
              }`}
              onClick={handlePayNow}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
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
                  Processing Payment...
                </>
              ) : (
                "Pay Now"
              )}
            </button>
          </div>
        )}

        {isPaid && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-md p-4 text-center">
            <svg
              className="w-6 h-6 mx-auto text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <p className="mt-2 text-green-700">
              Payment completed successfully
            </p>
            <p className="text-sm text-green-600">Thank you for your payment</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceDetail;
