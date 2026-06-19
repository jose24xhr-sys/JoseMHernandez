import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import OpsTracker from './pages/OpsTracker';
import WeeklyReport from './pages/WeeklyReport';


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/ops-tracker" element={<OpsTracker />} />
        <Route path="/weekly-report" element={<WeeklyReport />} />

      </Routes>
    </BrowserRouter>
  );
}