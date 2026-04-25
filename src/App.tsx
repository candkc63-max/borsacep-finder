import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import Egitmen from "./pages/Egitmen.tsx";
import Gizlilik from "./pages/Gizlilik.tsx";
import KullanimKosullari from "./pages/KullanimKosullari.tsx";
import Kvkk from "./pages/Kvkk.tsx";
import YasalUyari from "./pages/YasalUyari.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/egitmen" element={<Egitmen />} />
            <Route path="/gizlilik" element={<Gizlilik />} />
            <Route path="/kullanim-kosullari" element={<KullanimKosullari />} />
            <Route path="/kvkk" element={<Kvkk />} />
            <Route path="/yasal-uyari" element={<YasalUyari />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
