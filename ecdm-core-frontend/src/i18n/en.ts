export interface Translations {
  auth: {
    welcomeBack: string; signInContinue: string; email: string; password: string;
    showPassword: string; hidePassword: string; signIn: string; signingIn: string;
    noAccount: string; createAccount: string; branding: string;
    register: {
      title: string; subtitle: string; firstName: string; lastName: string;
      joinTitle: string; branding: string; alreadyAccount: string; signIn: string; creating: string;
    };
  };
  nav: {
    dashboard: string; marketing: string; campaigns: string; contentTracker: string;
    crmSales: string; customers: string; salesLeads: string; salesOrders: string;
    operations: string; workOrders: string; employeeEvaluations: string; employees: string;
    customerService: string; followUps: string; feedback: string;
    inventory: string; spareParts: string; products: string; categories: string; stock: string;
    finance: string; invoices: string; tasks: string; erpPlatform: string;
  };
  header: { search: string; signOut: string; };
  common: {
    save: string; cancel: string; delete: string; edit: string; add: string;
    search: string; loading: string; saving: string; noData: string; actions: string;
    notes: string; status: string; name: string; date: string; yes: string; no: string;
    confirm: string; confirmDelete: string; page: string; of: string; new: string;
    reason: string; customer: string; engineer: string; type: string; platform: string;
    budget: string; dates: string; revenue: string; impressions: string; conversions: string;
    sector: string; postDate: string; salesPerson: string; orderType: string; followUp: string;
    issue: string; quotationNo: string; quotationStatus: string; finalStatus: string;
    siteDate: string; siteVisit: string; punctuality: string; period: string;
    completed: string; returned: string; completionRate: string; returnRate: string;
    quality: string; overall: string; sku: string; stock: string; price: string; supplier: string;
    solved: string; csr: string; workOrder: string; opRating: string; csRating: string;
    punctualityPct: string; newRecord: string; deleteConfirmTitle: string;
  };
  lang: { en: string; ar: string; };
}

const en: Translations = {
  auth: {
    welcomeBack: 'Welcome back',
    signInContinue: 'Sign in to your account to continue',
    email: 'Email',
    password: 'Password',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    signIn: 'Sign In',
    signingIn: 'Signing in…',
    noAccount: "Don't have an account?",
    createAccount: 'Create account',
    branding: 'Enterprise ERP & CRM platform — manage clients, leads, tasks, and your entire workforce from one unified dashboard.',
    register: {
      title: 'Create Account',
      subtitle: 'Fill in your details to get started',
      firstName: 'First Name',
      lastName: 'Last Name',
      joinTitle: 'Join ECDM Core',
      branding: 'Create your account to start managing your business with an integrated ERP & CRM platform.',
      alreadyAccount: 'Already have an account?',
      signIn: 'Sign in',
      creating: 'Creating…',
    },
  },
  nav: {
    dashboard: 'Dashboard',
    marketing: 'Marketing',
    campaigns: 'Campaigns',
    contentTracker: 'Content Tracker',
    crmSales: 'CRM & Sales',
    customers: 'Customers',
    salesLeads: 'Sales Leads',
    salesOrders: 'Sales Orders',
    operations: 'Operations',
    workOrders: 'Work Orders',
    employeeEvaluations: 'Employee Evaluations',
    employees: 'Employees',
    customerService: 'Customer Service',
    followUps: 'Follow-Ups',
    feedback: 'Feedback',
    inventory: 'Inventory',
    spareParts: 'Spare Parts',
    products: 'Products',
    categories: 'Categories',
    stock: 'Stock',
    finance: 'Finance',
    invoices: 'Invoices',
    tasks: 'Tasks',
    erpPlatform: 'ERP & CRM Platform',
  },
  header: {
    search: 'Search anything…',
    signOut: 'Sign out',
  },
  common: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    search: 'Search…',
    loading: 'Loading…',
    saving: 'Saving…',
    noData: 'No records found',
    actions: 'Actions',
    notes: 'Notes',
    status: 'Status',
    name: 'Name',
    date: 'Date',
    yes: 'Yes',
    no: 'No',
    confirm: 'Confirm',
    confirmDelete: 'Are you sure you want to delete this record? This cannot be undone.',
    page: 'Page',
    of: 'of',
    new: 'New',
    reason: 'Reason / Notes',
    customer: 'Customer',
    engineer: 'Engineer',
    type: 'Type',
    platform: 'Platform',
    budget: 'Budget',
    dates: 'Dates',
    revenue: 'Revenue',
    impressions: 'Impressions',
    conversions: 'Conv.%',
    sector: 'Sector',
    postDate: 'Post Date',
    salesPerson: 'Sales Person',
    orderType: 'Order Type',
    followUp: 'Follow-Up',
    issue: 'Issue',
    quotationNo: 'Quotation #',
    quotationStatus: 'Q. Status',
    finalStatus: 'Final',
    siteDate: 'Inspection Date',
    siteVisit: 'Site Visit',
    punctuality: 'Punctuality',
    period: 'Period',
    completed: 'Completed',
    returned: 'Returned',
    completionRate: 'Completion %',
    returnRate: 'Return %',
    quality: 'Quality /5',
    overall: 'Overall %',
    sku: 'SKU',
    stock: 'Stock',
    price: 'Price',
    supplier: 'Supplier',
    solved: 'Solved?',
    csr: 'CSR',
    workOrder: 'Work Order',
    opRating: 'Op Rating',
    csRating: 'CS Rating',
    punctualityPct: 'Punctuality %',
    newRecord: '+ New',
    deleteConfirmTitle: 'Delete Record',
  },
  lang: {
    en: 'English',
    ar: 'العربية',
  },
};

export default en;
