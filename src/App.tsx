import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from '@/components/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Stalls from '@/pages/Stalls'
import StallDetail from '@/pages/StallDetail'
import StallForm from '@/pages/StallForm'
import Tenants from '@/pages/Tenants'
import TenantDetail from '@/pages/TenantDetail'
import TenantForm from '@/pages/TenantForm'
import Leases from '@/pages/Leases'
import LeaseForm from '@/pages/LeaseForm'
import Finance from '@/pages/Finance'
import Settings from '@/pages/Settings'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/stalls" element={<Stalls />} />
          <Route path="/stalls/new" element={<StallForm />} />
          <Route path="/stalls/:id" element={<StallDetail />} />
          <Route path="/stalls/:id/edit" element={<StallForm />} />
          <Route path="/tenants" element={<Tenants />} />
          <Route path="/tenants/new" element={<TenantForm />} />
          <Route path="/tenants/:id" element={<TenantDetail />} />
          <Route path="/tenants/:id/edit" element={<TenantForm />} />
          <Route path="/leases" element={<Leases />} />
          <Route path="/leases/new" element={<LeaseForm />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  )
}
