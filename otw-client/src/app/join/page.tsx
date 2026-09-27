import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function JoinPage() {
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
          <h1 className="text-3xl font-bold tracking-tight">Join-a-Gala</h1>
          <p className="text-sm text-muted-foreground">
            Enter a unique gala code to participate in a trip.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Enter Gala Code</CardTitle>
            <CardDescription>
              This is the entry point for the Join-a-Gala flow.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Future steps will validate the gala room code and prompt for RSVP before directing to the Member Dashboard.
            </p>
            <div className="flex gap-2">
              <Link
                href="/"
                className={cn(buttonVariants({ variant: 'outline' }), 'flex-1 text-center')}
              >
                Back to Home
              </Link>
              <Link
                href="/plan"
                className={cn(buttonVariants({ variant: 'default' }), 'flex-1 text-center')}
              >
                Plan a Gala
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
