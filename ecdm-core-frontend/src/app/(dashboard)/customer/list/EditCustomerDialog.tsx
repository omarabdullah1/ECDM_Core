'use client';
import { useState } from 'react';
import { X, Loader2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogBody } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

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
      onClose();
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || error?.response?.data?.error || 'Failed to update customer';
      toast.error(errorMsg);
      console.error('Update error:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader className="bg-white/50 backdrop-blur-md sticky top-0 z-10">
          <DialogTitle className="text-2xl font-bold tracking-tight text-gray-900">Edit Customer</DialogTitle>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1 font-medium">
            Update vital customer metadata (System-wide Admin Access)
          </p>
        </DialogHeader>

        <DialogBody className="bg-gray-50/30">
          <form id="edit-customer-form" onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
            {/* Row 1: Customer ID + Name */}
            <div className="grid grid-cols-2 gap-6 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="space-y-1.5">
                <label className={labelCls}>
                  Customer ID <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={formData.customerId}
                    onChange={(e) => handleChange('customerId', e.target.value)}
                    placeholder="e.g., CUS-1001"
                    required
                    className="h-10 border-gray-100 bg-gray-50/50"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleGenerateId}
                    disabled={generatingId || saving}
                    title="Generate next available ID"
                    className="shrink-0 h-10 w-10 p-0 rounded-lg"
                  >
                    <RefreshCw className={`h-4 w-4 ${generatingId ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>
                  Name <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Full name"
                  required
                  className="h-10 border-gray-100 bg-gray-50/50"
                />
              </div>
            </div>

            <div className="space-y-6 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Contact & Classification</h4>
              
              {/* Row 2: Phone + Email */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className={labelCls}>
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="+1234567890"
                    required
                    className="h-10 border-gray-100 bg-gray-50/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>Email</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="email@example.com"
                    className="h-10 border-gray-100 bg-gray-50/50"
                  />
                </div>
              </div>

              {/* Row 3: Type + Sector */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className={labelCls}>Type / Source</label>
                  <Select
                    value={formData.type}
                    onChange={(e) => handleChange('type', e.target.value)}
                    className="h-10 border-gray-100 bg-gray-50/50"
                  >
                    {CUSTOMER_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>Sector</label>
                  <Select
                    value={formData.sector}
                    onChange={(e) => handleChange('sector', e.target.value)}
                    className="h-10 border-gray-100 bg-gray-50/50"
                  >
                    {SECTORS.map(sector => (
                      <option key={sector} value={sector}>{sector}</option>
                    ))}
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-6 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Location & Logistics</h4>
              
              {/* Row 4: Company + Region */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className={labelCls}>Company</label>
                  <Input
                    type="text"
                    value={formData.company}
                    onChange={(e) => handleChange('company', e.target.value)}
                    placeholder="Company name"
                    className="h-10 border-gray-100 bg-gray-50/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>Region</label>
                  <Input
                    type="text"
                    value={formData.region}
                    onChange={(e) => handleChange('region', e.target.value)}
                    placeholder="Region/Location"
                    className="h-10 border-gray-100 bg-gray-50/50"
                  />
                </div>
              </div>

              {/* Row 5: Address */}
              <div className="space-y-1.5">
                <label className={labelCls}>Address</label>
                <Input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="Full address"
                  className="h-10 border-gray-100 bg-gray-50/50"
                />
              </div>

              {/* Row 6: Notes */}
              <div className="space-y-1.5">
                <label className={labelCls}>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  className="flex min-h-[100px] w-full rounded-xl border border-gray-100 bg-gray-50/50 px-4 py-3 text-sm shadow-inner transition-all focus-visible:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 font-medium resize-none"
                  placeholder="Additional notes about this customer..."
                  rows={3}
                />
              </div>
            </div>
          </form>
        </DialogBody>

        <DialogFooter className="bg-white/50 backdrop-blur-md border-t border-[hsl(var(--border))]/30">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={saving}
            className="px-6 rounded-xl hover:bg-gray-100 transition-colors"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-customer-form"
            disabled={saving}
            className="px-8 rounded-xl bg-[hsl(var(--primary))] hover:opacity-90 transition-all shadow-md active:scale-95"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
