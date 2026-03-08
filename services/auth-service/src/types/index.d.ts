// =============================================================================
// Type Declarations — Extend Express Request & User with Prisma User fields
// =============================================================================

declare global {
  namespace Express {
    /** Augment the Express User interface with our Prisma User fields */
    interface User {
      id: string;
      email: string;
      password: string | null;
      displayName: string;
      avatarUrl: string | null;
      status: string;
      provider: string;
      providerId: string | null;
      createdAt: Date;
      updatedAt: Date;
    }

    interface Request {
      /** Authenticated user attached by the authenticate middleware */
      user?: User;
      /** JWT ID (jti) of the current access token — used for blacklisting */
      tokenJti?: string;
    }
  }
}

export { };
