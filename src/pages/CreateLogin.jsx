import { useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { Card, Form, Input, Button, Typography, message } from 'antd'
import cmtiLogo from '../assets/waitro-member-cmti.png'

const { Title, Text } = Typography

const API_BASE_URL = 'http://10.1.1.13:8000'

function CreateLogin() {
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()
  const navigate = useNavigate()

  const handleSubmit = async (values) => {
    setLoading(true)
    try {
      await axios.post(`${API_BASE_URL}/users/`, values)
      message.success('User created successfully')
      navigate('/')
    } catch (error) {
      console.error(error)
      const detail = error?.response?.data?.detail || 'Failed to create user'
      message.error(detail)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <Card className="w-full max-w-2xl shadow-xl rounded-3xl">
        <div className="flex flex-col items-center gap-4 mb-6">
          <img src={cmtiLogo} alt="CMTI logo" className="h-16 w-auto object-contain" />
          <Title level={3} className="!mb-0 text-center">
            Create Login
          </Title>
          <Text type="secondary" className="text-center">
            Fill in the details to create a new login
          </Text>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please enter name' }]}
          >
            <Input placeholder="Enter name" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true, type: 'email', message: 'Please enter valid email' }]}
          >
            <Input placeholder="Enter email" />
          </Form.Item>

          <Form.Item
            name="designation"
            label="Designation"
            rules={[{ required: true, message: 'Please enter designation' }]}
          >
            <Input placeholder="Enter designation" />
          </Form.Item>

          <Form.Item
            name="role"
            label="Role"
            rules={[{ required: true, message: 'Please enter role' }]}
          >
            <Input placeholder="Enter role" />
          </Form.Item>

          <Form.Item
            name="center"
            label="Center"
            rules={[{ required: true, message: 'Please enter center' }]}
          >
            <Input placeholder="Enter center" />
          </Form.Item>

          <Form.Item
            name="group"
            label="Group"
            rules={[{ required: true, message: 'Please enter group' }]}
          >
            <Input placeholder="Enter group" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: 'Please enter password' }]}
          >
            <Input.Password placeholder="Enter password" />
          </Form.Item>

          <div className="md:col-span-2 flex justify-end gap-3 mt-2">
            <Button onClick={() => navigate('/')}>
              Back to Login
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Create Login
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  )
}

export default CreateLogin
