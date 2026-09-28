import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { type DashboardViewProps } from './types';

export function MemberDashboard({ code }: DashboardViewProps) {
  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight">Member Dashboard</h2>
            <Badge variant="secondary" className="text-xs">
              Participant / Member
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            View gala schedule, track your checklist items, and review expense shares for Gala <span className="font-mono font-medium text-foreground">{code}</span>.
          </p>
        </div>
      </div>

      {/* Scaffold Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* RSVP Status */}
        <Card>
          <CardHeader>
            <CardTitle>My RSVP</CardTitle>
            <CardDescription>Your attendance status for this gala</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg border border-border/50">
              <span className="text-sm font-medium">Status</span>
              <Badge variant="outline" className="text-xs">Attending</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              RSVP status can be toggled by the member before the cutoff date.
            </p>
          </CardContent>
        </Card>

        {/* Gala Itinerary */}
        <Card>
          <CardHeader>
            <CardTitle>Gala Itinerary</CardTitle>
            <CardDescription>Upcoming schedule, locations, and planned stops</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">
              Timeline view of gala events and activities.
            </div>
          </CardContent>
        </Card>

        {/* Personal Checklist */}
        <Card>
          <CardHeader>
            <CardTitle>My Checklist</CardTitle>
            <CardDescription>Items to bring, tasks, and personal reminders</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">
              Checklist items assigned to you or shared with the group.
            </div>
          </CardContent>
        </Card>

        {/* My Expenses */}
        <Card>
          <CardHeader>
            <CardTitle>My Expense Share</CardTitle>
            <CardDescription>Amounts owed, paid expenses, and split breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">
              Personal settlement summary and expense share details.
            </div>
          </CardContent>
        </Card>

        {/* Location Sharing */}
        <Card>
          <CardHeader>
            <CardTitle>Group Map</CardTitle>
            <CardDescription>Destination details and live group location</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">
              Member locations and meetup points.
            </div>
          </CardContent>
        </Card>

        {/* Photo Gallery */}
        <Card>
          <CardHeader>
            <CardTitle>Gala Photos</CardTitle>
            <CardDescription>Browse and contribute photos from the trip</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">
              Upload photos and view shared group memories.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default MemberDashboard;
