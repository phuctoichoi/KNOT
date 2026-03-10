import MainLayout from '@/components/layout/MainLayout'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, LineChart, Line, CartesianGrid, XAxis, YAxis } from 'recharts'
import api from '@/services/api'
import { BarChart2 } from 'lucide-react'

const PIE_COLORS = ['#EF4444', '#3B82F6', '#F97316', '#10B981', '#8B5CF6', '#EC4899', '#14B8A6']

export default function StatsPage() {
    const { t } = useTranslation()

    const { data: byType = [] } = useQuery({ queryKey: ['public', 'by-type'], queryFn: async () => { const { data } = await api.get('/analytics/public/reports/by-type'); return data } })
    const { data: trend = [] } = useQuery({ queryKey: ['public', 'trend'], queryFn: async () => { const { data } = await api.get('/analytics/public/reports/trend'); return data } })

    const emptyPie = [{ name: t('common.no_data', 'Chưa có dữ liệu'), count: 1, type: 'empty' }]
    const totalReportsByType = byType.reduce((acc: number, curr: any) => acc + curr.count, 0)
    const pieData = byType.length > 0
        ? byType.map((d: any) => ({ ...d, name: t(`report.type.${d.type}`, d.type) }))
        : emptyPie

    const formatDateStr = (dateStr: string) => {
        if (!dateStr || dateStr === '--') return '--'
        const [month, day] = dateStr.split('-')
        return `${day}/${month}`
    }

    const lineData = trend.length > 0
        ? trend.map((d: any) => ({ ...d, day: formatDateStr(d.period?.slice(5, 10)) }))
        : [{ day: '--', count: 0 }]

    return (
        <MainLayout>
            <div className="page-container py-8">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400">
                        <BarChart2 size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Thống kê hệ thống</h1>
                        <p className="text-gray-400">Dữ liệu tổng quan về các hoạt động báo cáo trên nền tảng KNOT</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                    <div className="card border-gray-800 bg-gray-900/60 backdrop-blur-md">
                        <h3 className="font-semibold text-white mb-6 text-center">{t('admin.reports_by_type', 'Báo cáo theo loại thiên tai')}</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    dataKey="count"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    label={byType.length > 0 ? (e: any) => {
                                        const percent = ((e.count / totalReportsByType) * 100).toFixed(0)
                                        return `${e.name} (${percent}%)`
                                    } : undefined}
                                    stroke="none"
                                >
                                    {pieData.map((d: any, i: number) => (
                                        <Cell key={i} fill={d.type !== 'empty' ? PIE_COLORS[i % PIE_COLORS.length] : '#374151'} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: number, name: string) => [value, name]}
                                    contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.9)', borderColor: '#374151', borderRadius: '8px', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                        {byType.length === 0 && <p className="text-center text-gray-600 text-sm -mt-8 relative z-10">{t('common.no_data', 'Chưa có dữ liệu')}</p>}
                    </div>

                    <div className="card border-gray-800 bg-gray-900/60 backdrop-blur-md">
                        <h3 className="font-semibold text-white mb-6 text-center">{t('admin.report_trend', 'Xu hướng báo cáo (90 ngày)')}</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={lineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                <XAxis dataKey="day" stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 12 }} tickLine={false} axisLine={false} dy={10} />
                                <YAxis allowDecimals={false} stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 12 }} tickLine={false} axisLine={false} dx={-10} />
                                <Tooltip
                                    labelFormatter={(label) => `${t('common.date', 'Ngày')}: ${label}`}
                                    formatter={(value: number) => [value, t('dashboard.stats.report_count', 'Số lượng báo cáo')]}
                                    contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.95)', borderColor: '#374151', borderRadius: '8px', color: '#fff', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)' }}
                                    itemStyle={{ color: '#EF4444', fontWeight: 'bold' }}
                                    cursor={{ stroke: '#4B5563', strokeWidth: 1, strokeDasharray: '4 4' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="count"
                                    name={t('dashboard.stats.report_count', 'Số lượng báo cáo')}
                                    stroke="#EF4444"
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: '#111827', strokeWidth: 2, stroke: '#EF4444' }}
                                    activeDot={{ r: 6, fill: '#EF4444', strokeWidth: 0 }}
                                    animationDuration={1500}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                        {trend.length === 0 && <p className="text-center text-gray-600 text-sm -mt-8 relative z-10">{t('common.no_data', 'Chưa có dữ liệu')}</p>}
                    </div>
                </div>
            </div>
        </MainLayout>
    )
}
