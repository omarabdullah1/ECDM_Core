'use client';
import { useState } from 'react';
import { X, Loader2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';

/**
 * Edit Customer Dialog - Admin Only
 * 
 * Allows Admins to edit ALL customer fields, including customerId.
 * This dialog is only accessible to SuperAdmin and Manager roles.
 */

interface Customer {
  _id: string;
  customerId: string;
  name: string;
  phone: string;
  type: string;
  sector: string;
  email?: string;
  company?: string;
  address?: string;
  region?: string;
  notes?: string;
}

interface EditCustomerDialogProps {
  customer: Customer;
  onClose: () => void;
  onSuccess: () => void;
}

// Available options
const CUSTOMER_TYPES = [
  'Google', 'Facebook', 'Instagram', 'TikTok', 'Snapchat', 
  'WhatsApp', 'Website', 'Referral', 'Cold Call', 'Exhibition', 
  'Direct', 'Other'
];

const SECTORS = ['B2B', 'B2C', 'B2G', 'Hybrid', 'Other'];

// Styling constants
const iCls = 'w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-3 text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 transition-all';
const labelCls = 'text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-1.5 block';

export default function EditCustomerDialog({ customer, onClose, onSuccess }: EditCustomerDialogProps) {
  const [saving, setSaving] = useState(false);
  const [generatingId, setGeneratingId] = useState(false);
  const [formData, setFormData] = useState({
    customerId: customer.customerId || '',
    name: customer.name || '',
    phone: customer.phone || '',
    type: customer.type || 'Other',
    sector: customer.sector || 'Other',
    email: customer.email || '',
    company: customer.company || '',
    address: customer.address || '',
    region: customer.region || '',
    notes: customer.notes || '',
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  /**
   * Smart Auto-Increment: Fetch next available Customer ID from backend
   * Uses mathematical analysis to prevent duplicate key errors
   */
  const handleGenerateId = async () => {
    setGeneratingId(true);
    try {
      const response = await api.get('/shared/customers/next-id');
      const nextId = response.data.data.nextId;
      setFormData(prev => ({ ...prev, customerId: nextId }));
      toast.success(`Generated ID: ${nextId}`);
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || 'Failed to generate ID';
      toast.error(errorMsg);
      console.error('Generate ID error:', error);
    } finally {
      setGeneratingId(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.name.trim()) {
      toast.error('Customer name is required');
      return;
    }
    if (!formData.phone.trim()) {
      toast.error('Phone number is required');
      return;
    }
    if (!formData.customerId.trim()) {
      toast.error('Customer ID is required');
      return;
    }

    setSaving(true);
    try {
      await api.put(`/shared/customers/${customer._id}`, formData);
      toast.success('Customer updated successfully');
      onSuccess();
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || error?.response?.data?.error || 'Failed to update customer';
      toast.error(errorMsg);
      console.error('Update error:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[hsl(var(--card))] border-b border-[hsl(var(--border))] px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Edit Customer</h2>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                Update customer information (Admin only)
              </p>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-[hsl(var(--muted))] rounded-lg transition-colors"
              disabled={saving}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Row 1: Customer ID + Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>
                Customer ID <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.customerId}
                  onChange={(e) => handleChange('customerId', e.target.value)}
                  className={iCls}
                  placeholder="e.g., CUS-1001"
                  required
                />
                <button
                  type="button"
                  onClick={handleGenerateId}
                  disabled={generatingId || saving}
                  className="px-3 py-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--secondary))]/80 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  title="Generate next available ID"
                >
                  <RefreshCw className={`h-4 w-4 ${generatingId ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                Must be unique across all customers
              </p>
            </div>
            <div>
              <label className={labelCls}>
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className={iCls}
                placeholder="Full name"
                required
              />
            </div>
          </div>

          {/* Row 2: Phone + Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className={iCls}
                placeholder="+1234567890"
                required
              />
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                Primary unique identifier
              </p>
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className={iCls}
                placeholder="email@example.com"
              />
            </div>
          </div>

          {/* Row 3: Type + Sector */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Type / Source</label>
              <select
                value={formData.type}
                onChange={(e) => handleChange('type', e.target.value)}
                className={iCls}
              >
                {CUSTOMER_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Sector</label>
              <select
                value={formData.sector}
                onChange={(e) => handleChange('sector', e.target.value)}
                className={iCls}
              >
                {SECTORS.map(sector => (
                  <option key={sector} value={sector}>{sector}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 4: Company + Region */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Company</label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => handleChange('company', e.target.value)}
                className={iCls}
                placeholder="Company name"
              />
            </div>
            <div>
              <label className={labelCls}>Region</label>
              <input
                type="text"
                value={formData.region}
                onChange={(e) => handleChange('region', e.target.value)}
                className={iCls}
                placeholder="Region/Location"
              />
            </div>
          </div>

          {/* Row 5: Address */}
          <div>
            <label className={labelCls}>Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              className={iCls}
              placeholder="Full address"
            />
          </div>

          {/* Row 6: Notes */}
          <div>
            <label className={labelCls}>Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              className={iCls}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[hsl(var(--border))]">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl border border-[hsl(var(--border))] text-sm font-medium hover:bg-[hsl(var(--muted))] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-[hsl(var(--primary))] text-white text-sm font-medium hover:bg-[hsl(var(--primary))]/90 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
