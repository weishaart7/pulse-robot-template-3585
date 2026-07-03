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
import NouveautesSection from "./pages/nouveautes/NouveautesSection";
import { SocieteFormPage } from "./pages/societes/SocieteFormPage";
import SituationMatrimonialePage from "./pages/famille/SituationMatrimonialePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
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
                  <Route path="famille/situation-matrimoniale" element={<SituationMatrimonialePage />} />
                  <Route path=":section" element={<DashboardSection />} />
                </Route>
                <Route path="/nouveautes" element={
                  <ProtectedRoute>
                    <NouveautesSection />
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
