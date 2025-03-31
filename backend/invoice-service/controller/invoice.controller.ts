import { Request, Response } from 'express';
import { InvoiceStatus } from '../model/invoice.model';
import { ValidationService } from '../services/validation.service';
import { InvoiceService } from '../services/invoice.service';
import { handleError } from '../services/error.service';

export class InvoiceController {
  createInvoice = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate request
      ValidationService.validateCreateInvoice(req);
      
      const { roomId, userId, amount, items, tax, totalAmount } = req.body;
      
      // Create invoice using service
      const invoice = await InvoiceService.createInvoice(
        roomId, 
        userId, 
        amount, 
        items, 
        tax, 
        totalAmount
      );
      
      res.status(201).json(invoice);
    } catch (error) {
      const appError = handleError(error);
      console.error('Error creating invoice:', appError);
      res.status(appError.statusCode).json({
        success: false,
        message: appError.message
      });
    }
  };

  getInvoiceById = async (req: Request, res: Response): Promise<void> => {
    try {
      const invoice = await InvoiceService.getInvoiceById(req.params.id);
      res.status(200).json(invoice);
    } catch (error) {
      const appError = handleError(error);
      console.error('Error fetching invoice:', appError);
      res.status(appError.statusCode).json({
        success: false,
        message: appError.message
      });
    }
  };

  getUserInvoices = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.params.userId;
      const invoices = await InvoiceService.getUserInvoices(userId);
      res.status(200).json(invoices);
    } catch (error) {
      const appError = handleError(error);
      console.error('Error fetching user invoices:', appError);
      res.status(appError.statusCode).json({
        success: false,
        message: appError.message
      });
    }
  };

  updateInvoiceStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      ValidationService.validateUpdateInvoiceStatus(req);
      
      const { id } = req.params;
      const { status, paymentId } = req.body;
      
      const invoice = await InvoiceService.updateInvoiceStatus(
        id, 
        status as InvoiceStatus, 
        paymentId
      );
      
      res.status(200).json(invoice);
    } catch (error) {
      const appError = handleError(error);
      console.error('Error updating invoice:', appError);
      res.status(appError.statusCode).json({
        success: false,
        message: appError.message
      });
    }
  };

  processPayment = async (req: Request, res: Response): Promise<void> => {
    try {
      ValidationService.validateProcessPayment(req);
      
      const { invoiceId } = req.params;
      const { paymentMethod, paymentDetails } = req.body;
      
      const result = await InvoiceService.processPayment(
        invoiceId, 
        paymentMethod, 
        paymentDetails
      );
      
      res.status(202).json(result);
    } catch (error) {
      const appError = handleError(error);
      console.error('Error processing payment:', appError);
      res.status(appError.statusCode).json({
        success: false,
        message: appError.message
      });
    }
  };
} 