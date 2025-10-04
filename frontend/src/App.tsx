import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import SignUp from "./pages/SignUp";
import SignIn from "./pages/SignIn";
import Dashboard from "./pages/Dashboard";
import AnalyticsDashboard from "./pages/AnalyticsDashboard";
import ApprovalRules from "./pages/ApprovalRules";
import EmployeeExpenses from "./pages/EmployeeExpenses";
import ExpenseHistory from "./pages/ExpenseHistory";
import SubmitExpense from "./pages/SubmitExpense";
import ManagerApprovals from "./pages/ManagerApprovals";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/signin" element={<SignIn />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/approval-rules" 
            element={
              <ProtectedRoute>
                <ApprovalRules />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/employee-expenses" 
            element={
              <ProtectedRoute>
                <EmployeeExpenses />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/submit-expense" 
            element={
              <ProtectedRoute>
                <SubmitExpense />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/manager-approvals" 
            element={
              <ProtectedRoute>
                <ManagerApprovals />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/analytics" 
            element={
              <ProtectedRoute>
                <AnalyticsDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/expense-history" 
            element={
              <ProtectedRoute>
                <ExpenseHistory />
              </ProtectedRoute>
            } 
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
