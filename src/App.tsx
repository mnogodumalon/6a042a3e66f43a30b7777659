import '@/lib/sentry';
import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorBusProvider } from '@/components/ErrorBus';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import KundenPage from '@/pages/KundenPage';
import VermietungPage from '@/pages/VermietungPage';
import KategorienPage from '@/pages/KategorienPage';
import WerkzeugbestandPage from '@/pages/WerkzeugbestandPage';
import PublicFormKunden from '@/pages/public/PublicForm_Kunden';
import PublicFormVermietung from '@/pages/public/PublicForm_Vermietung';
import PublicFormKategorien from '@/pages/public/PublicForm_Kategorien';
import PublicFormWerkzeugbestand from '@/pages/public/PublicForm_Werkzeugbestand';
// <public:imports>
// </public:imports>
// <custom:imports>
const WerkzeugVermietenPage = lazy(() => import('@/pages/intents/WerkzeugVermietenPage'));
const WerkzeugRueckgabePage = lazy(() => import('@/pages/intents/WerkzeugRueckgabePage'));
// </custom:imports>

export default function App() {
  return (
    <ErrorBoundary>
      <ErrorBusProvider>
        <HashRouter>
          <ActionsProvider>
            <Routes>
              <Route path="public/6a042a1ba7a8d8e74255c9ff" element={<PublicFormKunden />} />
              <Route path="public/6a042a1c8096b95d0d74862a" element={<PublicFormVermietung />} />
              <Route path="public/6a042a14a5334cc38646d8f7" element={<PublicFormKategorien />} />
              <Route path="public/6a042a1bb2c32790b48628b1" element={<PublicFormWerkzeugbestand />} />
              {/* <public:routes> */}
              {/* </public:routes> */}
              <Route element={<Layout />}>
                <Route index element={<DashboardOverview />} />
                <Route path="kunden" element={<KundenPage />} />
                <Route path="vermietung" element={<VermietungPage />} />
                <Route path="kategorien" element={<KategorienPage />} />
                <Route path="werkzeugbestand" element={<WerkzeugbestandPage />} />
                <Route path="admin" element={<AdminPage />} />
                {/* <custom:routes> */}
                <Route path="intents/werkzeug-vermieten" element={<Suspense fallback={null}><WerkzeugVermietenPage /></Suspense>} />
                <Route path="intents/werkzeug-rueckgabe" element={<Suspense fallback={null}><WerkzeugRueckgabePage /></Suspense>} />
                {/* </custom:routes> */}
              </Route>
            </Routes>
          </ActionsProvider>
        </HashRouter>
      </ErrorBusProvider>
    </ErrorBoundary>
  );
}
