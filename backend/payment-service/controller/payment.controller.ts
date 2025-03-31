import { Request, Response } from 'express';
import { PaymentMethod } from '../model/payment.model';
import { ValidationService } from '../service/validation.service';
import { PaymentService } from '../service/payment.service';
import { handleError } from '../service/error.service';

export class PaymentController {
  processPayment = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate payment input
      ValidationService.validatePaymentInput(req);
      
      const { invoiceId, userId, amount, paymentMethod, paymentDetails } = req.body;
      
      // Create and process payment
      const payment = await PaymentService.createPayment(
        invoiceId,
        userId,
        amount,
        paymentMethod || PaymentMethod.CREDIT_CARD,
        paymentDetails || {}
      );
      
      res.status(202).json({ 
        success: true,
        message: 'Payment processing initiated', 
        payment: {
          id: payment._id,
          status: payment.status,
          transactionId: payment.transactionId
        }
      });
    } catch (error) {
      const appError = handleError(error);
      console.error('Error processing payment:', appError);
      res.status(appError.statusCode).json({
        success: false,
        message: appError.message
      });
    }
  };

  getPaymentById = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate ID parameter
      ValidationService.validateIdParam(req.params.id);
      
      // Get payment
      const payment = await PaymentService.getPaymentById(req.params.id);
      
      res.status(200).json({
        success: true,
        payment
      });
    } catch (error) {
      const appError = handleError(error);
      console.error('Error fetching payment:', appError);
      res.status(appError.statusCode).json({
        success: false,
        message: appError.message
      });
    }
  };

  getUserPayments = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate userId
      ValidationService.validateIdParam(req.params.userId);
      
      // Get user payments
      const payments = await PaymentService.getUserPayments(req.params.userId);
      
      res.status(200).json({
        success: true,
        payments
      });
    } catch (error) {
      const appError = handleError(error);
      console.error('Error fetching user payments:', appError);
      res.status(appError.statusCode).json({
        success: false,
        message: appError.message
      });
    }
  };

  getPaymentsByInvoice = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate invoiceId
      ValidationService.validateIdParam(req.params.invoiceId);
      
      // Get invoice payments
      const payments = await PaymentService.getInvoicePayments(req.params.invoiceId);
      
      res.status(200).json({
        success: true,
        payments
      });
    } catch (error) {
      const appError = handleError(error);
      console.error('Error fetching invoice payments:', appError);
      res.status(appError.statusCode).json({
        success: false,
        message: appError.message
      });
    }
  };
} 