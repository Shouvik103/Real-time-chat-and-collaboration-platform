declare global {
    namespace Express {
        interface User {
            id: string;
            email: string;
            displayName: string;
            avatarUrl: string | null;
            status: string;
        }
        interface Request {
            user?: User;
            tokenJti?: string;
        }
    }
}
export {};
