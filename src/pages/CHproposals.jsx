import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
  DownloadOutlined,
  FilterOutlined,
  CalendarOutlined,
} from '@ant-design/icons'
import {
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
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

dayjs.extend(isSameOrAfter)
dayjs.extend(isSameOrBefore)

const { Title } = Typography
const { TextArea } = Input
const { RangePicker } = DatePicker

const API_BASE_URL = 'http://10.1.1.13:8000'

const PROPOSAL_FIELDS = [
  { name: 'id', label: 'ID (PK)', width: 120, fixed: 'left', inForm: false },
  { name: 'enquiry_date', label: 'Enquiry Date', width: 150 },
  { name: 'customer_type', label: 'Customer Type', width: 170 },
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
  { name: 'quotation_given_by_name', label: 'Quotation Given By', width: 200 },
  { name: 'quotation_given_by_department', label: 'Department', width: 180 },
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

const mapUiToApi = (values) => {
  const payload = {}
  FORM_FIELDS.forEach((field) => {
    const apiName = getApiName(field.name)
    payload[apiName] = values[field.name] ?? ''
  })
  return payload
}

const ActionButtons = ({ label, onAdd }) => (
  <Space wrap>
    <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>
      Add {label}
    </Button>
  </Space>
)

function Proposals() {
  const [form] = Form.useForm()
  const [tableData, setTableData] = useState([])
  const [filteredData, setFilteredData] = useState([])
  const [tableLoading, setTableLoading] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [searchText, setSearchText] = useState('')
  const [centerFilter, setCenterFilter] = useState(null)
  const [orderDateRange, setOrderDateRange] = useState(null)
  const [enquiryDateRange, setEnquiryDateRange] = useState(null)
  const [statusFilter, setStatusFilter] = useState(null)
  const [importPreview, setImportPreview] = useState(null)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const fileInputRef = useRef(null)
  const [bulkImportLoading, setBulkImportLoading] = useState(false)
  const [currentUserName, setCurrentUserName] = useState('')

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
      form.setFieldsValue({ updated_by: currentUserName })
    }
    setModalOpen(true)
  }, [form, currentUserName])

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
  }, [form])

  const handleSubmit = async (values) => {
    setSubmitLoading(true)
    const payload = mapUiToApi(values)
    const isEditing = Boolean(editingRecord)
    const url = isEditing
      ? `${API_BASE_URL}/proposals/${editingRecord.id}`
      : `${API_BASE_URL}/proposals/`
    const method = isEditing ? 'PUT' : 'POST'
    try {
      const response = await fetch(url, {
        method,
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Request failed')
      }
      await fetchProposals()
      message.success(isEditing ? 'Proposal updated' : 'Proposal created')
      closeModal()
    } catch (error) {
      console.error(error)
      message.error(error.message || 'Unable to save proposal')
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleDelete = useCallback(
    async (record) => {
      setDeletingId(record.id)
      try {
        const response = await fetch(`${API_BASE_URL}/proposals/${record.id}`, {
          method: 'DELETE',
          headers: { accept: '*/*' },
        })
        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(errorText || 'Failed to delete proposal')
        }
        message.success('Proposal deleted')
        await fetchProposals()
      } catch (error) {
        console.error(error)
        message.error(error.message || 'Unable to delete proposal')
      } finally {
        setDeletingId(null)
      }
    },
    [fetchProposals],
  )

  // Calculate statistics
  const statistics = useMemo(() => {
    const totalProposals = tableData.length
    const totalProjects = tableData.filter(
      (item) => item.project_number && item.project_number.trim() !== '',
    ).length
    const technicallyCompleted = tableData.filter(
      (item) =>
        item.technical_completed_year &&
        item.technical_completed_year.trim() !== '',
    ).length
    const financiallyCompleted = tableData.filter(
      (item) =>
        item.technical_completed_year &&
        item.technical_completed_year.trim() !== '' &&
        item.financial_completed_year &&
        item.financial_completed_year.trim() !== '',
    ).length
    const pendingProjects = tableData.filter(
      (item) =>
        (!item.technical_completed_year ||
          item.technical_completed_year.trim() === '') &&
        (!item.financial_completed_year ||
          item.financial_completed_year.trim() === ''),
    ).length
    return {
      totalProposals,
      totalProjects,
      technicallyCompleted,
      financiallyCompleted,
      pendingProjects,
    }
  }, [tableData])

  // Filter data based on search and filters
  useEffect(() => {
    let filtered = [...tableData]

    // Search filter
    if (searchText) {
      const s = searchText.trim()
      // If user typed only digits, treat it as ID (PK) search
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

    // Center filter
    if (centerFilter) {
      filtered = filtered.filter((item) => item.center === centerFilter)
    }

    // Order date filter
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

    // Enquiry date filter
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

    // Status filter from cards
    if (statusFilter === 'totalProjects') {
      filtered = filtered.filter(
        (item) => item.project_number && item.project_number.trim() !== '',
      )
    } else if (statusFilter === 'technicallyCompleted') {
      filtered = filtered.filter(
        (item) =>
          item.technical_completed_year &&
          item.technical_completed_year.trim() !== '',
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
        (item) =>
          (!item.technical_completed_year ||
            item.technical_completed_year.trim() === '') &&
          (!item.financial_completed_year ||
            item.financial_completed_year.trim() === ''),
      )
    }

    setFilteredData(filtered)
  }, [searchText, centerFilter, orderDateRange, enquiryDateRange, statusFilter, tableData])

  // Get unique centers for filter
  const uniqueCenters = useMemo(() => {
    const centers = [
      ...new Set(tableData.map((item) => item.center).filter(Boolean)),
    ]
    return centers.sort()
  }, [tableData])

  // Export to Excel
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

  // Excel serial date starts from 1899-12-30
  const EXCEL_EPOCH = dayjs('1899-12-30')
  const isExcelDateSerial = (num) =>
    typeof num === 'number' && num >= 40000 && num < 1000000

  const excelSerialToDateString = (serial) => {
    const days = Math.floor(serial) - (serial >= 24107 ? 1 : 0)
    const date = EXCEL_EPOCH.add(days, 'day')
    return date.format('YYYY-MM-DD')
  }

  const normalizeHeaderKey = (value) => {
    if (!value) return ''
    return value
      .toString()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '')
  }

  const handleBulkImport = async () => {
    if (!importPreview?.rows?.length) {
      message.warning('No rows to import')
      return
    }
    setBulkImportLoading(true)
    try {
      // Build lookup from normalized header -> internal field name
      const fieldLookup = PROPOSAL_FIELDS.reduce((acc, field) => {
        const labelKey = normalizeHeaderKey(field.label)
        const nameKey = normalizeHeaderKey(field.name)
        const apiKey = normalizeHeaderKey(getApiName(field.name))
        const fieldName = field.name
        if (labelKey) acc[labelKey] = fieldName
        if (nameKey) acc[nameKey] = fieldName
        if (apiKey) acc[apiKey] = fieldName
        return acc
      }, {})

      const payload = importPreview.rows.map((row) => {
        const values = {}
        importPreview.headers.forEach((header, idx) => {
          const rawValue = row[idx]
          let cleanValue = rawValue

          const headerKey = normalizeHeaderKey(header)
          let fieldName = fieldLookup[headerKey]

          // Extra robust mapping for tricky columns
          if (!fieldName) {
            const hk = headerKey

            // Email Reference (Email Ref, Email Reference No, Email Ref No etc.)
            if (
              hk.includes('email') &&
              (hk.includes('reference') || hk.includes('ref'))
            ) {
              fieldName = 'email_reference'
            }
            // Center / Centre
            else if (hk.includes('center') || hk.includes('centre')) {
              fieldName = 'center'
            }
            // Co-ordinator Remarks / Coordinator Remarks / Co Ordinator Remarks etc.
            else if (
              (hk.includes('coord') || hk.includes('coordinator') || hk.includes('coordinator')) &&
              hk.includes('remark')
            ) {
              fieldName = 'co_ordinator_remarks'
            }
            // Closer / Closure Report (Closure Report, Closer Rep etc.)
            else if (
              (hk.includes('closer') || hk.includes('closure') || hk.includes('closeout')) &&
              (hk.includes('report') || hk.includes('rep'))
            ) {
              fieldName = 'closer_report'
            }
          }

          if (!fieldName) return

          // Handle Excel date serial numbers (e.g., 45400 → "2024-06-01")
          if (typeof rawValue === 'number' && isExcelDateSerial(rawValue)) {
            cleanValue = excelSerialToDateString(rawValue)
          }
          // Force all other numbers to strings
          else if (typeof rawValue === 'number') {
            cleanValue = rawValue.toString()
          }
          // Handle actual JS Date objects from XLSX
          else if (rawValue instanceof Date) {
            cleanValue = dayjs(rawValue).format('YYYY-MM-DD')
          }
          // Trim strings
          else if (typeof rawValue === 'string') {
            cleanValue = rawValue.trim()
          }
          // Empty cells
          else if (rawValue === null || rawValue === undefined) {
            cleanValue = ''
          }

          values[fieldName] = cleanValue
        })

        // Ensure required field is present
        if (!values.updated_by) {
          values.updated_by = 'Excel Import'
        }

        return mapUiToApi(values)
      })

      const response = await fetch(`${API_BASE_URL}/proposals/bulk`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const err = await response.text()
        throw new Error(`Import failed: ${err.substring(0, 200)}...`)
      }

      const result = await response.json()
      message.success(`${result.length} proposals imported successfully!`)
      await fetchProposals()
      setImportModalOpen(false)
      setImportPreview(null)
    } catch (err) {
      console.error('Bulk import error:', err)
      message.error(err.message || 'Failed to import data. Check console for details.')
    } finally {
      setBulkImportLoading(false)
    }
  }

  // Import Excel and build preview
  const handleImportFileChange = (event) => {
    const file = event.target?.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
        const headers = rows[0] || []
        const body = rows.slice(1)
        setImportPreview({ headers, rows: body, sheetName: firstSheetName })
        setImportModalOpen(true)
        message.success('File loaded. Preview opened.')
      } catch (error) {
        console.error(error)
        message.error('Unable to read Excel file')
      } finally {
        if (event.target) {
          event.target.value = ''
        }
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const columns = useMemo(() => {
    const baseColumns = TABLE_FIELDS.map((field) => ({
      key: field.name,
      dataIndex: field.name,
      title: field.label,
      width: field.width,
      fixed: field.fixed,
      render: field.render,
    }))
    return [
      ...baseColumns,
      {
        key: 'actions',
        title: 'Actions',
        fixed: 'right',
        width: 170,
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
            <Popconfirm
              title="Confirm delete"
              description="This action cannot be undone."
              okText="Delete"
              okButtonProps={{ danger: true, loading: deletingId === record.id }}
              cancelText="Cancel"
              onConfirm={() => handleDelete(record)}
            >
              <Button
                size="small"
                type="link"
                danger
                icon={<DeleteOutlined />}
                loading={deletingId === record.id}
              >
                Delete
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ]
  }, [deletingId, handleDelete, openEditModal])

  // Compact projects view derived from proposals (currently unused, but kept)
  const projectRows = useMemo(
    () =>
      tableData
        .filter((item) => item.project_number && item.project_number.trim() !== '')
        .map((item) => {
          let status = 'Pending'
          if (
            item.technical_completed_year &&
            item.technical_completed_year.trim() !== '' &&
            item.financial_completed_year &&
            item.financial_completed_year.trim() !== ''
          ) {
            status = 'Financially Completed'
          } else if (
            item.technical_completed_year &&
            item.technical_completed_year.trim() !== ''
          ) {
            status = 'Technically Completed'
          }
          return {
            key: item.key,
            project_number: item.project_number,
            party_name: item.party_name,
            center: item.center,
            order_date: item.order_date,
            technical_completed_year: item.technical_completed_year,
            financial_completed_year: item.financial_completed_year,
            status,
          }
        }),
    [tableData],
  )

  const projectColumns = [
    { title: 'Project Number', dataIndex: 'project_number', key: 'project_number' },
    { title: 'Party Name', dataIndex: 'party_name', key: 'party_name' },
    { title: 'Center', dataIndex: 'center', key: 'center' },
    { title: 'Order Date', dataIndex: 'order_date', key: 'order_date' },
    {
      title: 'Technical Year',
      dataIndex: 'technical_completed_year',
      key: 'technical_completed_year',
    },
    {
      title: 'Financial Year',
      dataIndex: 'financial_completed_year',
      key: 'financial_completed_year',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (value) => {
        let color = 'default'
        if (value === 'Technically Completed') color = 'orange'
        if (value === 'Financially Completed') color = 'green'
        if (value === 'Pending') color = 'red'
        return <Tag color={color}>{value}</Tag>
      },
    },
  ]

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
                  {/* Statistics Cards */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                    <Card
                      className="bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                      onClick={() => setStatusFilter(null)}
                    >
                      <Statistic
                        title={
                          <span className="text-white/90">
                            Total Proposals
                          </span>
                        }
                        value={statistics.totalProposals}
                        valueStyle={{
                          color: '#fff',
                          fontSize: '28px',
                          fontWeight: 'bold',
                        }}
                      />
                    </Card>
                    <Card
                      className="bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                      onClick={() => setStatusFilter('totalProjects')}
                    >
                      <Statistic
                        title={
                          <span className="text-white/90">
                            Total Projects
                          </span>
                        }
                        value={statistics.totalProjects}
                        valueStyle={{
                          color: '#fff',
                          fontSize: '28px',
                          fontWeight: 'bold',
                        }}
                      />
                    </Card>
                    <Card
                      className="bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                      onClick={() => setStatusFilter('technicallyCompleted')}
                    >
                      <Statistic
                        title={
                          <span className="text-white/90">
                            Technically Completed
                          </span>
                        }
                        value={statistics.technicallyCompleted}
                        valueStyle={{
                          color: '#fff',
                          fontSize: '28px',
                          fontWeight: 'bold',
                        }}
                      />
                    </Card>
                    <Card
                      className="bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                      onClick={() => setStatusFilter('financiallyCompleted')}
                    >
                      <Statistic
                        title={
                          <span className="text-white/90">
                            Financially Completed
                          </span>
                        }
                        value={statistics.financiallyCompleted}
                        valueStyle={{
                          color: '#fff',
                          fontSize: '28px',
                          fontWeight: 'bold',
                        }}
                      />
                    </Card>
                    <Card
                      className="bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                      onClick={() => setStatusFilter('pendingProjects')}
                    >
                      <Statistic
                        title={
                          <span className="text-white/90">
                            Pending Projects
                          </span>
                        }
                        value={statistics.pendingProjects}
                        valueStyle={{
                          color: '#fff',
                          fontSize: '28px',
                          fontWeight: 'bold',
                        }}
                      />
                    </Card>
                  </div>

                  {/* Search and Filters Section */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-4">
                      <Title level={4} className="!mb-0">
                        Search & Filters
                      </Title>
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
                      {/* Clear Filters button (clears search + all filters) */}
                      <Col xs={24} sm={12} md={2} className="flex items-center">
                        <Button
                          onClick={() => {
                            setSearchText('')
                            setCenterFilter(null)
                            setOrderDateRange(null)
                            setEnquiryDateRange(null)
                            setStatusFilter(null)
                          }}
                          size="large"
                          style={{ width: '100%' }}
                        >
                          Clear Filters
                        </Button>
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
                            <Select.Option key={center} value={center}>
                              {center}
                            </Select.Option>
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
                          format="YYYY-MM-DD"
                        />
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <RangePicker
                          placeholder={[
                            'Start Enquiry Date',
                            'End Enquiry Date',
                          ]}
                          value={enquiryDateRange}
                          onChange={setEnquiryDateRange}
                          size="large"
                          style={{ width: '100%' }}
                          format="YYYY-MM-DD"
                        />
                      </Col>
                    </Row>
                    <div className="mt-4 flex justify-end gap-3">
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        ref={fileInputRef}
                        onChange={handleImportFileChange}
                        style={{ display: 'none' }}
                      />
                      <Button
                        onClick={() => fileInputRef.current && fileInputRef.current.click()}
                        size="large"
                      >
                        Import Excel
                      </Button>
                      <Button
                        type="primary"
                        icon={<DownloadOutlined />}
                        size="large"
                        onClick={handleExportExcel}
                        className="bg-gradient-to-r from-blue-500 to-blue-600 border-none shadow-md hover:shadow-lg"
                      >
                        Export to Excel
                      </Button>
                    </div>
                  </div>

                  {importPreview && (
                    <Modal
                      title={
                        importPreview
                          ? `Import Preview – ${importPreview.rows.length} rows (${importPreview.sheetName})`
                          : 'Import Preview'
                      }
                      open={importModalOpen}
                      onCancel={() => {
                        setImportModalOpen(false)
                        setImportPreview(null)
                      }}
                      width={1100}
                      footer={[
                        <Button
                          key="cancel"
                          onClick={() => {
                            setImportModalOpen(false)
                            setImportPreview(null)
                          }}
                        >
                          Cancel
                        </Button>,
                        <Button
                          key="submit"
                          type="primary"
                          loading={bulkImportLoading}
                          onClick={handleBulkImport}
                        >
                          Submit Import ({importPreview.rows.length} rows)
                        </Button>,
                      ]}
                    >
                      <div className="overflow-auto max-h-[60vh]">
                        <table className="min-w-full border-collapse text-sm">
                          <thead>
                            <tr>
                              {importPreview.headers.map((h, idx) => (
                                <th
                                  key={idx}
                                  className="border border-slate-200 bg-slate-50 px-2 py-1 text-left font-semibold"
                                >
                                  {h || `Column ${idx + 1}`}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {importPreview.rows.slice(0, 200).map((row, rIdx) => (
                              <tr key={rIdx}>
                                {importPreview.headers.map((_, cIdx) => (
                                  <td
                                    key={cIdx}
                                    className="border border-slate-200 px-2 py-1"
                                  >
                                    {row[cIdx] ?? ''}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {importPreview.rows.length > 200 && (
                          <p className="mt-2 text-xs text-slate-500">
                            Showing first 200 rows of {importPreview.rows.length}.
                          </p>
                        )}
                      </div>
                    </Modal>
                  )}

                  {/* Proposals Table */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 pb-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <Title level={4} className="!mb-1">
                          Proposal
                        </Title>
                        <p className="text-slate-500 text-sm">
                          Showing {filteredData.length} of {tableData.length}{' '}
                          proposals
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
                      scroll={{ x: 4200 }}
                      bordered
                    />
                  </div>
                </div>
              ),
            },
          ]}
        />
      </div>

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
          initialValues={{
            updated_by: localStorage.getItem('loggedInUser'),
          }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            {FORM_FIELDS.map((field) => {
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

              if (isDateField) {
                return (
                  <Form.Item
                    key={field.name}
                    name={field.name}
                    label={field.label}
                    rules={
                      field.required
                        ? [
                            {
                              required: true,
                              message: `Please enter ${field.label}`,
                            },
                          ]
                        : []
                    }
                    getValueProps={(value) => ({
                      value: value
                        ? dayjs(value).isValid()
                          ? dayjs(value)
                          : null
                        : null,
                    })}
                    normalize={(value) => {
                      if (!value) return ''
                      if (dayjs.isDayjs(value)) {
                        return value.format('YYYY-MM-DD')
                      }
                      return value
                    }}
                  >
                    <DatePicker
                      style={{ width: '100%' }}
                      format="YYYY-MM-DD"
                      placeholder={`Select ${field.label}`}
                    />
                  </Form.Item>
                )
              }

              const InputComponent = field.input === 'textarea' ? TextArea : Input
              const isUpdatedByField = field.name === 'updated_by'
              return (
                <Form.Item
                  key={field.name}
                  name={field.name}
                  label={field.label}
                  rules={
                    field.required
                      ? [
                          {
                            required: true,
                            message: `Please enter ${field.label}`,
                          },
                        ]
                      : []
                  }
                >
                  <InputComponent
                    rows={field.input === 'textarea' ? 2 : undefined}
                    disabled={isUpdatedByField}
                  />
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
