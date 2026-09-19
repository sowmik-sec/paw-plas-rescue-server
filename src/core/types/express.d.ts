export interface DecodedUser {
  email: string;
  role?: string;
  [key: string]: any;
}

declare global {
  namespace Express {
    interface Request {
      user?: DecodedUser;
      decoded?: DecodedUser;
    }
  }
}
