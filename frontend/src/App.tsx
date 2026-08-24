import { Navigate, Route, Routes } from 'react-router-dom'
import { PatientLoginPage } from './pages/auth/PatientLoginPage'
import { PatientRegistrationPage } from './pages/auth/PatientRegistrationPage'
import { PatientHomePage } from './pages/patient/PatientHomePage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<PatientLoginPage />} />
      <Route path="/register" element={<PatientRegistrationPage />} />
      <Route path="/patient/home" element={<PatientHomePage />} />
      <Route path="*" element={<Navigate replace to="/login" />} />
    </Routes>
  )
}

export default App
