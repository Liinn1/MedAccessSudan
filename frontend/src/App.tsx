import { Navigate, Route, Routes } from 'react-router-dom'
import { PatientLoginPage } from './pages/auth/PatientLoginPage'
import { PatientRegistrationPage } from './pages/auth/PatientRegistrationPage'
import { PatientHomePage } from './pages/patient/PatientHomePage'
import { FindDoctorPage } from './pages/patient/FindDoctorPage'
import { PublicHomePage } from './pages/public/PublicHomePage'
import { DoctorSearchResultsPage } from './pages/patient/DoctorSearchResultsPage'
import { DoctorProfilePage } from './pages/patient/DoctorProfilePage'
import { AppointmentSelectionPage } from './pages/patient/AppointmentSelectionPage'
import { DoctorDashboardPage } from './pages/doctor/DoctorDashboardPage'
import { DoctorRegistrationPage } from './pages/auth/DoctorRegistrationPage'
import { SignUpModalProvider } from './contexts/SignUpModalContext'
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage'
import { PatientProfilePage } from './pages/patient/PatientProfilePage'
import { DoctorProfileManagementPage } from './pages/doctor/DoctorProfileManagementPage'

function App() {
  return (
    <SignUpModalProvider><Routes>
      <Route path="/" element={<PublicHomePage />} />
      <Route path="/login" element={<PatientLoginPage />} />
      <Route path="/register" element={<PatientRegistrationPage />} />
      <Route path="/register/patient" element={<PatientRegistrationPage />} />
      <Route path="/register/doctor" element={<DoctorRegistrationPage />} />
      <Route path="/patient/home" element={<PatientHomePage />} />
      <Route path="/patient/doctors/search" element={<FindDoctorPage />} />
      <Route path="/patient/doctors/results" element={<DoctorSearchResultsPage />} />
      <Route path="/patient/doctors/:doctorId" element={<DoctorProfilePage />} />
      <Route path="/patient/doctors/:doctorId/appointments" element={<AppointmentSelectionPage />} />
      <Route path="/doctor/dashboard" element={<DoctorDashboardPage />} />
      <Route path="/doctor/profile" element={<DoctorProfileManagementPage />} />
      <Route path="/patient/profile" element={<PatientProfilePage />} />
      <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes></SignUpModalProvider>
  )
}

export default App
