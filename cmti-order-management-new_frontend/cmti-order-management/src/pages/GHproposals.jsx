import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  PlusOutlined,
  SearchOutlined,
  DownloadOutlined,
  FilterOutlined,
  EditOutlined,
  EyeOutlined,
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
  { name: 'center', label: 'Centre', width: 150 },
  { name: 'co_ordinator_remarks', label: 'Co-ordinator Remarks', width: 220, input: 'textarea' },
  { name: 'closer_report', label: 'Closure Report', width: 200, input: 'textarea' },
  { name: 'technical_completed_year', label: 'Technical Completion Year', width: 220 },
  { name: 'financial_completed_year', label: 'Financial Completion Year', width: 220 },
  { name: 'status', label: 'Status', width: 150, input: 'select' },
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
  'center',
  'group',
]

// Restricted columns for GH/CH (operational view - no quotation, no payment, no metadata)
const TABLE_FIELDS = [
  { name: 'id', label: 'SL NO', width: 80, fixed: 'left', render: (text, record, index) => index + 1 },
  { name: 'project_number', label: 'Project Number', width: 140 },
  { name: 'customer_name', label: 'Customer Name', width: 180 },
  { name: 'order_date', label: 'Order Date', width: 130 },
  { name: 'delivery_date', label: 'Delivery Date', width: 140 },
  { name: 'extended_delivery_date', label: 'Extended Delivery', width: 150 },
  { name: 'date_of_actual_commencement', label: 'Actual Commencement', width: 170 },
  { name: 'dispatch_date', label: 'Dispatch Date', width: 130 },
  { name: 'key_deliverables', label: 'Key Deliverables', width: 220, input: 'textarea' },
  { name: 'project_co_ordinator', label: 'Project Co-ordinator', width: 180 },
  { name: 'center', label: 'Centre', width: 120 },
  { name: 'group', label: 'Group', width: 120 },
  { name: 'status', label: 'Status', width: 130, input: 'select' },
  { name: 'technical_completed_year', label: 'Technical Completion', width: 160 },
  { name: 'financial_completed_year', label: 'Financial Completion', width: 160 },
  { name: 'co_ordinator_remarks', label: 'Co-ordinator Remarks', width: 220, input: 'textarea' },
  { name: 'closer_report', label: 'Closure Report', width: 180, input: 'textarea' },
  { name: 'updated_by', label: 'Updated By', width: 150 },
]

