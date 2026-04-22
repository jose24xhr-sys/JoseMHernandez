import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Routemize from "./pages/Routemize";
import BehavioralTest from "./pages/BehavioralTest";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/routemize" element={<Routemize />} />
        <Route path="/behavioraltest" element={<BehavioralTest />} />

      </Routes>
    </BrowserRouter>
  );
}