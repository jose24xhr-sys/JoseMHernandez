import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Routemize from "./pages/Routemize";
import OpsTracker from './pages/OpsTracker'


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/routemize" element={<Routemize />} />
        <Route path="/ops-tracker" element={<OpsTracker />} />

      </Routes>
    </BrowserRouter>
  );
}