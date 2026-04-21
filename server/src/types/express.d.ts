export {};

declare global {
  namespace Express {
    interface Request {
      locale?: "vi-VN" | "en-US" | "zh-CN";
      user?: {
        id: string;
        role?: string;
      };
    }
  }
}
