import { Router } from 'express';
import * as NotificationController from '../controller/notification.controller';

const router = Router();

//notiification routes
router.get('/user/:userId', NotificationController.getUserNotifications);
router.get('/room/:roomId', NotificationController.getRoomNotifications);
router.patch('/:id/read', NotificationController.markAsRead);
router.post('/', NotificationController.createNotification);

export default router; 