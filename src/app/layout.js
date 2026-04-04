import './globals.css';
import { Outfit } from 'next/font/google';
import { AuthProvider } from '@/components/AuthProvider';
import SWRProvider from '@/components/SWRProvider';

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-outfit',
  display: 'swap',
});

export const metadata = {
  title: 'DAYNYT Dashboard',
  description: 'Multi-Tenant Marketing Dashboard – Analytics & KPIs',
};

export default function RootLayout({ children }) {
  return (
    <html lang="de" className={outfit.variable}>
      <body className="font-sans antialiased">
        <SWRProvider>
          <AuthProvider>{children}</AuthProvider>
        </SWRProvider>
      </body>
    </html>
  );
}
