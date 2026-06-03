import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import OpsTracker from './pages/OpsTracker';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/ops-tracker" element={<OpsTracker />} />
      </Routes>
    </BrowserRouter>
  );
}