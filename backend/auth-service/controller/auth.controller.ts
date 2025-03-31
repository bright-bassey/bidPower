import { Request, Response } from "express";
import { ValidationService } from "../service/validation.service";
import { TokenService } from "../service/token.service";
import { UserService } from "../service/user.service";
import { AppError, handleError } from "../service/error.service";

export class AuthController {
  register = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate input
      ValidationService.validateRegistrationInput(req);
      const { username, email, password } = req.body;

      // Check if user exists
      const existingUser = await UserService.findUserByUsernameOrEmail(username, email);
      if (existingUser) {
        throw new AppError(400, "User already exists");
      }

      // Create new user
      const user = await UserService.createUser(username, email, password);
      const token = TokenService.generateToken(user._id.toString());

      res.status(201).json({
        success: true,
        token,
        user: UserService.formatUserResponse(user),
      });
    } catch (error) {
      const appError = handleError(error);
      console.error("Registration error:", appError);
      res.status(appError.statusCode).json({
        success: false,
        message: appError.message,
      });
    }
  };

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate input
      ValidationService.validateLoginInput(req);
      const { email, password } = req.body;

      // Validate login credentials
      const user = await UserService.validateUserCredentials(email, password);
      const token = TokenService.generateToken(user._id.toString());

      res.json({
        success: true,
        token,
        user: UserService.formatUserResponse(user),
      });
    } catch (error) {
      const appError = handleError(error);
      console.error("Login error:", appError);
      res.status(appError.statusCode).json({
        success: false,
        message: appError.message,
      });
    }
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    try {
      res.json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error) {
      const appError = handleError(error);
      console.error("Logout error:", appError);
      res.status(appError.statusCode).json({
        success: false,
        message: appError.message,
      });
    }
  };
}
