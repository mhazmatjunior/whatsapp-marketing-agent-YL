import './globals.css';

export const metadata = {
    title: 'WhatsApp Marketing Agent',
    description: 'Manage and send WhatsApp broadcasts',
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
