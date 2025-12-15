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
  const [allotmentModalVisible, setAllotmentModalVisible] = useState(false)
  const [selectedStageForAllotment, setSelectedStageForAllotment] = useState(null)
  const [allotmentData, setAllotmentData] = useState(null)
  const [loadingAllotment, setLoadingAllotment] = useState(false)

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

  const getStageAccessList = (stage) => {
    if (!stage) return []
    let config = null
    if (Array.isArray(stageConfig)) {
      config = stageConfig.find((s) => s.id === stage.stage_id)
      if (!config) {
        const name = (stage.stage_name || '').trim().toLowerCase()
        if (name) {
          config = stageConfig.find(
            (s) => (s.name || '').trim().toLowerCase() === name
          )
        }
      }
    }

    const raw = config?.access
    if (!raw || typeof raw !== 'string') return []
    return raw
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
  }

  const fetchStageData = async (projectId) => {
    setLoadingStages(true)
    try {
      const config = await fetchStageConfig()

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

  const handleOpenAllotmentModal = (stage) => {
    const projectId = Number(safeId(selectedProject))
    if (!projectId) {
      message.error('Project ID not found')
      return
    }

    setSelectedStageForAllotment(stage)
    setAllotmentModalVisible(true)
    setLoadingAllotment(true)
    setAllotmentData(null)

    fetch(`${apiBase}/proposals/payments/${projectId}`, {
      headers: { accept: 'application/json' },
    })
      .then(async (res) => {
        if (!res.ok) {
          const errText = await res.text().catch(() => 'Failed to load allotment sheet')
          throw new Error(errText || 'Failed to load allotment sheet')
        }
        return res.json()
      })
      .then((data) => {
        setAllotmentData(data)
      })
      .catch((err) => {
        console.error('Allotment sheet fetch error:', err)
        message.error(err.message || 'Failed to load allotment sheet')
      })
      .finally(() => {
        setLoadingAllotment(false)
      })
  }

  const handleCloseAllotmentModal = () => {
    setAllotmentModalVisible(false)
    setSelectedStageForAllotment(null)
    setAllotmentData(null)
    setLoadingAllotment(false)
  }

  const handleDownloadAllotment = async (format) => {
    const projectId = Number(safeId(selectedProject))
    if (!projectId) {
      message.error('Project ID not found')
      return
    }

    const normalizedFormat = (format || '').toLowerCase() === 'pdf' ? 'pdf' : 'word'

    try {
      const res = await fetch(`${apiBase}/proposals/payments/${projectId}`, {
        headers: { accept: 'application/json' },
      })
      if (!res.ok) {
        throw new Error('Failed to fetch allotment data')
      }
      const data = await res.json()

      const paymentsRows = Array.isArray(data?.payments) ? data.payments : []

      const html = `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <title>Allotment Sheet</title>
      <style>
        body { font-family: Arial, sans-serif; color: #000; padding: 32px; }
        h2 { text-align: center; margin-bottom: 32px; }
        .label { font-weight: 600; margin-right: 8px; }
        .block { margin-bottom: 6px; }

        table { border-collapse: collapse; width: 100%; margin-top: 16px; }
        th, td { border: 1px solid #000; padding: 4px; font-size: 12px; }
        .copy-to { margin-top: 32px; font-size: 12px; }
        .header-table { width: 100%; border: none; margin-bottom: 8px; }
        .header-table td { border: none; padding: 0; }
        .header-left { text-align: left; }
        .header-right { text-align: right; }
        .copy-to-table { width: 100%; border: none; margin-top: 8px; text-align: center; }
        .copy-to-table td { border: none; padding-top: 4px; }
      </style>
    </head>
    <body>
      <div>
        <h2>PP &amp; BD DEPT</h2>

        <table class="header-table">
          <tr>
            <td class="header-left">
              <span class="label">Released to C -</span>
              <span class="label">${data?.center || ''}</span>
            </td>
            <td class="header-right">
              <span class="label">Date:</span>
              <span class="label">${data?.order_date || ''}</span>
            </td>
          </tr>
        </table>

        <div class="block">
          <span class="label">${data?.activity || 'Project Name'}</span>
        </div>

        <div class="block">
          <span class="label">Customer:</span>
          <span>${(data?.party_name || '') + (data?.address ? ', ' + data.address : '')}</span>
        </div>

        <div class="block">
          <span class="label">Contact Person:</span>
          <span>${data?.email || ''}</span>
        </div>

        <div class="block">
          <span class="label">Project Co-ordinator:</span>
          <span>${data?.project_co_ordinator || ''}</span>
        </div>

        <div class="block">
          <span class="label">Email &amp; Contact details:</span>
          <span></span>
        </div>

        <div class="block">
          <span class="label">Project Number:</span>
          <span class="label">${data?.project_number || ''}</span>
        </div>

        <div class="block">
          <span class="label">Project Name:</span>
          <span class="label">${data?.activity || ''}</span>
        </div>

        <div class="block">
          <span class="label">Order Value:</span>
          <span>${data?.order_value || ''}</span>
        </div>

        <div class="block">
          <span class="label">Purchase order No:</span>
          <span>${data?.order_number || ''}</span>
        </div>

        <div class="block">
          <span class="label">Delivery date:</span>
          <span>${data?.delivery_date || ''}</span>
        </div>

        <table>
          <thead>
            <tr>
              <th>Full / Stage Payment</th>
              <th>Invoice No and Amount</th>
              <th>Invoice Date</th>
              <th>Payment Received</th>
              <th>Payment Received Date</th>
              <th>Balance amount and remarks</th>
            </tr>
          </thead>
          <tbody>
            ${paymentsRows.length > 0
              ? paymentsRows.map((row) => `
                <tr>
                  <td></td>
                  <td>${row.invoice_no || ''}</td>
                  <td>${row.invoice_date || ''}</td>
                  <td>${row.amount_recieved || ''}</td>
                  <td>${row.recieved_date || ''}</td>
                  <td>${row.bal || ''}</td>
                </tr>`).join('')
              : `
                <tr>
                  <td colspan="6" style="text-align:center;color:#666;">No payment records available</td>
                </tr>
              `}
          </tbody>
        </table>

        <div class="copy-to">
          <div class="block">Copy to:</div>
          <table class="copy-to-table">
            <tr>
              <td>GH (P&S)</td>
              <td>Sr. CAO</td>
              <td>GH (C-${data?.center || ''})</td>
              <td>CH (C-${data?.center || ''})</td>
            </tr>
          </table>
        </div>

        <div style="margin-top: 16px; text-align: right; font-weight: 600;">CH (PP&amp;BD)</div>
        <div style="margin-top: 16px; font-weight: 600; font-size: 12px;">Director: For kind information</div>
      </div>
    </body>
  </html>`
      if (normalizedFormat === 'word') {
        const blob = new Blob([html], { type: 'application/msword' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `allotment-${projectId}.doc`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } else {
        const win = window.open('', '_blank')
        if (!win) {
          message.error('Popup blocked. Please allow popups to download the PDF.')
          return
        }
        win.document.open()
        win.document.write(html + '<script>window.print();</script>')
        win.document.close()
      }
    } catch (err) {
      console.error('Allotment download error:', err)
      message.error(err.message || 'Failed to download allotment sheet')
    }
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
  const [projectNumberFilter, setProjectNumberFilter] = useState(undefined)

  // Extract unique centers-centers for the dropdown (you can adjust the field name if it’s different)
  const centerOptions = useMemo(() => {
    const centers = [...new Set(projectRows
      .map(p => p.center?.trim())
      .filter(Boolean))]

    return centers.sort().map(c => ({ label: c, value: c }))
  }, [projectRows])

  // Filtered list (search + center + project number prefix)
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

        // Project number prefix filter (GSP, ISP, GAP, ILP, DPP, LSP, CLP, SO)
        if (projectNumberFilter) {
          const prefix = projectNumberFilter.toUpperCase()
          const pn = (p.project_number || '').toString().trim().toUpperCase()
          if (!pn || !pn.startsWith(prefix)) return false
        }

        // Center filter
        if (selectedCenter && p.center?.trim() !== selectedCenter) return false

        return true
      })
  }, [projectRows, searchText, selectedCenter, projectNumberFilter])

  // Clear all filters
  const handleClearFilters = () => {
    setSearchText('')
    setSelectedCenter(undefined)
    setProjectNumberFilter(undefined)
  }

  // ...

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

        <Select
          placeholder="Filter by Project Number"
          allowClear
          size="large"
          style={{ width: 240 }}
          value={projectNumberFilter}
          onChange={setProjectNumberFilter}
        >
          {['GSP', 'ISP', 'GAP', 'ILP', 'DPP', 'LSP', 'CLP', 'SO'].map(code => (
            <Select.Option key={code} value={code}>
              {code}
            </Select.Option>
          ))}
        </Select>

        {(searchText || selectedCenter || projectNumberFilter) && (
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