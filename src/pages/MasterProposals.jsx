import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  DeleteOutlined,
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
  Popconfirm,
  Space,
  Table,
  Typography,
  message,
  DatePicker,
  Select,
  Row,
  Col,
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

const MASTER_FIELDS = [
  { name: 'quote_date', label: 'Quote Date' },
  { name: 'customer_name', label: 'Customer Name' },
  { name: 'description', label: 'Description' },
  { name: 'quote_amt', label: 'Quote Amount' },
  { name: 'reference', label: 'Reference' },
  { name: 'quotation_ref', label: 'Quotation Ref' },
  { name: 'indentor', label: 'Indentor' },
  { name: 'department', label: 'Department' },
  { name: 'contact_details', label: 'Contact Details' },
  { name: 'order_number', label: 'Order Number' },
  { name: 'date', label: 'Date' },
  { name: 'amount', label: 'Amount' },
]

function MasterProposals() {
  const [form] = Form.useForm()
  const [tableData, setTableData] = useState([])
  const [filteredData, setFilteredData] = useState([])
  const [tableLoading, setTableLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const [searchText, setSearchText] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState(null)
  const [orderDateRange, setOrderDateRange] = useState(null)

  const [importPreview, setImportPreview] = useState(null)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const fileInputRef = useRef(null)
  const [bulkImportLoading, setBulkImportLoading] = useState(false)

  const fetchProposals = useCallback(async () => {
    setTableLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/master_proposals/`, {
        headers: { accept: 'application/json' },
      })
      if (!response.ok) {
        throw new Error('Unable to fetch proposals')
      }
      const payload = await response.json()
      const normalized = Array.isArray(payload)
        ? payload.map((item) => ({ ...item, key: item.id }))
        : []
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

  // Filters
  useEffect(() => {
    let filtered = [...tableData]

    if (searchText) {
      const s = searchText.trim().toLowerCase()
      filtered = filtered.filter((item) =>
        Object.values(item).some((val) =>
          String(val).toLowerCase().includes(s),
        ),
      )
    }

    if (departmentFilter) {
      filtered = filtered.filter((item) => item.department === departmentFilter)
    }

    if (orderDateRange && orderDateRange.length === 2) {
      filtered = filtered.filter((item) => {
        if (!item.date) return false
        const orderDate = dayjs(item.date)
        if (!orderDate.isValid()) return false
        const start = orderDateRange[0].startOf('day')
        const end = orderDateRange[1].endOf('day')
        return (
          orderDate.isSameOrAfter(start) && orderDate.isSameOrBefore(end)
        )
      })
    }

    setFilteredData(filtered)
  }, [searchText, departmentFilter, orderDateRange, tableData])

  const uniqueDepartments = useMemo(() => {
    const departments = [
      ...new Set(tableData.map((item) => item.department).filter(Boolean)),
    ]
    return departments.sort()
  }, [tableData])

  // Export to Excel (Master Proposals)
  const handleExportExcel = () => {
    if (filteredData.length === 0) {
      message.warning('No data to export')
      return
    }

    const worksheet = XLSX.utils.json_to_sheet(
      filteredData.map((item) => ({
        'Quote Date': item.quote_date || '',
        'Customer Name': item.customer_name || '',
        Description: item.description || '',
        'Quote Amount': item.quote_amt || '',
        Reference: item.reference || '',
        'Quotation Ref': item.quotation_ref || '',
        Indentor: item.indentor || '',
        Department: item.department || '',
        'Contact Details': item.contact_details || '',
        'Order Number': item.order_number || '',
        Date: item.date || '',
        Amount: item.amount || '',
      })),
    )

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Master Proposals')
    XLSX.writeFile(
      workbook,
      `master_proposals_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`,
    )
    message.success('Excel file downloaded successfully')
  }

  // Import preview helpers (simpler than main Proposals)
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

  const handleBulkImport = async () => {
    if (!importPreview?.rows?.length) {
      message.warning('No rows to import')
      return
    }
    setBulkImportLoading(true)

    try {
      const headerToField = {
        quotedate: 'quote_date',
        customername: 'customer_name',
        description: 'description',
        quoteamt: 'quote_amt',
        reference: 'reference',
        quotationref: 'quotation_ref',
        indentor: 'indentor',
        department: 'department',
        contactdetails: 'contact_details',
        ordernumber: 'order_number',
        date: 'date',
        amount: 'amount',
      }

      const normalizeKey = (value) =>
        (value || '')
          .toString()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '')

      const excelSerialToDate = (serial) => {
        if (typeof serial !== 'number' || Number.isNaN(serial)) return ''
        const excelEpoch = new Date(Date.UTC(1899, 11, 30))
        const date = new Date(excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000)
        return dayjs(date).format('YYYY-MM-DD')
      }

      const items = importPreview.rows.map((row) => {
        const obj = {}
        importPreview.headers.forEach((header, idx) => {
          const key = headerToField[normalizeKey(header)]
          if (!key) return

          const raw = row[idx]
          let value

          if (raw === null || raw === undefined) {
            value = ''
          } else if (raw instanceof Date) {
            value = dayjs(raw).format('YYYY-MM-DD')
          } else if (
            (key === 'quote_date' || key === 'date') &&
            typeof raw === 'number'
          ) {
            value = excelSerialToDate(raw)
          } else {
            value = String(raw)
          }

          obj[key] = value
        })
        return obj
      })

      const response = await fetch(`${API_BASE_URL}/master_proposals/bulk`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items }),
      })

      if (!response.ok) {
        const err = await response.text()
        throw new Error(err || 'Bulk import failed')
      }

      message.success('Master proposals imported successfully')
      await fetchProposals()
      setImportModalOpen(false)
      setImportPreview(null)
    } finally {
      setBulkImportLoading(false)
    }
  }

  const openEditModal = useCallback(
    (record) => {
      setEditingRecord(record)
      form.setFieldsValue(record)
      setModalOpen(true)
    },
    [form],
  )

  const closeModal = useCallback(() => {
    setModalOpen(false)
    setEditingRecord(null)
    form.resetFields()
  }, [form])

  const handleSubmit = async (values) => {
    const payload = {}
    MASTER_FIELDS.forEach((field) => {
      payload[field.name] = values[field.name] ?? ''
    })
    const isEditing = Boolean(editingRecord)
    const url = isEditing
      ? `${API_BASE_URL}/master_proposals/${editingRecord.id}`
      : `${API_BASE_URL}/master_proposals/`
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
    }
  }

  const handleDelete = useCallback(
    async (record) => {
      setDeletingId(record.id)
      try {
        const response = await fetch(`${API_BASE_URL}/master_proposals/${record.id}`, {
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

  const columns = useMemo(
    () => [
      {
        title: 'Quote Date',
        dataIndex: 'quote_date',
        key: 'quote_date',
      },
      {
        title: 'Customer Name',
        dataIndex: 'customer_name',
        key: 'customer_name',
      },
      {
        title: 'Description',
        dataIndex: 'description',
        key: 'description',
      },
      {
        title: 'Quote Amount',
        dataIndex: 'quote_amt',
        key: 'quote_amt',
      },
      {
        title: 'Reference',
        dataIndex: 'reference',
        key: 'reference',
      },
      {
        title: 'Quotation Ref',
        dataIndex: 'quotation_ref',
        key: 'quotation_ref',
      },
      {
        title: 'Indentor',
        dataIndex: 'indentor',
        key: 'indentor',
      },
      {
        title: 'Department',
        dataIndex: 'department',
        key: 'department',
      },
      {
        title: 'Contact Details',
        dataIndex: 'contact_details',
        key: 'contact_details',
      },
      {
        title: 'Order Number',
        dataIndex: 'order_number',
        key: 'order_number',
      },
      {
        title: 'Date',
        dataIndex: 'date',
        key: 'date',
      },
      {
        title: 'Amount',
        dataIndex: 'amount',
        key: 'amount',
      },
      {
        title: 'Actions',
        key: 'actions',
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
    ],
    [deletingId, handleDelete, openEditModal],
  )

  return (
    <>
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <Title level={3}>Master Proposals</Title>
        {/* Filters at top */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-6 mt-4">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <Input
                placeholder="Search proposals"
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                size="large"
                allowClear
              />
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Select
                placeholder="Filter by department"
                value={departmentFilter}
                onChange={setDepartmentFilter}
                size="large"
                allowClear
                style={{ width: '100%' }}
              >
                {uniqueDepartments.map((d) => (
                  <Select.Option key={d} value={d}>
                    {d}
                  </Select.Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <RangePicker
                size="large"
                style={{ width: '100%' }}
                value={orderDateRange}
                onChange={setOrderDateRange}
                placeholder={['Start order date', 'End order date']}
              />
            </Col>
            <Col xs={24} sm={12} md={4} className="flex items-center">
              <Button
                onClick={() => {
                  setSearchText('')
                  setDepartmentFilter(null)
                  setOrderDateRange(null)
                }}
                size="large"
                style={{ width: '100%' }}
              >
                Clear Filters
              </Button>
            </Col>
          </Row>

          <div className="mt-4 flex flex-wrap gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
              onChange={handleImportFileChange}
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => fileInputRef.current?.click()}
            >
              Import Excel
            </Button>
            <Button
              danger
              icon={<DownloadOutlined />}
              onClick={handleExportExcel}
            >
              Export Excel
            </Button>
          </div>
        </div>

        {/* Master Proposals Table */}
        <Table
          rowKey="key"
          columns={columns}
          dataSource={filteredData}
          loading={tableLoading}
          pagination={{ pageSize: 20 }}
          bordered
          title={() => 'Master Proposals'}
        />
      </div>

      {/* Edit / Add Modal (simple, using all FORM_FIELDS) */}
      <Modal
        title={editingRecord ? 'Edit Proposal' : 'Add Proposal'}
        open={modalOpen}
        onCancel={closeModal}
        onOk={() => {
          form
            .validateFields()
            .then(handleSubmit)
            .catch(() => {})
        }}
        okText={editingRecord ? 'Update' : 'Create'}
        maskClosable={false}
        width={800}
      >
        <Form form={form} layout="vertical">
          {MASTER_FIELDS.map((field) => (
            <Form.Item
              key={field.name}
              name={field.name}
              label={field.label}
              rules={field.required ? [{ required: true, message: 'Required' }] : []}
            >
              <Input />
            </Form.Item>
          ))}
        </Form>
      </Modal>

      {/* Import preview modal */}
      <Modal
        title="Import Preview"
        open={importModalOpen}
        onCancel={() => setImportModalOpen(false)}
        footer={[
          <Button key="delete" onClick={() => setImportModalOpen(false)}>
            Delete
          </Button>,
          <Button
            key="send"
            type="primary"
            loading={bulkImportLoading}
            onClick={handleBulkImport}
          >
            Send
          </Button>,
        ]}
        width={900}
      >
        {importPreview ? (
          <div className="max-h-96 overflow-auto border border-slate-200 rounded-md">
            <Table
              size="small"
              pagination={false}
              columns={
                (importPreview.headers || []).map((h, idx) => ({
                  title: h || `Col ${idx + 1}`,
                  dataIndex: String(idx),
                  key: String(idx),
                }))
              }
              dataSource={
                (importPreview.rows || []).map((row, rowIndex) => {
                  const obj = { key: rowIndex }
                  row.forEach((cell, colIndex) => {
                    obj[String(colIndex)] = cell
                  })
                  return obj
                })
              }
            />
          </div>
        ) : (
          <p>No preview available.</p>
        )}
      </Modal>
    </>
  )
}

export default MasterProposals
