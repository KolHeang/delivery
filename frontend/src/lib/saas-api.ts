import api from './api';

export interface Plan {
  id: number;
  name: string;
  slug: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  maxUsers: number;
  maxOrdersPerMonth: number;
  maxDrivers: number;
  maxMerchants?: number;
  maxVehicles: number;
  features: Record<string, boolean>;
  isActive: boolean;
  isPopular: boolean;
}

export interface SubscriptionInfo {
  hasSubscription: boolean;
  subscriptionId?: number;
  status: 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired' | 'none';
  billingCycle?: 'monthly' | 'yearly';
  plan?: Plan;
  companyName?: string;
  subdomain?: string;
  customDomain?: string;
  domainStatus?: string;
  dnsInstructions?: any;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  daysRemaining?: number;
  isExpired?: boolean;
  features?: Record<string, boolean>;
  limits?: {
    maxUsers: number;
    maxDrivers: number;
    maxVehicles: number;
    maxOrdersPerMonth: number;
  };
}

export interface CouponValidation {
  valid: boolean;
  coupon: {
    id: number;
    code: string;
    discountType: 'percentage' | 'fixed_amount';
    discountValue: number;
    partner?: {
      id: number;
      name: string;
      referralCode: string;
    };
  };
  subtotal: number;
  discountAmount: number;
  finalAmount: number;
}

export interface SaasInvoice {
  id: number;
  invoiceNumber: string;
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  status: 'pending' | 'paid' | 'draft' | 'failed';
  dueDate: string;
  paidAt?: string;
  createdAt: string;
  subscription?: any;
}

