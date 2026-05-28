import React from 'react';
import { 
  CalendarDays, 
  Users, 
  Inbox, 
  Award, 
  Activity, 
  ChevronRight, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

export function CommandFeed() {
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
    { name: "Stop the Bleed", classes: 2 }
  ];

  const upcomingSchedule = [
    { id: 1, name: "CPR — Seattle Fire Dept", date: "Jun 3", time: "9:00 AM", location: "Seattle" },
    { id: 2, name: "CPR — WFLD", date: "Jun 10", time: "9:00 AM", location: "Chicago" },
    { id: 3, name: "Stop the Bleed", date: "Jun 17", time: "1:00 PM", location: "Portland" }
  ];

  const combinedFeed = [
    { type: "activity", id: 1, msg: "New class CPR — WFLD scheduled", ago: "2h ago" },
    { type: "request", id: 1, org: "Metro School District", cert: "Stop the Bleed", status: "pending", attendees: 8, ago: "3h ago" },
    { type: "activity", id: 2, msg: "Training request approved: City Hospital", ago: "3h ago" },
    { type: "request", id: 2, org: "City Hospital", cert: "CPR / AED / First Aid", status: "approved", attendees: 10, ago: "5h ago" },
    { type: "activity", id: 3, msg: "14 students enrolled in CPR — Seattle", ago: "5h ago" },
    { type: "activity", id: 4, msg: "Certificate issued: Jordan Kim", ago: "1d ago" },
    { type: "activity", id: 5, msg: "New training request: Metro School District", ago: "1d ago" }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex w-full font-sans selection:bg-primary/20">
      {/* Left Command Panel */}
      <div className="w-80 border-r bg-zinc-950 text-zinc-50 flex flex-col h-screen sticky top-0 shrink-0">
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="h-5 w-5 text-emerald-500" />
            <h1 className="font-bold tracking-tight text-lg">Operations Control</h1>
          </div>
          <p className="text-xs text-zinc-400">Live monitoring & dispatch</p>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
            {/* KPIs */}
            <div className="space-y-3">
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Metrics</h2>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-zinc-900 rounded-md p-3 border border-zinc-800">
                  <div className="flex items-center text-zinc-400 mb-1">
                    <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
                    <span className="text-[10px] uppercase font-medium">Upcoming</span>
                  </div>
                  <div className="text-xl font-bold text-zinc-100">{kpis.upcomingClasses}</div>
                </div>
                <div className="bg-zinc-900 rounded-md p-3 border border-zinc-800">
                  <div className="flex items-center text-zinc-400 mb-1">
                    <Users className="h-3.5 w-3.5 mr-1.5" />
                    <span className="text-[10px] uppercase font-medium">Students</span>
                  </div>
                  <div className="text-xl font-bold text-zinc-100">{kpis.totalStudents}</div>
                </div>
                <div className="bg-zinc-900 rounded-md p-3 border border-zinc-800">
                  <div className="flex items-center text-zinc-400 mb-1">
                    <Inbox className="h-3.5 w-3.5 mr-1.5" />
                    <span className="text-[10px] uppercase font-medium">Pending Req</span>
                  </div>
                  <div className="text-xl font-bold text-amber-400">{kpis.pendingRequests}</div>
                </div>
                <div className="bg-zinc-900 rounded-md p-3 border border-zinc-800">
                  <div className="flex items-center text-zinc-400 mb-1">
                    <Award className="h-3.5 w-3.5 mr-1.5" />
                    <span className="text-[10px] uppercase font-medium">Certs Issued</span>
                  </div>
                  <div className="text-xl font-bold text-zinc-100">{kpis.certificatesIssued}</div>
                </div>
              </div>
            </div>

            <Separator className="bg-zinc-800" />

            {/* Upcoming Schedule Mini List */}
            <div className="space-y-3">
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Upcoming Schedule</h2>
              <div className="space-y-2">
                {upcomingSchedule.map((item) => (
                  <div key={item.id} className="flex flex-col gap-1.5 bg-zinc-900/50 p-2.5 rounded border border-zinc-800/50 hover:bg-zinc-800 transition-colors cursor-pointer group">
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-medium text-zinc-200 group-hover:text-emerald-400 transition-colors line-clamp-1">{item.name}</span>
                      <ChevronRight className="h-3 w-3 text-zinc-600 group-hover:text-emerald-400" />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-zinc-400">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {item.date}, {item.time}
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {item.location}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator className="bg-zinc-800" />

            {/* Tiny Bar Chart */}
            <div className="space-y-3">
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Cert Type Breakdown</h2>
              <div className="h-32 bg-zinc-900/30 rounded border border-zinc-800 p-2 pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                    <XAxis dataKey="name" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{fill: '#27272a'}} contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', fontSize: '12px', color: '#f4f4f5' }} />
                    <Bar dataKey="classes" radius={[2, 2, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#3f3f46'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Right Operations Feed */}
      <div className="flex-1 bg-zinc-50 dark:bg-zinc-950 flex flex-col h-screen">
        <header className="px-8 py-5 bg-white border-b border-zinc-200 sticky top-0 z-10">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Operations Feed</h2>
          <p className="text-sm text-zinc-500">Real-time activity and training requests</p>
        </header>
        
        <ScrollArea className="flex-1 p-8">
          <div className="max-w-3xl mx-auto">
            <div className="relative border-l-2 border-zinc-200 ml-4 pb-8">
              {combinedFeed.map((item, index) => {
                const isActivity = item.type === 'activity';
                
                return (
                  <div key={`${item.type}-${item.id}-${index}`} className="mb-8 ml-8 relative group">
                    {/* Timeline dot */}
                    <div className={`absolute -left-[41px] top-1 h-5 w-5 rounded-full border-2 border-white flex items-center justify-center
                      ${isActivity ? 'bg-zinc-200 text-zinc-500' : 
                        item.status === 'pending' ? 'bg-amber-400 text-amber-900' : 'bg-emerald-500 text-white'}`}
                    >
                      {isActivity ? <Activity className="h-2.5 w-2.5" /> : 
                       item.status === 'pending' ? <AlertCircle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium text-zinc-400">{item.ago}</span>
                        {!isActivity && (
                          <Badge variant={item.status === 'pending' ? 'secondary' : 'default'} 
                            className={`text-[10px] uppercase tracking-wider px-1.5 py-0 h-5
                              ${item.status === 'pending' ? 'bg-amber-100 text-amber-800 hover:bg-amber-100' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'}`}
                          >
                            {item.status}
                          </Badge>
                        )}
                      </div>

                      {isActivity ? (
                        <div className="bg-white rounded-lg border border-zinc-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                          <p className="text-sm font-medium text-zinc-800">{item.msg}</p>
                        </div>
                      ) : (
                        <Card className="shadow-sm border-zinc-200 hover:shadow-md transition-all">
                          <CardContent className="p-5">
                            <div className="flex justify-between items-start gap-4">
                              <div>
                                <h3 className="font-semibold text-lg text-zinc-900 mb-1">{item.org}</h3>
                                <div className="flex items-center gap-3 text-sm text-zinc-500">
                                  <span className="flex items-center gap-1"><Award className="h-3.5 w-3.5" /> {item.cert}</span>
                                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {item.attendees} attendees</span>
                                </div>
                              </div>
                              {item.status === 'pending' && (
                                <div className="flex gap-2">
                                  <button className="text-xs font-medium px-3 py-1.5 rounded-md border border-zinc-200 hover:bg-zinc-50 transition-colors">Decline</button>
                                  <button className="text-xs font-medium px-3 py-1.5 rounded-md bg-zinc-900 text-white hover:bg-zinc-800 transition-colors">Approve</button>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {/* End of feed indicator */}
              <div className="absolute -left-[35px] bottom-0 h-2 w-2 rounded-full bg-zinc-200 border border-white"></div>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
