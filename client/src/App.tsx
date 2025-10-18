import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import Category from "@/pages/category";
import Article from "@/pages/article";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Admin from "@/pages/admin";
import NotFound from "@/pages/not-found";

// Protected route wrapper
function ProtectedRoute({ component: Component }: { component: () => JSX.Element }) {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/me"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return <Component />;
}

// Temporary admin placeholder
function AdminPlaceholder() {
  const { data: user } = useQuery<any>({
    queryKey: ["/api/auth/me"],
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10 p-4">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Admin Panel</h1>
        <p className="text-muted-foreground">Welcome, {user?.name}!</p>
        <p className="text-sm">CMS coming soon...</p>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/admin">
        <ProtectedRoute component={Admin} />
      </Route>
      <Route path="/categoria/:category" component={Category} />
      <Route path="/noticia/:id" component={Article} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
