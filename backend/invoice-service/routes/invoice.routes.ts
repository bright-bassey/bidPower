import { Router, RequestHandler } from 'express';
import { InvoiceController } from '../controller/invoice.controller';

const router = Router();
const invoiceController = new InvoiceController();

router.post('/', invoiceController.createInvoice as RequestHandler);
router.get('/:id', invoiceController.getInvoiceById as RequestHandler);
router.get('/user/:userId', invoiceController.getUserInvoices as RequestHandler);
router.patch('/:id/status', invoiceController.updateInvoiceStatus as RequestHandler);
router.post('/:invoiceId/pay', invoiceController.processPayment as RequestHandler);

export default router; 