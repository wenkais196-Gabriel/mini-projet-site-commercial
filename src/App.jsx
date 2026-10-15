/* =============================================================================
   App.jsx — configuration (the "wiring") of the application.
   Role: one single real HTML page, 3 virtual pages handled by react-router.
   The <DataProvider> is placed ABOVE the router: it is what makes the data
   "linked between the virtual pages" (requirement of the assignment).
   ========================================================================== */

import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { DataProvider } from "./store/DataContext.jsx";
import { Layout } from "./components/layout/Layout.jsx";
import { HomePage } from "./pages/HomePage.jsx";
import { ProductsPage } from "./pages/ProductsPage.jsx";
import { OrderPage } from "./pages/OrderPage.jsx";

export default function App() {
  return (
    <DataProvider>
      {/* The `future` flags silence the migration warnings of react-router 6 (they
          do not concern our code: they are v7 compatibility messages). We stay on
          v6, the version of the course tutorial. */}
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          {/* Layout = common template (navigation bar + <Outlet/>).
              The 3 routes are its children: they are displayed "inside" the template. */}
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/produits" element={<ProductsPage />} />
            <Route path="/commande" element={<OrderPage />} />
            {/* Any unknown URL goes back to the home page */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </DataProvider>
  );
}
