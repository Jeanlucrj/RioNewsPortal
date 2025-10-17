import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerUserSchema, type RegisterUser } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Newspaper } from "lucide-react";

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<RegisterUser>({
    resolver: zodResolver(registerUserSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      name: "",
    },
  });

  async function onSubmit(data: RegisterUser) {
    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/auth/register", data);

      // Invalidate user query to refetch
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });

      toast({
        title: "Success",
        description: "Account created successfully!",
      });

      setLocation("/admin");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Registration failed",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <Newspaper className="w-6 h-6 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-2xl">Registration Disabled</CardTitle>
          <CardDescription>
            Public registration is disabled for security. Contact your administrator to create an account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-center p-6 bg-muted rounded-lg">
            <p className="text-muted-foreground">
              For security reasons, new editor accounts can only be created by administrators.
            </p>
            <p className="text-sm text-muted-foreground">
              If you need access, please contact the system administrator.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-6">
              <div className="flex gap-4">
                <Button
                  data-testid="link-login"
                  type="button"
                  variant="default"
                  className="flex-1"
                  onClick={() => setLocation("/login")}
                >
                  Go to Login
                </Button>
                
                <Button
                  data-testid="link-home"
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setLocation("/")}
                >
                  Back to Home
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
