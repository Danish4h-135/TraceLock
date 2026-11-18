import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { BootLoadingScreen } from './components/BootLoadingScreen';
import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { CasesListView } from './views/CasesListView';
import { CaseWorkspaceView } from './views/CaseWorkspaceView';
import { EvidenceVaultView } from './views/EvidenceVaultView';
import { AuditLogView } from './views/AuditLogView';
import { VerificationLabView } from './views/VerificationLabView';

export const App: React.FC = () => {
  const { user, loading } = useAuth();
  const [booting, setBooting] = useState<boolean>(true);
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [showNewCaseModal, setShowNewCaseModal] = useState<boolean>(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setBooting(false);
    }, 1400);
    return () => clearTimeout(timer);
  }, []);

  if (loading || booting) {
    return <BootLoadingScreen onComplete={() => setBooting(false)} />;
  }

  if (!user) {
    return (
      <div className="animate-fade-in">
        <LoginView />
      </div>
    );
  }

  const handleNavigate = (view: string, caseId?: string) => {
    setCurrentView(view);
    if (caseId) {
      setActiveCaseId(caseId);
    }
  };

  const handleOpenCase = (caseId: string) => {
    setActiveCaseId(caseId);
    setCurrentView('case-workspace');
  };

  return (
    <div className="min-h-screen bg-obsidian-900 text-slate-100 flex flex-col font-sans selection:bg-slate-700 selection:text-white animate-fade-in">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar currentView={currentView} onNavigate={handleNavigate} />

        <main className="flex-1 overflow-y-auto bg-obsidian-900/90 scroll-smooth">
          <div key={`${currentView}-${activeCaseId || ''}`} className="animate-slide-up">
            {currentView === 'dashboard' && (
              <DashboardView
                onNavigate={handleNavigate}
                onNewCase={() => {
                  setCurrentView('cases');
                  setShowNewCaseModal(true);
                }}
              />
            )}

            {currentView === 'cases' && (
              <CasesListView
                onOpenCase={handleOpenCase}
                showNewCaseModal={showNewCaseModal}
                onCloseNewCaseModal={() => setShowNewCaseModal(false)}
                onOpenNewCaseModal={() => setShowNewCaseModal(true)}
              />
            )}

            {currentView === 'case-workspace' && activeCaseId && (
              <CaseWorkspaceView caseId={activeCaseId} onBack={() => setCurrentView('cases')} />
            )}

            {currentView === 'evidence' && <EvidenceVaultView onOpenCase={handleOpenCase} />}

            {currentView === 'audit' && <AuditLogView />}

            {currentView === 'lab' && <VerificationLabView />}
          </div>
        </main>
      </div>
    </div>
  );
};
