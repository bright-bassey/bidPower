import { Router, RequestHandler } from 'express';
import { 
  createInvoice, 
  getInvoiceById, 
  getUserInvoices, 
  updateInvoiceStatus,
  processPayment
} from '../controller/invoice.controller';

const router = Router();

router.post('/', createInvoice as RequestHandler);
router.get('/:id', getInvoiceById as RequestHandler);
router.get('/user/:userId', getUserInvoices as RequestHandler);
router.patch('/:id/status', updateInvoiceStatus as RequestHandler);
router.post('/:invoiceId/pay', processPayment as RequestHandler);

export default router; 