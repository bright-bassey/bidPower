import { Router } from 'express';
import { AuthController } from '../controller/auth.controller';

const router = Router();
const authController = new AuthController();

// Bind the methods to the instance
router.post('/register', authController.register);
router.post('/login', authController.login);

export default router;