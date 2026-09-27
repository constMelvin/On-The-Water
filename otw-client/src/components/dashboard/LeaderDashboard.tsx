import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { type DashboardViewProps } from './types';

export function LeaderDashboard({ code }: DashboardViewProps) {
  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight">Leader Dashboard</h2>
            <Badge variant="default" className="text-xs">
              Host / Leader
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Manage gala settings, coordinate members, and oversee itinerary and expenses for Gala <span className="font-mono font-medium text-foreground">{code}</span>.
          </p>
        </div>
      </div>

      {/* Scaffold Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Gala Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Gala Settings</CardTitle>
            <CardDescription>Configure gala details, invite links, and room status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm bg-muted/50 p-3 rounded-lg border border-border/50">
              <span className="text-muted-foreground block text-xs">Shareable Code</span>
              <span className="font-mono font-bold text-base">{code}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Leader controls allow updating gala dates, destination, and access permissions.
            </p>
          </CardContent>
        </Card>

        {/* Member Management */}
        <Card>
          <CardHeader>
            <CardTitle>Members & RSVPs</CardTitle>
            <CardDescription>Track member participation and manage invitations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">
              Member list and RSVP tracker will connect to the room membership API.
            </div>
          </CardContent>
        </Card>

        {/* Itinerary Planning */}
        <Card>
          <CardHeader>
            <CardTitle>Itinerary Planning</CardTitle>
            <CardDescription>Create and schedule activities, dining, and stops</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">
              Itinerary builder component with drag-and-drop sequencing.
            </div>
          </CardContent>
        </Card>

        {/* Budget & Shared Expenses */}
        <Card>
          <CardHeader>
            <CardTitle>Budget & Expenses</CardTitle>
            <CardDescription>Oversee group cost estimates and expense splits</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">
              Settlement calculation and budget estimate oversight.
            </div>
          </CardContent>
        </Card>

        {/* Location & Navigation */}
        <Card>
          <CardHeader>
            <CardTitle>Location & Map</CardTitle>
            <CardDescription>Real-time location sharing and destination pins</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">
              Interactive map view with member location pins.
            </div>
          </CardContent>
        </Card>

        {/* Shared Media */}
        <Card>
          <CardHeader>
            <CardTitle>Photo Album</CardTitle>
            <CardDescription>Gala photo collection and Google Drive storage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">
              Photo gallery integration with Drive metadata.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default LeaderDashboard;