// All fields for data mapping (internal use)
const ALL_FIELDS = [
  { name: 'id', label: 'SL NO', width: 120, fixed: 'left', inForm: false },
  { name: 'enquiry_date', label: 'Enquiry Date', width: 150 },
  { name: 'customer_type', label: 'Customer Type', width: 170 },
  { name: 'customer_name', label: 'Customer Name', width: 170 },
  { name: 'address', label: 'Address', width: 240 },
  { name: 'email', label: 'Email', width: 200 },
  { name: 'phone_no', label: 'Phone No.', width: 150 },
  { name: 'alternate_contact_details', label: 'Alternate Contact', width: 220 },
  { name: 'request_type', label: 'Request Type', width: 160, render: (value) => (value ? <Tag color="blue">{value}</Tag> : null) },
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
  { name: 'center', label: 'Centre', width: 150 },
  { name: 'co_ordinator_remarks', label: 'Co-ordinator Remarks', width: 220, input: 'textarea' },
  { name: 'closer_report', label: 'Closure Report', width: 200, input: 'textarea' },
  { name: 'technical_completed_year', label: 'Technical Completion Year', width: 220 },
  { name: 'financial_completed_year', label: 'Financial Completion Year', width: 220 },
  { name: 'status', label: 'Status', width: 150, input: 'select' },
  { name: 'dispatch_date', label: 'Dispatch Date', width: 160 },
  { name: 'ppm_remarks', label: 'PPM Remarks', width: 200, input: 'textarea' },
  { name: 'created_at', label: 'Created At', width: 190, inForm: false },
  { name: 'updated_at', label: 'Updated At', width: 190, inForm: false },
  { name: 'updated_by', label: 'Updated By', width: 150, required: true },
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

const mapUiToApi = (values) => {
  const payload = {}
  COORDINATOR_ADD_FIELDS.forEach((fieldName) => {
    const apiName = getApiName(fieldName)
    payload[apiName] = values[fieldName] ?? ''
  })
  return payload
}

function Proposals() {
  const [form] = Form.useForm() // For existing edit modal (if any)
  const [coordinatorForm] = Form.useForm() // For new Add Proposal modal

  const [tableData, setTableData] = useState([])
  const [filteredData, setFilteredData] = useState([])
  const [tableLoading, setTableLoading] = useState(false)
  const [coordinatorSubmitLoading, setCoordinatorSubmitLoading] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)

  const [coordinatorModalOpen, setCoordinatorModalOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [editingRecord, setEditingRecord] = useState(null)

  const [searchText, setSearchText] = useState('')
  const [centerFilter, setCenterFilter] = useState(null)
  const [orderDateRange, setOrderDateRange] = useState(null)
  const [enquiryDateRange, setEnquiryDateRange] = useState(null)
  const [statusFilter, setStatusFilter] = useState(null)
  const [projectCodePrefix, setProjectCodePrefix] = useState('')
  const [currentUserName, setCurrentUserName] = useState('')
  const [currentUserCenter, setCurrentUserCenter] = useState('')
  const [currentUserGroup, setCurrentUserGroup] = useState('')
  const [proposalCount, setProposalCount] = useState(0)
  const [stats, setStats] = useState({
    totalProposals: 0,
    totalProjects: 0,
    technicallyCompleted: 0,
    financiallyCompleted: 0,
    ongoingProjects: 0
  })
  const [customerOptions, setCustomerOptions] = useState([])
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false)
  const [userRole, setUserRole] = useState('')

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
      if (!record) return
      setEditingRecord(record)
      form.resetFields()
      form.setFieldsValue({
        ...record,
        updated_by: currentUserName || record.updated_by,
      })
      setModalOpen(true)
    },
    [form, currentUserName],
  )

  const closeModal = useCallback(() => {
    setModalOpen(false)
    setEditingRecord(null)
    form.resetFields()
  }, [form])

  const handleSubmit = async (values) => {
    if (!editingRecord?.id) {
      message.error('No record selected for editing')
      return
    }

    setSubmitLoading(true)

    // Build payload for coordinator-update endpoint (only allowed fields)
    const payload = {
      project_id: editingRecord.id,
      extended_delivery_date: values.extended_delivery_date || '',
      co_ordinator_remarks: values.co_ordinator_remarks || '',
      technical_completed_year: values.technical_completed_year || null,
      updated_by: values.updated_by || currentUserName || '',
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
            setCurrentUserGroup(parsedUser.group || '')
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

  const fetchStats = useCallback(async () => {
    let group = ''
    try {
      const rawUser = window.localStorage.getItem('ppm_user')
      if (rawUser) {
        const parsedUser = JSON.parse(rawUser)
        group = parsedUser?.group || ''
      }
    } catch (err) {
      console.error('Failed to parse ppm_user from localStorage', err)
    }

    if (!group) {
      return
    }

    try {
      const encodedGroup = encodeURIComponent(group)
      const response = await fetch(`${API_BASE_URL}/proposals/stats/by-group/${encodedGroup}`, {
        headers: { accept: 'application/json' },
      })

      if (!response.ok) {
        throw new Error('Unable to fetch proposal stats')
      }

      const payload = await response.json()
      setStats(payload)
      setProposalCount(payload.totalProposals)
    } catch (error) {
      console.error(error)
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
          setUserRole(parsedUser.role?.toLowerCase() || '')
        }
      }
    } catch (error) {
      console.error('Failed to read user from localStorage', error)
    }

    // Trigger delivery notification check on every page load
    fetch(`${API_BASE_URL}/proposals/check-delivery-notifications`, {
      method: 'POST',
      headers: { accept: 'application/json' },
    }).catch(err => console.log('Notification check error:', err))

    fetchProposals()
    fetchStats()
  }, [fetchProposals])

  // Open/Close Coordinator Add Modal
  const openCoordinatorAddModal = () => {
    coordinatorForm.resetFields()

    // Auto-fill read-only fields including group and center
    if (currentUserName) {
      coordinatorForm.setFieldsValue({
        quotation_given_by_name: currentUserName,
        quotation_given_by_department: currentUserCenter ? currentUserCenter.toUpperCase() : '',
        center: currentUserCenter || '',
        group: currentUserGroup || '',
      })
    }

    setCoordinatorModalOpen(true)
  }

  const closeCoordinatorModal = () => {
    setCoordinatorModalOpen(false)
    coordinatorForm.resetFields()
    setCustomerOptions([])
  }

  // Search customers by name
  const searchCustomers = useCallback(async (searchValue) => {
    if (!searchValue || searchValue.trim().length < 2) {
      setCustomerOptions([])
      return
    }

    setCustomerSearchLoading(true)
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
    } finally {
      setCustomerSearchLoading(false)
    }
  }, [])

  // Handle customer selection - auto-fill related fields
  const handleCustomerSelect = useCallback((value, option) => {
    const customer = option?.customer
    if (customer) {
      coordinatorForm.setFieldsValue({
        customer_name: customer.name,
        customer_type: customer.customer_type || '',
        address: customer.address || '',
        email: customer.email || '',
        phone_no: customer.phone_no || '',
        alternate_contact_details: customer.alternate_contact_details || '',
      })
    }
  }, [coordinatorForm])

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
    const totalProjects = tableData.length
    const technicallyCompleted = tableData.filter(
      (item) =>
        item.technical_completed_year &&
        item.technical_completed_year.trim() !== '',
    ).length
    const financiallyCompleted = tableData.filter(
      (item) => item.technical_completed_year?.trim() && item.financial_completed_year?.trim()
    ).length
    const pendingProjects = tableData.filter(
      (item) =>
        item.status === 'Ongoing',
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
      if (statusFilter === 'totalProjects') {
        // Shown everything in the table for Scientists/GH, as they treat everything assigned as a "Project"
        filtered = tableData
      } else if (statusFilter === 'technicallyCompleted') {
        filtered = filtered.filter(
          (item) =>
            item.technical_completed_year &&
            item.technical_completed_year.trim() !== '',
        )
      } else if (statusFilter === 'financiallyCompleted') {
        filtered = filtered.filter(
          (item) => item.technical_completed_year?.trim() && item.financial_completed_year?.trim()
        )
      } else if (statusFilter === 'pendingProjects') {
        filtered = filtered.filter(
          (item) =>
            item.status === 'Ongoing',
        )
      } else if (statusFilter === 'proposals') {
        filtered = filtered.filter((item) => !item.project_number?.trim())
      }
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
      'order_date',
      'delivery_date',
      'extended_delivery_date',
      'date_of_actual_commencement',
      'dispatch_date',
      'technical_completed_year',
      'financial_completed_year',
    ])

    const base = TABLE_FIELDS.map((f) => {
      const baseColumn = {
        key: f.name,
        dataIndex: f.name,
        title: f.label,
        width: f.width,
        fixed: f.fixed,
      }

      // Custom render for Status field with styled badges
      if (f.name === 'status') {
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
        render: f.render ?? (dateFields.has(f.name) ? (value) => formatDate(value) : undefined),
      }
    })

    // Find index of extended_delivery_date and insert overdue_days after it
    const extendedDeliveryIndex = base.findIndex(
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
            <Button
              size="small"
              type="link"
              icon={<EyeOutlined />}
              title="View"
              onClick={(e) => {
                e.stopPropagation()
                openDetailModal(record)
              }}
            />
            <Button
              size="small"
              type="link"
              icon={<EditOutlined />}
              title="Edit"
              onClick={() => openEditModal(record)}
            />
          </Space>
        ),
      },
    ]
  }, [openEditModal, openDetailModal])

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
                    <Statistic title={<span className="text-white/90">Total Projects</span>} value={stats.totalProjects} valueStyle={{ color: '#fff', fontSize: '28px', fontWeight: 'bold' }} />
                  </Card>
                  <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white cursor-pointer" onClick={() => setStatusFilter('technicallyCompleted')}>
                    <Statistic title={<span className="text-white/90">Technically Completed</span>} value={stats.technicallyCompleted} valueStyle={{ color: '#fff', fontSize: '28px', fontWeight: 'bold' }} />
                  </Card>
                  <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white cursor-pointer" onClick={() => setStatusFilter('financiallyCompleted')}>
                    <Statistic title={<span className="text-white/90">Financially Completed</span>} value={stats.financiallyCompleted} valueStyle={{ color: '#fff', fontSize: '28px', fontWeight: 'bold' }} />
                  </Card>
                  <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white cursor-pointer" onClick={() => setStatusFilter('pendingProjects')}>
                    <Statistic title={<span className="text-white/90">Ongoing Projects</span>} value={stats.ongoingProjects} valueStyle={{ color: '#fff', fontSize: '28px', fontWeight: 'bold' }} />
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
                  scroll={{ x: 1800, y: 600 }}
                  sticky
                  bordered
                />
              </div>
            </div>
          </Tabs.TabPane>
        </Tabs>
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
              // Exclude quotation details, payment details, metadata for GH/CH
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
            {COORDINATOR_ADD_FIELDS.filter((fieldName) => {
              if (userRole === 'scientist') {
                return !['quotation_given_by_department', 'center', 'group'].includes(fieldName)
              }
              return true
            }).map((fieldName) => {
              const field = PROPOSAL_FIELDS.find((f) => f.name === fieldName)
              if (!field) return null

              const isDate = ['enquiry_date', 'quote_date', 'revised_negotiated_quote_date'].includes(fieldName)
              const isTextArea = field.input === 'textarea'
              const isCustomerType = fieldName === 'customer_type'
              const isRequestType = fieldName === 'request_type'
              const isReadOnlyName = fieldName === 'quotation_given_by_name'
              const isReadOnlyDept = fieldName === 'quotation_given_by_department'
              const isReadOnlyCenter = fieldName === 'center'
              const isReadOnlyGroup = fieldName === 'group'
              const isCustomerName = fieldName === 'customer_name'

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
                    ) : isCustomerName ? (
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
                    ) : isReadOnlyName || isReadOnlyDept || isReadOnlyCenter || isReadOnlyGroup ? (
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

      {/* Edit Proposal Modal */}
      <Modal
        title={editingRecord ? `Edit Proposal / Project` : 'Edit Proposal / Project'}
        open={modalOpen}
        onCancel={closeModal}
        width={1100}
        okText="Update"
        confirmLoading={submitLoading}
        onOk={() => form.submit()}
        maskClosable={false}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={[16, 16]}>
            {TABLE_FIELDS.filter(field => {
              const allowedEditFields = [
                'extended_delivery_date',
                'co_ordinator_remarks',
                'technical_completed_year',
                'updated_by',
              ]
              return !editingRecord || allowedEditFields.includes(field.name)
            }).map((field) => {

              const isTextArea = field.input === 'textarea'
              const isUpdatedByField = field.name === 'updated_by'

              // Date fields that should use DatePicker
              const dateFields = [
                'enquiry_date',
                'quote_date',
                'revised_negotiated_quote_date',
                'order_date',
                'delivery_date',
                'extended_delivery_date',
                'date_of_actual_commencement',
                'dispatch_date',
              ]
              const isDateField = dateFields.includes(field.name)

              return (
                <Col span={12} key={field.name}>
                  <Form.Item
                    name={field.name}
                    label={field.label}
                    rules={field.required ? [{ required: true, message: `${field.label} is required` }] : []}
                    getValueProps={(value) => ({
                      value: value && isDateField
                        ? dayjs(value).isValid()
                          ? dayjs(value)
                          : null
                        : value,
                    })}
                    normalize={(value) => {
                      if (!value) return ''
                      if (isDateField && dayjs.isDayjs(value)) {
                        return value.format('YYYY-MM-DD')
                      }
                      return value
                    }}
                  >
                    {isTextArea ? (
                      <TextArea rows={3} placeholder={`Enter ${field.label}`} disabled={isUpdatedByField && editingRecord} />
                    ) : isDateField ? (
                      <DatePicker
                        style={{ width: '100%' }}
                        format="DD.MM.YYYY"
                        placeholder={`Select ${field.label}`}
                      />
                    ) : (
                      <Input placeholder={`Enter ${field.label}`} disabled={isUpdatedByField && editingRecord} />
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