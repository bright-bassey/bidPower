import { User, IUser } from '../model/user.model';
import { AuthenticationError, DatabaseError } from './error.service';

export class UserService {
    static async createUser(username: string, email: string, password: string): Promise<IUser> {
        try {
            return await User.create({
                username,
                email,
                password
            });
        } catch (error) {
            if (error instanceof Error) {
                throw new DatabaseError(`Failed to create user: ${error.message}`);
            }
            throw new DatabaseError('Failed to create user');
        }
    }

    static async findUserByEmail(email: string): Promise<IUser | null> {
        try {
            return await User.findOne({ email });
        } catch (error) {
            if (error instanceof Error) {
                throw new DatabaseError(`Failed to find user: ${error.message}`);
            }
            throw new DatabaseError('Failed to find user');
        }
    }

    static async findUserByUsernameOrEmail(username: string, email: string): Promise<IUser | null> {
        try {
            return await User.findOne({ 
                $or: [{ email }, { username }] 
            });
        } catch (error) {
            if (error instanceof Error) {
                throw new DatabaseError(`Failed to find user: ${error.message}`);
            }
            throw new DatabaseError('Failed to find user');
        }
    }

    static async validateUserCredentials(email: string, password: string): Promise<IUser> {
        const user = await this.findUserByEmail(email);
        if (!user) {
            throw new AuthenticationError('Invalid credentials');
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            throw new AuthenticationError('Invalid credentials');
        }

        return user;
    }

    static formatUserResponse(user: IUser) {
        return {
            id: user._id,
            username: user.username,
            email: user.email
        };
    }
} 