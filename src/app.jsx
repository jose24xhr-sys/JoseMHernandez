import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Routemize from "./pages/Routemize";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/routemize" element={<Routemize />} />
      </Routes>
    </BrowserRouter>
  );
}