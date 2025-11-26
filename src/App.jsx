import { Layout } from 'antd'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Proposals from './pages/Proposals'
import Configuration from './pages/Configuration'
import Projects from './pages/Projects'
import GHProposals from './pages/GHproposals'
import GHProjects from './pages/GHprojects'
import Login from './pages/Login'
import CreateLogin from './pages/CreateLogin'
import Sidebar from './components/Sidebar'
import './App.css'

const { Content } = Layout

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

function getStoredUser() {
  try {
    const raw = window.localStorage.getItem('ppm_user')
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function RoleProtectedLayout({ basePath }) {
  if (!isAuthenticated()) {
    return <Navigate to="/" replace />
  }

  const user = getStoredUser()
  const userRole = (user?.role || '').toLowerCase() === 'admin' ? 'admin' : 'gh'

  // If user hits a path for the wrong role, send them to their own base
  if (userRole !== basePath) {
    return <Navigate to={`/${userRole}/proposals`} replace />
  }

  const isAdmin = userRole === 'admin'

   // Choose which page components to render based on role
  const ProposalsComponent = isAdmin ? Proposals : GHProposals
  const ProjectsComponent = isAdmin ? Projects : GHProjects

  return (
    <Layout className="min-h-screen">
      <Sidebar />
      <Layout className="bg-slate-100">
        <Content className="p-6">
          <Routes>
            <Route path="proposals" element={<ProposalsComponent />} />
            {isAdmin && <Route path="configuration" element={<Configuration />} />}
            <Route path="projects" element={<ProjectsComponent />} />
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
          {/* Auth routes (no sidebar) */}
          <Route path="/" element={<Login />} />
          <Route path="/create-login" element={<CreateLogin />} />

          {/* Admin routes */}
          <Route path="/admin/*" element={<RoleProtectedLayout basePath="admin" />} />

          {/* GH routes */}
          <Route path="/gh/*" element={<RoleProtectedLayout basePath="gh" />} />

          {/* Fallback: if some other path, send to login */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App

