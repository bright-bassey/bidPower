import jwt, { Secret, SignOptions } from 'jsonwebtoken';

export class TokenService {
    static generateToken(userId: string): string {
        return jwt.sign(
            { userId },
            (process.env.JWT_SECRET || "fallback") as Secret,
            { expiresIn: process.env.JWT_EXPIRES_IN || '1d' } as SignOptions
        );
    }

    static verifyToken(token: string): any {
        return jwt.verify(token, (process.env.JWT_SECRET || "fallback") as Secret);
    }
} 