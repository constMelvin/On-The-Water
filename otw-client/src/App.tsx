import { Button } from '@/components/ui/button'

export default function App() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-4 text-foreground">
      <h1 className="text-3xl font-bold tracking-tight">Gala Planner</h1>
      <p className="text-muted-foreground">Tailwind CSS v4 + shadcn UI initialized successfully.</p>
      <div className="flex gap-2">
        <Button>Click me</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="secondary">Secondary</Button>
      </div>
    </div>
  )
}
