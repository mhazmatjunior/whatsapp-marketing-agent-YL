import './globals.css';
import AuthProvider from '../components/AuthProvider.js';

export const metadata = {
    title: 'Elite Broadcaster',
    description: 'Premium marketing automation for elite networks.',
    icons: {
        icon: '/favicon.jpg',
    },
};

export const viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
};


export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body>
                <AuthProvider>
                    {children}
                </AuthProvider>
            </body>
        </html>
    );
}
