import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import PatientVitals from './pages/PatientVitals'; 

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Authentication Routes */}
        <Route path="/" element={<AuthPage />} />
        <Route path="/auth" element={<AuthPage />} />
        
        {/* Main Dashboard Routes */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/doctor-dashboard" element={<DoctorDashboard />} />
        
        {/* Patient Detail Route */}
        {/* FIX APPLIED: Route path now matches the URL structure /doctor/patient/:id */}
        <Route path="/doctor/patient/:id" element={<PatientVitals />} /> 
      </Routes>
    </BrowserRouter>
  );
}

export default App;