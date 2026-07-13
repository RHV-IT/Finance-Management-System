import './globals.css';
import { Inter } from 'next/font/google';
 
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
 
export const metadata = {
  title: 'RHV Hospital ERP',
  description: 'Redeemers Health Village — Enterprise Resource Planning Dashboard',
};
 
export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
