import { Navigate, Route, Routes } from 'react-router-dom'
import { PatientLoginPage } from './pages/auth/PatientLoginPage'
import { PatientRegistrationPage } from './pages/auth/PatientRegistrationPage'
import { PatientHomePage } from './pages/patient/PatientHomePage'
import { FindDoctorPage } from './pages/patient/FindDoctorPage'
import { PublicHomePage } from './pages/public/PublicHomePage'
import { DoctorSearchResultsPage } from './pages/patient/DoctorSearchResultsPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicHomePage />} />
      <Route path="/login" element={<PatientLoginPage />} />
      <Route path="/register" element={<PatientRegistrationPage />} />
      <Route path="/patient/home" element={<PatientHomePage />} />
      <Route path="/patient/doctors/search" element={<FindDoctorPage />} />
      <Route path="/patient/doctors/results" element={<DoctorSearchResultsPage />} />
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  )
}

export default App
