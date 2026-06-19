import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import TripPlanner from './pages/TripPlanner';
import TripResult from './pages/TripResult';
import ELDLogViewer from './pages/ELDLogViewer';
import Navbar from './components/ui/Navbar';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/planner" element={<TripPlanner />} />
        <Route path="/result" element={<TripResult />} />
        <Route path="/logs" element={<ELDLogViewer />} />
      </Routes>
    </div>
  );
}
