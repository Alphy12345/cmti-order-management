import { useCallback, useEffect, useMemo, useState } from 'react'
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
  { name: 'group', label: 'Group', width: 150 },
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
  const [currentUserName, setCurrentUserName] = useState('')
  const [projectCodePrefix, setProjectCodePrefix] = useState('')

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
      if (!response.ok) {
        throw new Error('Unable to fetch proposals')
      }
      const payload = await response.json()
      let normalized = Array.isArray(payload) ? payload.map(mapApiToUi) : []

      setTableData(normalized)
      setFilteredData(normalized)
    } catch (error) {
      console.error(error)
      message.error(error.message || 'Unable to fetch proposals')
    } finally {
      setTableLoading(false)
    }
  }, [])

  useEffect(() => {
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
    const isEditing = Boolean(editingRecord)
    let url
    let method
    let payload

    if (isEditing) {
      // For GH users, coordinator-only update goes through dedicated endpoint
      url = `${API_BASE_URL}/proposals/coordinator-update`
      method = 'POST'
      payload = {
        project_id: editingRecord.id,
        co_ordinator_remarks: values.co_ordinator_remarks ?? '',
        extended_delivery_date: values.extended_delivery_date ?? '',
        technical_completed_year: values.technical_completed_year ?? '',
        updated_by: currentUserName || values.updated_by || '',
      }
    } else {
      // Create follows the general proposals API
      payload = mapUiToApi(values)
      url = `${API_BASE_URL}/proposals/`
      method = 'POST'
    }

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
        let errorMessage = 'Request failed'
        try {
          const errorBody = await response.json()
          if (errorBody && typeof errorBody === 'object' && errorBody.detail) {
            errorMessage = errorBody.detail
          }
        } catch {
          const errorText = await response.text()
          if (errorText) errorMessage = errorText
        }
        throw new Error(errorMessage)
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

    // Project code prefix filter (first three letters of project number)
    if (projectCodePrefix && projectCodePrefix.trim() !== '') {
      const prefix = projectCodePrefix.trim().slice(0, 3).toLowerCase()
      filtered = filtered.filter((item) => {
        if (!item.project_number) return false
        const projectPrefix = String(item.project_number)
          .slice(0, 3)
          .toLowerCase()
        return projectPrefix === prefix
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
  }, [
    searchText,
    centerFilter,
    orderDateRange,
    enquiryDateRange,
    statusFilter,
    projectCodePrefix,
    tableData,
  ])

  // Get unique centers for filter
  const uniqueCenters = useMemo(() => {
    const centers = [
      ...new Set(tableData.map((item) => item.center).filter(Boolean)),
    ]
    return centers.sort()
  }, [tableData])

  // Get unique project code prefixes (first three letters) for dropdown
  const uniqueProjectPrefixes = useMemo(() => {
    const prefixes = tableData
      .map((item) => item.project_number)
      .filter(Boolean)
      .map((code) => String(code).slice(0, 3).toUpperCase())
      .filter((code) => code.trim() !== '')

    return [...new Set(prefixes)].sort()
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
        width: 100,
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
  }, [deletingId, handleDelete, openEditModal])

  // Compact projects view derived from proposals
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

                            <Col xs={24} sm={12} md={4}>
                              <Select
                                placeholder="Filter by Project Code (first 3 letters)"
                                value={projectCodePrefix || undefined}
                                onChange={(value) => setProjectCodePrefix(value || '')}
                                allowClear
                                size="large"
                                style={{ width: '100%' }}
                              >
                                {uniqueProjectPrefixes.map((prefix) => (
                                  <Select.Option key={prefix} value={prefix}>
                                    {prefix}
                                  </Select.Option>
                                ))}
                              </Select>
                            </Col>

                            {/* Clear Filters button (clears search + all filters) */}
                            <Col xs={24} sm={12} md={4} className="flex items-center">
                              <Button
                                onClick={() => {
                                  setSearchText('')
                                  setCenterFilter(null)
                                  setOrderDateRange(null)
                                  setEnquiryDateRange(null)
                                  setStatusFilter(null)
                                  setProjectCodePrefix('')
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
                                prefix={<FilterOutlined />}
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
                          <div className="mt-4 flex justify-end">
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
          initialValues={{ updated_by: '' }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            {FORM_FIELDS.filter((field) =>
              ['co_ordinator_remarks', 'extended_delivery_date', 'technical_completed_year', 'updated_by'].includes(
                field.name,
              ),
            ).map((field) => {
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
