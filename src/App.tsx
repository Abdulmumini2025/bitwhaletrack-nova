import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Header } from "@/components/Header";
import Index from "./pages/Index";
import { AuthPage } from "./pages/AuthPage";
import { AboutPage } from "./pages/AboutPage";
import { AdminPage } from "./pages/AdminPage";
import { AdminLoginPage } from "./pages/AdminLoginPage";
import { CreateNewsPage } from "./pages/CreateNewsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ContactPage } from "./pages/ContactPage";
import NotFound from "./pages/NotFound";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Header />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/admin-login" element={<AdminLoginPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/create-news" element={<CreateNewsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
