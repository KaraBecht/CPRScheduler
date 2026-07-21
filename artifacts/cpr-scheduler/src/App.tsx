import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/AppShell";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Classes from "@/pages/classes";
import ClassDetail from "@/pages/class-detail";
import ClassRoster from "@/pages/class-roster";
import PublicRosterSignIn from "@/pages/public-roster-signin";
import Requests from "@/pages/requests";
import PublicIntake from "@/pages/public-intake";
import Certificates from "@/pages/certificates";
import People from "@/pages/people";
import { RoleGate } from "@/components/RoleGate";
import EmailPreviewRenewal from "@/pages/email-preview-renewal";
import SigninSheet from "@/pages/signin-sheet";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 10_000 } },
});

function Router() {
  return (
    <Switch>
      <Route path="/intake" component={PublicIntake} />
      <Route path="/roster-signin/:id" component={PublicRosterSignIn} />
      <Route path="/email-preview/renewal" component={EmailPreviewRenewal} />
      <Route path="/classes/:id/signin-sheet" component={SigninSheet} />
      <Route>
        <AppShell>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/classes" component={Classes} />
            <Route path="/classes/:id/roster" component={ClassRoster} />
            <Route path="/classes/:id" component={ClassDetail} />
            <Route path="/requests">
              <RoleGate allow={["administrator", "requestor"]}>
                <Requests />
              </RoleGate>
            </Route>
            <Route path="/certificates" component={Certificates} />
            <Route path="/people">
              <RoleGate allow={["administrator"]}>
                <People />
              </RoleGate>
            </Route>
            <Route component={NotFound} />
          </Switch>
        </AppShell>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
