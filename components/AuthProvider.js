'use client';

import { SessionProvider } from "next-auth/react";

export default function AuthProvider({ children }) {
    return (
        <SessionProvider
            refetchInterval={5 * 60}
            refetchOnWindowFocus={false}
        >
            {children}
        </SessionProvider>
    );
}
