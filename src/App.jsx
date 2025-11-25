import { Layout } from 'antd'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Proposals from './pages/Proposals'
import Configuration from './pages/Configuration'
import Projects from './pages/Projects'
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

function ProtectedLayout() {
  if (!isAuthenticated()) {
    return <Navigate to="/" replace />
  }

  return (
    <Layout className="min-h-screen">
      <Sidebar />
      <Layout className="bg-slate-100">
        <Content className="p-6">
          <Routes>
            <Route path="proposals" element={<Proposals />} />
            <Route path="configuration" element={<Configuration />} />
            <Route path="projects" element={<Projects />} />
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

          {/* Main app routes with sidebar layout */}
          <Route path="/*" element={<ProtectedLayout />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App

