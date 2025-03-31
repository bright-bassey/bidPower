import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import {
  Invoice,
  InvoiceStatus,
  getInvoiceById,
  getUserInvoices,
  processPayment as processInvoicePayment,
} from "../services/invoice.service";
import { processPayment as processPaymentService } from "../services/payment.service";

interface InvoiceContextType {
  invoices: Invoice[];
  currentInvoice: Invoice | null;
  loading: boolean;
  error: string | null;
  fetchUserInvoices: () => Promise<Invoice[]>;
  fetchInvoiceById: (id: string) => Promise<Invoice | null>;
  processPayment: (
    invoiceId: string,
    paymentMethod?: string,
    paymentDetails?: any
  ) => Promise<any>;
  clearCurrentInvoice: () => void;
}

const InvoiceContext = createContext<InvoiceContextType | undefined>(undefined);

export const useInvoice = (): InvoiceContextType => {
  const context = useContext(InvoiceContext);
  if (!context) {
    throw new Error("useInvoice must be used within an InvoiceProvider");
  }
  return context;
};

export const InvoiceProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [currentInvoice, setCurrentInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserInvoices = useCallback(async (): Promise<Invoice[]> => {
    try {
      setLoading(true);
      setError(null);
      const userId = localStorage.getItem("userId");
      if (!userId) {
        throw new Error("User not authenticated");
      }

      const fetchedInvoices = await getUserInvoices(userId);
      setInvoices(fetchedInvoices);
      return fetchedInvoices;
    } catch (error) {
      console.error("Error fetching invoices:", error);
      setError(
        error instanceof Error ? error.message : "Failed to fetch invoices"
      );
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchInvoiceById = useCallback(
    async (id: string): Promise<Invoice | null> => {
      try {
        setLoading(true);
        setError(null);
        const invoice = await getInvoiceById(id);
        setCurrentInvoice(invoice);
        return invoice;
      } catch (error) {
        console.error("Error fetching invoice:", error);
        setError(
          error instanceof Error
            ? error.message
            : "Failed to fetch invoice details"
        );
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const processPayment = useCallback(
    async (
      invoiceId: string,
      paymentMethod: string = "card",
      paymentDetails: any = { cardToken: "simulated-payment" }
    ): Promise<any> => {
      try {
        setLoading(true);
        setError(null);
        const userId = localStorage.getItem("userId");
        if (!userId) {
          throw new Error("User not authenticated");
        }

        // Fetch the invoice to get the amount
        const invoice = await getInvoiceById(invoiceId);
        if (!invoice) {
          throw new Error("Invoice not found");
        }

        // We can use either the invoice service's processPayment or the payment service
        // Here we'll use both in sequence to ensure both services are updated

        // First, notify the invoice service
        await processInvoicePayment(invoiceId, paymentMethod, paymentDetails);

        // Then, process the actual payment
        const payment = await processPaymentService(
          userId,
          invoiceId,
          invoice.totalAmount,
          paymentMethod,
          paymentDetails
        );

        // Refresh the current invoice to get the updated status
        const updatedInvoice = await getInvoiceById(invoiceId);
        setCurrentInvoice(updatedInvoice);

        return payment;
      } catch (error) {
        console.error("Error processing payment:", error);
        setError(
          error instanceof Error ? error.message : "Failed to process payment"
        );
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const clearCurrentInvoice = useCallback(() => {
    setCurrentInvoice(null);
  }, []);

  const value = {
    invoices,
    currentInvoice,
    loading,
    error,
    fetchUserInvoices,
    fetchInvoiceById,
    processPayment,
    clearCurrentInvoice,
  };

  return (
    <InvoiceContext.Provider value={value}>{children}</InvoiceContext.Provider>
  );
};
