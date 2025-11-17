import { useState } from 'react';
import { MainView } from './components/MainView';
import { TableView } from './components/TableView';
import { WeeklyView } from './components/WeeklyView';
import { GalleryView } from './components/GalleryView';
import { UIKit } from './components/UIKit';
import { TechnicalFlow } from './components/TechnicalFlow';
import { Header } from './components/Header';

type View = 'main' | 'table' | 'weekly' | 'gallery' | 'uikit' | 'flow';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('main');
  const [selectedBranch, setSelectedBranch] = useState('Sucursal Centro');

  const renderView = () => {
    switch (currentView) {
      case 'main':
        return <MainView onViewChange={setCurrentView} />;
      case 'table':
        return <TableView onViewChange={setCurrentView} />;
      case 'weekly':
        return <WeeklyView onViewChange={setCurrentView} />;
      case 'gallery':
        return <GalleryView />;
      case 'uikit':
        return <UIKit />;
      case 'flow':
        return <TechnicalFlow />;
      default:
        return <MainView onViewChange={setCurrentView} />;
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F6F7' }}>
      <Header 
        selectedBranch={selectedBranch}
        onBranchChange={setSelectedBranch}
        onViewChange={setCurrentView}
      />
      {renderView()}
    </div>
  );
}
