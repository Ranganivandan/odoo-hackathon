import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut, User } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, logout, isAdmin, isManager } = useAuth();

  const isAuthPage = location.pathname === "/signin" || location.pathname === "/signup";
  const isHomePage = location.pathname === "/";

  if (isAuthPage) {
    return <>{children}</>;
  }

  // Role-based navigation items
  const getNavItems = () => {
    if (!isAuthenticated) return [];

    const items = [];

    // All authenticated users see Analytics first
    items.push({ to: "/analytics", label: "Analytics" });

    // Admin sees: Dashboard (User Management) + Policies
    if (isAdmin) {
      items.push(
        { to: "/dashboard", label: "Users" },
        { to: "/approval-rules", label: "Policies" }
      );
    }

    // Manager sees: Audits (Approvals)
    if (isManager) {
      items.push({ to: "/manager-approvals", label: "Audits" });
    }

    // All authenticated users see: Entries (My Expenses) + History
    items.push(
      { to: "/employee-expenses", label: "Entries" },
      { to: "/expense-history", label: "History" }
    );

    return items;
  };

  const navItems = getNavItems();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <nav className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-2xl font-bold text-primary">
              ExpenseFlow
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              {isAuthenticated ? (
                <>
                  {navItems.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      className="text-foreground hover:text-primary transition-colors"
                    >
                      {item.label}
                    </Link>
                  ))}
                  
                  {/* User Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <User className="h-4 w-4" />
                        {user?.firstName}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>
                        <div className="flex flex-col">
                          <span>{user?.firstName} {user?.lastName}</span>
                          <span className="text-xs text-muted-foreground font-normal">
                            {user?.email}
                          </span>
                          <span className="text-xs text-primary font-medium mt-1">
                            {user?.role?.toUpperCase()}
                          </span>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout}>
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <Link to="/signin">
                  <Button variant="outline" size="sm">
                    Sign In
                  </Button>
                </Link>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-foreground"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 flex flex-col gap-4">
              {isAuthenticated ? (
                <>
                  {navItems.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      className="text-foreground hover:text-primary transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                  <div className="pt-2 border-t border-border">
                    <div className="text-sm text-muted-foreground mb-2">
                      {user?.firstName} {user?.lastName}
                      <span className="block text-xs">{user?.email}</span>
                      <span className="text-xs text-primary">{user?.role?.toUpperCase()}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2"
                      onClick={() => {
                        handleLogout();
                        setMobileMenuOpen(false);
                      }}
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <Link to="/signin" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" size="sm" className="w-full">
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>
                    <Button size="sm" className="w-full bg-accent hover:bg-accent/90">
                      Get Started
                    </Button>
                  </Link>
                </>
              )}
            </div>
          )}
        </nav>
      </header>

      <main>{children}</main>
      <footer className="border-t border-border bg-card/50 mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-muted-foreground text-sm">
            © 2025 ApprovalFlow. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
