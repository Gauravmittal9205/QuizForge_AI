import { ReactNode } from 'react';
import Navbar from './Navbar';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />
      <main className="pt-24">
        <div className="container mx-auto px-6 py-12">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
