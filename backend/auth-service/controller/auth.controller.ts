import { Request, Response } from 'express';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { User } from '../model/user.model';

export class AuthController {
    register = async (req: Request, res: Response): Promise<void> => {
        try {
            const { username, email, password } = req.body;

            // Validate input
            if (!username || !email || !password) {
                res.status(400).json({
                    success: false,
                    message: 'Please provide username, email and password'
                });
                return;
            }

            // Check if user exists
            const existingUser = await User.findOne({ 
                $or: [{ email }, { username }] 
            });

            if (existingUser) {
                res.status(400).json({
                    success: false,
                    message: 'User already exists'
                });
                return;
            }

            // Create new user
            const user = await User.create({
                username,
                email,
                password
            });

            // Generate token
            const token = jwt.sign(
                { userId: user._id },
                (process.env.JWT_SECRET || "fallback") as Secret,
                { expiresIn: process.env.JWT_EXPIRES_IN || '1d' } as SignOptions
            );

            res.status(201).json({
                success: true,
                token,
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email
                }
            });
        } catch (error: any) {
            console.error('Registration error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error creating user'
            });
        }
    }

    login = async (req: Request, res: Response): Promise<void> => {
        try {
            const { email, password } = req.body;

            // Validate input
            if (!email || !password) {
                res.status(400).json({
                    success: false,
                    message: 'Please provide email and password'
                });
                return;
            }

            // Find user
            const user = await User.findOne({ email });
            if (!user) {
                res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
                return;
            }

            // Check password
            const isMatch = await user.comparePassword(password);
            if (!isMatch) {
                res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
                return;
            }

            // Generate token
            const token = jwt.sign(
                { userId: user._id },
                (process.env.JWT_SECRET || "fallback") as Secret,
                { expiresIn: process.env.JWT_EXPIRES_IN || '1d' } as SignOptions
            );

            res.json({
                success: true,
                token,
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email
                }
            });
        } catch (error: any) {
            console.error('Login error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error logging in'
            });
        }
    }

    logout = async (req: Request, res: Response): Promise<void> => {
        try {
            // Client-side will handle clearing the token but we can add
            // token invalidation logic here in the future if needed
            
            res.json({
                success: true,
                message: 'Logged out successfully'
            });
        } catch (error: any) {
            console.error('Logout error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error logging out'
            });
        }
    }
}