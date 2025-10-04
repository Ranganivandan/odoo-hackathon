// API Configuration and Base Setup
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'manager' | 'employee';
  company: Company;
  manager?: User;
  isManagerApprover?: boolean;
  isActive?: boolean;
  monthlyBudget?: number;
  budgetCurrency?: string;
  budgetAlertThreshold?: number;
  lastLogin?: string;
  createdAt?: string;
}

export interface Company {
  id: string;
  name: string;
  country: string;
  currency: string;
  currencySymbol: string;
  settings?: {
    expenseCategories: ExpenseCategory[];
  };
}

export interface ExpenseCategory {
  _id?: string;
  name: string;
  description: string;
  isActive: boolean;
}

export interface Expense {
  _id: string;
  employee: User;
  company: Company;
  amount: number;
  currency: string;
  amountInCompanyCurrency: number;
  exchangeRate: number;
  category: string;
  description: string;
  expenseDate: string;
  receipt?: {
    filename: string;
    originalName: string;
    path: string;
    mimeType: string;
    size: number;
  };
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  currentApprover?: User;
  approvalSequence: ApprovalStep[];
  finalApproval?: {
    approvedBy?: User;
    approvedAt?: string;
    rejectedBy?: User;
    rejectedAt?: string;
    finalComments?: string;
  };
  tags: string[];
  isUrgent?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalStep {
  approver: User;
  sequence: number;
  status: 'pending' | 'approved' | 'rejected';
  comments?: string;
  approvedAt?: string;
  rejectedAt?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

// Auth Token Management
export const authToken = {
  get: () => localStorage.getItem('authToken'),
  set: (token: string) => localStorage.setItem('authToken', token),
  remove: () => localStorage.removeItem('authToken'),
};

// User Management
export const currentUser = {
  get: () => {
    const user = localStorage.getItem('currentUser');
    return user ? JSON.parse(user) : null;
  },
  set: (user: User) => localStorage.setItem('currentUser', JSON.stringify(user)),
  remove: () => localStorage.removeItem('currentUser'),
};

// API Request Helper
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = authToken.get();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || 'Request failed');
    }

    return data;
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
}

// Multipart Form Data Request Helper
async function apiFormRequest<T>(
  endpoint: string,
  formData: FormData
): Promise<ApiResponse<T>> {
  const token = authToken.get();
  
  const headers: HeadersInit = {
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || 'Request failed');
    }

    return data;
  } catch (error) {
    console.error('API Form Request Error:', error);
    throw error;
  }
}

