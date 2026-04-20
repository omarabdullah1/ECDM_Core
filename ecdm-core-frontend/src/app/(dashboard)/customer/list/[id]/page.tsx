'use client';
import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/axios';
import {
  ArrowLeft,
  User,
  DollarSign,
  MapPin,
  ShoppingCart,
  Wrench,
  MessageSquare,
  CheckCircle,
  Phone,
  Mail,
  Building,
  Search,
  Printer,
  Calendar,
  FileText,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────────
interface Customer {
  _id: string;
  customerId: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  address?: string;
  type: string;
  sector: string;
  createdAt: string;
}

interface SalesOrder {
  _id: string;
  salesOrderId: string;
  issueDescription: string;
  typeOfOrder: string;
  orderStatus: string;
  quotationStatus?: string;
  finalStatus?: string;
  siteInspectionDate?: string;
  createdAt: string;
}

interface CustomerOrder {
  _id: string;
  salesOrderId: string;
  typeOfOrder: string;
  issue: string;
  scheduledVisitDate?: string;
  actualVisitDate?: string;
  engineerName: string;
  deal: string;
  cost: number;
  devicePickupType: string;
  notes?: string;
  createdAt: string;
}

interface WorkOrder {
  _id: string;
  customerOrderId: string;
  maintenanceEngineer: string;
  taskDate?: string;
  startMaintenanceDate?: string;
  endMaintenanceDate?: string;
  punctuality: string;
  taskCompleted: string;
  rating?: string;
  notes?: string;
  createdAt: string;
}

interface FollowUp {
  _id: string;
  status: string;
  followUpDate: string;
  solvedIssue: string;
  punctuality?: string;
  reasonForDelay?: string;
  notes?: string;
  createdAt: string;
}

interface Feedback {
  _id: string;
  solvedIssue: string;
  ratingOperation?: string;
  ratingCustomerService?: string;
  followUp: string;
  notes?: string;
  createdAt: string;
}

interface KPIs {
  totalSpent: number;
  totalVisits: number;
  totalOrders: number;
  totalWorkOrders: number;
  totalFollowUps: number;
  totalFeedbacks: number;
}

interface CustomerReport {
  customer: Customer;
  kpis: KPIs;
  history: {
    salesOrders: SalesOrder[];
    customerOrders: CustomerOrder[];
    workOrders: WorkOrder[];
    followUps: FollowUp[];
    feedbacks: Feedback[];
  };
}

// ─── Tab Type ───────────────────────────────────────────────────────────────────
type TabKey = 'operations' | 'financials' | 'sales' | 'followups' | 'feedbacks';

export default function CustomerReportPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;

  const [report, setReport] = useState<CustomerReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('operations');
  
  // Filters
  const [opsSearch, setOpsSearch] = useState('');
  const [finSearch, setFinSearch] = useState('');

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get(`/shared/customers/${customerId}/report`);
        setReport(data.data);
      } catch (err) {
        setError('Failed to load customer report.');
        console.error(err);
      }
      setLoading(false);
    };

    if (customerId) {
      fetchReport();
    }
  }, [customerId]);

  // ─── Format date helper ─────────────────────────────────────────────────────
  const formatDate = (d?: string) => {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return '—';
    }
  };

  const formatCurrency = (val: number) =>
    val.toLocaleString('en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 });

  // ─── Filtered operations data ─────────────────────────────────────────────────
  const filteredOperations = useMemo(() => {
    if (!report) return [];
    const merged = report.history.customerOrders.map((co) => {
      const wo = report.history.workOrders.find(
        (w) => w.customerOrderId === co._id
      );
      return { ...co, workOrder: wo };
    });
    if (!opsSearch.trim()) return merged;
    const term = opsSearch.toLowerCase();
    return merged.filter(
      (item) =>
        item.issue?.toLowerCase().includes(term) ||
        item.engineerName?.toLowerCase().includes(term) ||
        formatDate(item.actualVisitDate || item.scheduledVisitDate).includes(term)
    );
  }, [report, opsSearch]);

  // ─── Filtered financials data ─────────────────────────────────────────────────
  const filteredFinancials = useMemo(() => {
    if (!report) return [];
    const data = report.history.customerOrders.filter((co) => co.cost > 0);
    if (!finSearch.trim()) return data;
    const term = finSearch.toLowerCase();
    return data.filter(
      (item) =>
        item.issue?.toLowerCase().includes(term) ||
        formatDate(item.createdAt).includes(term)
    );
  }, [report, finSearch]);

  // ─── Print Invoice ────────────────────────────────────────────────────────────
  const printInvoice = (order: CustomerOrder) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${report?.customer.customerId}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { margin: 0; font-size: 24px; }
          .header p { margin: 5px 0; color: #666; }
          .details { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .details-section { flex: 1; }
          .details-section h3 { margin: 0 0 10px; font-size: 14px; color: #666; text-transform: uppercase; }
          .details-section p { margin: 5px 0; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background: #f5f5f5; font-weight: 600; }
          .total { text-align: right; font-size: 18px; font-weight: bold; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 40px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>ECDM Core Invoice</h1>
          <p>Invoice Date: ${formatDate(order.createdAt)}</p>
        </div>
        <div class="details">
          <div class="details-section">
            <h3>Customer</h3>
            <p><strong>${report?.customer.name}</strong></p>
            <p>${report?.customer.phone}</p>
            ${report?.customer.email ? `<p>${report.customer.email}</p>` : ''}
            ${report?.customer.address ? `<p>${report.customer.address}</p>` : ''}
          </div>
          <div class="details-section" style="text-align: right;">
            <h3>Order Details</h3>
            <p>Customer ID: ${report?.customer.customerId}</p>
            <p>Order Type: ${order.typeOfOrder || 'N/A'}</p>
            <p>Visit Date: ${formatDate(order.actualVisitDate || order.scheduledVisitDate)}</p>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Engineer</th>
              <th>Status</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${order.issue || 'Service'}</td>
              <td>${order.engineerName || 'N/A'}</td>
              <td>${order.deal || 'N/A'}</td>
              <td style="text-align: right;">${formatCurrency(order.cost)}</td>
            </tr>
          </tbody>
        </table>
        <div class="total">
          Total: ${formatCurrency(order.cost)}
        </div>
        <div class="footer">
          <p>Thank you for your business!</p>
          <p>ECDM Core - Engineering & Maintenance Solutions</p>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // ─── Render ─────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-[hsl(var(--muted-foreground))]">Loading customer report…</div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="text-red-500">{error || 'Report not found.'}</div>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[hsl(var(--primary))] text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Go Back
        </button>
      </div>
    );
  }

  const { customer, kpis, history } = report;

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'operations', label: 'Operations & Visits', count: history.customerOrders.length },
    { key: 'financials', label: 'Financials', count: history.customerOrders.filter((o) => o.cost > 0).length },
    { key: 'sales', label: 'Sales Orders', count: history.salesOrders.length },
    { key: 'followups', label: 'Follow-Ups', count: history.followUps.length },
    { key: 'feedbacks', label: 'Feedbacks', count: history.feedbacks.length },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in-slide stagger-1">
        <div className="flex items-center gap-4">
          <Link
            href="/customer/list"
            className="p-2 rounded-xl border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <User className="h-6 w-6 text-[hsl(var(--primary))]" />
              {customer.name}
            </h1>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {customer.customerId} • Customer 360° Report
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-[hsl(var(--muted-foreground))]">
          <span className="flex items-center gap-1">
            <Phone className="h-4 w-4" /> {customer.phone}
          </span>
          {customer.email && (
            <span className="flex items-center gap-1">
              <Mail className="h-4 w-4" /> {customer.email}
            </span>
          )}
          {customer.company && (
            <span className="flex items-center gap-1">
              <Building className="h-4 w-4" /> {customer.company}
            </span>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard icon={<DollarSign />} label="Total Spent" value={formatCurrency(kpis.totalSpent)} color="green" />
        <KPICard icon={<MapPin />} label="Total Visits" value={kpis.totalVisits.toString()} color="blue" />
        <KPICard icon={<ShoppingCart />} label="Sales Orders" value={kpis.totalOrders.toString()} color="purple" />
        <KPICard icon={<Wrench />} label="Work Orders" value={kpis.totalWorkOrders.toString()} color="orange" />
        <KPICard icon={<CheckCircle />} label="Follow-Ups" value={kpis.totalFollowUps.toString()} color="cyan" />
        <KPICard icon={<MessageSquare />} label="Feedbacks" value={kpis.totalFeedbacks.toString()} color="pink" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[hsl(var(--border))] pb-2 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-t-xl text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'bg-[hsl(var(--primary))] text-white'
                : 'bg-[hsl(var(--muted))] hover:bg-[hsl(var(--muted))]/80'
            }`}
          >
            {tab.label} <span className="ml-1 text-xs opacity-70">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] p-4">
        {/* Operations & Visits Tab */}
        {activeTab === 'operations' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                <input
                  type="text"
                  placeholder="Search by issue, engineer, date…"
                  value={opsSearch}
                  onChange={(e) => setOpsSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm"
                />
              </div>
            </div>
            <div className="w-full overflow-x-auto custom-table-scrollbar">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[hsl(var(--border))]">
                    <th className="text-left py-3 px-2 font-semibold">Visit Date</th>
                    <th className="text-left py-3 px-2 font-semibold">Engineer</th>
                    <th className="text-left py-3 px-2 font-semibold">Issue</th>
                    <th className="text-left py-3 px-2 font-semibold">Status</th>
                    <th className="text-left py-3 px-2 font-semibold">Cost</th>
                    <th className="text-left py-3 px-2 font-semibold">Work Order</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOperations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-[hsl(var(--muted-foreground))]">
                        No operations found.
                      </td>
                    </tr>
                  ) : (
                    filteredOperations.map((item) => (
                      <tr key={item._id} className="border-b border-[hsl(var(--border))]/50 hover:bg-[hsl(var(--muted))]/30">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
                            {formatDate(item.actualVisitDate || item.scheduledVisitDate)}
                          </div>
                        </td>
                        <td className="py-3 px-2">{item.engineerName || '—'}</td>
                        <td className="py-3 px-2 max-w-[200px] truncate" title={item.issue}>
                          {item.issue || '—'}
                        </td>
                        <td className="py-3 px-2">
                          <StatusBadge status={item.deal} />
                        </td>
                        <td className="py-3 px-2 font-medium">{formatCurrency(item.cost)}</td>
                        <td className="py-3 px-2">
                          {item.workOrder ? (
                            <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-600">
                              {item.workOrder.taskCompleted || 'Assigned'}
                            </span>
                          ) : (
                            <span className="text-xs text-[hsl(var(--muted-foreground))]">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Financials Tab */}
        {activeTab === 'financials' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                <input
                  type="text"
                  placeholder="Search by issue or date…"
                  value={finSearch}
                  onChange={(e) => setFinSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm"
                />
              </div>
            </div>
            <div className="w-full overflow-x-auto custom-table-scrollbar">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[hsl(var(--border))]">
                    <th className="text-left py-3 px-2 font-semibold">Order Date</th>
                    <th className="text-left py-3 px-2 font-semibold">Order Type</th>
                    <th className="text-left py-3 px-2 font-semibold">Service/Issue</th>
                    <th className="text-left py-3 px-2 font-semibold">Cost</th>
                    <th className="text-left py-3 px-2 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFinancials.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-[hsl(var(--muted-foreground))]">
                        No financial records found.
                      </td>
                    </tr>
                  ) : (
                    filteredFinancials.map((item) => (
                      <tr key={item._id} className="border-b border-[hsl(var(--border))]/50 hover:bg-[hsl(var(--muted))]/30">
                        <td className="py-3 px-2">{formatDate(item.createdAt)}</td>
                        <td className="py-3 px-2">{item.typeOfOrder || '—'}</td>
                        <td className="py-3 px-2 max-w-[200px] truncate" title={item.issue}>
                          {item.issue || '—'}
                        </td>
                        <td className="py-3 px-2 font-semibold text-green-600">{formatCurrency(item.cost)}</td>
                        <td className="py-3 px-2">
                          <button
                            onClick={() => printInvoice(item)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/20"
                          >
                            <Printer className="h-3.5 w-3.5" /> Print Invoice
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {filteredFinancials.length > 0 && (
              <div className="flex justify-end border-t border-[hsl(var(--border))] pt-4">
                <div className="text-right">
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(filteredFinancials.reduce((sum, o) => sum + o.cost, 0))}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sales Orders Tab */}
        {activeTab === 'sales' && (
          <div className="w-full overflow-x-auto custom-table-scrollbar">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[hsl(var(--border))]">
                  <th className="text-left py-3 px-2 font-semibold">Order ID</th>
                  <th className="text-left py-3 px-2 font-semibold">Type</th>
                  <th className="text-left py-3 px-2 font-semibold">Issue Description</th>
                  <th className="text-left py-3 px-2 font-semibold">Status</th>
                  <th className="text-left py-3 px-2 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {history.salesOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-[hsl(var(--muted-foreground))]">
                      No sales orders found.
                    </td>
                  </tr>
                ) : (
                  history.salesOrders.map((order) => (
                    <tr key={order._id} className="border-b border-[hsl(var(--border))]/50 hover:bg-[hsl(var(--muted))]/30">
                      <td className="py-3 px-2 font-mono text-xs text-[hsl(var(--primary))]">
                        {order.salesOrderId}
                      </td>
                      <td className="py-3 px-2">{order.typeOfOrder || '—'}</td>
                      <td className="py-3 px-2 max-w-[250px] truncate" title={order.issueDescription}>
                        {order.issueDescription}
                      </td>
                      <td className="py-3 px-2">
                        <StatusBadge status={order.orderStatus} />
                      </td>
                      <td className="py-3 px-2">{formatDate(order.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Follow-Ups Tab */}
        {activeTab === 'followups' && (
          <div className="w-full overflow-x-auto custom-table-scrollbar">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[hsl(var(--border))]">
                  <th className="text-left py-3 px-2 font-semibold">Follow-Up Date</th>
                  <th className="text-left py-3 px-2 font-semibold">Status</th>
                  <th className="text-left py-3 px-2 font-semibold">Solved Issue</th>
                  <th className="text-left py-3 px-2 font-semibold">Punctuality</th>
                  <th className="text-left py-3 px-2 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody>
                {history.followUps.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-[hsl(var(--muted-foreground))]">
                      No follow-ups found.
                    </td>
                  </tr>
                ) : (
                  history.followUps.map((fu) => (
                    <tr key={fu._id} className="border-b border-[hsl(var(--border))]/50 hover:bg-[hsl(var(--muted))]/30">
                      <td className="py-3 px-2">{formatDate(fu.followUpDate)}</td>
                      <td className="py-3 px-2">
                        <StatusBadge status={fu.status} />
                      </td>
                      <td className="py-3 px-2">
                        {fu.solvedIssue === 'Yes' ? (
                          <span className="text-green-600 font-medium">Yes</span>
                        ) : fu.solvedIssue === 'No' ? (
                          <span className="text-red-500 font-medium">No</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 px-2">{fu.punctuality || '—'}</td>
                      <td className="py-3 px-2 max-w-[200px] truncate" title={fu.notes}>
                        {fu.notes || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Feedbacks Tab */}
        {activeTab === 'feedbacks' && (
          <div className="w-full overflow-x-auto custom-table-scrollbar">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[hsl(var(--border))]">
                  <th className="text-left py-3 px-2 font-semibold">Date</th>
                  <th className="text-left py-3 px-2 font-semibold">Solved Issue</th>
                  <th className="text-left py-3 px-2 font-semibold">Operation Rating</th>
                  <th className="text-left py-3 px-2 font-semibold">Service Rating</th>
                  <th className="text-left py-3 px-2 font-semibold">Needs Follow-Up</th>
                  <th className="text-left py-3 px-2 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody>
                {history.feedbacks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-[hsl(var(--muted-foreground))]">
                      No feedbacks found.
                    </td>
                  </tr>
                ) : (
                  history.feedbacks.map((fb) => (
                    <tr key={fb._id} className="border-b border-[hsl(var(--border))]/50 hover:bg-[hsl(var(--muted))]/30">
                      <td className="py-3 px-2">{formatDate(fb.createdAt)}</td>
                      <td className="py-3 px-2">
                        {fb.solvedIssue === 'Yes' ? (
                          <span className="text-green-600 font-medium">Yes</span>
                        ) : fb.solvedIssue === 'No' ? (
                          <span className="text-red-500 font-medium">No</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 px-2">{fb.ratingOperation || '—'}</td>
                      <td className="py-3 px-2">{fb.ratingCustomerService || '—'}</td>
                      <td className="py-3 px-2">
                        {fb.followUp === 'Yes' ? (
                          <span className="text-orange-500 font-medium">Yes</span>
                        ) : fb.followUp === 'No' ? (
                          <span className="text-green-600 font-medium">No</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 px-2 max-w-[200px] truncate" title={fb.notes}>
                        {fb.notes || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── KPI Card Component ─────────────────────────────────────────────────────────
function KPICard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'green' | 'blue' | 'purple' | 'orange' | 'cyan' | 'pink';
}) {
  const colorClasses = {
    green: 'bg-green-500/10 text-green-600',
    blue: 'bg-blue-500/10 text-blue-600',
    purple: 'bg-purple-500/10 text-purple-600',
    orange: 'bg-orange-500/10 text-orange-600',
    cyan: 'bg-cyan-500/10 text-cyan-600',
    pink: 'bg-pink-500/10 text-pink-600',
  };

  return (
    <div className="p-4 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colorClasses[color]}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-[hsl(var(--muted-foreground))]">{label}</p>
    </div>
  );
}

// ─── Status Badge Component ─────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const getStatusColor = (s: string) => {
    const normalized = s?.toLowerCase() || '';
    if (['completed', 'done', 'approved', 'yes', 'accepted'].some((k) => normalized.includes(k)))
      return 'bg-green-500/10 text-green-600';
    if (['pending', 'in progress', 'inprogress'].some((k) => normalized.includes(k)))
      return 'bg-yellow-500/10 text-yellow-600';
    if (['rejected', 'cancelled', 'failed', 'no'].some((k) => normalized.includes(k)))
      return 'bg-red-500/10 text-red-600';
    return 'bg-gray-500/10 text-gray-600';
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
      {status || '—'}
    </span>
  );
}
