import { Layout } from 'antd'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Proposals from './pages/Proposals'
import Analytics from './pages/Analytics'
import Configuration from './pages/Configuration'
import Projects from './pages/Projects'
import GHProposals from './pages/GHproposals'
import GHProjects from './pages/GHprojects'
import CHProposals from './pages/CHproposals'
import CHProjects from './pages/CHprojects'
import Login from './pages/Login'
import CreateLogin from './pages/CreateLogin'
import Sidebar from './components/Sidebar'

import './App.css'

const { Content } = Layout

// Check if user is logged in
function isAuthenticated() {
  try {
    const raw = window.localStorage.getItem('ppm_user')
    if (!raw) return false
    const parsed = JSON.parse(raw)
    return Boolean(parsed && parsed.user_id)
  } catch {
    return false
  }
}

// Get user object from localStorage
function getStoredUser() {
  try {
    const raw = window.localStorage.getItem('ppm_user')
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

// Protected layout that enforces correct role and renders correct pages
function RoleProtectedLayout({ basePath }) {
  // Redirect to login if not authenticated
  if (!isAuthenticated()) {
    return <Navigate to="/" replace />
  }

  const user = getStoredUser()
  const userRole = (user?.role || '').toLowerCase()

  // Normalize role: only allow 'admin', 'gh', 'ch' — default to 'gh' if unknown
  const normalizedRole = ['admin', 'gh', 'ch'].includes(userRole) ? userRole : 'gh'

  // If user is trying to access a base path that doesn't match their role → redirect
  if (normalizedRole !== basePath) {
    return <Navigate to={`/${normalizedRole}/proposals`} replace />
  }

  const isAdmin = normalizedRole === 'admin'

  // Select correct page components based on role
  let ProposalsComponent = GHProposals
  let ProjectsComponent = GHProjects

  if (normalizedRole === 'admin') {
    ProposalsComponent = Proposals
    ProjectsComponent = Projects
  } else if (normalizedRole === 'ch') {
    ProposalsComponent = CHProposals
    ProjectsComponent = CHProjects
  }
  // 'gh' already set as default above

  return (
    <Layout className="min-h-screen">
      <Sidebar />
      <Layout
        className="bg-slate-100"
        style={{ marginLeft: 260, minHeight: '100vh' }}
      >
        <Content
          className="p-6"
          style={{ height: '100vh', overflowY: 'auto' }}
        >
          <Routes>
            <Route path="proposals" element={<ProposalsComponent />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="projects" element={<ProjectsComponent />} />

            {/* Only admins can access configuration */}
            {isAdmin && (
              <Route path="configuration" element={<Configuration />} />
            )}

            {/* Catch-all: redirect to proposals */}
            <Route path="*" element={<Navigate to="proposals" replace />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  )
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-100">
        <Routes>
          {/* Public / Auth Routes */}
          <Route path="/" element={<Login />} />
          <Route path="/create-login" element={<CreateLogin />} />

          {/* Protected Role-Based Routes */}
          <Route path="/admin/*" element={<RoleProtectedLayout basePath="admin" />} />
          <Route path="/gh/*" element={<RoleProtectedLayout basePath="gh" />} />
          <Route path="/ch/*" element={<RoleProtectedLayout basePath="ch" />} />

          {/* Fallback: any unknown route → login */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App