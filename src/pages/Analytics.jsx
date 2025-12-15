import { useEffect, useMemo, useRef, useState } from 'react'
import { Card, Statistic, Row, Col, Select, Typography, message } from 'antd'
import Chart from 'chart.js/auto'
import '../App.css'

const { Title } = Typography

const API_BASE_URL = 'http://172.18.100.160:8000'

const BASE_START_YEAR = 2015
const CURRENT_YEAR = new Date().getFullYear()

function Analytics() {
  const [proposals, setProposals] = useState([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState(null)
  // default range: from BASE_START_YEAR up to CURRENT_YEAR
  const [selectedMinYear, setSelectedMinYear] = useState(BASE_START_YEAR)
  const [selectedMaxYear, setSelectedMaxYear] = useState(CURRENT_YEAR)
  const chartRef = useRef(null)
  const chartInstanceRef = useRef(null)
  const pie1Ref = useRef(null)
  const pie2Ref = useRef(null)
  const pie3Ref = useRef(null)
  const pie1Instance = useRef(null)
  const pie2Instance = useRef(null)
  const pie3Instance = useRef(null)

  useEffect(() => {
    const fetchProposals = async () => {
      setLoading(true)
      try {
        const res = await fetch(`${API_BASE_URL}/proposals/`, {
          headers: { accept: 'application/json' },
        })
        if (!res.ok) throw new Error('Unable to fetch proposals')
        const payload = await res.json()
        setProposals(Array.isArray(payload) ? payload : [])
      } catch (err) {
        console.error(err)
        message.error(err.message || 'Unable to fetch proposals')
      } finally {
        setLoading(false)
      }
    }
    fetchProposals()
  }, [])

  const statistics = useMemo(() => {
    const tableData = proposals || []
    const totalProposals = tableData.length
    const totalProjects = tableData.filter((item) => item.project_number && item.project_number.toString().trim() !== '').length
    const technicallyCompleted = tableData.filter((item) => item.technical_completed_year && item.technical_completed_year.toString().trim() !== '').length
    const financiallyCompleted = tableData.filter((item) => item.technical_completed_year && item.technical_completed_year.toString().trim() !== '' && item.financial_completed_year && item.financial_completed_year.toString().trim() !== '').length
    const pendingProjects = tableData.filter((item) => (!item.technical_completed_year || item.technical_completed_year.toString().trim() === '') && (!item.financial_completed_year || item.financial_completed_year.toString().trim() === '')).length
    return { totalProposals, totalProjects, technicallyCompleted, financiallyCompleted, pendingProjects }
  }, [proposals])

  const availableYears = useMemo(() => {
    const maxYear = CURRENT_YEAR + 10
    const years = []
    for (let y = maxYear; y >= BASE_START_YEAR; y--) {
      years.push(y)
    }
    return years
  }, [])

  const chartLabels = useMemo(() => {
    const minY = Math.min(selectedMinYear, selectedMaxYear)
    const maxY = Math.max(selectedMinYear, selectedMaxYear)
    return availableYears.filter((y) => y >= minY && y <= maxY)
  }, [availableYears, selectedMinYear, selectedMaxYear])

  const getProjectYear = (p) => {
    // prefer order_date, then technical_completed_year, then financial_completed_year, then created_at
    try {
      if (p.order_date) {
        const year = Number(String(p.order_date).slice(0, 4))
        if (!Number.isNaN(year)) return year
      }
    } catch (e) {
      // ignore
    }
    if (p.technical_completed_year) {
      const y = Number(String(p.technical_completed_year).slice(0, 4))
      if (!Number.isNaN(y)) return y
    }
    if (p.financial_completed_year) {
      const y = Number(String(p.financial_completed_year).slice(0, 4))
      if (!Number.isNaN(y)) return y
    }
    if (p.created_at) {
      const y = Number(String(p.created_at).slice(0, 4))
      if (!Number.isNaN(y)) return y
    }
    return null
  }

  const chartData = useMemo(() => {
    const counts = chartLabels.map((year) => {
      return proposals.filter((p) => {
        if (!p.project_number) return false
        const py = getProjectYear(p)
        return py === year
      }).length
    })
    return counts
  }, [proposals, chartLabels])

  // Helpers for pie charts
  const PROJECT_PREFIXES = ['GSP', 'ISP', 'GAP', 'ILP', 'DPP', 'LSP', 'CLP', 'SO']

  const getProjectPrefix = (pn) => {
    if (!pn) return 'OTHER'
    const up = String(pn).toUpperCase().trim()
    for (const pref of PROJECT_PREFIXES) {
      if (up.startsWith(pref)) return pref
    }
    // fallback: letters up to first digit
    const m = up.match(/^[A-Z]+/)
    return m ? m[0] : 'OTHER'
  }

  const colorPalette = (n) => {
    const colors = []
    for (let i = 0; i < n; i++) {
      const hue = Math.round((i * 360) / n)
      colors.push(`hsl(${hue} 70% 55%)`)
    }
    return colors
  }

  // Pie 1: project number distribution
  const pie1 = useMemo(() => {
    const counts = {}
    for (const p of proposals) {
      const pref = getProjectPrefix(p.project_number)
      counts[pref] = (counts[pref] || 0) + (p.project_number ? 1 : 0)
    }
    // include known prefixes even if zero
    for (const pref of PROJECT_PREFIXES) if (!counts[pref]) counts[pref] = 0
    const labels = Object.keys(counts)
    const data = labels.map((l) => counts[l])
    return { labels, data }
  }, [proposals])

  // Pie 2: departments -> number of projects
  const pie2 = useMemo(() => {
    const counts = {}
    for (const p of proposals) {
      if (!p.project_number) continue
      const dep = (p.center || 'Unknown').toString() || 'Unknown'
      counts[dep] = (counts[dep] || 0) + 1
    }
    const labels = Object.keys(counts)
    const data = labels.map((l) => counts[l])
    return { labels, data }
  }, [proposals])

  // Pie 3: financially completed projects by department
  const pie3 = useMemo(() => {
    const counts = {}
    for (const p of proposals) {
      const tech = p.technical_completed_year && String(p.technical_completed_year).trim() !== ''
      const fin = p.financial_completed_year && String(p.financial_completed_year).trim() !== ''
      if (!p.project_number) continue
      if (!(tech && fin)) continue
      const dep = (p.center || 'Unknown').toString() || 'Unknown'
      counts[dep] = (counts[dep] || 0) + 1
    }
    const labels = Object.keys(counts)
    const data = labels.map((l) => counts[l])
    return { labels, data }
  }, [proposals])


  const MIN_YEAR_OPTIONS = useMemo(
    () => availableYears.filter((y) => y <= CURRENT_YEAR),
    [availableYears],
  )

  const MAX_YEAR_OPTIONS = useMemo(
    () => availableYears.filter((y) => y >= CURRENT_YEAR),
    [availableYears],
  )

  useEffect(() => {
    if (!chartRef.current) return
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy()
      chartInstanceRef.current = null
    }

    const ctx = chartRef.current.getContext('2d')
    chartInstanceRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: chartLabels.map(String),
        datasets: [
          {
            label: 'Projects per Year',
            data: chartData,
            backgroundColor: 'rgba(37,99,235,0.8)',
            borderColor: 'rgba(37,99,235,1)',
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            suggestedMax: Math.max(30, (chartData && chartData.length ? Math.max(...chartData) : 30)),
            ticks: {
              stepSize: 5,
              color: '#374151',
              font: { size: 14 },
            },
            title: {
              display: true,
              text: 'Number of Projects'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Year'
            }
            ,
            ticks: { color: '#374151', font: { size: 14 } }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: { bodyFont: { size: 14 }, titleFont: { size: 14 } },
        },
      },
    })

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy()
        chartInstanceRef.current = null
      }
    }
  }, [chartLabels, chartData])

  // Render pie charts
  useEffect(() => {
    const renderPie = (ref, instanceRef, dataset, title) => {
      if (!ref?.current) return
      if (instanceRef.current) {
        instanceRef.current.destroy()
        instanceRef.current = null
      }
      const ctx = ref.current.getContext('2d')
      const colors = colorPalette(dataset.labels.length)
      instanceRef.current = new Chart(ctx, {
        type: 'pie',
        data: {
          labels: dataset.labels,
          datasets: [
            {
              data: dataset.data,
              backgroundColor: colors,
              borderColor: '#ffffff',
              borderWidth: 1,
            },
          ],
        },
        options: {
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 14, padding: 12, font: { size: 14 } } },
            title: { display: !!title, text: title, font: { size: 16 } },
            tooltip: { enabled: true, callbacks: { label: (ctx) => {
                const label = ctx.label || ''
                const value = ctx.parsed || 0
                const sum = ctx.dataset.data.reduce((a, b) => a + b, 0)
                const pct = sum ? ((value / sum) * 100).toFixed(1) : '0.0'
                return `${label}: ${value} (${pct}%)`
              } } },
          },
          responsive: true,
          maintainAspectRatio: false,
          animation: { animateRotate: true, duration: 700, easing: 'easeOutQuart' },
        },
      })
    }

    renderPie(pie1Ref, pie1Instance, pie1, 'Projects by Project Number')
    renderPie(pie2Ref, pie2Instance, pie2, 'Projects by Department')
    renderPie(pie3Ref, pie3Instance, pie3, 'Financially Completed Projects by Department')

    return () => {
      if (pie1Instance.current) {
        pie1Instance.current.destroy()
        pie1Instance.current = null
      }
      if (pie2Instance.current) {
        pie2Instance.current.destroy()
        pie2Instance.current = null
      }
      if (pie3Instance.current) {
        pie3Instance.current.destroy()
        pie3Instance.current = null
      }
    }
  }, [pie1, pie2, pie3])

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Title level={4} className="!mb-0">Analytics</Title>
            <p className="text-slate-500 text-sm">Overview and charts derived from proposals data</p>
          </div>
          
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg hover:shadow-xl transition-shadow">
            <Statistic title={<span className="text-white/90">Total Proposals</span>} value={statistics.totalProposals} valueStyle={{ color: '#fff', fontSize: '28px', fontWeight: 'bold' }} />
          </Card>
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg hover:shadow-xl transition-shadow">
            <Statistic title={<span className="text-white/90">Total Projects</span>} value={statistics.totalProjects} valueStyle={{ color: '#fff', fontSize: '28px', fontWeight: 'bold' }} />
          </Card>
          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg hover:shadow-xl transition-shadow">
            <Statistic title={<span className="text-white/90">Technically Completed</span>} value={statistics.technicallyCompleted} valueStyle={{ color: '#fff', fontSize: '28px', fontWeight: 'bold' }} />
          </Card>
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg hover:shadow-xl transition-shadow">
            <Statistic title={<span className="text-white/90">Financially Completed</span>} value={statistics.financiallyCompleted} valueStyle={{ color: '#fff', fontSize: '28px', fontWeight: 'bold' }} />
          </Card>
          <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg hover:shadow-xl transition-shadow">
            <Statistic title={<span className="text-white/90">Pending Projects</span>} value={statistics.pendingProjects} valueStyle={{ color: '#fff', fontSize: '28px', fontWeight: 'bold' }} />
          </Card>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mt-8">
          <h3 className="text-2xl font-semibold mb-4">Projects per Year</h3>
          <div style={{ height: 460 }}>
            <canvas ref={chartRef} style={{ width: '100%', height: '100%' }} />
          </div>
        </div>

        <div className="flex justify-center mt-4 mb-6 gap-4 flex-wrap">
          <Select
            value={selectedMinYear}
            onChange={(v) => setSelectedMinYear(Number(v))}
            size="large"
            style={{ width: 260 }}
          >
            {MIN_YEAR_OPTIONS.map((y) => (
              <Select.Option key={y} value={y}>{`Show ${y} and years below`}</Select.Option>
            ))}
          </Select>

          <Select
            value={selectedMaxYear}
            onChange={(v) => setSelectedMaxYear(Number(v))}
            size="large"
            style={{ width: 260 }}
          >
            {MAX_YEAR_OPTIONS.map((y) => (
              <Select.Option key={y} value={y}>{`Include up to year ${y}`}</Select.Option>
            ))}
          </Select>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-medium mb-4">Project Distribution (by Project Number)</h3>
            <div style={{ height: 420, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <canvas ref={pie1Ref} style={{ width: '100%', height: '100%' }} />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-medium mb-4">Projects by Department</h3>
            <div style={{ height: 420, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <canvas ref={pie2Ref} style={{ width: '100%', height: '100%' }} />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-medium mb-4">Financially Completed Projects by Department</h3>
            <div style={{ height: 420, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <canvas ref={pie3Ref} style={{ width: '100%', height: '100%' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Analytics