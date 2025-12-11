import { Layout, Menu, Button, Typography, message } from 'antd'
import {
  ProfileOutlined,
  SettingOutlined,
  ProjectOutlined,
} from '@ant-design/icons'
import cmtiLogo from '../assets/waitro-member-cmti.png'
import { useLocation, useNavigate } from 'react-router-dom'

const { Sider } = Layout
const { Text } = Typography

function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()

  const segments = location.pathname.split('/').filter(Boolean)
  const basePath = segments[0] || 'admin'
  const section = segments[1] || 'proposals'

  const selectedKey =
    section === 'configuration' ? 'configuration' : section === 'projects' ? 'projects' : 'proposals'

  let userName = ''
  try {
    const rawUser = window.localStorage.getItem('ppm_user')
    if (rawUser) {
      const parsedUser = JSON.parse(rawUser)
      if (parsedUser && parsedUser.name) {
        userName = parsedUser.name
      }
    }
  } catch (error) {
    console.error('Failed to read user from localStorage', error)
  }

  const handleLogout = () => {
    try {
      window.localStorage.removeItem('ppm_user')
      window.localStorage.removeItem('token')
    } catch (error) {
      console.error('Failed to clear user from localStorage', error)
    }
    message.success('Logged out')
    navigate('/')
  }

  return (
    <Sider
      width={260}
      className="bg-white shadow-lg flex flex-col justify-between"
      style={{ position: 'fixed', left: 0, top: 0, bottom: 0, height: '100vh', zIndex: 100 }}
    >
      <div>
        <div className="flex flex-col items-start gap-4 px-6 py-8 border-b border-slate-200">
          <div className="w-full flex items-center justify-center">
            <img
              src={cmtiLogo}
              alt="CMTI logo"
              className="h-16 w-auto object-contain"
            />
          </div>
          {userName && (
            <div className="mt-2 w-full text-center">
              <Text type="secondary">Welcome,</Text>
              <div>
                <Text strong>{userName}</Text>
              </div>
            </div>
          )}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          onClick={(info) => {
            // ✅ FIXED: Now handles all three roles correctly
            const prefix = basePath === 'ch' ? '/ch' : basePath === 'gh' ? '/gh' : '/admin'
            
            if (info.key === 'configuration') navigate(`${prefix}/configuration`)
            else if (info.key === 'projects') navigate(`${prefix}/projects`)
            else navigate(`${prefix}/proposals`)
          }}
          items={[
            { key: 'proposals', icon: <ProfileOutlined />, label: 'Proposals' },
            ...(basePath === 'admin'
              ? [
                  {
                    key: 'configuration',
                    icon: <SettingOutlined />,
                    label: 'Configuration',
                  },
                ]
              : []),
            { key: 'projects', icon: <ProjectOutlined />, label: 'Projects' },
          ]}
          className="text-base"
        />
      </div>
      <div className="px-4 pb-4 border-t border-slate-200 pt-3">
        <Button danger block onClick={handleLogout}>
          Logout
        </Button>
      </div>
    </Sider>
  )
}

export default Sidebar