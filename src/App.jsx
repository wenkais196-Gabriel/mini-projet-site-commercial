/* =============================================================================
   App.jsx — configuration (le « câblage ») de l'application.
   Rôle : une seule page HTML réelle, 3 pages virtuelles gérées par react-router.
   Le <DataProvider> est placé AU-DESSUS du router : c'est lui qui rend les
   données « liées entre les pages virtuelles » (exigence du sujet).
   ========================================================================== */

import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { DataProvider } from "./store/DataContext.jsx";
import { Layout } from "./components/layout/Layout.jsx";
import { AccueilPage } from "./pages/AccueilPage.jsx";
import { ProduitsPage } from "./pages/ProduitsPage.jsx";
import { CommandePage } from "./pages/CommandePage.jsx";

export default function App() {
  return (
    <DataProvider>
      {/* Les drapeaux `future` font taire les avertissements de migration de
          react-router 6 (ils ne concernent pas notre code : ce sont des messages
          de compatibilité v7). On reste bien en v6, la version du tutoriel du cours. */}
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          {/* Layout = gabarit commun (barre de navigation + <Outlet/>).
              Les 3 routes sont ses enfants : elles s'affichent « dans » le gabarit. */}
          <Route element={<Layout />}>
            <Route path="/" element={<AccueilPage />} />
            <Route path="/produits" element={<ProduitsPage />} />
            <Route path="/commande" element={<CommandePage />} />
            {/* Toute URL inconnue ramène à l'accueil */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </DataProvider>
  );
}
