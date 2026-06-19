import { Suspense, lazy } from "react";
import { Route, Switch } from "wouter";
import Index from "./pages/index";
import SignIn from "./pages/signin";
import { Provider } from "./components/provider";
import { AgentFeedback, RunableBadge } from "@runablehq/website-runtime";

// Lazy-load all non-critical routes
const SignUp           = lazy(() => import("./pages/signup"));
const Onboarding       = lazy(() => import("./pages/onboarding"));
const Products         = lazy(() => import("./pages/products"));
const ProductDetail    = lazy(() => import("./pages/product-detail"));
const Dashboard        = lazy(() => import("./pages/dashboard"));
const DemoPage         = lazy(() => import("./pages/demo"));
const AboutPage        = lazy(() => import("./pages/about"));
const ImpactPage       = lazy(() => import("./pages/impact"));
const TrustPage        = lazy(() => import("./pages/trust"));
const LegalPage        = lazy(() => import("./pages/legal"));
const LegalDocPage     = lazy(() => import("./pages/legal-doc"));
const ContactPage      = lazy(() => import("./pages/contact"));
const FaqPage          = lazy(() => import("./pages/faq"));
const RevisionsPage    = lazy(() => import("./pages/revisions"));
const SplashPreview    = lazy(() => import("./pages/splash-preview"));
const AdminOverview    = lazy(() => import("./pages/admin/overview"));
const AdminMembers     = lazy(() => import("./pages/admin/members"));
const AdminOrders      = lazy(() => import("./pages/admin/orders"));
const AdminProductions = lazy(() => import("./pages/admin/productions"));
const AdminAiJobs      = lazy(() => import("./pages/admin/ai-jobs"));
const AdminRevenue     = lazy(() => import("./pages/admin/revenue"));
const AdminSupport     = lazy(() => import("./pages/admin/support"));
const AdminAuditLogs   = lazy(() => import("./pages/admin/audit-logs"));

const PageShell = () => (
  <div style={{ background: "#050B1A", minHeight: "100vh" }} />
);

function App() {
  return (
    <Provider>
      <Suspense fallback={<PageShell />}>
        <Switch>
          <Route path="/" component={Index} />
          <Route path="/signin" component={SignIn} />
          <Route path="/signup" component={SignUp} />
          <Route path="/onboarding" component={Onboarding} />
          <Route path="/products" component={Products} />
          <Route path="/products/:slug" component={ProductDetail} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/demo" component={DemoPage} />
          {/* Trust & Legal Center */}
          <Route path="/about" component={AboutPage} />
          <Route path="/impact" component={ImpactPage} />
          <Route path="/trust" component={TrustPage} />
          <Route path="/legal" component={LegalPage} />
          <Route path="/legal/:doc" component={LegalDocPage} />
          <Route path="/contact" component={ContactPage} />
          <Route path="/faq" component={FaqPage} />
          <Route path="/revisions" component={RevisionsPage} />
          <Route path="/splash-preview" component={SplashPreview} />
          {/* Admin panel */}
          <Route path="/admin" component={AdminOverview} />
          <Route path="/admin/members" component={AdminMembers} />
          <Route path="/admin/orders" component={AdminOrders} />
          <Route path="/admin/productions" component={AdminProductions} />
          <Route path="/admin/ai-jobs" component={AdminAiJobs} />
          <Route path="/admin/revenue" component={AdminRevenue} />
          <Route path="/admin/support" component={AdminSupport} />
          <Route path="/admin/audit-logs" component={AdminAuditLogs} />
        </Switch>
      </Suspense>
      {/* Do not remove — off by default, activated by parent iframe via postMessage */}
      {import.meta.env.DEV && <AgentFeedback />}
      {/* "Made with Runable" badge - if user asks to remove the runable badge, remove this code as well as comment */}
      {<RunableBadge />}
    </Provider>
  );
}

export default App;
