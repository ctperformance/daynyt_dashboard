import './globals.css';

export const metadata = {
  title: 'EASE Dashboard',
  description: 'Marketing Dashboard – Quiz Analytics & KPIs',
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body className="antialiased">{children}</body>
    </html>
  );
}
