import { useCallback, useEffect, useState } from 'react'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import {
  Button,
  Table,
  Typography,
  Modal,
  Form,
  Input,
  InputNumber,
  message,
  Space,
  Popconfirm,
  Checkbox,
} from 'antd'
import dayjs from 'dayjs'

const { Title } = Typography

const API_BASE_URL = 'http://172.18.100.160:8000'


function Configuration({ projectRows = [] }) {
  const [stageData, setStageData] = useState([])
  const [stageLoading, setStageLoading] = useState(false)
  const [stageModalOpen, setStageModalOpen] = useState(false)
  const [stageSubmitLoading, setStageSubmitLoading] = useState(false)
  const [editingStage, setEditingStage] = useState(null)
  const [stageForm] = Form.useForm()

  const fetchStages = useCallback(async () => {
    setStageLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/stages/`, {
        headers: { accept: 'application/json' },
      })
      if (!response.ok) {
        throw new Error('Unable to fetch stages')
      }
      const payload = await response.json()
      const normalized = Array.isArray(payload)
        ? payload.map((item) => ({ ...item, key: item.id }))
        : []
      setStageData(normalized)
    } catch (error) {
      console.error(error)
      message.error(error.message || 'Unable to fetch stages')
    } finally {
      setStageLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStages()
  }, [fetchStages])

  const openStageModal = (stage = null) => {
    setEditingStage(stage)
    stageForm.setFieldsValue({
      name: stage?.name ?? '',
      position: stage?.position ?? undefined,
    })
    setStageModalOpen(true)
  }

  const closeStageModal = () => {
    setStageModalOpen(false)
    setEditingStage(null)
    stageForm.resetFields()
  }

  const handleStageSubmit = async () => {
    try {
      const values = await stageForm.validateFields()
      setStageSubmitLoading(true)
      const isEditing = Boolean(editingStage)
      const url = isEditing
        ? `${API_BASE_URL}/stages/${editingStage.id}`
        : `${API_BASE_URL}/stages/`
      const method = isEditing ? 'PUT' : 'POST'
      const response = await fetch(url, {
        method,
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: values.name,
          position: values.position,
        }),
      })
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Unable to save stage')
      }
      message.success(isEditing ? 'Stage updated' : 'Stage created')
      closeStageModal()
      fetchStages()
    } catch (error) {
      if (error.errorFields) {
        // validation error from form, ignore
        return
      }
      console.error(error)
      message.error(error.message || 'Unable to save stage')
    } finally {
      setStageSubmitLoading(false)
    }
  }

  const handleDeleteStage = async (stage) => {
    try {
      const response = await fetch(`${API_BASE_URL}/stages/${stage.id}`, {
        method: 'DELETE',
        headers: { accept: '*/*' },
      })
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Unable to delete stage')
      }
      message.success('Stage deleted')
      fetchStages()
    } catch (error) {
      console.error(error)
      message.error(error.message || 'Unable to delete stage')
    }
  }

  const stageColumns = [
    {
      title: 'Stage ID',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: 'Stage Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Created At',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (value) =>
        value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => openStageModal(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete stage"
            description="This action cannot be undone."
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDeleteStage(record)}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div>
         
          
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openStageModal()}>
          Add Stage
        </Button>
      </div>


      <Table
        rowKey="key"
        columns={stageColumns}
        dataSource={stageData}
        loading={stageLoading}
        pagination={{ pageSize: 10 }}
        bordered
        title={() => 'Stages'}
      />

      <Modal
        title={editingStage ? 'Edit Stage' : 'Add Stage'}
        open={stageModalOpen}
        onCancel={closeStageModal}
        onOk={handleStageSubmit}
        confirmLoading={stageSubmitLoading}
        okText={editingStage ? 'Update' : 'Create'}
        maskClosable={false}
      >
        <Form form={stageForm} layout="vertical">
          <Form.Item
            name="name"
            label="Stage Name"
            rules={[{ required: true, message: 'Please enter stage name' }]}
          >
            <Input placeholder="Enter stage name" />
          </Form.Item>
          <Form.Item
            name="position"
            label="Position"
            tooltip="Enter the stage number where this stage should appear (e.g. 6 to place it between 5 and 7)"
            rules={[
              {
                type: 'number',
                transform: (value) => (value === '' ? undefined : value),
              },
            ]}
          >
            <InputNumber
              min={1}
              style={{ width: '100%' }}
              placeholder="Leave empty to add at the end"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Configuration


