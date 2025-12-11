'use client'

import { useMemo, useState, useEffect } from 'react'
import {
  Card,
  Typography,
  Button,
  Space,
  Modal,
  Empty,
  Tag,
  Spin,
  Upload,
  message,
  Input,
  Table,
  Popconfirm,
  Form,
  DatePicker,
  Select
} from 'antd'
import {
  EyeOutlined,
  FileTextOutlined,
  UserOutlined,
  CalendarOutlined,
  LinkOutlined,
  UploadOutlined,
  InboxOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
dayjs.extend(customParseFormat)

const { Title, Text } = Typography
const { TextArea } = Input
const { Dragger } = Upload

const formatValue = (value) => (value ? value : 'Not available')
const safeId = (item) => item?.id ?? item?.key ?? ''

const getProjectTheme = (projectNumber) => {
  const num = (projectNumber || '').toString().toUpperCase()
  if (num.includes('ISP')) {
    return {
      cardClass: 'border-l-4 border-blue-500 bg-blue-50',
      pillClass: 'bg-blue-500/10 text-blue-700 border border-blue-500/30',
      pillLabel: 'ISP',
    }
  }
  if (num.includes('GSP')) {
    return {
      cardClass: 'border-l-4 border-red-500 bg-red-50',
      pillClass: 'bg-red-500/10 text-red-700 border border-red-500/30',
      pillLabel: 'GSP',
    }
  }
  return {
    cardClass: 'border-l-4 border-green-500 bg-green-50',
    pillClass: 'bg-green-500/10 text-green-700 border border-green-500/30',
    pillLabel: 'Other',
  }
}

function Projects() {
  const apiBase = 'http://10.1.1.13:8000'
  
  // Projects list state
  const [projectRows, setProjectRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentUserName, setCurrentUserName] = useState('')
  const [stageConfig, setStageConfig] = useState([])
  
  // Project details state
  const [selectedProject, setSelectedProject] = useState(null)
  const [stageData, setStageData] = useState([])
  const [loadingStages, setLoadingStages] = useState(false)
  const [viewDocumentUrl, setViewDocumentUrl] = useState(null)

  // Upload
  const [uploadModalVisible, setUploadModalVisible] = useState(false)
  const [selectedStageForUpload, setSelectedStageForUpload] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [fileToUpload, setFileToUpload] = useState(null)
  const [documentName, setDocumentName] = useState('')
  const [uploadedBy, setUploadedBy] = useState('')
  const [description, setDescription] = useState('')

  // Remarks
  const [remarksModalVisible, setRemarksModalVisible] = useState(false)
  const [selectedStageForRemarks, setSelectedStageForRemarks] = useState(null)
  const [remarksText, setRemarksText] = useState('')
  const [remarksBy, setRemarksBy] = useState('')
  const [submittingRemarks, setSubmittingRemarks] = useState(false)
  const [editingRemark, setEditingRemark] = useState(null)

  // Payment
  const [paymentModalVisible, setPaymentModalVisible] = useState(false)
  const [selectedStageForPayment, setSelectedStageForPayment] = useState(null)
  const [paymentForm] = Form.useForm()
  const [editingPayment, setEditingPayment] = useState(null)
  const [submittingPayment, setSubmittingPayment] = useState(false)

  // Fetch projects on mount and read current user from localStorage
  useEffect(() => {
    try {
      const rawUser = window.localStorage.getItem('ppm_user')
      if (rawUser) {
        const parsedUser = JSON.parse(rawUser)
        if (parsedUser && parsedUser.name) {
          setCurrentUserName(parsedUser.name)
        }
      }
    } catch (error) {
      console.error('Failed to read user from localStorage', error)
    }

    fetchProjects()
    fetchStageConfig()
  }, [])

  const fetchProjects = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${apiBase}/proposals/`)
      if (!res.ok) {
        throw new Error(`Failed to fetch projects: ${res.status}`)
      }
      const data = await res.json()
      console.log('Fetched projects:', data)
      setProjectRows(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching projects:', error)
      message.error('Failed to load projects')
      setProjectRows([])
    } finally {
      setLoading(false)
    }
  }

  const fetchStageConfig = async () => {
    try {
      const res = await fetch(`${apiBase}/stages/`, {
        headers: { accept: 'application/json' },
      })
      if (!res.ok) {
        throw new Error('Failed to fetch stage configuration')
      }
      const data = await res.json()
      const normalized = Array.isArray(data)
        ? data.map((item) => ({ ...item, key: item.id }))
        : []
      setStageConfig(normalized)
      return normalized
    } catch (error) {
      console.error('Error fetching stage configuration:', error)
      return []
    }
  }

  const cards = useMemo(() => projectRows || [], [projectRows])

  const restrictedStages = {
    uploadDisabled: ['progress', 'payments'],
    remarksDisabled: ['enquiry', 'proposal', 'po', 'po acknowledgment', 'payments', 'closure report'],
    paymentDisabled: ['enquiry', 'proposal', 'po', 'po acknowledgment', 'progress', 'closure report'],
  }

  const fetchStageData = async (projectId) => {
    setLoadingStages(true)
    try {
      let config = stageConfig
      if (!config || config.length === 0) {
        config = await fetchStageConfig()
      }

      const res = await fetch(`${apiBase}/proposals/stage_wise/${projectId}`)
      if (!res.ok) {
        const err = await res.text().catch(() => 'Failed')
        throw new Error(err || 'Failed to fetch stage data')
      }
      const data = await res.json()

      const getPosition = (stage) => {
        const matched = config.find((s) => s.id === stage.stage_id)
        const raw = matched?.position ?? stage.position

        const num = typeof raw === 'number' ? raw : Number(raw)
        return Number.isNaN(num) ? null : num
      }

      const sorted = Array.isArray(data)
        ? [...data].sort((a, b) => {
            const pa = getPosition(a)
            const pb = getPosition(b)

            const paValid = pa !== null
            const pbValid = pb !== null

            if (!paValid && !pbValid) return 0
            if (!paValid) return 1
            if (!pbValid) return -1
            return pa - pb
          })
        : []
      setStageData(sorted)
    } catch (error) {
      console.error('Error fetching stages:', error)
      message.error('Failed to load stage data')
      setStageData([])
    } finally {
      setLoadingStages(false)
    }
  }

  const handleViewProject = (project) => {
    setSelectedProject(project)
    const projectId = safeId(project)
    if (projectId) fetchStageData(projectId)
  }

  const handleBackToProjects = () => {
    setSelectedProject(null)
    setStageData([])
  }

  // Upload Document handlers
  const handleOpenUploadModal = (stage) => {
    setSelectedStageForUpload(stage)
    setUploadModalVisible(true)
    setFileToUpload(null)
    setDocumentName((stage.stage_name || 'Document').toString())
    setUploadedBy(currentUserName || '')
    setDescription('')
  }

  const handleCloseUploadModal = () => {
    setUploadModalVisible(false)
    setSelectedStageForUpload(null)
    setFileToUpload(null)
  }

  const handleUpload = async () => {
    if (!fileToUpload) return message.error('Please select a file')
    const uploader = (uploadedBy || currentUserName || '').trim()
    if (!uploader) return message.error('Your name is required')

    setUploading(true)
    const formData = new FormData()
    formData.append('name', documentName.trim())
    formData.append('description', description.trim())
    formData.append('project_id', safeId(selectedProject))
    formData.append('stage_id', selectedStageForUpload.stage_id)
    formData.append('uploaded_by', uploader)
    formData.append('file', fileToUpload)

    try {
      const res = await fetch(`${apiBase}/documents/`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const err = await res.text().catch(() => 'Upload failed')
        throw new Error(err || 'Upload failed')
      }
      message.success('Document uploaded!')
      handleCloseUploadModal()
      fetchStageData(safeId(selectedProject))
    } catch (err) {
      console.error('Upload error:', err)
      message.error(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  // Remarks handlers
  const handleOpenRemarksModal = (stage) => {
    setSelectedStageForRemarks(stage)
    setRemarksModalVisible(true)
    setRemarksText('')
    setRemarksBy('')
    setEditingRemark(null)
  }

  const handleEditRemark = (stage, remark) => {
    setSelectedStageForRemarks(stage)
    setEditingRemark(remark)
    setRemarksText(remark.remarks || '')
    setRemarksBy(remark.updated_by || '')
    setRemarksModalVisible(true)
  }

  const handleDeleteRemark = async (remarkId) => {
    try {
      const res = await fetch(`${apiBase}/progress/${remarkId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      message.success('Remark deleted')
      fetchStageData(safeId(selectedProject))
    } catch (err) {
      console.error(err)
      message.error('Failed to delete remark')
    }
  }

  const handleSubmitRemarks = async () => {
    if (!remarksText.trim()) return message.error('Remarks required')
    if (!remarksBy.trim()) return message.error('Your name required')

    setSubmittingRemarks(true)
    try {
      if (editingRemark) {
        const res = await fetch(`${apiBase}/progress/${editingRemark.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: safeId(selectedProject),
            stage_id: selectedStageForRemarks.stage_id,
            remarks: remarksText.trim(),
            updated_by: remarksBy.trim(),
          }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.detail || 'Failed to update remark')
        }
        message.success('Remark updated!')
      } else {
        const res = await fetch(`${apiBase}/progress/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: safeId(selectedProject),
            stage_id: selectedStageForRemarks.stage_id,
            remarks: remarksText.trim(),
            updated_by: remarksBy.trim(),
          }),
        })
        if (!res.ok) throw new Error('Failed to add remark')
        message.success('Remarks added!')
      }

      setRemarksModalVisible(false)
      setEditingRemark(null)
      setRemarksText('')
      setRemarksBy('')
      fetchStageData(safeId(selectedProject))
    } catch (err) {
      console.error(err)
      message.error(err.message || 'Failed to save remark')
    } finally {
      setSubmittingRemarks(false)
    }
  }

  // Payment handlers
  const handleOpenPaymentModal = (stage, payment = null) => {
    setSelectedStageForPayment(stage)
    setEditingPayment(payment)
    setPaymentModalVisible(true)

    if (payment) {
      paymentForm.setFieldsValue({
        invoice_no: payment.invoice_no?.toString() || '',
        gross_amount: payment.gross_amount?.toString() || '',
        get_amount: payment.get_amount?.toString() || '',
        amount_claimed: payment.amount_claimed?.toString() || '',
        amount_recieved: payment.amount_recieved?.toString() || '',
        tds: payment.tds?.toString() || '',
        get_tds: payment.get_tds?.toString() || '',
        ld: payment.ld?.toString() || '',
        bal: payment.bal?.toString() || '',
        follow_up_status: payment.follow_up_status || '',
        invoice_date: payment.invoice_date ? dayjs(payment.invoice_date, ['DD/M/YY', 'DD/MM/YY', 'YYYY-MM-DD', dayjs.ISO_8601]) : null,
        recieved_date: payment.recieved_date ? dayjs(payment.recieved_date, ['DD/M/YY', 'DD/MM/YY', 'YYYY-MM-DD', dayjs.ISO_8601]) : null,
      })
    } else {
      paymentForm.resetFields()
    }
  }

  const handleSubmitPayment = async (values) => {
    setSubmittingPayment(true)
    try {
      const payload = {
        invoice_no: values.invoice_no || '',
        gross_amount: values.gross_amount || '',
        get_amount: values.get_amount || '',
        amount_claimed: values.amount_claimed || '',
        amount_recieved: values.amount_recieved || '',
        tds: values.tds || '',
        get_tds: values.get_tds || '',
        ld: values.ld || '',
        bal: values.bal || '',
        follow_up_status: values.follow_up_status || '',
        invoice_date: values.invoice_date ? values.invoice_date.format('DD/M/YY') : null,
        recieved_date: values.recieved_date ? values.recieved_date.format('DD/M/YY') : null,
        project_id: Number(safeId(selectedProject)),
        stage_id: Number(selectedStageForPayment.stage_id),
      }

      const url = editingPayment ? `${apiBase}/payments/${editingPayment.id}` : `${apiBase}/payments/`

      const res = await fetch(url, {
        method: editingPayment ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || 'Failed to save payment')
      }

      message.success(editingPayment ? 'Payment updated!' : 'Payment added!')
      setPaymentModalVisible(false)
      setEditingPayment(null)
      paymentForm.resetFields()
      fetchStageData(safeId(selectedProject))
    } catch (err) {
      console.error('Payment error:', err)
      message.error(err.message || 'Failed to save payment')
    } finally {
      setSubmittingPayment(false)
    }
  }

  const handleDeletePayment = async (id) => {
    try {
      const res = await fetch(`${apiBase}/payments/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      message.success('Payment deleted')
      fetchStageData(safeId(selectedProject))
    } catch (err) {
      console.error(err)
      message.error('Failed to delete payment')
    }
  }

    const [searchText, setSearchText] = useState('')
  const [selectedCenter, setSelectedCenter] = useState(undefined)   // “center” field in your project objects

  // Extract unique centers-centers for the dropdown (you can adjust the field name if it’s different)
  const centerOptions = useMemo(() => {
    const centers = [...new Set(projectRows
      .map(p => p.center?.trim())
      .filter(Boolean))]

    return centers.sort().map(c => ({ label: c, value: c }))
  }, [projectRows])

  // Filtered list (search + center)
  const filteredCards = useMemo(() => {
    return (projectRows || [])
      .filter(p => p?.project_number)                     // keep only projects that have a number
      .filter(p => {
        // Search – checks project_number, activity and coordinator
        const searchLower = searchText.toLowerCase().trim()
        if (searchLower) {
          const inNumber   = p.project_number?.toString().toLowerCase().includes(searchLower)
          const inActivity = p.activity?.toLowerCase().includes(searchLower)
          const inCoord    = p.project_co_ordinator?.toLowerCase().includes(searchLower)
          if (! (inNumber || inActivity || inCoord)) return false
        }

        // Center filter
        if (selectedCenter && p.center?.trim() !== selectedCenter) return false

        return true
      })
  }, [projectRows, searchText, selectedCenter])

  // Clear all filters
  const handleClearFilters = () => {
    setSearchText('')
    setSelectedCenter(undefined)
  }

  const getPaymentColumns = (stage) => [
    { title: 'Inv #', dataIndex: 'invoice_no', width: 120 },
    { title: 'Inv Date', dataIndex: 'invoice_date', width: 110 },
    { title: 'Gross', dataIndex: 'gross_amount', width: 110 },
    { title: 'Get Amount', dataIndex: 'get_amount', width: 110 },
    { title: 'Amount Claimed', dataIndex: 'amount_claimed', width: 130 },
    { title: 'Amount Received', dataIndex: 'amount_recieved', width: 130 },
    { title: 'Received Date', dataIndex: 'recieved_date', width: 120 },
    { title: 'TDS', dataIndex: 'tds', width: 90 },
    { title: 'Get TDS', dataIndex: 'get_tds', width: 90 },
    { title: 'LD', dataIndex: 'ld', width: 90 },
    { title: 'Balance', dataIndex: 'bal', width: 90 },
    { title: 'Status', dataIndex: 'follow_up_status', width: 150 },
    {
      title: 'Actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenPaymentModal(stage, record)}>Edit</Button>
          <Popconfirm title="Delete payment?" onConfirm={() => handleDeletePayment(record.id)}>
            <Button danger size="small" icon={<DeleteOutlined />}>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const formatDate = (date) => {
    if (!date) return 'N/A'
    const d = dayjs(date, ['DD/M/YY', 'DD/MM/YY', 'YYYY-MM-DD', dayjs.ISO_8601], true)
    return d.isValid() ? d.format('DD-MMM-YYYY, hh:mm A') : date
  }

  const uploadProps = {
    multiple: false,
    maxCount: 1,
    beforeUpload: (file) => {
      setFileToUpload(file)
      return false
    },
    onRemove: () => {
      setFileToUpload(null)
    },
    fileList: fileToUpload ? [{
      uid: fileToUpload.uid || fileToUpload.name,
      name: fileToUpload.name,
      status: 'done',
      originFileObj: fileToUpload,
    }] : [],
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spin size="large" tip="Loading projects..." />
      </div>
    )
  }

  // Project details view
  if (selectedProject) {
    return (
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={handleBackToProjects}
              size="large"
            >
              Back to Projects
            </Button>
            <div>
              <Title level={3} className="!mb-0">
                <FileTextOutlined /> Project {formatValue(selectedProject.project_number)}
              </Title>
              <Text type="secondary">{selectedProject.activity}</Text>
            </div>
          </div>
        </div>

        {loadingStages ? (
          <div className="py-20 text-center">
            <Spin size="large" tip="Loading stages..." />
          </div>
        ) : stageData.length === 0 ? (
          <Empty description="No stages found" />
        ) : (
          <div className="space-y-8">
            {stageData
              .filter(stage => (stage.stage_name || '').trim().toLowerCase() !== 'dgdfh')
              .map((stage) => {
                const rawName = (stage.stage_name || '').trim()
                const stageName = rawName
                const stageNameLower = rawName.toLowerCase()
                const hasDocs = Array.isArray(stage.documents) && stage.documents.length > 0
                const hasProg = Array.isArray(stage.progress) && stage.progress.length > 0
                const hasPay = Array.isArray(stage.payments) && stage.payments.length > 0

                const hideUpload = restrictedStages.uploadDisabled.includes(stageNameLower)
                const hideRemarks = restrictedStages.remarksDisabled.includes(stageNameLower)
                const hidePayment = restrictedStages.paymentDisabled.includes(stageNameLower)

                const defaultStageNames = [
                  'enquiry',
                  'proposal',
                  'po',
                  'po acknowledgment',
                  'progress',
                  'payments',
                  'closure report',
                ]
                const isCustomStage = !defaultStageNames.includes(stageNameLower)

                return (
                  <div key={stage.stage_id ?? stageName} className="border rounded-xl p-6 bg-gray-50">
                    <div className="flex justify-between items-center mb-5">
                      <Title level={4} className="!mb-0">
                        <Tag color="blue">{stage.stage_id}</Tag> {stageName || 'Stage'}
                      </Title>
                      {!hideUpload && (
                        <Button size="small" type="primary" icon={<UploadOutlined />} onClick={() => handleOpenUploadModal(stage)}>
                          Upload
                        </Button>
                      )}
                    </div>

                    {hasDocs && (
                      <div className="mb-6">
                        <Text strong>Documents:</Text>
                        <div className="grid gap-3 mt-3 md:grid-cols-2">
                          {stage.documents.map((doc) => (
                            <Card key={doc.id} size="small" className="border-l-4 border-l-blue-600">
                              <Text strong>{doc.name}</Text>
                              {doc.description && <Text type="secondary" className="block text-xs">{doc.description}</Text>}
                              <div className="text-xs text-gray-500 mt-1">
                                <UserOutlined /> {doc.uploaded_by || 'Unknown'} • <CalendarOutlined /> {formatDate(doc.updated_at)}
                              </div>
                              {doc.url ? (
                                <Button type="link" size="small" icon={<LinkOutlined />} onClick={() => setViewDocumentUrl(doc.url)}>
                                  View
                                </Button>
                              ) : null}
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mb-6">
                      <div className="flex justify-between items-center mb-3">
                        {!hideRemarks && !isCustomStage && (
                          <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={() => handleOpenRemarksModal(stage)}>
                            Add Remark
                          </Button>
                        )}
                      </div>
                      {hasProg && stage.progress.map((p) => (
                        <Card key={p.id} size="small" className="mb-3 border-l-4 border-l-green-600">
                          <div className="flex justify-between items-start">
                            <div>
                              <Text>{p.remarks}</Text>
                              <Text type="secondary" className="block text-xs mt-1">
                                {p.updated_by || 'Unknown'} • {formatDate(p.updated_at)}
                              </Text>
                            </div>
                            <div>
                              <Space>
                                <Button size="small" icon={<EditOutlined />} onClick={() => handleEditRemark(stage, p)}>Edit</Button>
                                <Popconfirm title="Delete remark?" onConfirm={() => handleDeleteRemark(p.id)}>
                                  <Button danger size="small" icon={<DeleteOutlined />}>Delete</Button>
                                </Popconfirm>
                              </Space>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-3">
                        {!hidePayment && !isCustomStage && (
                          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => handleOpenPaymentModal(stage)}>
                            Add Payment
                          </Button>
                        )}
                      </div>
                      {hasPay && (
                        <Table
                          dataSource={stage.payments}
                          columns={getPaymentColumns(stage)}
                          pagination={false}
                          size="small"
                          scroll={{ x: 1400 }}
                          rowKey="id"
                        />
                      )}
                    </div>
                  </div>
                )
              })}
          </div>
        )}

        <Modal
          title={<>{editingPayment ? 'Edit' : 'Add'} Payment - {selectedStageForPayment?.stage_name}</>}
          open={paymentModalVisible}
          onCancel={() => {
            setPaymentModalVisible(false)
            setEditingPayment(null)
            paymentForm.resetFields()
          }}
          footer={null}
          width={1000}
        >
          <Form form={paymentForm} layout="vertical" onFinish={handleSubmitPayment}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Form.Item label="Invoice No" name="invoice_no" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item label="Invoice Date" name="invoice_date">
                <DatePicker format="DD/M/YY" className="w-full" />
              </Form.Item>
              <Form.Item label="Gross Amount" name="gross_amount">
                <Input />
              </Form.Item>
              <Form.Item label="Get Amount" name="get_amount">
                <Input />
              </Form.Item>
              <Form.Item label="Amount Claimed" name="amount_claimed">
                <Input />
              </Form.Item>
              <Form.Item label="Amount Received" name="amount_recieved">
                <Input />
              </Form.Item>
              <Form.Item label="Received Date" name="recieved_date">
                <DatePicker format="DD/M/YY" className="w-full" />
              </Form.Item>
              <Form.Item label="TDS" name="tds">
                <Input />
              </Form.Item>
              <Form.Item label="Get TDS" name="get_tds">
                <Input />
              </Form.Item>
              <Form.Item label="LD" name="ld">
                <Input />
              </Form.Item>
              <Form.Item label="Balance" name="bal">
                <Input />
              </Form.Item>
              <Form.Item label="Follow-up Status" name="follow_up_status">
                <Input />
              </Form.Item>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button onClick={() => {
                setPaymentModalVisible(false)
                setEditingPayment(null)
                paymentForm.resetFields()
              }}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submittingPayment}>
                {editingPayment ? 'Update' : 'Add'} Payment
              </Button>
            </div>
          </Form>
        </Modal>

        <Modal
          title={`Upload Document - ${selectedStageForUpload?.stage_name}`}
          open={uploadModalVisible}
          onCancel={handleCloseUploadModal}
          footer={[
            <Button key="cancel" onClick={handleCloseUploadModal}>Cancel</Button>,
            <Button key="upload" type="primary" loading={uploading} onClick={handleUpload}>Upload</Button>
          ]}
          width={600}
        >
          <Space direction="vertical" size="large" className="w-full">
            <Dragger {...uploadProps}>
              <p className="ant-upload-drag-icon"><InboxOutlined /></p>
              <p className="ant-upload-text">Click or drag file to this area</p>
            </Dragger>
            <Input placeholder="Document Name *" value={documentName} disabled />
            <TextArea placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            <Input placeholder="Your Name *" value={uploadedBy} disabled />
          </Space>
        </Modal>

        <Modal
          title={`${editingRemark ? 'Edit' : 'Add'} Remark - ${selectedStageForRemarks?.stage_name}`}
          open={remarksModalVisible}
          onCancel={() => {
            setRemarksModalVisible(false)
            setEditingRemark(null)
            setRemarksText('')
            setRemarksBy('')
          }}
          footer={[
            <Button key="cancel" onClick={() => {
              setRemarksModalVisible(false)
              setEditingRemark(null)
              setRemarksText('')
              setRemarksBy('')
            }}>Cancel</Button>,
            <Button key="submit" type="primary" loading={submittingRemarks} onClick={handleSubmitRemarks}>
              {editingRemark ? 'Update' : 'Submit'}
            </Button>
          ]}
          width={600}
        >
          <Space direction="vertical" size="large" className="w-full">
            <TextArea placeholder="Enter your remarks *" value={remarksText} onChange={(e) => setRemarksText(e.target.value)} rows={4} />
            <Input placeholder="Your Name *" value={remarksBy} onChange={(e) => setRemarksBy(e.target.value)} />
          </Space>
        </Modal>

        <Modal
          title="Document Viewer"
          open={!!viewDocumentUrl}
          onCancel={() => setViewDocumentUrl(null)}
          footer={null}
          width={1100}
        >
          <iframe src={viewDocumentUrl} className="w-full h-[80vh]" title="Document" />
        </Modal>
      </div>
    )
  }


  // Projects list view
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <Title level={3}>Projects</Title>

      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <Input.Search
          placeholder="Search by project number, activity or coordinator..."
          allowClear
          enterButton
          size="large"
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          onSearch={value => setSearchText(value)}
          style={{ width: 420, maxWidth: '100%' }}
        />

        <Select
          placeholder="Filter by center"
          allowClear
          size="large"
          style={{ width: 240 }}
          options={centerOptions}
          value={selectedCenter}
          onChange={setSelectedCenter}
        />

        {(searchText || selectedCenter) && (
          <Button type="default" size="large" onClick={handleClearFilters}>
            Clear Filters
          </Button>
        )}
      </div>

      {/* Show count of filtered projects */}
      <Text type="secondary" className="block mb-4">
        {filteredCards.length} {filteredCards.length === 1 ? 'project' : 'projects'} found
      </Text>

      {filteredCards.length === 0 ? (
        <Empty description="No projects match the current filters" />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredCards.map((project) => (
            (() => {
              const theme = getProjectTheme(project.project_number)
              return (
                <Card
                  key={safeId(project)}
                  hoverable
                  className={`shadow-sm border ${theme.cardClass}`}
                >
                  <Space direction="vertical" size="middle" className="w-full">
                    <div className="flex items-center justify-between">
                      <div>
                        <Text type="secondary">Project No.</Text>
                        <Text strong className="block text-lg">{formatValue(project.project_number)}</Text>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${theme.pillClass}`}>
                        {theme.pillLabel}
                      </span>
                    </div>
                    <div><Text type="secondary">Activity:</Text> <Text>{formatValue(project.activity)}</Text></div>
                    <div><Text type="secondary">Coordinator:</Text> <Text>{formatValue(project.project_co_ordinator)}</Text></div>
                    {project.center && (
                      <div><Text type="secondary">Center:</Text> <Text>{formatValue(project.center)}</Text></div>
                    )}
                    <Button type="primary" icon={<EyeOutlined />} onClick={() => handleViewProject(project)}>
                      View Details
                    </Button>
                  </Space>
                </Card>
              )
            })()
          ))}
        </div>
      )}
    </div>
  )
}

export default Projects