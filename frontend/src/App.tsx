import { Navigate, Route, Routes, useParams } from 'react-router-dom'
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
import { DoctorAvailabilityPage } from './pages/doctor/DoctorAvailabilityPage'
import { DoctorAppointmentsPage } from './pages/doctor/DoctorAppointmentsPage'
import { PatientAppointmentsPage } from './pages/patient/PatientAppointmentsPage'
import { PatientAppointmentDetailsPage } from './pages/patient/PatientAppointmentDetailsPage'
import { AppointmentConfirmationPage } from './pages/patient/AppointmentConfirmationPage'
import { PatientReviewPage } from './pages/patient/PatientReviewPage'
import { buildDoctorBookingPath } from './utils/navigation'

function LegacyAppointmentSelectionRedirect() {
  const { doctorId } = useParams()
  return <Navigate replace to={buildDoctorBookingPath(doctorId ?? '')} />
}

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
      <Route path="/patient/doctors/:doctorId/book" element={<AppointmentSelectionPage />} />
      <Route path="/patient/doctors/:doctorId/appointments" element={<LegacyAppointmentSelectionRedirect />} />
      <Route path="/patient/appointments/confirm" element={<AppointmentConfirmationPage />} />
      <Route path="/patient/appointments" element={<PatientAppointmentsPage />} />
      <Route path="/patient/appointments/:appointmentId" element={<PatientAppointmentDetailsPage />} />
      <Route path="/patient/appointments/:appointmentId/review" element={<PatientReviewPage />} />
      <Route path="/doctor/dashboard" element={<DoctorDashboardPage />} />
      <Route path="/doctor/profile" element={<DoctorProfileManagementPage />} />
      <Route path="/doctor/availability" element={<DoctorAvailabilityPage />} />
      <Route path="/doctor/appointments" element={<DoctorAppointmentsPage />} />
      <Route path="/patient/profile" element={<PatientProfilePage />} />
      <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes></SignUpModalProvider>
  )
}

export default App
