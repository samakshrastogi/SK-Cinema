import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import "./index.css";

import { AuthProvider } from "@/context/AuthContext";
import { LayoutProvider } from "@/context/LayoutContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <LayoutProvider>
          <App />
        </LayoutProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);