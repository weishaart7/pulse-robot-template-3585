import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { DebugInfo } from "@/components/ui/debug-info";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import DashboardSection from "./pages/DashboardSection";
import DashboardLayout from "./components/layout/DashboardLayout";
import InvestmentPlatform from "./pages/investment/InvestmentPlatform";
import NouveautesSection from "./pages/nouveautes/NouveautesSection";
import { SocieteFormPage } from "./pages/societes/SocieteFormPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  console.log('🚀 App component rendering');
  
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <DebugInfo />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={<Dashboard />} />
                  <Route path=":section" element={<DashboardSection />} />
                </Route>
                <Route path="/nouveautes" element={
                  <ProtectedRoute>
                    <NouveautesSection />
                  </ProtectedRoute>
                } />
                <Route path="/investment" element={
                  <ProtectedRoute>
                    <InvestmentPlatform />
                  </ProtectedRoute>
                } />
                <Route path="/societes/form" element={
                  <ProtectedRoute>
                    <SocieteFormPage />
                  </ProtectedRoute>
                } />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
