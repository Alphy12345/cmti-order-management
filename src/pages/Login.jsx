import { useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { Card, Form, Input, Button, Typography, Checkbox, message } from 'antd'
import cmtiLogo from '../assets/waitro-member-cmti.png'

const { Title, Text } = Typography

const API_BASE_URL = 'http://10.1.1.13:8000'

function parseApiError(error) {
  if (!error) return 'Unknown error'
  const res = error.response
  if (!res) {
    return error.message || 'Network error'
  }

  const { status, data } = res

  if (typeof data === 'string' && data.trim()) return data
  if (data) {
    if (typeof data === 'object') {
      if (data.detail) return data.detail
      if (data.message) return data.message
      if (data.errors) {
        if (Array.isArray(data.errors)) return data.errors.join(', ')
        return JSON.stringify(data.errors)
      }
    }
  }

  return `Request failed with status ${status}`
}

function Login() {
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [form] = Form.useForm()
  const navigate = useNavigate()

  const handleSubmit = async (values) => {
    setLoading(true)
    try {
      const response = await axios.post(`${API_BASE_URL}/users/login`, {
        email: values.email,
        password: values.password,
      })

      console.log('Login response:', response.data)

      // Extract user data and token from API response
      const userData = response.data
      
      // ✅ CRITICAL FIX: Save the token!
      const token = userData.access_token || userData.token
      if (token) {
        localStorage.setItem('token', token)
        console.log('Token saved to localStorage')
      } else {
        console.warn('No token found in login response!')
      }

      const userPayload = {
        user_id: userData.id,
        name: userData.name,
        email: userData.email || values.email,
        role: userData.role,
        center: userData.center,
        designation: userData.designation,
        group: userData.group,
      }

      // Save user to localStorage
      try {
        localStorage.setItem('ppm_user', JSON.stringify(userPayload))
        console.log('User saved to localStorage:', userPayload)
      } catch (err) {
        console.error('Failed to save user to localStorage', err)
      }

      // Show success message
      message.success(userData.message || 'Login successful')

      // Navigate based on role
      const routeRole = userPayload.role
      navigate(`/${routeRole}/proposals`)

    } catch (error) {
      console.error('Login error:', error)
      const detail = parseApiError(error)
      message.error(detail)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <Card className="w-full max-w-md shadow-xl rounded-3xl">
        <div className="flex flex-col items-center gap-4 mb-6">
          <img src={cmtiLogo} alt="CMTI logo" className="h-16 w-auto object-contain" />
          <Title level={3} className="!mb-0 text-center">
            Welcome
          </Title>
          <Text type="secondary" className="text-center">
            Please sign in to continue
          </Text>
        </div>

        <Form form={form} layout="vertical" onFinish={handleSubmit} autoComplete="off">
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Please enter a valid email' },
            ]}
          >
            <Input placeholder="Enter email" size="large" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: 'Please enter your password' }]}
          >
            <Input
              placeholder="Enter password"
              size="large"
              type={showPassword ? 'text' : 'password'}
            />
          </Form.Item>

          <div className="flex items-center justify-between mb-4">
            <Checkbox
              checked={showPassword}
              onChange={(e) => setShowPassword(e.target.checked)}
            >
              Show password
            </Checkbox>
          </div>

          <Button
            type="primary"
            htmlType="submit"
            size="large"
            loading={loading}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            Sign In
          </Button>
        </Form>

        <div className="mt-6 text-center">
          <Text type="secondary">Don&apos;t have an account?</Text>
          <button
            type="button"
            className="ml-2 text-blue-600 hover:text-blue-700 font-medium"
            onClick={() => navigate('/create-login')}
          >
            Create login
          </button>
        </div>
      </Card>
    </div>
  )
}

export default Login