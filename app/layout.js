import './globals.css';
import AuthProvider from '../components/AuthProvider';

export const metadata = {
    title: 'Elite Broadcaster',
    description: 'Premium marketing automation for elite networks.',
    icons: {
        icon: '/favicon.jpg',
    },
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
