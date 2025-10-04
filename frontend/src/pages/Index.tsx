import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { CheckCircle, Users, Settings, ArrowRight } from "lucide-react";

const Index = () => {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-tight">
            Streamline Your Expense
            <span className="text-primary"> Approval Workflow</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Manage approvals efficiently with smart rules, role-based access, and seamless team collaboration
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Link to="/signup">
              <Button size="lg" className="bg-accent hover:bg-accent/90 text-lg px-8">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/signin">
              <Button size="lg" variant="outline" className="text-lg px-8">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20 bg-card/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 text-foreground">
            Everything You Need for Approval Management
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-card p-8 rounded-xl shadow-md border border-border hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-foreground">User Management</h3>
              <p className="text-muted-foreground">
                Assign roles, manage permissions, and organize your team with an intuitive dashboard
              </p>
            </div>

            <div className="bg-card p-8 rounded-xl shadow-md border border-border hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                <Settings className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-foreground">Approval Rules</h3>
              <p className="text-muted-foreground">
                Create custom workflows with dynamic approval sequences and percentage-based approvals
              </p>
            </div>

            <div className="bg-card p-8 rounded-xl shadow-md border border-border hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-foreground">Smart Workflows</h3>
              <p className="text-muted-foreground">
                Sequential or parallel approvals with automated routing based on your business rules
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center bg-gradient-to-br from-primary/10 to-accent/10 p-12 rounded-2xl border border-border">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join companies streamlining their approval processes today
          </p>
          <Link to="/signup">
            <Button size="lg" className="bg-accent hover:bg-accent/90 text-lg px-8">
              Create Your Account
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
