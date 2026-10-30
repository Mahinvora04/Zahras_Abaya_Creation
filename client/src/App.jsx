import { BrowserRouter, Route, Routes } from "react-router-dom";

import About from "./pages/About";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminProducts from "./pages/admin/Products";
import Cart from "./pages/Cart";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Navbar from "./components/Navbar";
import ProductDetail from "./pages/ProductDetail";
import ProductForm from "./pages/admin/ProductForm";
import Products from "./pages/Products";
import Profile from "./pages/Profile";
import ProtectedRoute from "./components/ProtectedRoute";
import Register from "./pages/Register";
import useAuthStore from "./store/authStore";
import { useEffect } from "react";

export default function App() {
  const { loadUser } = useAuthStore();

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Admin routes — no Navbar */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute adminOnly>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/products"
          element={
            <ProtectedRoute adminOnly>
              <AdminProducts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/products/new"
          element={
            <ProtectedRoute adminOnly>
              <ProductForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/products/edit/:id"
          element={
            <ProtectedRoute adminOnly>
              <ProductForm />
            </ProtectedRoute>
          }
        />

        {/* Public routes — with Navbar */}
        <Route
          path="/*"
          element={
            <>
              <Navbar />
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/about-us" element={<About />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/products" element={<Products />} />
                <Route path="/product/:id" element={<ProductDetail />} />

                {/* ✅ UPDATED: Cart is now protected */}
                <Route
                  path="/cart"
                  element={
                    <ProtectedRoute>
                      <Cart />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </>
          }
        />
      </Routes>
      <Footer />
    </BrowserRouter>
  );
}
