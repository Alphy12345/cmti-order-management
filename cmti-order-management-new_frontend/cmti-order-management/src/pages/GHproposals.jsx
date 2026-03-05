import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  PlusOutlined,
  SearchOutlined,
  DownloadOutlined,
  FilterOutlined,
  EditOutlined,
} from '@ant-design/icons'
import {
  Button,
  Form,
  Input,
  Modal,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
  DatePicker,
  Select,
  Card,
  Row,
  Col,
  Statistic,
} from 'antd'
import * as XLSX from 'xlsx'
import dayjs from 'dayjs'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import '../App.css'
import { API_BASE_URL } from '../config/api.js'
import { DISPLAY_DATE_FORMAT, formatDate, formatIndianNumber } from '../config/date.js'

dayjs.extend(isSameOrAfter)
dayjs.extend(isSameOrBefore)

const { Title } = Typography
const { TextArea } = Input
const { RangePicker } = DatePicker

const CUSTOMER_TYPE_OPTIONS = [
  'Govt',
  'Private',
  'MHI',
  'MSME',
  'Research Institute',
  'Educational institute',
]

const REQUEST_TYPE_OPTIONS = [
  'Call for Proposal',
  'Mail',
  'Discussion',
  'Initiative',
  'Tender',
  'Direct Enquiry',
  'Budgetry offer',
  'EOI',
]

const PROPOSAL_FIELDS = [
  { name: 'id', label: 'SL NO', width: 120, fixed: 'left', inForm: false, render: (text, record, index) => index + 1 },
  { name: 'enquiry_date', label: 'Enquiry Date', width: 150 },
  { name: 'customer_type', label: 'Customer Type', width: 170 },
  { name: 'customer_name', label: 'Customer Name', width: 170 },
  { name: 'address', label: 'Address', width: 240 },
  { name: 'email', label: 'Email', width: 200 },
  { name: 'phone_no', label: 'Phone No.', width: 150 },
  { name: 'alternate_contact_details', label: 'Alternate Contact', width: 220 },
  {
    name: 'request_type',
    label: 'Request Type',
    width: 160,
    render: (value) => (value ? <Tag color="blue">{value}</Tag> : null),
  },
  { name: 'email_reference', label: 'Email Reference', width: 200 },
  { name: 'quote_reference', label: 'Quote Reference', width: 190 },
  { name: 'quote_description', label: 'Quote Description', width: 240, input: 'textarea' },
  { name: 'quote_date', label: 'Quote Date', width: 140 },
  { name: 'quote_amount', label: 'Quote Amount', width: 160 },
  { name: 'revised_negotiated', label: 'Revised / Negotiated', width: 190, apiName: 'revised/negotiated' },
  { name: 'revised_negotiated_quote_date', label: 'Revised Quote Date', width: 190, apiName: 'revised/negotiated_quote_date' },
  { name: 'revised_negotiated_quote_amount', label: 'Revised Quote Amount', width: 210, apiName: 'revised/negotiated_quote_amount' },
  { name: 'quotation_given_by_department', label: 'Department', width: 180 },
  { name: 'quotation_given_by_name', label: 'Quotation Given By', width: 200 },
  { name: 'project_number', label: 'Project Number', width: 140 },
  { name: 'party_name', label: 'Party Name', width: 200 },
  { name: 'activity', label: 'Activity', width: 160 },
  { name: 'key_deliverables', label: 'Key Deliverables', width: 240, input: 'textarea' },
  { name: 'order_number', label: 'Order Number', width: 150 },
  { name: 'order_date', label: 'Order Date', width: 150 },
  { name: 'delivery_date', label: 'Delivery Date', width: 160 },
  { name: 'extended_delivery_date', label: 'Extended Delivery', width: 190 },
  { name: 'date_of_actual_commencement', label: 'Actual Commencement', width: 210 },
  { name: 'order_value', label: 'Order Value', width: 170 },
  { name: 'details_of_external_internal_review_meeting', label: 'Review Meeting Details', width: 260, input: 'textarea' },
  { name: 'project_co_ordinator', label: 'Project Co-ordinator', width: 200 },
  { name: 'center', label: 'Center', width: 150 },
  { name: 'co_ordinator_remarks', label: 'Co-ordinator Remarks', width: 220, input: 'textarea' },
  { name: 'closer_report', label: 'Closer Report', width: 200, input: 'textarea' },
  { name: 'technical_completed_year', label: 'Technical Completion Year', width: 220 },
  { name: 'financial_completed_year', label: 'Financial Completion Year', width: 220 },
  { name: 'dispatch_date', label: 'Dispatch Date', width: 160 },
  { name: 'ppm_remarks', label: 'PPM Remarks', width: 200, input: 'textarea' },
  { name: 'created_at', label: 'Created At', width: 190, inForm: false },
  { name: 'updated_at', label: 'Updated At', width: 190, inForm: false },
  { name: 'updated_by', label: 'Updated By', width: 150, required: true },
  { name: 'group', label: 'Group', width: 150 },
]

