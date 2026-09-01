import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import NotFound from "./NotFound";
import packageInfo from "../package.json";
import "./index.css";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <BrowserRouter>
    <>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <div className="app-version" aria-label={`MuscleMap AI version ${packageInfo.version}`}>
        v{packageInfo.version}
      </div>
    </>
  </BrowserRouter>
);
