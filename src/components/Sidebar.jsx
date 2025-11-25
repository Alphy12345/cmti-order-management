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

  const selectedKey =
    location.pathname === '/configuration'
      ? 'configuration'
      : location.pathname === '/projects'
      ? 'projects'
      : 'proposals'

  const handleLogout = () => {
    try {
      window.localStorage.removeItem('ppm_user')
    } catch (error) {
      console.error('Failed to clear user from localStorage', error)
    }
    message.success('Logged out')
    navigate('/')
  }

  return (
    <Sider width={260} className="bg-white shadow-lg flex flex-col justify-between">
      <div>
        <div className="flex flex-col items-start gap-4 px-6 py-8 border-b border-slate-200">
          <div className="w-full flex items-center justify-center">
            <img
              src={cmtiLogo}
              alt="CMTI logo"
              className="h-16 w-auto object-contain"
            />
          </div>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          onClick={(info) => {
            if (info.key === 'configuration') navigate('/configuration')
            else if (info.key === 'projects') navigate('/projects')
            else navigate('/proposals')
          }}
          items={[
            { key: 'proposals', icon: <ProfileOutlined />, label: 'Proposals' },
            {
              key: 'configuration',
              icon: <SettingOutlined />,
              label: 'Configuration',
            },
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


