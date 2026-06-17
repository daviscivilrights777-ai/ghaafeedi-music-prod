import { Route, Switch } from "wouter";
import Index from "./pages/index";
import SignIn from "./pages/signin";
import SignUp from "./pages/signup";
import Onboarding from "./pages/onboarding";
import Products from "./pages/products";
import ProductDetail from "./pages/product-detail";
import Dashboard from "./pages/dashboard";
import AdminOverview from "./pages/admin/overview";
import AdminMembers from "./pages/admin/members";
import AdminOrders from "./pages/admin/orders";
import AdminProductions from "./pages/admin/productions";
import AdminAiJobs from "./pages/admin/ai-jobs";
import AdminRevenue from "./pages/admin/revenue";
import AdminSupport from "./pages/admin/support";
import AdminAuditLogs from "./pages/admin/audit-logs";
import DemoPage from "./pages/demo";
import AboutPage from "./pages/about";
import ImpactPage from "./pages/impact";
import TrustPage from "./pages/trust";
import LegalPage from "./pages/legal";
import LegalDocPage from "./pages/legal-doc";
import ContactPage from "./pages/contact";
import FaqPage from "./pages/faq";
import { Provider } from "./components/provider";
import { AgentFeedback, RunableBadge } from "@runablehq/website-runtime";

function App() {
  return (
    <Provider>
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
      {/* Do not remove — off by default, activated by parent iframe via postMessage */}
      {import.meta.env.DEV && <AgentFeedback />}
      {/* "Made with Runable" badge - if user asks to remove the runable badge, remove this code as well as comment */}
      {<RunableBadge />}
    </Provider>
  );
}

export default App;
