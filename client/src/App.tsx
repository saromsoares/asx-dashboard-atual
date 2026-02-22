import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Sidebar from "./components/Sidebar";
import Home from "./pages/Home";
import Compras from "./pages/Compras";
import Configuracoes from "./pages/Configuracoes";
import Desenvolvimento from "./pages/Desenvolvimento";
import Conteiner from "./pages/Conteiner";

function Router() {
  const [location] = useLocation();

  const getCurrentPage = () => {
    if (location === "/compras") return "compras";
    if (location === "/conteiner") return "conteiner";
    if (location === "/desenvolvimento") return "desenvolvimento";
    if (location === "/configuracoes") return "configuracoes";
    return "dashboard";
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'oklch(0.12 0.005 285)' }}>
      <Sidebar currentPage={getCurrentPage()} />
      <main className="flex-1 overflow-auto">
        <Switch>
          <Route path={"/"} component={Home} />
          <Route path={"/compras"} component={Compras} />
          <Route path={"/conteiner"} component={Conteiner} />
          <Route path={"/desenvolvimento"} component={Desenvolvimento} />
          <Route path={"/configuracoes"} component={Configuracoes} />
          <Route path={"/404"} component={NotFound} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
