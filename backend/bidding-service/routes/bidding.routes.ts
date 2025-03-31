import { Router } from 'express';
import { biddingController } from '../controller/bidding.controller';

const router = Router();

router.post('/', biddingController.placeBid);
router.get('/room/:roomId', biddingController.getBidsByRoom);
router.get('/room/:roomId/highest', biddingController.getHighestBid);

export default router; 