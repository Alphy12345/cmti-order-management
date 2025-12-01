// src/pages/ChProjects.jsx
'use client'

import { useMemo, useState, useEffect } from 'react'
import {
  Card,
  Typography,
  Empty,
  Tag,
  Spin,
  Input,
  message,
  Space,
  Button,
} from 'antd'
import {
  EyeOutlined,
  FileTextOutlined,
  UserOutlined,
  SearchOutlined,
  ProjectOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'

const { Title, Text } = Typography

const API_BASE = 'http://10.1.1.13:8000'

// Project type detection & styling
const getProjectTheme = (projectNumber) => {
  const num = (projectNumber || '').toString().trim().toUpperCase()

  if (num.includes('ISP')) {
    return { bg: 'bg-blue-50', border: 'border-blue-600', tag: 'bg-blue-600', label: 'ISP', iconColor: 'text-blue-700' }
  }
  if (num.includes('GSP')) {
    return { bg: 'bg-red-50', border: 'border-red-600', tag: 'bg-red-600', label: 'GSP', iconColor: 'text-red-700' }
  }
  return { bg: 'bg-green-50', border: 'border-green-600', tag: 'bg-green-600', label: 'Other', iconColor: 'text-green-700' }
}

function ChProjects() {
  const [projects, setProjects] = useState([])
  const [filteredProjects, setFilteredProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [currentUser, setCurrentUser] = useState({ name: '', center: '' })

  // Load user from localStorage
  useEffect(() => {
    try {
      const userData = localStorage.getItem('ppm_user')
      if (userData) {
        const user = JSON.parse(userData)
        setCurrentUser({
          name: user.name || user.username || 'User',
          center: (user.center || user.department || '').trim().toLowerCase(),
        })
      }
    } catch (err) {
      message.error('Failed to load user info')
    }
  }, [])

  // Fetch only projects (with project_number) for user's center
  useEffect(() => {
    if (!currentUser.center) return

    const fetchProjects = async () => {
      setLoading(true)
      try {
        const centerCode = currentUser.center
        const response = await fetch(`${API_BASE}/proposals/by-centre/${centerCode}`, {
          headers: { accept: 'application/json' },
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.status}`)
        }

        const data = await response.json()

        // Filter only records that have a project_number → real projects
        const realProjects = (Array.isArray(data) ? data : [])
          .filter(item => item.project_number && item.project_number.trim() !== '')
          .map(item => ({
            ...item,
            key: item.id,
          }))

        setProjects(realProjects)
        setFilteredProjects(realProjects)
        message.success(`Loaded ${realProjects.length} active projects`)
      } catch (err) {
        console.error(err)
        message.error('Failed to load projects')
        setProjects([])
        setFilteredProjects([])
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [currentUser.center])

  // Search filter
  useEffect(() => {
    const term = searchText.toLowerCase().trim()
    if (!term) {
      setFilteredProjects(projects)
      return
    }

    const filtered = projects.filter(p =>
      p.project_number?.toLowerCase().includes(term) ||
      p.activity?.toLowerCase().includes(term) ||
      p.party_name?.toLowerCase().includes(term) ||
      p.project_co_ordinator?.toLowerCase().includes(term)
    )
    setFilteredProjects(filtered)
  }, [searchText, projects])

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" tip={`Loading projects for ${currentUser.center?.toUpperCase()} center...`} />
      </div>
    )
  }

  // No center
  if (!currentUser.center) {
    return (
      <div className="p-10 text-center">
        <Empty description="No center assigned to your account" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm p-8 mb-8 text-center">
          <div className="flex items-center justify-center gap-4 mb-4">
            <ProjectOutlined className="text-5xl text-blue-600" />
            <Title level={1} className="m-0">CH Projects Dashboard</Title>
          </div>
          <Title level={3} type="secondary" className="m-0">
            {currentUser.center.toUpperCase()} Center
          </Title>
          <Text type="secondary" className="text-lg">
            Welcome, <strong>{currentUser.name}</strong>
          </Text>
          <div className="mt-4">
            <Tag color="blue" className="text-xl px-6 py-2">
              {filteredProjects.length} Active Project{filteredProjects.length !== 1 ? 's' : ''}
            </Tag>
          </div>
        </div>

        {/* Search */}
        <div className="mb-8 max-w-2xl mx-auto">
          <Input.Search
            placeholder="Search by Project Number, Party, Activity or Coordinator..."
            allowClear
            size="large"
            prefix={<SearchOutlined />}
            enterButton="Search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="shadow-md"
          />
        </div>

        {/* Projects Grid */}
        {filteredProjects.length === 0 ? (
          <div className="text-center py-20">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span>
                  {searchText ? 'No projects match your search' : 'No active projects in your center'}
                </span>
              }
            />
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProjects.map((project) => {
              const theme = getProjectTheme(project.project_number)

              return (
                <Card
                  key={project.id}
                  hoverable
                  className={`shadow-lg border-l-8 ${theme.border} ${theme.bg} transition-all hover:shadow-2xl hover:scale-105 cursor-pointer`}
                  onClick={() => {
                    // Future: navigate to project detail page
                    message.info(`Project ${project.project_number} clicked`)
                  }}
                >
                  <div className="text-center mb-4">
                    <Text className={`text-3xl font-bold block ${theme.iconColor}`}>
                      {project.project_number}
                    </Text>
                    <Tag className={`mt-2 text-lg px-4 py-1 ${theme.tag}`}>
                      {theme.label}
                    </Tag>
                  </div>

                  <Space direction="vertical" size="middle" className="w-full">
                    <div>
                      <Text type="secondary" className="text-xs">Activity</Text>
                      <Text className="block font-semibold text-base" strong>
                        {project.activity || 'Not specified'}
                      </Text>
                    </div>

                    <div>
                      <Text type="secondary" className="text-xs">Party</Text>
                      <Text className="block">{project.party_name || '—'}</Text>
                    </div>

                    <div>
                      <Text type="secondary" className="text-xs">Coordinator</Text>
                      <Text strong className="block">
                        <UserOutlined /> {project.project_co_ordinator || '—'}
                      </Text>
                    </div>

                    {project.order_value && (
                      <div className="text-center pt-3 border-t mt-3">
                        <Text className="text-2xl font-bold text-green-600">
                          ₹{(parseInt(project.order_value) || 0).toLocaleString('en-IN')}
                        </Text>
                      </div>
                    )}

                    <Button
                      type="primary"
                      icon={<EyeOutlined />}
                      block
                      size="large"
                      className="mt-4"
                    >
                      View Project
                    </Button>
                  </Space>
                </Card>
              )
            })}
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500">
          <Text>CH Projects • {currentUser.center.toUpperCase()} Center • {dayjs().format('DD MMM YYYY')}</Text>
        </div>
      </div>
    </div>
  )
}

export default ChProjects