// Authentication APIs
export const authApi = {
  register: async (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    country: string;
  }) => {
    const response = await apiRequest<{ user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    if (response.data?.token) {
      authToken.set(response.data.token);
      currentUser.set(response.data.user);
    }
    
    return response;
  },

  login: async (email: string, password: string) => {
    const response = await apiRequest<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (response.data?.token) {
      authToken.set(response.data.token);
      currentUser.set(response.data.user);
    }
    
    return response;
  },

  logout: async () => {
    await apiRequest('/auth/logout', { method: 'POST' });
    authToken.remove();
    currentUser.remove();
  },

  getProfile: async () => {
    return apiRequest<{ user: User }>('/auth/profile');
  },

  updateProfile: async (data: { firstName: string; lastName: string }) => {
    return apiRequest<{ user: User }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    return apiRequest('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },
};

// User Management APIs
export const userApi = {
  getAll: async () => {
    return apiRequest<{ users: User[] }>('/users');
  },

  getById: async (id: string) => {
    return apiRequest<{ user: User }>(`/users/${id}`);
  },

  create: async (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: 'admin' | 'manager' | 'employee';
    manager?: string;
    isManagerApprover?: boolean;
  }) => {
    return apiRequest<{ user: User }>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: Partial<User>) => {
    return apiRequest<{ user: User }>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string) => {
    return apiRequest(`/users/${id}`, { method: 'DELETE' });
  },

  getTeamMembers: async () => {
    return apiRequest<{ users: User[] }>('/users/team/members');
  },

  getManagers: async () => {
    return apiRequest<{ managers: User[] }>('/users/managers/list');
  },

  updateBudget: async (id: string, data: {
    monthlyBudget: number;
    budgetCurrency?: string;
    budgetAlertThreshold?: number;
  }) => {
    return apiRequest<{ user: User }>(`/users/${id}/budget`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  getAnalytics: async (id: string) => {
    return apiRequest<any>(`/users/${id}/analytics`);
  },
};

// Expense APIs
export const expenseApi = {
  create: async (formData: FormData) => {
    return apiFormRequest<{ expense: Expense }>('/expenses', formData);
  },

  getMyExpenses: async () => {
    return apiRequest<{ expenses: Expense[] }>('/expenses/my-expenses');
  },

  getPendingApprovals: async () => {
    return apiRequest<{ expenses: Expense[] }>('/expenses/pending-approval');
  },

  getHistory: async (filters?: { status?: string; category?: string; employeeId?: string; startDate?: string; endDate?: string }) => {
    const params = new URLSearchParams(filters as any).toString();
    return apiRequest<{ expenses: Expense[] }>(`/expenses/history${params ? '?' + params : ''}`);
  },

  getAll: async () => {
    return apiRequest<{ expenses: Expense[] }>('/expenses');
  },

  getById: async (id: string) => {
    return apiRequest<{ expense: Expense }>(`/expenses/${id}`);
  },

  update: async (id: string, data: Partial<Expense>) => {
    return apiRequest<{ expense: Expense }>(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  cancel: async (id: string) => {
    return apiRequest(`/expenses/${id}/cancel`, { method: 'PUT' });
  },

  getStats: async (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    return apiRequest<{
      summary: {
        totalExpenses: number;
        totalAmount: number;
        pendingCount: number;
        approvedCount: number;
        rejectedCount: number;
        pendingAmount: number;
        approvedAmount: number;
      };
      categoryBreakdown: Array<{
        _id: string;
        count: number;
        totalAmount: number;
      }>;
    }>(`/expenses/stats/summary?${params.toString()}`);
  },
};

// Approval APIs
export const approvalApi = {
  approveOrReject: async (
    id: string,
    action: 'approve' | 'reject',
    comments?: string
  ) => {
    return apiRequest<{ expense: Expense }>(`/approvals/${id}/action`, {
      method: 'PUT',
      body: JSON.stringify({ action, comments }),
    });
  },

  getHistory: async (id: string) => {
    return apiRequest<{ history: ApprovalStep[] }>(`/approvals/${id}/history`);
  },

  override: async (id: string, action: 'approve' | 'reject', comments?: string) => {
    return apiRequest<{ expense: Expense }>(`/approvals/${id}/override`, {
      method: 'PUT',
      body: JSON.stringify({ action, comments }),
    });
  },

  getPendingCount: async () => {
    return apiRequest<{ count: number }>('/approvals/pending/count');
  },

  bulkAction: async (
    expenseIds: string[],
    action: 'approve' | 'reject',
    comments?: string
  ) => {
    return apiRequest('/approvals/bulk-action', {
      method: 'PUT',
      body: JSON.stringify({ expenseIds, action, comments }),
    });
  },
};

// Company APIs
export const companyApi = {
  get: async () => {
    return apiRequest<{ company: Company }>('/companies');
  },

  update: async (data: Partial<Company>) => {
    return apiRequest<{ company: Company }>('/companies', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  getCategories: async () => {
    return apiRequest<{ categories: ExpenseCategory[] }>('/companies/categories');
  },

  addCategory: async (data: { name: string; description: string }) => {
    return apiRequest<{ category: ExpenseCategory }>('/companies/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateCategory: async (id: string, data: Partial<ExpenseCategory>) => {
    return apiRequest<{ category: ExpenseCategory }>(`/companies/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteCategory: async (id: string) => {
    return apiRequest(`/companies/categories/${id}`, { method: 'DELETE' });
  },
};

// Currency APIs
export const currencyApi = {
  getCountries: async () => {
    return apiRequest<{
      countries: Array<{
        name: string;
        currency: string;
        currencyName: string;
        symbol: string;
      }>;
    }>('/currencies/countries');
  },

  getActive: async () => {
    return apiRequest('/currencies/active');
  },

  getRates: async (baseCurrency: string) => {
    return apiRequest(`/currencies/rates/${baseCurrency}`);
  },

  convert: async (amount: number, fromCurrency: string, toCurrency: string) => {
    return apiRequest<{
      convertedAmount: number;
      exchangeRate: number;
    }>('/currencies/convert', {
      method: 'POST',
      body: JSON.stringify({ amount, fromCurrency, toCurrency }),
    });
  },
};

// OCR APIs (Gemini + Cloudinary)
export const ocrApi = {
  // New Gemini OCR endpoint - auto-fills expense fields
  extractReceipt: async (file: File) => {
    const formData = new FormData();
    formData.append('receipt', file); // Changed from 'image' to 'receipt'
    return apiFormRequest<{
      description: string;
      amount: number;
      currency: string;
      expenseDate: string;
      category: string;
      receipt: {
        url: string;
        publicId: string;
      };
      ocrData: {
        merchant: string;
        extractedAmount: number;
        extractedCurrency: string;
        extractedDate: string;
        lineItems: Array<{
          description: string;
          quantity: number;
          price: number;
        }>;
        taxAmount: number;
        tipAmount: number;
        confidence: number;
        rawText: string;
        validation: {
          isValid: boolean;
          errors: string[];
          warnings: string[];
        };
        usedFallback: boolean;
        extractedAt: string;
      };
    }>('/ocr/extract-receipt', formData);
  },

  // Batch extract multiple receipts
  batchExtract: async (files: File[]) => {
    const formData = new FormData();
    files.forEach(file => formData.append('receipts', file));
    return apiFormRequest<{
      results: Array<{
        filename: string;
        success: boolean;
        data?: any;
        error?: string;
      }>;
    }>('/ocr/batch-extract', formData);
  },

  // Get OCR service status
  getStatus: async () => {
    return apiRequest<{
      geminiOCR: boolean;
      cloudinary: boolean;
      cache: any;
      supportedFormats: string[];
      maxFileSize: string;
      features: any;
    }>('/ocr/status');
  },

  // Legacy endpoints (deprecated - use extractReceipt instead)
  extractText: async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    return apiFormRequest<{ text: string; confidence: number }>('/ocr/extract-text', formData);
  },

  extractReceiptData: async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    return apiFormRequest<{
      extractedAmount?: number;
      extractedDate?: string;
      extractedMerchant?: string;
      extractedCategory?: string;
      confidence: number;
    }>('/ocr/extract-receipt-data', formData);
  },
};

// Analytics APIs
export const analyticsApi = {
  getDashboard: async (period: string = 'all') => {
    return apiRequest<any>(`/analytics/dashboard?period=${period}`);
  },
};

// Approval Rule Types
export interface ApprovalRule {
  _id: string;
  name: string;
  description?: string;
  type: 'percentage' | 'specific_approver' | 'hybrid' | 'sequential';
  conditions: {
    percentage?: number;
    specificApprovers?: User[];
    hybrid?: {
      percentage: number;
      specificApprovers: User[];
    };
    sequential?: Array<{
      approver: User;
      sequence: number;
      isRequired: boolean;
    }>;
  };
  amountThreshold: {
    minAmount: number;
    maxAmount: number;
  };
  categoryFilter: string[];
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

// Approval Rule APIs
export const approvalRuleApi = {
  getAll: async () => {
    return apiRequest<{ rules: ApprovalRule[] }>('/companies/approval-rules');
  },

  getById: async (id: string) => {
    return apiRequest<{ rule: ApprovalRule }>(`/companies/approval-rules/${id}`);
  },

  create: async (data: {
    name: string;
    description?: string;
    type: 'percentage' | 'specific_approver' | 'hybrid' | 'sequential';
    conditions: {
      percentage?: number;
      specificApprovers?: string[];
      hybrid?: {
        percentage: number;
        specificApprovers: string[];
      };
      sequential?: Array<{
        approver: string;
        sequence: number;
        isRequired: boolean;
      }>;
    };
    amountThreshold?: {
      minAmount?: number;
      maxAmount?: number;
    };
    categoryFilter?: string[];
    priority?: number;
  }) => {
    return apiRequest<{ rule: ApprovalRule }>('/companies/approval-rules', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: {
    name?: string;
    description?: string;
    type?: 'percentage' | 'specific_approver' | 'hybrid' | 'sequential';
    conditions?: {
      percentage?: number;
      specificApprovers?: string[];
      hybrid?: {
        percentage: number;
        specificApprovers: string[];
      };
      sequential?: Array<{
        approver: string;
        sequence: number;
        isRequired: boolean;
      }>;
    };
    amountThreshold?: {
      minAmount?: number;
      maxAmount?: number;
    };
    categoryFilter?: string[];
    priority?: number;
    isActive?: boolean;
  }) => {
    return apiRequest<{ rule: ApprovalRule }>(`/companies/approval-rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string) => {
    return apiRequest(`/companies/approval-rules/${id}`, { method: 'DELETE' });
  },
};

// Health Check
export const healthApi = {
  check: async () => {
    return apiRequest<{ status: string; timestamp: string; uptime: number }>('/health');
  },
};
