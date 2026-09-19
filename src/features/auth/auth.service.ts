import jwt, { SignOptions } from "jsonwebtoken";
import { getEnv } from "../../core/config/env";
import { UnauthorizedError } from "../../core/errors/app-error";
import { DecodedUser } from "../../core/types/express";

export class AuthService {
  private secret: string;

  constructor(secret?: string) {
    if (secret) {
      this.secret = secret;
    } else {
      try {
        this.secret = getEnv().ACCESS_TOKEN_SECRET;
      } catch {
        this.secret = process.env.ACCESS_TOKEN_SECRET || "";
      }
    }
  }

  public generateToken(
    payload: { email: string; [key: string]: any },
    options?: SignOptions
  ): string {
    const signOptions: SignOptions = {
      expiresIn: "6h",
      ...options,
    };
    return jwt.sign(payload, this.secret, signOptions);
  }

  public verifyToken(token: string): DecodedUser {
    try {
      const decoded = jwt.verify(token, this.secret);
      return decoded as DecodedUser;
    } catch {
      throw new UnauthorizedError("Unauthorized access");
    }
  }
}

export const authService = new AuthService();
