import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function PlanPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-foreground">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-1">
          <Link
            href="/"
            className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground font-semibold"
          >
            OTW
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Plan-a-Gala</h1>
          <p className="text-sm text-muted-foreground">
            Step 1: Set up your new gala and generate a room code.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gala Setup Flow</CardTitle>
            <CardDescription>
              This is the entry point for the Plan-a-Gala creation flow.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Future steps will collect gala name, dates, destination, and initial itinerary details before creating the room.
            </p>
            <div className="flex gap-2">
              <Link
                href="/"
                className={cn(buttonVariants({ variant: 'outline' }), 'flex-1 text-center')}
              >
                Back to Home
              </Link>
              <Link
                href="/join"
                className={cn(buttonVariants({ variant: 'default' }), 'flex-1 text-center')}
              >
                Go to Join
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
