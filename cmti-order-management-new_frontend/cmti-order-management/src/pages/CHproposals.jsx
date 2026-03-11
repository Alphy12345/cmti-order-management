import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
  DownloadOutlined,
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
  AutoComplete,
} from 'antd'
import * as XLSX from 'xlsx'
import dayjs from 'dayjs'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import '../App.css'
import { API_BASE_URL } from '../config/api.js'
import { DISPLAY_DATE_FORMAT, formatDate } from '../config/date.js'

dayjs.extend(isSameOrAfter)
dayjs.extend(isSameOrBefore)

const { Title } = Typography
const { TextArea } = Input
const { RangePicker } = DatePicker

// Restricted columns for CH (operational view - no quotation, no payment, no metadata)
const TABLE_FIELDS = [
  { name: 'id', label: 'SL NO', width: 80, fixed: 'left' },
  { name: 'project_number', label: 'Project Number', width: 140 },
  { name: 'customer_name', label: 'Customer Name', width: 180 },
  { name: 'order_date', label: 'Order Date', width: 130 },
  { name: 'delivery_date', label: 'Delivery Date', width: 140 },
  { name: 'extended_delivery_date', label: 'Extended Delivery', width: 150 },
  { name: 'date_of_actual_commencement', label: 'Actual Commencement', width: 170 },
  { name: 'dispatch_date', label: 'Dispatch Date', width: 130 },
  { name: 'key_deliverables', label: 'Key Deliverables', width: 220 },
  { name: 'project_co_ordinator', label: 'Project Co-ordinator', width: 180 },
  { name: 'center', label: 'Center', width: 120 },
  { name: 'group', label: 'Group', width: 120 },
  { name: 'status', label: 'Status', width: 130 },
  { name: 'technical_completed_year', label: 'Technical Completion', width: 160 },
  { name: 'financial_completed_year', label: 'Financial Completion', width: 160 },
  { name: 'co_ordinator_remarks', label: 'Co-ordinator Remarks', width: 220 },
  { name: 'closer_report', label: 'Closer Report', width: 180 },
]

// All fields for data mapping (internal use)
const ALL_FIELDS = [
  { name: 'id', label: 'ID (PK)', width: 120, fixed: 'left' },
  { name: 'enquiry_date', label: 'Enquiry Date', width: 150 },
  { name: 'customer_type', label: 'Customer Type', width: 170 },
  { name: 'customer_name', label: 'Customer Name', width: 170 },
  { name: 'address', label: 'Address', width: 240 },
  { name: 'email', label: 'Email', width: 200 },
  { name: 'phone_no', label: 'Phone No.', width: 150 },
  { name: 'alternate_contact_details', label: 'Alternate Contact', width: 220 },
  { name: 'request_type', label: 'Request Type', width: 160 },
  { name: 'email_reference', label: 'Email Reference', width: 200 },
  { name: 'quote_reference', label: 'Quote Reference', width: 190 },
  { name: 'quote_description', label: 'Quote Description', width: 240 },
  { name: 'quote_date', label: 'Quote Date', width: 140 },
  { name: 'quote_amount', label: 'Quote Amount', width: 160 },
  { name: 'revised_negotiated', label: 'Revised / Negotiated', width: 190, apiName: 'revised/negotiated' },
  { name: 'revised_negotiated_quote_date', label: 'Revised Quote Date', width: 190, apiName: 'revised/negotiated_quote_date' },
  { name: 'revised_negotiated_quote_amount', label: 'Revised Quote Amount', width: 210, apiName: 'revised/negotiated_quote_amount' },
  { name: 'quotation_given_by_name', label: 'Quotation Given By', width: 200 },
  { name: 'quotation_given_by_department', label: 'Department', width: 180 },
  { name: 'project_number', label: 'Project Number', width: 140 },
  { name: 'party_name', label: 'Party Name', width: 200 },
  { name: 'activity', label: 'Activity', width: 160 },
  { name: 'key_deliverables', label: 'Key Deliverables', width: 240 },
  { name: 'order_number', label: 'Order Number', width: 150 },
  { name: 'order_date', label: 'Order Date', width: 150 },
  { name: 'delivery_date', label: 'Delivery Date', width: 160 },
  { name: 'extended_delivery_date', label: 'Extended Delivery', width: 190 },
  { name: 'date_of_actual_commencement', label: 'Actual Commencement', width: 210 },
  { name: 'order_value', label: 'Order Value', width: 170 },
  { name: 'details_of_external_internal_review_meeting', label: 'Review Meeting Details', width: 260 },
  { name: 'project_co_ordinator', label: 'Project Co-ordinator', width: 200 },
  { name: 'center', label: 'Center', width: 150 },
  { name: 'co_ordinator_remarks', label: 'Co-ordinator Remarks', width: 220 },
  { name: 'closer_report', label: 'Closer Report', width: 200 },
  { name: 'technical_completed_year', label: 'Technical Completion Year', width: 220 },
  { name: 'financial_completed_year', label: 'Financial Completion Year', width: 220 },
  { name: 'status', label: 'Status', width: 150 },
  { name: 'dispatch_date', label: 'Dispatch Date', width: 160 },
  { name: 'ppm_remarks', label: 'PPM Remarks', width: 200 },
  { name: 'created_at', label: 'Created At', width: 190 },
  { name: 'updated_at', label: 'Updated At', width: 190 },
  { name: 'updated_by', label: 'Updated By', width: 150 },
  { name: 'group', label: 'Group', width: 150 },
]

