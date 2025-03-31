import { Router, RequestHandler } from 'express';
import { 
  placeBid, 
  getBidsByRoom, 
  getHighestBid 
} from '../controller/bidding.controller';

const router = Router();

router.post('/', placeBid as RequestHandler);
router.get('/room/:roomId', getBidsByRoom as RequestHandler);
router.get('/room/:roomId/highest', getHighestBid as RequestHandler);

export default router; 