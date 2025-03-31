import { Router, RequestHandler } from 'express';
import { 
  getUserNotifications, 
  getRoomNotifications, 
  markAsRead, 
  createNotification 
} from '../controller/notification.controller';

const router = Router();

router.get('/user/:userId', getUserNotifications as RequestHandler);
router.get('/room/:roomId', getRoomNotifications as RequestHandler);
router.patch('/:id/read', markAsRead as RequestHandler);
router.post('/', createNotification as RequestHandler);

export default router; 