export const saasApi = {
  // Plans
  getPlans: async (all = false, params?: any): Promise<any> => {
    const res = await api.get('/saas/plans', {
      params: { ...(all ? { all: 'true' } : {}), ...params },
    });
    return res.data;
  },

  getPlanById: async (id: number | string): Promise<Plan> => {
    const res = await api.get(`/saas/plans/${id}`);
    return res.data;
  },

  createPlan: async (data: Partial<Plan>): Promise<Plan> => {
    const res = await api.post('/saas/plans', data);
    return res.data;
  },

  updatePlan: async (id: number, data: Partial<Plan>): Promise<Plan> => {
    const res = await api.put(`/saas/plans/${id}`, data);
    return res.data;
  },

  deletePlan: async (id: number) => {
    const res = await api.delete(`/saas/plans/${id}`);
    return res.data;
  },

  // Subscriptions
  getMySubscription: async (): Promise<SubscriptionInfo> => {
    const res = await api.get('/saas/subscriptions/me');
    return res.data;
  },

  getBySubdomain: async (subdomain: string) => {
    const res = await api.get(`/saas/subscriptions/by-subdomain/${subdomain}`);
    return res.data;
  },

  checkout: async (data: {
    planId: number;
    billingCycle: 'monthly' | 'yearly';
    couponCode?: string;
    companyName?: string;
    subdomain?: string;
    customDomain?: string;
  }) => {
    const res = await api.post('/saas/subscriptions/checkout', data);
    return res.data;
  },

  registerAndCheckout: async (data: {
    planId: number;
    billingCycle: 'monthly' | 'yearly';
    couponCode?: string;
    companyName: string;
    subdomain: string;
    customDomain?: string;
    adminName: string;
    email: string;
    phone?: string;
    password?: string;
  }) => {
    const res = await api.post('/saas/subscriptions/register-and-checkout', data);
    return res.data;
  },

  cancelSubscription: async () => {
    const res = await api.post('/saas/subscriptions/cancel');
    return res.data;
  },

  // Coupons
  validateCoupon: async (
    code: string,
    subtotal: number,
  ): Promise<CouponValidation> => {
    const res = await api.post('/saas/coupons/validate', { code, subtotal });
    return res.data;
  },

  getCoupons: async (params?: any) => {
    const res = await api.get('/saas/coupons', { params });
    return res.data;
  },

  createCoupon: async (data: any) => {
    const res = await api.post('/saas/coupons', data);
    return res.data;
  },

  // Invoices & Payments
  getMyInvoices: async (): Promise<SaasInvoice[]> => {
    const res = await api.get('/saas/invoices/my');
    return res.data;
  },

  processPayment: async (data: {
    invoiceId: number;
    paymentMethod: string;
    transactionId?: string;
  }) => {
    const res = await api.post('/saas/payments/checkout-pay', data);
    return res.data;
  },

  // Partner / Affiliate
  getPartnerStats: async () => {
    const res = await api.get('/saas/partners/my-stats');
    return res.data;
  },

  getPartnerByReferral: async (code: string) => {
    const res = await api.get(`/saas/partners/referral/${code}`);
    return res.data;
  },

  // Super Admin
  getAllSubscriptions: async (params?: any) => {
    const res = await api.get('/saas/subscriptions', { params });
    return res.data;
  },

  getAllInvoices: async (params?: any) => {
    const res = await api.get('/saas/invoices', { params });
    return res.data;
  },

  updateInvoiceStatus: async (id: number, status: string) => {
    const res = await api.put(`/saas/invoices/${id}/status`, { status });
    return res.data;
  },

  createInvoice: async (data: any) => {
    const res = await api.post('/saas/invoices', data);
    return res.data;
  },

  createRenewalInvoice: async (data: {
    subscriptionId?: number;
    planId?: number;
    billingCycle?: string;
    totalAmount?: number;
  }) => {
    const res = await api.post('/saas/invoices', data);
    return res.data;
  },

  updateSubscriptionStatus: async (id: number, status: string) => {
    const res = await api.put(`/saas/subscriptions/${id}/status`, { status });
    return res.data;
  },

  getAllPartners: async (params?: any) => {
    const res = await api.get('/saas/partners', { params });
    return res.data;
  },

  createPartner: async (data: any) => {
    const res = await api.post('/saas/partners', data);
    return res.data;
  },

  updatePartner: async (id: number, data: any) => {
    const res = await api.put(`/saas/partners/${id}`, data);
    return res.data;
  },

  deletePartner: async (id: number) => {
    const res = await api.delete(`/saas/partners/${id}`);
    return res.data;
  },

  getAllCommissions: async (params?: any) => {
    const res = await api.get('/saas/commissions', { params });
    return res.data;
  },

  updateCommissionStatus: async (
    id: number,
    status: string,
    payoutReference?: string,
  ) => {
    const res = await api.put(`/saas/commissions/${id}/status`, {
      status,
      payoutReference,
    });
    return res.data;
  },

  // SaaS Platform Master Admins (Dedicated saas_admins table)
  getSaasAdmins: async (params?: any) => {
    const res = await api.get('/saas/admins', { params });
    return res.data;
  },

  createSaasAdmin: async (data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    role?: string;
  }) => {
    const res = await api.post('/saas/admins', data);
    return res.data;
  },

  updateSaasAdmin: async (id: number, data: any) => {
    const res = await api.patch(`/saas/admins/${id}`, data);
    return res.data;
  },

  deleteSaasAdmin: async (id: number) => {
    const res = await api.delete(`/saas/admins/${id}`);
    return res.data;
  },

  // Dynamic Multi-Domain Management (saas_domains)
  resolveDomain: async (domain: string) => {
    const res = await api.get(`/saas/domains/resolve?domain=${encodeURIComponent(domain)}`);
    return res.data;
  },

  getDomains: async (tenantId?: number) => {
    const res = await api.get(`/saas/domains${tenantId ? `?tenantId=${tenantId}` : ''}`);
    return res.data;
  },

  addDomain: async (data: {
    tenantId: number;
    domain: string;
    isPrimary?: boolean;
    domainType?: string;
    dnsTarget?: string;
  }) => {
    const res = await api.post('/saas/domains', data);
    return res.data;
  },

  setPrimaryDomain: async (domainId: number) => {
    const res = await api.patch(`/saas/domains/${domainId}/primary`);
    return res.data;
  },

  verifyDomain: async (domainId: number) => {
    const res = await api.patch(`/saas/domains/${domainId}/verify`);
    return res.data;
  },

  deleteDomain: async (domainId: number) => {
    const res = await api.delete(`/saas/domains/${domainId}`);
    return res.data;
  },

  getSaasAdminById: async (id: number) => {
    const res = await api.get(`/saas/admins/${id}`);
    return res.data;
  },

  deleteTenant: async (id: number) => {
    const res = await api.delete(`/saas/tenants/${id}`);
    return res.data;
  },

  getCouponById: async (id: number) => {
    const res = await api.get(`/saas/coupons/${id}`);
    return res.data;
  },

  updateCoupon: async (id: number, data: any) => {
    const res = await api.put(`/saas/coupons/${id}`, data);
    return res.data;
  },

  deleteCoupon: async (id: number) => {
    const res = await api.delete(`/saas/coupons/${id}`);
    return res.data;
  },

  adminLogin: async (email: string, password: string) => {
    const res = await api.post('/saas/admins/login', { email, password });
    return res.data;
  },
};
