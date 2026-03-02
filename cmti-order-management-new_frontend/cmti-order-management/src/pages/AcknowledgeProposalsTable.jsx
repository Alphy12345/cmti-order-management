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

import dayjs from 'dayjs'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'

import '../App.css'
import { API_BASE_URL } from '../config/api.js'
import { formatDate } from '../config/date.js'

dayjs.extend(isSameOrAfter)
dayjs.extend(isSameOrBefore)


const AcknowledgeProposalsTable = ({ fetchProposalsTrigger }) => {
  const [pendingProposals, setPendingProposals] = useState([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState({})

  const fetchPendingProposals = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/proposals/false`, {
        headers: { accept: 'application/json' },
      })
      if (!response.ok) throw new Error('Failed to fetch pending proposals')
      const data = await response.json()
      const normalized = Array.isArray(data)
        ? data.map((item) => ({ ...item, key: item.id }))
        : []
      setPendingProposals(normalized)
    } catch (error) {
      console.error(error)
      message.error('Unable to fetch pending proposals')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPendingProposals()
  }, [fetchPendingProposals])

  // Refresh when master proposals are updated (optional sync)
  useEffect(() => {
    fetchPendingProposals()
  }, [fetchProposalsTrigger])

  const handleAcknowledge = async (id, acknowledge = true) => {
    setActionLoading((prev) => ({ ...prev, [id]: true }))
    try {
      const response = await fetch(`${API_BASE_URL}/proposals/acknowledge/${id}`, {
        method: 'PUT',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_acknowledged: acknowledge }),
      })

      if (!response.ok) {
        const err = await response.text()
        throw new Error(err || 'Failed to update acknowledgement')
      }

      message.success(acknowledge ? 'Proposal accepted' : 'Proposal rejected')
      fetchPendingProposals()  // Refresh pending list
      fetchProposalsTrigger()  // Refresh master proposals if needed
    } catch (error) {
      console.error(error)
      message.error(error.message || 'Failed to update acknowledgement')
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }))
    }
  }

  const pendingColumns = [
 
    { title: 'Enquiry Date', dataIndex: 'enquiry_date', key: 'enquiry_date', width: 120,
        render: (text) => formatDate(text) },

    { title: 'Customer Type', dataIndex: 'customer_type', key: 'customer_type' , width: 120,},
    { title: 'Customer Name', dataIndex: 'customer_name', key: 'customer_name', width: 120, },
    { title: 'Address', dataIndex: 'address', key: 'address', width: 120, },
    { title: 'Email', dataIndex: 'email', key: 'email' , width: 120,},
    { title: 'Phone No', dataIndex: 'phone_no', key: 'phone_no' , width: 120,},
    { title: 'Alternate Contact Details', dataIndex: 'alternate_contact_details', key: 'alternate_contact_details', width: 120, },

    { title: 'Request Type', dataIndex: 'request_type', key: 'request_type' , width: 120,},
    { title: 'Email Reference', dataIndex: 'email_reference', key: 'email_reference' , width: 120,},
    { title: 'Quote Reference', dataIndex: 'quote_reference', key: 'quote_reference', width: 120, },

    { title: 'Quote Description', dataIndex: 'quote_description', key: 'quote_description', width: 120, },

    { title: 'Quote Date', dataIndex: 'quote_date', key: 'quote_date',
        render: (text) => formatDate(text), width: 120, },
    { title: 'Quote Amount', dataIndex: 'quote_amount', key: 'quote_amount', width: 120, },

    { title: 'Revised/Negotiated', dataIndex: 'revised/negotiated', key: 'revised/negotiated' , width: 120,},
    { title: 'Revised/Negotiated Quote Date', dataIndex: 'revised/negotiated_quote_date', key: 'revised/negotiated_quote_date',
        render: (text) => formatDate(text) , width: 120,},
    { title: 'Revised/Negotiated Quote Amount', dataIndex: 'revised/negotiated_quote_amount', key: 'revised/negotiated_quote_amount', width: 120, },

    { title: 'Quotation By', dataIndex: 'quotation_given_by_name', key: 'quotation_given_by_name' , width: 120,},
    { title: 'Department', dataIndex: 'quotation_given_by_department', key: 'quotation_given_by_department' , width: 120,},

    {
      title: 'Action',
      key: 'action',
      fixed: 'right',
       width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            loading={actionLoading[record.id]}
            onClick={() => handleAcknowledge(record.id, true)}
          >
            Accept
          </Button>
          <Popconfirm
            title="Reject this proposal?"
            description="This will acknowledge it as rejected."
            onConfirm={() => handleAcknowledge(record.id, false)}
            okText="Reject"
            okButtonProps={{ danger: true }}
          >
            <Button
              danger
              size="small"
              loading={actionLoading[record.id]}
            >
              Reject
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div className="overflow-x-auto">
      <Table
        rowKey="key"
        columns={pendingColumns}
        dataSource={pendingProposals}
        loading={loading}
        pagination={{ pageSize: 15 }}
        bordered
        scroll={{ x: 1600, y: 500 }}
        sticky
        locale={{ emptyText: 'No pending proposals to acknowledge' }}
      />
    </div>
  )
}


export default AcknowledgeProposalsTable;