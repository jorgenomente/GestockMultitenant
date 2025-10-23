import { useState } from 'react';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { Footer } from './components/Footer';
import { Dashboard } from './components/pages/Dashboard';
import { Suppliers } from './components/pages/Suppliers';
import { Orders } from './components/pages/Orders';
import { ActiveOrder } from './components/pages/ActiveOrder';
import { OrderDetail } from './components/pages/OrderDetail';
import { Stock } from './components/pages/Stock';
import { Expirations } from './components/pages/Expirations';
import { Budget } from './components/pages/Budget';
import { Reports } from './components/pages/Reports';
import { Settings } from './components/pages/Settings';
import { Toaster } from './components/ui/sonner';

export default function App() {
  const [currentPage, setCurrentPage] = useState('order-detail');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'suppliers':
        return <Suppliers />;
      case 'orders':
        return <Orders 
          onViewOrder={() => setCurrentPage('active-order')}
          onEditOrder={() => setCurrentPage('order-detail')}
        />;
      case 'active-order':
        return <ActiveOrder onBack={() => setCurrentPage('orders')} />;
      case 'order-detail':
        return <OrderDetail onBack={() => setCurrentPage('orders')} />;
      case 'stock':
        return <Stock />;
      case 'expirations':
        return <Expirations />;
      case 'budget':
        return <Budget />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#F5F5F2]">
      {/* Desktop TopBar - hidden on mobile */}
      <div className="md:block hidden">
        <TopBar />
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar - hidden on mobile */}
        <div className="md:block hidden">
          <Sidebar
            currentPage={currentPage}
            onNavigate={setCurrentPage}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        </div>
        
        <main className="flex-1 overflow-y-auto bg-[#F5F5F2] flex flex-col">
          {/* Mobile Header - hide on certain pages */}
          {currentPage !== 'order-detail' && currentPage !== 'active-order' && (
            <div className="md:hidden sticky top-0 z-40 px-4 py-4 bg-[#FAFAF9] border-b" style={{ borderColor: '#D8D8D3' }}>
              <h1 
                className="text-[1.25rem] m-0"
                style={{ 
                  fontFamily: 'var(--font-family-heading)', 
                  fontWeight: 600,
                  color: '#1F1F1F',
                  letterSpacing: '-0.02em'
                }}
              >
                GeStock
              </h1>
            </div>
          )}
          
          <div className="flex-1">
            {renderPage()}
          </div>
          <Footer />
        </main>
      </div>

      {/* Mobile Bottom Navigation - hide on order-detail */}
      {currentPage !== 'order-detail' && (
        <BottomNav currentPage={currentPage} onNavigate={setCurrentPage} />
      )}

      <Toaster />
    </div>
  );
}
