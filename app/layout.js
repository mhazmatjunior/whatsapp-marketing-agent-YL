import './globals.css';
import AuthProvider from '../components/AuthProvider';

export const metadata = {
    title: 'WhatsApp Marketing Agent',
    description: 'Manage and send WhatsApp broadcasts',
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
