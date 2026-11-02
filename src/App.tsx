import { lazy } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import { AppProvider } from './lib/store';
import { Layout } from './components/layout/Layout';
import { RouteBoundary } from './components/ErrorBoundary';

const Home = lazy(() => import('./routes/Home'));
const Browsers = lazy(() => import('./routes/Browsers'));
const BrowserDetail = lazy(() => import('./routes/BrowserDetail'));
const Compare = lazy(() => import('./routes/Compare'));
const NotFound = lazy(() => import('./routes/NotFound'));
const Rankings = lazy(() => import('./routes/Rankings'));
const CustomRanking = lazy(() => import('./routes/CustomRanking'));
const QuizHub = lazy(() => import('./routes/Quiz').then((m) => ({ default: m.QuizHub })));
const QuizRun = lazy(() => import('./routes/Quiz'));
const QuizBuilder = lazy(() => import('./routes/QuizBuilder'));
const DeviceFinder = lazy(() => import('./routes/DeviceFinder'));
const Settings = lazy(() => import('./routes/Settings'));
const Privacy = lazy(() => import('./routes/Privacy'));
const DataHealth = lazy(() => import('./routes/DataHealth'));
const Accessibility = lazy(() => import('./routes/Accessibility'));
const ShortlistBrief = lazy(() => import('./routes/ShortlistBrief'));
const C = () => import('./routes/Collections');
const Collections = lazy(() => C().then((m) => ({ default: m.Collections })));
const CollectionPage = lazy(() => C().then((m) => ({ default: m.CollectionPage })));
const T = () => import('./routes/Tools');
const Versus = lazy(() => T().then((m) => ({ default: m.Versus })));
const SwitchPlanner = lazy(() => T().then((m) => ({ default: m.SwitchPlanner })));
const FeatureFinder = lazy(() => T().then((m) => ({ default: m.FeatureFinder })));
const ExtensionChecker = lazy(() => T().then((m) => ({ default: m.ExtensionChecker })));
const Matrix = lazy(() => T().then((m) => ({ default: m.Matrix })));
const G = () => import('./routes/Guides');
const Mv2Tracker = lazy(() => G().then((m) => ({ default: m.Mv2Tracker })));
const SyncGuide = lazy(() => G().then((m) => ({ default: m.SyncGuide })));
const AndroidHub = lazy(() => G().then((m) => ({ default: m.AndroidHub })));
const AiHub = lazy(() => G().then((m) => ({ default: m.AiHub })));
const News = lazy(() => G().then((m) => ({ default: m.News })));
const Graveyard = lazy(() => G().then((m) => ({ default: m.Graveyard })));
const I = () => import('./routes/Info');
const Engines = lazy(() => I().then((m) => ({ default: m.Engines })));
const History = lazy(() => I().then((m) => ({ default: m.History })));
const Learn = lazy(() => I().then((m) => ({ default: m.Learn })));
const About = lazy(() => I().then((m) => ({ default: m.About })));
const OsPage = lazy(() => I().then((m) => ({ default: m.OsPage })));
const You = lazy(() => import('./routes/You'));
const E = () => import('./routes/Explore');
const Tradeoffs = lazy(() => E().then((m) => ({ default: m.Tradeoffs })));
const Bump = lazy(() => E().then((m) => ({ default: m.Bump })));
const WinMatrix = lazy(() => E().then((m) => ({ default: m.WinMatrix })));
const Parallel = lazy(() => E().then((m) => ({ default: m.Parallel })));
const F = () => import('./routes/Fun');
const TierList = lazy(() => F().then((m) => ({ default: m.TierList })));
const Battle = lazy(() => F().then((m) => ({ default: m.Battle })));
const Shortlist = lazy(() => F().then((m) => ({ default: m.Shortlist })));
const Security = lazy(() => import('./routes/Security'));
const SecurityBenchmarks = lazy(() => import('./routes/SecurityBenchmarks'));

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <HashRouter>
        <AppProvider>
          <Layout>
            <RouteBoundary>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/browsers" element={<Browsers />} />
              <Route path="/browser/:id" element={<BrowserDetail />} />
              <Route path="/compare" element={<Compare />} />
              <Route path="/rankings" element={<Rankings />} />
              <Route path="/rankings/custom" element={<CustomRanking />} />
              <Route path="/quiz" element={<QuizHub />} />
              <Route path="/quiz/build" element={<QuizBuilder />} />
              <Route path="/quiz/:id" element={<QuizRun />} />
              <Route path="/vs" element={<Versus />} />
              <Route path="/switch" element={<SwitchPlanner />} />
              <Route path="/finder" element={<FeatureFinder />} />
              <Route path="/extensions" element={<ExtensionChecker />} />
              <Route path="/old-device" element={<DeviceFinder />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/collections" element={<Collections />} />
              <Route path="/collections/:id" element={<CollectionPage />} />
              <Route path="/matrix" element={<Matrix />} />
              <Route path="/mv2" element={<Mv2Tracker />} />
              <Route path="/sync" element={<SyncGuide />} />
              <Route path="/android" element={<AndroidHub />} />
              <Route path="/ai" element={<AiHub />} />
              <Route path="/news" element={<News />} />
              <Route path="/graveyard" element={<Graveyard />} />
              <Route path="/engines" element={<Engines />} />
              <Route path="/history" element={<History />} />
              <Route path="/learn" element={<Learn />} />
              <Route path="/about" element={<About />} />
              <Route path="/os/:os" element={<OsPage />} />
              <Route path="/you" element={<You />} />
              <Route path="/tradeoffs" element={<Tradeoffs />} />
              <Route path="/rankings/bump" element={<Bump />} />
              <Route path="/rankings/h2h" element={<WinMatrix />} />
              <Route path="/rankings/parallel" element={<Parallel />} />
              <Route path="/tierlist" element={<TierList />} />
              <Route path="/battle" element={<Battle />} />
              <Route path="/shortlist" element={<Shortlist />} />
              <Route path="/shortlist/brief" element={<ShortlistBrief />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/data-health" element={<DataHealth />} />
              <Route path="/accessibility" element={<Accessibility />} />
              <Route path="/security" element={<Security />} />
              <Route path="/security/benchmarks" element={<SecurityBenchmarks />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </RouteBoundary>
          </Layout>
        </AppProvider>
      </HashRouter>
    </MotionConfig>
  );
}
