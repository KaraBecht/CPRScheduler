import React from "react";
import {
  CalendarDays,
  Users,
  Inbox,
  Award,
  CircleDot,
  Clock,
  MapPin,
  Activity
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../ui/card";
import { Badge } from "../../ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";

// Static Data
const kpis = {
  upcomingClasses: 3,
  totalClasses: 7,
  totalStudents: 18,
  pendingRequests: 2,
  certificatesIssued: 14,
  enrollmentsThisMonth: 6,
};

const chartData = [
  { name: "CPR/AED", classes: 5 },
  { name: "Stop the Bleed", classes: 2 },
];

const upcomingSchedule = [
  {
    id: 1,
    name: "CPR — Seattle Fire Dept",
    cert: "CPR / AED / First Aid",
    date: "Jun 3, 2026",
    time: "9:00 AM",
    location: "Seattle, WA",
    instructor: "Amy Abrams",
    enrolled: 4,
    capacity: 10,
  },
  {
    id: 2,
    name: "CPR — WFLD",
    cert: "CPR / AED / First Aid",
    date: "Jun 10, 2026",
    time: "9:00 AM",
    location: "Chicago, IL",
    instructor: "Amy Abrams",
    enrolled: 2,
    capacity: 10,
  },
  {
    id: 3,
    name: "Stop the Bleed",
    cert: "Stop the Bleed",
    date: "Jun 17, 2026",
    time: "1:00 PM",
    location: "Portland, OR",
    instructor: "Tom Lee",
    enrolled: 7,
    capacity: 10,
  },
];

const activityFeed = [
  { id: 1, msg: "New class CPR — WFLD scheduled", ago: "2h ago" },
  { id: 2, msg: "Training request approved: City Hospital", ago: "3h ago" },
  { id: 3, msg: "14 students enrolled in CPR — Seattle", ago: "5h ago" },
  { id: 4, msg: "Certificate issued: Jordan Kim", ago: "1d ago" },
  { id: 5, msg: "New training request: Metro School District", ago: "1d ago" },
];

const recentRequests = [
  {
    id: 1,
    org: "City Hospital",
    cert: "CPR / AED / First Aid",
    status: "approved",
    attendees: 10,
    date: "Jun 5, 2026",
  },
  {
    id: 2,
    org: "Metro School District",
    cert: "Stop the Bleed",
    status: "pending",
    attendees: 8,
    date: "Jun 20, 2026",
  },
];

export function Scorecard() {
  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Top Ribbon: KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Upcoming Classes
              </CardTitle>
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                <CalendarDays className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{kpis.upcomingClasses}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {kpis.totalClasses} total scheduled
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-emerald-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Students
              </CardTitle>
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
                <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{kpis.totalStudents}</div>
              <p className="text-xs text-muted-foreground mt-1">
                +{kpis.enrollmentsThisMonth} this month
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Requests
              </CardTitle>
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                <Inbox className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{kpis.pendingRequests}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Requires action
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Certificates Issued
              </CardTitle>
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                <Award className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{kpis.certificatesIssued}</div>
              <p className="text-xs text-muted-foreground mt-1">
                All time total
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* Left Column (Wide) */}
          <div className="xl:col-span-2 space-y-6">
            
            {/* Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Classes by Certification Type</CardTitle>
                <CardDescription>Breakdown of upcoming and active classes</CardDescription>
              </CardHeader>
              <CardContent className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} 
                    />
                    <RechartsTooltip 
                      cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--background))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="classes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Upcoming Schedule */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-muted-foreground" />
                Upcoming Schedule
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingSchedule.map((cls) => (
                  <Card key={cls.id} className="overflow-hidden hover:border-primary/50 transition-colors">
                    <div className="h-1 bg-primary w-full" />
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-base">{cls.name}</CardTitle>
                          <CardDescription className="mt-1">{cls.cert}</CardDescription>
                        </div>
                        <Badge variant="outline" className="bg-primary/5">
                          {cls.enrolled}/{cls.capacity}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 pb-4">
                      <div className="grid grid-cols-2 gap-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <CalendarDays className="h-3.5 w-3.5" />
                          <span>{cls.date}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{cls.time}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          <span className="truncate" title={cls.location}>{cls.location}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Users className="h-3.5 w-3.5" />
                          <span className="truncate" title={cls.instructor}>{cls.instructor}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            
          </div>
          
          {/* Right Column (Ops Rail) */}
          <div className="space-y-6">
            
            {/* Live Activity Feed */}
            <Card className="h-auto">
              <CardHeader className="pb-4 border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-500" />
                  Live Activity Feed
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 px-0">
                <div className="space-y-0">
                  {activityFeed.map((feed, index) => (
                    <div key={feed.id} className="px-4 py-3 flex gap-4 hover:bg-muted/50 transition-colors relative">
                      {index !== activityFeed.length - 1 && (
                        <div className="absolute left-6 top-8 bottom-0 w-px bg-border" />
                      )}
                      <div className="mt-1">
                        <CircleDot className="h-4 w-4 text-primary bg-background" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-tight">{feed.msg}</p>
                        <p className="text-xs text-muted-foreground">{feed.ago}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Training Requests */}
            <Card>
              <CardHeader className="pb-4 border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <Inbox className="h-4 w-4 text-amber-500" />
                  Recent Training Requests
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 p-0">
                <div className="divide-y">
                  {recentRequests.map((req) => (
                    <div key={req.id} className="p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium text-sm">{req.org}</div>
                        <Badge 
                          variant={req.status === 'approved' ? 'default' : 'secondary'} 
                          className={req.status === 'approved' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}
                        >
                          {req.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div className="flex items-center gap-1">
                          <Award className="h-3 w-3" />
                          <span>{req.cert}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>{req.attendees} attendees expected</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          <span>Preferred: {req.date}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

          </div>
          
        </div>
      </div>
    </div>
  );
}
