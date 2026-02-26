import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/Login";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "./hooks/useAuth";
import Sidebar from "./components/Sidebar";
import Home from "./pages/Home";
import Compras from "./pages/Compras";
import Configuracoes from "./pages/Configuracoes";
import Desenvolvimento from "./pages/Desenvolvimento";
import Containers from "./pages/Containers";
import Conteiner from "./pages/Conteiner";
import Rastreamento from "./pages/Rastreamento";
import Pagamentos from "./pages/Pagamentos";
import CentralSarom from "./pages/CentralSarom";
import CentralAlexandre from "./pages/CentralAlexandre";
import Garantias from "./pages/Garantias";
import { MobileMenu } from "./components/MobileMenu";
import { ToastContainer } from "./components/Toast";
import { useToast } from "./hooks/useToast";


function ProtectedRouter() {
  const { isAuthenticated, loading } = useAuth();
  const [location] = useLocation();
  
  // Se está na página de login, sempre mostrar login
  if (location === '/login') {
    return <Login />;
  }
  
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: 'oklch(0.12 0.005 285)' }}>
        <div style={{ color: 'oklch(0.60 0.010 285)' }}>Carregando...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return <AuthenticatedRouter />;
}

function AuthenticatedRouter() {
  const [location] = useLocation();
  const { toasts, removeToast } = useToast();


  const getCurrentPage = () => {
    if (location === "/compras") return "compras";
    if (location === "/containers") return "containers";
    if (location === "/conteiner") return "conteiner";
    if (location === "/rastreamento") return "rastreamento";
    if (location === "/pagamentos") return "pagamentos";
    if (location === "/central-sarom") return "central-sarom";
    if (location === "/central-alexandre") return "central-alexandre";
    if (location === "/desenvolvimento") return "desenvolvimento";
    if (location === "/configuracoes") return "configuracoes";
    return "dashboard";
  };

  // make sure to consider if you need authentication for certain routes
  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden" style={{ background: 'oklch(0.12 0.005 285)' }}>
      {/* Sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar currentPage={getCurrentPage()} />
      </div>
      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 z-40 border-b px-4 flex items-center gap-4" style={{ background: 'oklch(0.14 0.005 285)', borderColor: 'oklch(0.26 0.005 285)' }}>
        <MobileMenu items={[
          { label: 'Dashboard', href: '/' },
          { label: 'Pedidos', href: '/compras' },
          { label: 'Containers', href: '/containers' },
          { label: 'Contêiner SR', href: '/conteiner' },
          { label: 'Rastreamento', href: '/rastreamento' },
          { label: 'Pagamentos', href: '/pagamentos' },
          { label: 'Desenvolvimento', href: '/desenvolvimento' },
          { label: 'Central Sarom', href: '/central-sarom' },
          { label: 'Central Alexandre', href: '/central-alexandre' },
          { label: 'Configurações', href: '/configuracoes' },
        ]} currentPath={location} />
        <div className="flex-1" />
      </header>
      <main className="flex-1 overflow-auto md:mt-0 mt-14">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/compras" component={Compras} />
          <Route path="/containers" component={Containers} />
          <Route path="/conteiner" component={Conteiner} />
          <Route path="/rastreamento" component={Rastreamento} />
          <Route path="/pagamentos" component={Pagamentos} />
          <Route path="/central-sarom" component={CentralSarom} />
          <Route path="/central-alexandre" component={CentralAlexandre} />
          <Route path="/desenvolvimento" component={Desenvolvimento} />
          <Route path="/garantias" component={Garantias} />
          <Route path="/configuracoes" component={Configuracoes} />
          <Route path="/404" component={NotFound} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Switch>
            <Route path="/login" component={Login} />
            <Route component={ProtectedRouter} />
          </Switch>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