const getApiName = (name) => {
  const field = ALL_FIELDS.find((item) => item.name === name)
  return field?.apiName ?? name
}

const uniqueKey = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)

const mapApiToUi = (record) => {
  const mapped = {}
  ALL_FIELDS.forEach((field) => {
    const apiName = getApiName(field.name)
    mapped[field.name] = record?.[apiName] ?? ''
  })
  mapped.key = record?.id ?? uniqueKey()
  return mapped
}

const ActionButtons = ({ label, onAdd }) => (
  <Space wrap>
    <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>
      Add {label}
    </Button>
  </Space>
)

const calculateOverdueDays = (deliveryDate, extendedDelivery) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const referenceDate = extendedDelivery
    ? new Date(extendedDelivery)
    : deliveryDate
      ? new Date(deliveryDate)
      : null

  if (!referenceDate || isNaN(referenceDate.getTime())) return null

  const diffMs = today - referenceDate
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  return diffDays
}

function Proposals() {
  const [form] = Form.useForm()
  const [tableData, setTableData] = useState([])
  const [filteredData, setFilteredData] = useState([])
  const [tableLoading, setTableLoading] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [editingRecord, setEditingRecord] = useState(null)
  const [searchText, setSearchText] = useState('')
  const [centerFilter, setCenterFilter] = useState(null)
  const [orderDateRange, setOrderDateRange] = useState(null)
  const [enquiryDateRange, setEnquiryDateRange] = useState(null)
  const [statusFilter, setStatusFilter] = useState(null)
  const [projectNumberFilter, setProjectNumberFilter] = useState(null)
  const [currentUserName, setCurrentUserName] = useState('')
  const [currentUserCenter, setCurrentUserCenter] = useState('')
  const [currentUserGroup, setCurrentUserGroup] = useState('')
  const [customerOptions, setCustomerOptions] = useState([])

  const fetchProposals = useCallback(async () => {
    setTableLoading(true)

    let center = null
    try {
      const rawUser = window.localStorage.getItem('ppm_user')
      if (rawUser) {
        const parsedUser = JSON.parse(rawUser)
        center = parsedUser?.center?.trim().toLowerCase() || null
      }
    } catch (err) {
      console.error('Failed to parse ppm_user from localStorage', err)
    }

    if (!center) {
      message.error('User center not found. Please log in again.')
      setTableLoading(false)
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/proposals/by-centre/${center}`, {
        headers: { accept: 'application/json' },
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to fetch proposals for center "${center}": ${response.status} ${errorText}`)
      }

      const payload = await response.json()
      const normalized = Array.isArray(payload) ? payload.map(mapApiToUi) : []
      setTableData(normalized)
      setFilteredData(normalized)
    } catch (error) {
      console.error('Fetch proposals error:', error)
      message.error(error.message || 'Unable to fetch proposals for your center')
      setTableData([])
      setFilteredData([])
    } finally {
      setTableLoading(false)
    }
  }, [])

  useEffect(() => {
    try {
      const rawUser = window.localStorage.getItem('ppm_user')
      if (rawUser) {
        const parsedUser = JSON.parse(rawUser)
        if (parsedUser && parsedUser.name) {
          setCurrentUserName(parsedUser.name)
          setCurrentUserCenter(parsedUser.center || '')
          setCurrentUserGroup(parsedUser.group || '')
        }
      }
    } catch (error) {
      console.error('Failed to read user from localStorage', error)
    }

    fetchProposals()
  }, [fetchProposals])

  const openAddModal = useCallback(() => {
    setEditingRecord(null)
    form.resetFields()
    if (currentUserName) {
      form.setFieldsValue({
        updated_by: currentUserName,
        quotation_given_by_name: currentUserName,
        quotation_given_by_department: currentUserCenter ? currentUserCenter.toUpperCase() : '',
        center: currentUserCenter || '',
        group: currentUserGroup || '',
      })
    }
    setModalOpen(true)
  }, [form, currentUserName, currentUserCenter, currentUserGroup])

  const openDetailModal = useCallback((record) => {
    setSelectedRecord(record)
    setDetailModalOpen(true)
  }, [])

  const closeDetailModal = useCallback(() => {
    setDetailModalOpen(false)
    setSelectedRecord(null)
  }, [])

  const openEditModal = useCallback(
    (record) => {
      setEditingRecord(record)
      form.setFieldsValue({ ...record, updated_by: currentUserName || record.updated_by })
      setModalOpen(true)
    },
    [form, currentUserName],
  )

  const closeModal = useCallback(() => {
    setModalOpen(false)
    setEditingRecord(null)
    form.resetFields()
    setCustomerOptions([])
  }, [form])

  // Search customers by name
  const searchCustomers = useCallback(async (searchValue) => {
    if (!searchValue || searchValue.trim().length < 2) {
      setCustomerOptions([])
      return
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/customers/search?name=${encodeURIComponent(searchValue.trim())}`,
        { headers: { accept: 'application/json' } }
      )

      if (!response.ok) throw new Error('Failed to search customers')

      const customers = await response.json()
      const options = customers.map((customer) => ({
        value: customer.name,
        label: `${customer.name} ${customer.customer_type ? `(${customer.customer_type})` : ''}`,
        customer: customer,
      }))
      setCustomerOptions(options)
    } catch (error) {
      console.error('Customer search error:', error)
      setCustomerOptions([])
    }
  }, [])

  // Handle customer selection - auto-fill related fields
  const handleCustomerSelect = useCallback((value, option) => {
    const customer = option?.customer
    if (customer) {
      form.setFieldsValue({
        customer_name: customer.name,
        customer_type: customer.customer_type || '',
        address: customer.address || '',
        email: customer.email || '',
        phone_no: customer.phone_no || '',
        alternate_contact_details: customer.alternate_contact_details || '',
      })
    }
  }, [form])

  const handleSubmit = async (values) => {
    if (!editingRecord) {
      await handleCreate(values)
      return
    }

    if (!editingRecord?.id) {
      message.error('No record selected for editing')
      return
    }

    setSubmitLoading(true)

    const payload = {
      project_id: editingRecord.id,
      extended_delivery_date: values.extended_delivery_date || '',
      co_ordinator_remarks: values.co_ordinator_remarks || '',
      technical_completed_year: values.technical_completed_year || null,
      updated_by: values.updated_by || localStorage.getItem('loggedInUser') || '',
    }

    try {
      const response = await fetch(`${API_BASE_URL}/proposals/coordinator-update`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw new Error(errorBody.detail || 'Failed to update proposal')
      }

      message.success('Proposal updated successfully')
      closeModal()
      await fetchProposals()
    } catch (error) {
      console.error(error)
      message.error(error.message || 'Unable to update proposal')
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleCreate = async (values) => {
    setSubmitLoading(true)
    try {
      const createFields = [
        'enquiry_date', 'customer_type', 'customer_name', 'address', 'email', 'phone_no',
        'alternate_contact_details', 'request_type', 'email_reference', 'quote_reference',
        'quote_description', 'quote_date', 'quote_amount', 'revised_negotiated',
        'revised_negotiated_quote_date', 'revised_negotiated_quote_amount',
        'quotation_given_by_name', 'quotation_given_by_department', 'center', 'group',
      ]

      const payload = {}
      createFields.forEach((fieldName) => {
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

      message.success('Proposal created successfully')
      closeModal()
      await fetchProposals()
    } catch (error) {
      console.error(error)
      message.error(error.message || 'Unable to create proposal')
    } finally {
      setSubmitLoading(false)
    }
  }

  const statistics = useMemo(() => {
    const totalProposals = tableData.length
    const totalProjects = tableData.filter(
      (item) => item.project_number && item.project_number.trim() !== '',
    ).length
    const technicallyCompleted = tableData.filter(
      (item) =>
        item.technical_completed_year &&
        item.technical_completed_year.trim() !== '' &&
        (!item.financial_completed_year ||
          item.financial_completed_year.trim() === ''),
    ).length
    const financiallyCompleted = tableData.filter(
      (item) =>
        item.technical_completed_year &&
        item.technical_completed_year.trim() !== '' &&
        item.financial_completed_year &&
        item.financial_completed_year.trim() !== '',
    ).length
    const pendingProjects = tableData.filter(
      (item) => item.status === 'Ongoing',
    ).length
    return {
      totalProposals,
      totalProjects,
      technicallyCompleted,
      financiallyCompleted,
      pendingProjects,
    }
  }, [tableData])

  useEffect(() => {
    let filtered = [...tableData]

    if (searchText) {
      const s = searchText.trim()
      if (/^\d+$/.test(s)) {
        filtered = filtered.filter((item) => String(item.id) === s)
      } else {
        const searchLower = s.toLowerCase()
        filtered = filtered.filter((item) =>
          Object.values(item).some((val) =>
            String(val).toLowerCase().includes(searchLower),
          ),
        )
      }
    }

    if (centerFilter) {
      filtered = filtered.filter((item) => item.center === centerFilter)
    }

    if (projectNumberFilter) {
      const prefix = projectNumberFilter.toUpperCase()
      filtered = filtered.filter((item) => {
        const pn = (item.project_number || '').toString().trim().toUpperCase()
        if (!pn) return false
        return pn.startsWith(prefix)
      })
    }

    if (orderDateRange && orderDateRange.length === 2) {
      filtered = filtered.filter((item) => {
        if (!item.order_date) return false
        const orderDate = dayjs(item.order_date)
        if (!orderDate.isValid()) return false
        const start = orderDateRange[0].startOf('day')
        const end = orderDateRange[1].endOf('day')
        return (
          orderDate.isSameOrAfter(start) && orderDate.isSameOrBefore(end)
        )
      })
    }

    if (enquiryDateRange && enquiryDateRange.length === 2) {
      filtered = filtered.filter((item) => {
        if (!item.enquiry_date) return false
        const enquiryDate = dayjs(item.enquiry_date)
        if (!enquiryDate.isValid()) return false
        const start = enquiryDateRange[0].startOf('day')
        const end = enquiryDateRange[1].endOf('day')
        return (
          enquiryDate.isSameOrAfter(start) &&
          enquiryDate.isSameOrBefore(end)
        )
      })
    }

    if (statusFilter === 'totalProjects') {
      filtered = filtered.filter(
        (item) => item.project_number && item.project_number.trim() !== '',
      )
    } else if (statusFilter === 'technicallyCompleted') {
      filtered = filtered.filter(
        (item) =>
          item.technical_completed_year &&
          item.technical_completed_year.trim() !== '' &&
          (!item.financial_completed_year ||
            item.financial_completed_year.trim() === ''),
      )
    } else if (statusFilter === 'financiallyCompleted') {
      filtered = filtered.filter(
        (item) =>
          item.technical_completed_year &&
          item.technical_completed_year.trim() !== '' &&
          item.financial_completed_year &&
          item.financial_completed_year.trim() !== '',
      )
    } else if (statusFilter === 'pendingProjects') {
      filtered = filtered.filter(
        (item) => item.status === 'Ongoing',
      )
    }

    setFilteredData(filtered)
  }, [
    searchText,
    centerFilter,
    orderDateRange,
    enquiryDateRange,
    statusFilter,
    projectNumberFilter,
    tableData,
  ])

  const uniqueCenters = useMemo(() => {
    const centers = [
      ...new Set(tableData.map((item) => item.center).filter(Boolean)),
    ]
    return centers.sort()
  }, [tableData])

  const handleExportExcel = () => {
    if (filteredData.length === 0) {
      message.warning('No data to export')
      return
    }
    const worksheet = XLSX.utils.json_to_sheet(
      filteredData.map((item) => {
        const row = {}
        TABLE_FIELDS.forEach((field) => {
          row[field.label] = item[field.name] || ''
        })
        return row
      }),
    )
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Proposals')
    XLSX.writeFile(
      workbook,
      `proposals_export_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`,
    )
    message.success('Excel file downloaded successfully')
  }

  const columns = useMemo(() => {
    const dateFields = new Set([
      'order_date',
      'delivery_date',
      'extended_delivery_date',
      'date_of_actual_commencement',
      'dispatch_date',
      'technical_completed_year',
      'financial_completed_year',
    ])

    const baseColumns = TABLE_FIELDS.map((field) => {
      const baseColumn = {
        key: field.name,
        dataIndex: field.name,
        title: field.label,
        width: field.width,
        fixed: field.fixed,
      }

      if (field.name === 'status') {
        return {
          ...baseColumn,
          render: (value) => {
            if (!value) return '-'
            const statusColors = {
              'Ongoing': { bg: '#e3f2fd', color: '#1565c0' },
              'Completed': { bg: '#e8f5e9', color: '#2e7d32' },
              'Delayed': { bg: '#fff3e0', color: '#e65100' },
              'On Hold': { bg: '#f3e5f5', color: '#6a1b9a' },
              'Technically completed': { bg: '#e0f7fa', color: '#00695c' },
              'Short closed by cutomer': { bg: '#fce4ec', color: '#c62828' },
              'Short closed by CMTI': { bg: '#fce4ec', color: '#c62828' },
            }
            const colors = statusColors[value] || { bg: '#f5f5f5', color: '#616161' }
            return (
              <span style={{
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '12px',
                backgroundColor: colors.bg,
                color: colors.color,
                fontWeight: 500,
              }}>
                {value}
              </span>
            )
          }
        }
      }

      return {
        ...baseColumn,
        render: field.render ?? (dateFields.has(field.name) ? (value) => formatDate(value) : undefined),
      }
    })

    const extendedDeliveryIndex = baseColumns.findIndex(
      (col) => col.key === 'extended_delivery_date',
    )

    const overdueDaysColumn = {
      key: 'overdue_days',
      dataIndex: 'overdue_days',
      title: 'Overdue Days',
      width: 140,
      render: (_, record) => {
        const overdueDays = calculateOverdueDays(
          record.delivery_date,
          record.extended_delivery_date,
        )

        if (overdueDays === null) return '-'

        if (overdueDays > 0) {
          return (
            <span style={{ color: '#cf1322', fontWeight: 500 }}>
               {overdueDays} days overdue
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

    if (extendedDeliveryIndex !== -1) {
      baseColumns.splice(extendedDeliveryIndex + 1, 0, overdueDaysColumn)
    }

    return [
      ...baseColumns,
      {
        key: 'actions',
        title: 'Actions',
        fixed: 'right',
        width: 80,
        render: (_, record) => (
          <Space size="small">
            <Button
              size="small"
              type="link"
              icon={<EditOutlined />}
              onClick={() => openEditModal(record)}
            >
              Edit
            </Button>
          </Space>
        ),
      },
    ]
  }, [openEditModal])

  return (
    <>
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <Tabs
          defaultActiveKey="proposals"
          items={[
            {
              key: 'proposals',
              label: 'Proposals',
              children: (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                    <Card
                      className="bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                      onClick={() => setStatusFilter(null)}
                    >
                      <Statistic
                        title={<span className="text-white/90">Total Proposals</span>}
                        value={statistics.totalProposals}
                        valueStyle={{ color: '#fff', fontSize: '28px', fontWeight: 'bold' }}
                      />
                    </Card>
                    <Card
                      className="bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                      onClick={() => setStatusFilter('totalProjects')}
                    >
                      <Statistic
                        title={<span className="text-white/90">Total Projects</span>}
                        value={statistics.totalProjects}
                        valueStyle={{ color: '#fff', fontSize: '28px', fontWeight: 'bold' }}
                      />
                    </Card>
                    <Card
                      className="bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                      onClick={() => setStatusFilter('technicallyCompleted')}
                    >
                      <Statistic
                        title={<span className="text-white/90">Technically Completed</span>}
                        value={statistics.technicallyCompleted}
                        valueStyle={{ color: '#fff', fontSize: '28px', fontWeight: 'bold' }}
                      />
                    </Card>
                    <Card
                      className="bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                      onClick={() => setStatusFilter('financiallyCompleted')}
                    >
                      <Statistic
                        title={<span className="text-white/90">Financially Completed</span>}
                        value={statistics.financiallyCompleted}
                        valueStyle={{ color: '#fff', fontSize: '28px', fontWeight: 'bold' }}
                      />
                    </Card>
                    <Card
                      className="bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                      onClick={() => setStatusFilter('pendingProjects')}
                    >
                      <Statistic
                        title={<span className="text-white/90">Ongoing Projects</span>}
                        value={statistics.pendingProjects}
                        valueStyle={{ color: '#fff', fontSize: '28px', fontWeight: 'bold' }}
                      />
                    </Card>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-4">
                      <Title level={4} className="!mb-0">Search & Filters</Title>
                    </div>
                    <Row gutter={[16, 16]}>
                      <Col xs={24} sm={12} md={6}>
                        <Input
                          placeholder="Search proposals... (type ID to search by PK)"
                          prefix={<SearchOutlined />}
                          value={searchText}
                          onChange={(e) => setSearchText(e.target.value)}
                          size="large"
                          allowClear
                        />
                      </Col>
                      <Col xs={24} sm={12} md={4} className="flex items-center">
                        <Button
                          onClick={() => {
                            setSearchText('')
                            setCenterFilter(null)
                            setOrderDateRange(null)
                            setEnquiryDateRange(null)
                            setStatusFilter(null)
                            setProjectNumberFilter(null)
                          }}
                          size="large"
                          style={{ width: '100%' }}
                        >
                          Clear Filters
                        </Button>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Select
                          placeholder="Filter by Project Number"
                          value={projectNumberFilter}
                          onChange={setProjectNumberFilter}
                          size="large"
                          allowClear
                          style={{ width: '100%' }}
                        >
                          {['GSP', 'ISP', 'GAP', 'ILP', 'DPP', 'LSP', 'CLP', 'SO'].map((code) => (
                            <Select.Option key={code} value={code}>{code}</Select.Option>
                          ))}
                        </Select>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Select
                          placeholder="Filter by Center"
                          value={centerFilter}
                          onChange={setCenterFilter}
                          size="large"
                          allowClear
                          style={{ width: '100%' }}
                        >
                          {uniqueCenters.map((center) => (
                            <Select.Option key={center} value={center}>{center}</Select.Option>
                          ))}
                        </Select>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <RangePicker
                          placeholder={['Start Order Date', 'End Order Date']}
                          value={orderDateRange}
                          onChange={setOrderDateRange}
                          size="large"
                          style={{ width: '100%' }}
                          format={DISPLAY_DATE_FORMAT}
                        />
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <RangePicker
                          placeholder={['Start Enquiry Date', 'End Enquiry Date']}
                          value={enquiryDateRange}
                          onChange={setEnquiryDateRange}
                          size="large"
                          style={{ width: '100%' }}
                          format={DISPLAY_DATE_FORMAT}
                        />
                      </Col>
                      <Col xs={24} sm={12} md={4} className="flex items-center justify-end">
                        <Button
                          type="primary"
                          icon={<DownloadOutlined />}
                          size="large"
                          onClick={handleExportExcel}
                          className="bg-gradient-to-r from-blue-500 to-blue-600 border-none shadow-md hover:shadow-lg w-full md:w-auto"
                        >
                          Export to Excel
                        </Button>
                      </Col>
                    </Row>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 pb-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <Title level={4} className="!mb-1">Proposal</Title>
                        <p className="text-slate-500 text-sm">
                          Showing {filteredData.length} of {tableData.length} proposals
                        </p>
                      </div>
                      <ActionButtons label="Proposal" onAdd={openAddModal} />
                    </div>
                    <Table
                      rowKey="key"
                      columns={columns}
                      dataSource={filteredData}
                      loading={tableLoading}
                      pagination={{ pageSize: 10 }}
                      scroll={{ x: 1800, y: 600 }}
                      sticky
                      bordered
                      onRow={(record) => ({
                        onClick: () => openDetailModal(record),
                        style: { cursor: 'pointer' },
                      })}
                    />
                  </div>
                </div>
              ),
            },
          ]}
        />
      </div>

      {/* Detail View Modal */}
      <Modal
        title="Proposal Details"
        open={detailModalOpen}
        onCancel={closeDetailModal}
        width={900}
        footer={[
          <Button key="close" onClick={closeDetailModal}>Close</Button>,
          <Button key="edit" type="primary" onClick={() => {
            closeDetailModal()
            openEditModal(selectedRecord)
          }}>Edit</Button>,
        ]}
        maskClosable={false}
      >
        {selectedRecord && (
          <div className="grid gap-4 md:grid-cols-2">
            {ALL_FIELDS.filter(f => {
              // Exclude quotation details, payment details, metadata for CH
              const excludedFields = [
                'quote_reference', 'quote_description', 'quote_date', 'quote_amount',
                'revised_negotiated', 'revised_negotiated_quote_date', 'revised_negotiated_quote_amount',
                'quotation_given_by_name', 'quotation_given_by_department',
                'party_name', 'activity', 'order_value', 'ppm_remarks',
                'created_at', 'updated_at', 'id'
              ]
              return !excludedFields.includes(f.name)
            }).map((field) => {
              const value = selectedRecord[field.name]
              const isDate = ['enquiry_date', 'quote_date', 'revised_negotiated_quote_date', 'order_date', 'delivery_date', 'extended_delivery_date', 'date_of_actual_commencement', 'dispatch_date'].includes(field.name)
              const displayValue = isDate ? formatDate(value) : (value || '-')

              return (
                <div key={field.name} className="border-b pb-2">
                  <div className="text-sm text-gray-500">{field.label}</div>
                  <div className="font-medium">{displayValue}</div>
                </div>
              )
            })}
          </div>
        )}
      </Modal>

      <Modal
        title={editingRecord ? 'Edit Proposal' : 'Add Proposal'}
        open={modalOpen}
        onCancel={closeModal}
        width={1000}
        okText={editingRecord ? 'Update' : 'Create'}
        confirmLoading={submitLoading}
        onOk={() => form.submit()}
        maskClosable={false}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ updated_by: localStorage.getItem('loggedInUser') }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            {ALL_FIELDS.filter(f => !['id', 'created_at', 'updated_at'].includes(f.name)).map((field) => {
              const allowedEditFields = [
                'extended_delivery_date',
                'co_ordinator_remarks',
                'technical_completed_year',
                'updated_by',
              ]

              if (editingRecord && !allowedEditFields.includes(field.name)) {
                return null
              }

              const dateFields = [
                'enquiry_date', 'quote_date', 'revised_negotiated_quote_date',
                'order_date', 'delivery_date', 'extended_delivery_date',
                'date_of_actual_commencement', 'dispatch_date',
              ]
              const isDateField = dateFields.includes(field.name)

              if (isDateField) {
                return (
                  <Form.Item
                    key={field.name}
                    name={field.name}
                    label={field.label}
                    rules={field.required ? [{ required: true, message: `Please enter ${field.label}` }] : []}
                    getValueProps={(value) => ({ value: value ? dayjs(value).isValid() ? dayjs(value) : null : null })}
                    normalize={(value) => {
                      if (!value) return ''
                      if (dayjs.isDayjs(value)) return value.format('YYYY-MM-DD')
                      return value
                    }}
                  >
                    <DatePicker style={{ width: '100%' }} format={DISPLAY_DATE_FORMAT} placeholder={`Select ${field.label}`} />
                  </Form.Item>
                )
              }

              const InputComponent = ['Description', 'Deliverables', 'Remarks', 'Report', 'Details'].some(t => field.label?.includes(t)) ? TextArea : Input
              const isUpdatedByField = field.name === 'updated_by'
              const isReadOnlyField = ['quotation_given_by_name', 'quotation_given_by_department', 'center', 'group'].includes(field.name)
              const isCustomerName = field.name === 'customer_name'
              const shouldDisable = isUpdatedByField || (isReadOnlyField && editingRecord)

              if (isCustomerName && !editingRecord) {
                return (
                  <Form.Item
                    key={field.name}
                    name={field.name}
                    label={field.label}
                    rules={field.required ? [{ required: true, message: `Please enter ${field.label}` }] : []}
                  >
                    <AutoComplete
                      options={customerOptions}
                      onSearch={searchCustomers}
                      onSelect={handleCustomerSelect}
                      placeholder="Search existing customers..."
                      style={{ width: '100%' }}
                      allowClear
                    >
                      <Input />
                    </AutoComplete>
                  </Form.Item>
                )
              }

              return (
                <Form.Item
                  key={field.name}
                  name={field.name}
                  label={field.label}
                  rules={field.required ? [{ required: true, message: `Please enter ${field.label}` }] : []}
                >
                  <InputComponent rows={2} disabled={shouldDisable} />
                </Form.Item>
              )
            })}
          </div>
        </Form>
      </Modal>
    </>
  )
}

export default Proposals
