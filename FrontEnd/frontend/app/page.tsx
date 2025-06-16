import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-pink-600 to-pink-500 bg-clip-text text-transparent">
              Welcome to Next.js + Shadcn UI + AWS Amplify
            </h1>
            <p className="text-xl text-muted-foreground">
              Your modern full-stack application is ready!
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card className="border-pink-200 hover:border-pink-300 transition-colors">
              <CardHeader>
                <CardTitle>Next.js 15</CardTitle>
                <CardDescription>
                  The React framework for production
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Built with App Router, TypeScript, and Turbopack for optimal performance.
                </p>
              </CardContent>
            </Card>

            <Card className="border-purple-200 hover:border-purple-300 transition-colors">
              <CardHeader>
                <CardTitle>Shadcn UI</CardTitle>
                <CardDescription>
                  Beautiful and accessible components
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Customizable UI components built with Radix UI and Tailwind CSS.
                </p>
              </CardContent>
            </Card>

            <Card className="border-cyan-200 hover:border-cyan-300 transition-colors">
              <CardHeader>
                <CardTitle>AWS Amplify</CardTitle>
                <CardDescription>
                  Full-stack development platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Authentication, APIs, Storage, and more cloud services ready to use.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-center gap-4">
            <Button variant="default">Get Started</Button>
            <Button variant="outline">Learn More</Button>
          </div>
        </div>
      </main>
    </div>
  );
}