// Fields required for the coordinator add endpoint
const COORDINATOR_ADD_FIELDS = [
  'enquiry_date',
  'customer_type',
  'customer_name',
  'address',
  'email',
  'phone_no',
  'alternate_contact_details',
  'request_type',
  'email_reference',
  'quote_reference',
  'quote_description',
  'quote_date',
  'quote_amount',
  'revised_negotiated',
  'revised_negotiated_quote_date',
  'revised_negotiated_quote_amount',
  'quotation_given_by_name',
  'quotation_given_by_department',
]

const FORM_FIELDS = PROPOSAL_FIELDS.filter((field) => field.inForm !== false)
const TABLE_FIELDS = PROPOSAL_FIELDS

const getApiName = (name) => {
  const field = PROPOSAL_FIELDS.find((item) => item.name === name)
  return field?.apiName ?? name
}

const uniqueKey = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)

const mapApiToUi = (record) => {
  const mapped = {}
  TABLE_FIELDS.forEach((field) => {
    const apiName = getApiName(field.name)
    mapped[field.name] = record?.[apiName] ?? ''
  })
  mapped.key = record?.id ?? uniqueKey()
  return mapped
}

function Proposals() {
  const [form] = Form.useForm() // For existing edit modal (if any)
  const [coordinatorForm] = Form.useForm() // For new Add Proposal modal

  const [tableData, setTableData] = useState([])
  const [filteredData, setFilteredData] = useState([])
  const [tableLoading, setTableLoading] = useState(false)
  const [coordinatorSubmitLoading, setCoordinatorSubmitLoading] = useState(false)

  const [coordinatorModalOpen, setCoordinatorModalOpen] = useState(false)

  const [searchText, setSearchText] = useState('')
  const [centerFilter, setCenterFilter] = useState(null)
  const [orderDateRange, setOrderDateRange] = useState(null)
  const [enquiryDateRange, setEnquiryDateRange] = useState(null)
  const [statusFilter, setStatusFilter] = useState(null)
  const [projectCodePrefix, setProjectCodePrefix] = useState('')
  const [currentUserName, setCurrentUserName] = useState('')
  const [currentUserCenter, setCurrentUserCenter] = useState('')
  const [proposalCount, setProposalCount] = useState(0)

  const fetchProposals = useCallback(async () => {
    setTableLoading(true)
    try {
      let url = `${API_BASE_URL}/proposals/`
      let coordinatorName = ''

      try {
        const rawUser = window.localStorage.getItem('ppm_user')
        if (rawUser) {
          const parsedUser = JSON.parse(rawUser)
          if (parsedUser && parsedUser.name) {
            coordinatorName = parsedUser.name
            setCurrentUserName(parsedUser.name)
            setCurrentUserCenter(parsedUser.center || '')
            const encodedName = encodeURIComponent(parsedUser.name)
            url = `${API_BASE_URL}/proposals/by-name/${encodedName}`
          }
        }
      } catch (storageError) {
        console.error('Failed to read user from localStorage', storageError)
      }

      const response = await fetch(url, {
        headers: { accept: 'application/json' },
      })
      if (!response.ok) throw new Error('Unable to fetch proposals')
      const payload = await response.json()
      const normalized = Array.isArray(payload) ? payload.map(mapApiToUi) : []

      setTableData(normalized)
      setFilteredData(normalized)
    } catch (error) {
      console.error(error)
      message.error(error.message || 'Unable to fetch proposals')
    } finally {
      setTableLoading(false)
    }
  }, [])

  const fetchProposalsCount = async () => {
    try {
      let count = 0
      const rawUser = window.localStorage.getItem('ppm_user')
      if (rawUser) {
        const parsedUser = JSON.parse(rawUser)
        if (parsedUser?.name) {
          const encodedName = encodeURIComponent(parsedUser.name)
          const url = `${API_BASE_URL}/master_proposals/by-indentor/${encodedName}/count`
          const response = await fetch(url, { headers: { accept: 'application/json' } })
          if (response.ok) {
            const payload = await response.json()
            count = payload?.count ?? 0
          }
        }
      }
      setProposalCount(count)
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    fetchProposals()
    fetchProposalsCount()
  }, [fetchProposals])

  // Open/Close Coordinator Add Modal
  const openCoordinatorAddModal = () => {
    coordinatorForm.resetFields()

    // Auto-fill read-only fields
    if (currentUserName) {
      coordinatorForm.setFieldsValue({
        quotation_given_by_name: currentUserName,
        quotation_given_by_department: currentUserCenter ? currentUserCenter.toUpperCase() : '',
      })
    }

    setCoordinatorModalOpen(true)
  }

  const closeCoordinatorModal = () => {
    setCoordinatorModalOpen(false)
    coordinatorForm.resetFields()
  }

  // Submit new proposal via coordinator endpoint
  const handleCoordinatorSubmit = async (values) => {
    setCoordinatorSubmitLoading(true)
    try {
      const payload = {}
      COORDINATOR_ADD_FIELDS.forEach((fieldName) => {
        const apiName = getApiName(fieldName)
        payload[apiName] = values[fieldName] ?? ''
      })

      const response = await fetch(`${API_BASE_URL}/proposals/add-proposal-coordinator`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw new Error(errorBody.detail || 'Failed to create proposal')
      }

      message.success('Proposal created successfully by coordinator')
      closeCoordinatorModal()
      await fetchProposals() // Refresh table
    } catch (error) {
      console.error(error)
      message.error(error.message || 'Unable to create proposal')
    } finally {
      setCoordinatorSubmitLoading(false)
    }
  }

  // Statistics
  const statistics = useMemo(() => {
    const totalProposals = tableData.length
    const totalProjects = tableData.filter((item) => item.project_number?.trim()).length
    const technicallyCompleted = tableData.filter(
      (item) => item.technical_completed_year?.trim() && !item.financial_completed_year?.trim()
    ).length
    const financiallyCompleted = tableData.filter(
      (item) => item.technical_completed_year?.trim() && item.financial_completed_year?.trim()
    ).length
    const pendingProjects = tableData.filter(
      (item) =>
        item.project_number?.trim() &&
        (!item.technical_completed_year?.trim() || !item.financial_completed_year?.trim())
    ).length

    return { totalProposals, totalProjects, technicallyCompleted, financiallyCompleted, pendingProjects }
  }, [tableData])

  // Filtering logic
  useEffect(() => {
    let filtered = [...tableData]

    if (searchText) {
      const s = searchText.trim()
      if (/^\d+$/.test(s)) {
        filtered = filtered.filter((item) => String(item.id) === s)
      } else {
        const lower = s.toLowerCase()
        filtered = filtered.filter((item) =>
          Object.values(item).some((val) => String(val).toLowerCase().includes(lower))
        )
      }
    }

    if (centerFilter) filtered = filtered.filter((item) => item.center === centerFilter)
    if (projectCodePrefix) {
      const prefix = projectCodePrefix.trim().slice(0, 3).toLowerCase()
      filtered = filtered.filter(
        (item) => item.project_number && String(item.project_number).slice(0, 3).toLowerCase() === prefix
      )
    }

    if (orderDateRange?.length === 2) {
      filtered = filtered.filter((item) => {
        if (!item.order_date) return false
        const date = dayjs(item.order_date)
        return date.isSameOrAfter(orderDateRange[0].startOf('day')) && date.isSameOrBefore(orderDateRange[1].endOf('day'))
      })
    }

    if (enquiryDateRange?.length === 2) {
      filtered = filtered.filter((item) => {
        if (!item.enquiry_date) return false
        const date = dayjs(item.enquiry_date)
        return date.isSameOrAfter(enquiryDateRange[0].startOf('day')) && date.isSameOrBefore(enquiryDateRange[1].endOf('day'))
      })
    }

    if (statusFilter) {
      if (statusFilter === 'totalProjects')
        filtered = filtered.filter((item) => item.project_number?.trim())
      if (statusFilter === 'technicallyCompleted')
        filtered = filtered.filter((item) => item.technical_completed_year?.trim())
      if (statusFilter === 'financiallyCompleted')
        filtered = filtered.filter(
          (item) => item.technical_completed_year?.trim() && item.financial_completed_year?.trim()
        )
      if (statusFilter === 'pendingProjects')
        filtered = filtered.filter(
          (item) =>
            item.project_number?.trim() &&
            (!item.technical_completed_year?.trim() || !item.financial_completed_year?.trim())
        )
      if (statusFilter === 'proposals')
        filtered = filtered.filter((item) => !item.project_number?.trim())
    }

    setFilteredData(filtered)
  }, [searchText, centerFilter, orderDateRange, enquiryDateRange, statusFilter, projectCodePrefix, tableData])

  const uniqueCenters = useMemo(() => [...new Set(tableData.map((i) => i.center).filter(Boolean))].sort(), [tableData])
  const uniqueProjectPrefixes = useMemo(() => {
    const prefixes = tableData
      .map((i) => i.project_number)
      .filter(Boolean)
      .map((code) => String(code).slice(0, 3).toUpperCase())
    return [...new Set(prefixes)].sort()
  }, [tableData])

  const handleExportExcel = () => {
    if (!filteredData.length) return message.warning('No data to export')
    const worksheet = XLSX.utils.json_to_sheet(
      filteredData.map((item) => {
        const row = {}
        TABLE_FIELDS.forEach((f) => (row[f.label] = item[f.name] || ''))
        return row
      })
    )
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Proposals')
    XLSX.writeFile(workbook, `proposals_export_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`)
    message.success('Excel downloaded')
  }

  // Helper function to calculate overdue days
  const calculateOverdueDays = (deliveryDate, extendedDelivery) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Use extended delivery date if present, otherwise use delivery date
    const referenceDate = extendedDelivery
      ? new Date(extendedDelivery)
      : deliveryDate
        ? new Date(deliveryDate)
        : null

    if (!referenceDate || isNaN(referenceDate.getTime())) return null

    const diffMs = today - referenceDate
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    return diffDays // positive = overdue, negative = still within deadline
  }

  const columns = useMemo(() => {
    const dateFields = new Set([
      'enquiry_date',
      'quote_date',
      'revised_negotiated_quote_date',
      'order_date',
      'delivery_date',
      'extended_delivery_date',
      'date_of_actual_commencement',
      'dispatch_date',
      'created_at',
      'updated_at',
    ])

    const amountFields = new Set([
      'quote_amount',
      'revised_negotiated_quote_amount',
      'order_value',
    ])

    const base = TABLE_FIELDS.map((f) => ({
      key: f.name,
      dataIndex: f.name,
      title: f.label,
      width: f.width,
      fixed: f.fixed,
      render: f.render ?? (dateFields.has(f.name) ? (value) => formatDate(value) : amountFields.has(f.name) ? (value) => formatIndianNumber(value) : undefined),
    }))

    // Find index of extended_delivery_date and insert overdue_days after it
    const extendedDeliveryIndex = base.findIndex(
      (col) => col.key === 'extended_delivery_date',
    )

    const overdueDaysColumn = {
      key: 'overdue_days',
      dataIndex: 'overdue_days',
      title: 'Overdue Days',
      width: 150,
      render: (_, record) => {
        const overdueDays = calculateOverdueDays(
          record.delivery_date,
          record.extended_delivery_date,
        )

        if (overdueDays === null) return '-'

        if (overdueDays > 0) {
          return (
            <span style={{ color: '#cf1322', fontWeight: 500 }}>
               {overdueDays} days
            </span>
          )
        } else if (overdueDays < 0) {
          return (
            <span style={{ color: '#389e0d', fontWeight: 500 }}>
               {Math.abs(overdueDays)} days remaining
            </span>
          )
        } else {
          return (
            <span style={{ color: '#fa8c16', fontWeight: 500 }}>
               Due Today
            </span>
          )
        }
      },
    }

    // Insert overdue_days column after extended_delivery_date
    if (extendedDeliveryIndex !== -1) {
      base.splice(extendedDeliveryIndex + 1, 0, overdueDaysColumn)
    }

    return [
      ...base,
      {
        key: 'actions',
        title: 'Actions',
        fixed: 'right',
        width: 100,
        render: (_, record) => (
          <Space size="small">
            <Button size="small" type="link" icon={<EditOutlined />} onClick={() => message.info('Edit functionality preserved')}>
              Edit
            </Button>
          </Space>
        ),
      },
    ]
  }, [])

  return (
    <>
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <Tabs defaultActiveKey="proposals">
          <Tabs.TabPane tab="Proposals" key="proposals">
            <div className="space-y-6">
              {/* Header: Stats + Add Button */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 flex-1">
                  <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white cursor-pointer" onClick={() => setStatusFilter('proposals')}>
                    <Statistic title={<span className="text-white/90">Total Proposals</span>} value={proposalCount} valueStyle={{ color: '#fff', fontSize: '28px', fontWeight: 'bold' }} />
                  </Card>
                  <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white cursor-pointer" onClick={() => setStatusFilter('totalProjects')}>
                    <Statistic title={<span className="text-white/90">Total Projects</span>} value={statistics.totalProjects} valueStyle={{ color: '#fff', fontSize: '28px', fontWeight: 'bold' }} />
                  </Card>
                  <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white cursor-pointer" onClick={() => setStatusFilter('technicallyCompleted')}>
                    <Statistic title={<span className="text-white/90">Technically Completed</span>} value={statistics.technicallyCompleted} valueStyle={{ color: '#fff', fontSize: '28px', fontWeight: 'bold' }} />
                  </Card>
                  <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white cursor-pointer" onClick={() => setStatusFilter('financiallyCompleted')}>
                    <Statistic title={<span className="text-white/90">Financially Completed</span>} value={statistics.financiallyCompleted} valueStyle={{ color: '#fff', fontSize: '28px', fontWeight: 'bold' }} />
                  </Card>
                  <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white cursor-pointer" onClick={() => setStatusFilter('pendingProjects')}>
                    <Statistic title={<span className="text-white/90">Pending Projects</span>} value={statistics.pendingProjects} valueStyle={{ color: '#fff', fontSize: '28px', fontWeight: 'bold' }} />
                  </Card>
                </div>

                
              </div>

              {/* Search & Filters */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <Title level={4} className="!mb-4">Search & Filters</Title>
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={6}>
                    <Input placeholder="Search proposals..." prefix={<SearchOutlined />} value={searchText} onChange={(e) => setSearchText(e.target.value)} allowClear size="large" />
                  </Col>
                  <Col xs={24} md={4}>
                    <Select placeholder="Project Code Prefix" value={projectCodePrefix || undefined} onChange={setProjectCodePrefix} allowClear size="large" style={{ width: '100%' }}>
                      {uniqueProjectPrefixes.map((p) => (<Select.Option key={p} value={p}>{p}</Select.Option>))}
                    </Select>
                  </Col>
                  <Col xs={24} md={4}>
                    <Select placeholder="Center" value={centerFilter} onChange={setCenterFilter} allowClear size="large" style={{ width: '100%' }}>
                      {uniqueCenters.map((c) => (<Select.Option key={c} value={c}>{c}</Select.Option>))}
                    </Select>
                  </Col>
                  <Col xs={24} md={5}>
                    <RangePicker placeholder={['Order Date Start', 'End']} value={orderDateRange} onChange={setOrderDateRange} size="large" style={{ width: '100%' }} format={DISPLAY_DATE_FORMAT} />
                  </Col>
                  <Col xs={24} md={5}>
                    <RangePicker placeholder={['Enquiry Start', 'End']} value={enquiryDateRange} onChange={setEnquiryDateRange} size="large" style={{ width: '100%' }} format={DISPLAY_DATE_FORMAT} />
                  </Col>
                </Row>
                <div className="mt-4 flex justify-between">
                  <Button onClick={() => {
                    setSearchText('')
                    setCenterFilter(null)
                    setOrderDateRange(null)
                    setEnquiryDateRange(null)
                    setStatusFilter(null)
                    setProjectCodePrefix('')
                  }}>
                    Clear Filters
                  </Button>
                  <Button type="primary" icon={<DownloadOutlined />} onClick={handleExportExcel}>
                    Export to Excel
                  </Button>
                </div>
              </div>

              {/* Table */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <Title level={4} className="!mb-1">Proposal / Projects</Title>
                    <p className="text-slate-500 text-sm">Showing {filteredData.length} records</p>
                  </div>
                  <Button
                  type="primary"
                  size="large"
                  icon={<PlusOutlined />}
                  onClick={openCoordinatorAddModal}
                  className="bg-gradient-to-r from-green-500 to-green-600 border-none shadow-md hover:shadow-lg"
                >
                  Add Proposal
                </Button>
                </div>
                <Table
                  rowKey="key"
                  columns={columns}
                  dataSource={filteredData}
                  loading={tableLoading}
                  pagination={{ pageSize: 10 }}
                  scroll={{ x: 4200, y: 600 }}
                  bordered
                />
              </div>
            </div>
          </Tabs.TabPane>
        </Tabs>
      </div>

      {/* Add Proposal Modal (Coordinator) */}
      <Modal
        title="Add Proposal (Coordinator)"
        open={coordinatorModalOpen}
        onCancel={closeCoordinatorModal}
        width={1100}
        okText="Submit"
        confirmLoading={coordinatorSubmitLoading}
        onOk={() => coordinatorForm.submit()}
        maskClosable={false}
      >
        <Form form={coordinatorForm} layout="vertical" onFinish={handleCoordinatorSubmit}>
          <Row gutter={[16, 16]}>
            {COORDINATOR_ADD_FIELDS.map((fieldName) => {
              const field = PROPOSAL_FIELDS.find((f) => f.name === fieldName)
              if (!field) return null

              const isDate = ['enquiry_date', 'quote_date', 'revised_negotiated_quote_date'].includes(fieldName)
              const isTextArea = field.input === 'textarea'
              const isCustomerType = fieldName === 'customer_type'
              const isRequestType = fieldName === 'request_type'
              const isReadOnlyName = fieldName === 'quotation_given_by_name'
              const isReadOnlyDept = fieldName === 'quotation_given_by_department'

              return (
                <Col span={12} key={fieldName}>
                  <Form.Item
                    name={fieldName}
                    label={field.label}
                  >
                    {isDate ? (
                      <DatePicker style={{ width: '100%' }} format={DISPLAY_DATE_FORMAT} placeholder={`Select ${field.label}`} />
                    ) : isTextArea ? (
                      <TextArea rows={3} placeholder={`Enter ${field.label}`} />
                    ) : isCustomerType ? (
                      <Select placeholder="Select Customer Type" allowClear>
                        {CUSTOMER_TYPE_OPTIONS.map((opt) => (
                          <Select.Option key={opt} value={opt}>{opt}</Select.Option>
                        ))}
                      </Select>
                    ) : isRequestType ? (
                      <Select placeholder="Select Request Type" allowClear>
                        {REQUEST_TYPE_OPTIONS.map((opt) => (
                          <Select.Option key={opt} value={opt}>{opt}</Select.Option>
                        ))}
                      </Select>
                    ) : isReadOnlyName || isReadOnlyDept ? (
                      <Input disabled style={{ background: '#f5f5f5', color: '#000' }} />
                    ) : (
                      <Input placeholder={`Enter ${field.label}`} />
                    )}
                  </Form.Item>
                </Col>
              )
            })}
          </Row>
        </Form>
      </Modal>
    </>
  )
}

export default Proposals