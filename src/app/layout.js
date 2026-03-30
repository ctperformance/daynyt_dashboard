import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';

export const metadata = {
  title: 'DAYNYT Dashboard',
  description: 'Multi-Tenant Marketing Dashboard – Analytics & KPIs',
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body className="antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
