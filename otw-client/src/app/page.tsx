import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-foreground">
      <div className="max-w-xl w-full space-y-8 text-center">
        {/* Brand & Heading */}
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight">OTW</h1>
          <p className="text-xl font-medium text-muted-foreground">
            Landing Page
          </p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            On The Water — Collaborative gala and trip planner for groups and friends.
          </p>
        </div>

        {/* Quick Route Navigation */}
        <Card className="text-left border-border/80">
          <CardHeader>
            <CardTitle className="text-base">Get Started</CardTitle>
            <CardDescription>
              Choose an action to start planning or join an existing gala.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/plan"
              className={cn(buttonVariants({ variant: 'default' }), 'flex-1 text-center')}
            >
              Plan-a-Gala
            </Link>
            <Link
              href="/join"
              className={cn(buttonVariants({ variant: 'outline' }), 'flex-1 text-center')}
            >
              Join-a-Gala
            </Link>
          </CardContent>
        </Card>

        {/* Example Dynamic Dashboard Link */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Explore sample gala dashboards:</p>
          <div className="flex justify-center gap-3 font-mono">
            <Link href="/ABC123" className="underline hover:text-foreground">
              /ABC123
            </Link>
            <Link href="/OTW2026" className="underline hover:text-foreground">
              /OTW2026
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
