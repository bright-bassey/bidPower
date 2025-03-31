import { Router, RequestHandler } from 'express';
import { 
  getAllRooms, 
  getRoomById, 
  createRoom, 
  joinRoom,
  updateRoomHighestBid
} from '../controller/room.controller';

const router = Router();

router.get('/', getAllRooms as RequestHandler);
router.get('/:id', getRoomById as RequestHandler);
router.post('/', createRoom as RequestHandler);
router.post('/:id/join', joinRoom as RequestHandler);
router.patch('/:id/highest-bid', updateRoomHighestBid as RequestHandler);

export default router;