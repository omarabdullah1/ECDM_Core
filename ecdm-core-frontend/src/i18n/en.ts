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
    dashboard: string; marketing: string; marketingLeads: string; marketingData: string;
    sales: string; salesLeads: string; salesData: string; salesOrders: string;
    customer: string; customerOrders: string; customerFollowUp: string; customerFeedback: string;
    operations: string; workOrder: string; inventoryPlus: string; reportOperation: string;
    erpPlatform: string;
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
    update: string; create: string; total: string; select: string; none: string;
    allStatuses: string; allTypes: string; allPlatforms: string;
    phone: string; email: string; address: string; region: string;
    description: string; startDate: string; endDate: string;
    selectCustomer: string; selectEngineer: string;
    cannotUndo: string; prev: string; next: string;
  };
  dashboard: {
    activeClientsCustomers: string; revenueCurrent: string; activeWorkOrders: string;
    lowStockAlerts: string; thisMonth: string; vsLastMonth: string; inProgress: string;
    sparePartsLabel: string; productsLabel: string;
    salesPipelineLeads: string; salesPipelineQuotations: string;
    leadsByStage: string; ordersByQuotation: string; noDataYet: string;
    operationsPunctuality: string; noCompletedOrders: string; workOrdersTracked: string;
    onTime: string; delayed: string;
    marketingCampaigns: string; impressionsVsConversions: string; noActiveCampaigns: string;
    pendingFollowUps: string; unsolvedIssues: string; pending: string; allCaughtUp: string;
    delayedWorkOrders: string; markedLateOpen: string; orders: string;
    noDelayedOrders: string; reasonPrefix: string; late: string;
    daysAgo: string; hoursAgo: string;
    recentFeedback: string; latestRatings: string; noFeedbackYet: string;
    justNow: string; yesterday: string; today: string; inDays: string;
    retry: string; failedLoad: string;
    op: string; cs: string; eng: string; unknown: string; count: string;
    impressionsKey: string; conversionsKey: string;
  };
  pages: {
    clients: {
      title: string; subtitle: string; addBtn: string; company: string; industry: string;
      assignedTo: string; emptyState: string; deleteTitle: string; deleteMsg: string;
      searchPlaceholder: string; companyName: string; noneAssigned: string;
      prospect: string; active: string; inactive: string; churned: string;
    };
    customers: {
      title: string; addBtn: string; ageStatus: string;
      emptyState: string; deleteTitle: string; deleteMsg: string;
      allSectors: string; optionalNotes: string;
      fullName: string; phoneNumber: string;
    };
    salesOrders: {
      title: string; addBtn: string; linkedLead: string; issueDesc: string;
      siteInspection: string; techInspection: string; quotationLink: string;
      emptyState: string; deleteTitle: string; deleteMsg: string;
      noneLead: string;
    };
    salesLeads: {
      title: string; addBtn: string; followUpRequired: string; followUpDate: string;
      emptyState: string; deleteTitle: string; deleteMsg: string;
      allOrderTypes: string; selectSalesPerson: string;
    };
    leads: {
      title: string; subtitle: string; addBtn: string; contact: string;
      company: string; source: string; value: string;
      emptyState: string; deleteTitle: string; deleteMsg: string;
      searchPlaceholder: string; title_: string;
    };
    activities: {
      title: string; subtitle: string; addBtn: string; subject: string;
      duration: string; performedBy: string; relatedClient: string;
      relatedLead: string; emptyState: string; deleteTitle: string; deleteMsg: string;
      searchPlaceholder: string;
    };
    campaigns: {
      title: string; addBtn: string; convRate: string;
      emptyState: string; deleteTitle: string; deleteMsg: string;
      namePlaceholder: string;
    };
    contentTracker: {
      title: string; addBtn: string;
      emptyState: string; deleteTitle: string; deleteMsg: string;
    };
    workOrders: {
      title: string; addBtn: string; assignedEngineer: string; issueDesc: string;
      notSet: string; emptyState: string; deleteTitle: string; deleteMsg: string;
      allOrderTypes: string;
    };
    employees: {
      title: string; subtitle: string; addBtn: string; firstName: string; lastName: string;
      department: string; position: string; hireDate: string;
      emptyState: string; deleteTitle: string; deleteMsg: string;
      searchPlaceholder: string; allDepartments: string;
    };
    employeeEvals: {
      title: string; subtitle: string;
      scoreBanner: string; scoreBannerSub: string;
      allEngineers: string; emptyState: string;
    };
    followUps: {
      title: string; subtitle: string; addBtn: string;
      issueSolved: string; yesSolved: string; noUnresolved: string;
      reasonNotSolving: string; followUpDate: string;
      emptyState: string; deleteTitle: string; deleteMsg: string;
      all: string; solvedLabel: string; unresolvedLabel: string;
      reasonPlaceholder: string; notesPlaceholder: string;
    };
    feedback: {
      title: string; subtitle: string; addBtn: string;
      ratingOp: string; ratingCs: string;
      emptyState: string; deleteTitle: string; deleteMsg: string;
      notesPlaceholder: string;
    };
    inventoryItems: {
      title: string; subtitle: string; addBtn: string; itemName: string;
      stockNumber: string; stockCount: string; supplierDetails: string;
      supplierName: string; supplierPhone: string; supplierAddress: string;
      emptyState: string; deleteTitle: string; deleteMsg: string;
      searchPlaceholder: string;
    };
    products: {
      title: string; subtitle: string; addBtn: string;
      category: string; unitPrice: string; costPrice: string;
      unit: string; initialStock: string; lowStockAlert: string; lowStock: string;
      emptyState: string; deleteTitle: string; deleteMsg: string;
      searchPlaceholder: string;
    };
    categories: {
      title: string; subtitle: string; addBtn: string;
      parentCategory: string; isActive: string; noneRoot: string;
      emptyState: string; deleteTitle: string; deleteMsg: string;
      searchPlaceholder: string;
    };
    stockMovements: {
      title: string; subtitle: string; addBtn: string;
      product: string; quantity: string; reference: string; by: string;
      currentStock: string; selectProduct: string;
      stockIn: string; stockOut: string; adjustment: string;
      emptyState: string; deleteTitle: string; deleteMsg: string;
      deleteNote: string; allProducts: string;
    };
    invoices: {
      title: string; subtitle: string; addBtn: string;
      client: string; dueDate: string; subtotal: string; tax: string;
      totalAmount: string; items: string; itemDesc: string; qty: string;
      unitPrice: string; addItem: string; removeItem: string;
      emptyState: string; deleteTitle: string; deleteMsg: string;
      searchPlaceholder: string; draft: string; sent: string; paid: string;
      overdue: string; cancelled: string;
    };
    tasks: {
      title: string; subtitle: string; addBtn: string;
      titleField: string; priority: string; dueDate: string;
      assignedTo: string; relatedClient: string;
      emptyState: string; deleteTitle: string; deleteMsg: string;
      searchPlaceholder: string; allPriorities: string;
      todo: string; inProgressStatus: string; done: string;
      low: string; medium: string; high: string; urgent: string;
    };
  };
  lang: { en: string; ar: string; };
  theme: { light: string; dark: string; };
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
    marketingLeads: 'Marketing Leads',
    marketingData: 'Marketing Data',
    sales: 'Sales',
    salesLeads: 'Sales Leads',
    salesData: 'Sales Data',
    salesOrders: 'Sales Orders',
    customer: 'Customer',
    customerOrders: 'Customer Orders',
    customerFollowUp: 'Follow-Up',
    customerFeedback: 'Feedback',
    operations: 'Operations',
    workOrder: 'Work Orders',
    inventoryPlus: 'Inventory+',
    reportOperation: 'Performance Reports',
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
    update: 'Update',
    create: 'Create',
    total: 'total',
    select: 'Select…',
    none: '— None —',
    allStatuses: 'All Statuses',
    allTypes: 'All Types',
    allPlatforms: 'All Platforms',
    phone: 'Phone',
    email: 'Email',
    address: 'Address',
    region: 'Region',
    description: 'Description',
    startDate: 'Start Date',
    endDate: 'End Date',
    selectCustomer: 'Select customer…',
    selectEngineer: 'Select engineer…',
    cannotUndo: 'This action cannot be undone.',
    prev: '← Prev',
    next: 'Next →',
  },
  dashboard: {
    activeClientsCustomers: 'Active Clients & Customers',
    revenueCurrent: 'Revenue (Current Month)',
    activeWorkOrders: 'Active Work Orders',
    lowStockAlerts: 'Low Stock Alerts',
    thisMonth: 'this month',
    vsLastMonth: 'vs last month',
    inProgress: 'In Progress',
    sparePartsLabel: 'Spare Parts',
    productsLabel: 'Products',
    salesPipelineLeads: 'Sales Pipeline — Leads',
    salesPipelineQuotations: 'Sales Pipeline — Quotations',
    leadsByStage: 'Leads by current stage',
    ordersByQuotation: 'Orders by quotation status',
    noDataYet: 'No data yet',
    operationsPunctuality: 'Operations Punctuality',
    noCompletedOrders: 'No completed work orders yet',
    workOrdersTracked: 'work orders tracked',
    onTime: 'On-Time',
    delayed: 'Delayed',
    marketingCampaigns: 'Marketing Campaigns',
    impressionsVsConversions: 'Impressions vs Conversions — current campaigns',
    noActiveCampaigns: 'No active campaigns',
    pendingFollowUps: 'Pending Follow-ups',
    unsolvedIssues: 'Unsolved issues needing attention',
    pending: 'pending',
    allCaughtUp: 'All caught up!',
    delayedWorkOrders: 'Delayed Work Orders',
    markedLateOpen: 'Marked late & still open',
    orders: 'orders',
    noDelayedOrders: 'No delayed orders',
    reasonPrefix: 'Reason:',
    late: 'late',
    daysAgo: 'days ago',
    hoursAgo: 'h ago',
    recentFeedback: 'Recent Feedback',
    latestRatings: 'Latest customer ratings',
    noFeedbackYet: 'No feedback yet',
    justNow: 'Just now',
    yesterday: 'Yesterday',
    today: 'Today',
    inDays: 'In',
    retry: 'Retry',
    failedLoad: 'Failed to load dashboard',
    op: 'Op',
    cs: 'CS',
    eng: 'Eng.',
    unknown: 'Unknown',
    count: 'Count',
    impressionsKey: 'Impressions',
    conversionsKey: 'Conversions',
  },
  pages: {
    clients: {
      title: 'Clients',
      subtitle: 'Manage your client portfolio',
      addBtn: 'Add Client',
      company: 'Company',
      industry: 'Industry',
      assignedTo: 'Assigned To',
      emptyState: 'No clients found. Click "Add Client" to create one.',
      deleteTitle: 'Delete Client?',
      deleteMsg: 'This action cannot be undone. The client and all related data will be permanently removed.',
      searchPlaceholder: 'Search clients...',
      companyName: 'Company Name',
      noneAssigned: '— None —',
      prospect: 'Prospect',
      active: 'Active',
      inactive: 'Inactive',
      churned: 'Churned',
    },
    customers: {
      title: 'Customers',
      addBtn: 'Add Customer',
      ageStatus: 'Age Status',
      emptyState: 'No customers found.',
      deleteTitle: 'Delete Customer',
      deleteMsg: 'Are you sure? This action cannot be undone.',
      allSectors: 'All Sectors',
      optionalNotes: 'Optional notes',
      fullName: 'Full name',
      phoneNumber: 'Phone number',
    },
    salesOrders: {
      title: 'Sales Orders',
      addBtn: 'New Order',
      linkedLead: 'Linked Sales Lead',
      issueDesc: 'Issue Description',
      siteInspection: 'Site Inspection Date',
      techInspection: 'Technical Inspection',
      quotationLink: 'Quotation Number / Link',
      emptyState: 'No orders found',
      deleteTitle: 'Delete Sales Order?',
      deleteMsg: 'This action cannot be undone.',
      noneLead: 'None',
    },
    salesLeads: {
      title: 'Sales Leads',
      addBtn: 'New Lead',
      followUpRequired: 'Follow-Up Required',
      followUpDate: 'Follow-Up Date',
      emptyState: 'No leads found',
      deleteTitle: 'Delete Lead?',
      deleteMsg: 'This action cannot be undone.',
      allOrderTypes: 'All Order Types',
      selectSalesPerson: 'Select sales person…',
    },
    leads: {
      title: 'Leads',
      subtitle: 'Track and convert sales leads',
      addBtn: 'Add Lead',
      contact: 'Contact',
      company: 'Company',
      source: 'Source',
      value: 'Value',
      emptyState: 'No leads found.',
      deleteTitle: 'Delete Lead?',
      deleteMsg: 'This action cannot be undone.',
      searchPlaceholder: 'Search leads...',
      title_: 'Title',
    },
    activities: {
      title: 'Activities',
      subtitle: 'Track calls, emails, meetings and notes',
      addBtn: 'Log Activity',
      subject: 'Subject',
      duration: 'Duration',
      performedBy: 'Performed By',
      relatedClient: 'Related Client',
      relatedLead: 'Related Lead',
      emptyState: 'No activities found.',
      deleteTitle: 'Delete Activity?',
      deleteMsg: 'This action cannot be undone.',
      searchPlaceholder: 'Search activities...',
    },
    campaigns: {
      title: 'Campaigns',
      addBtn: 'New Campaign',
      convRate: 'Conv.%',
      emptyState: 'No campaigns found',
      deleteTitle: 'Delete Campaign?',
      deleteMsg: 'This action cannot be undone.',
      namePlaceholder: 'e.g. Q1 Google Ads',
    },
    contentTracker: {
      title: 'Content Tracker',
      addBtn: 'New Content',
      emptyState: 'No content found',
      deleteTitle: 'Delete Content?',
      deleteMsg: 'This action cannot be undone.',
    },
    workOrders: {
      title: 'Work Orders',
      addBtn: 'New Work Order',
      assignedEngineer: 'Assigned Engineer',
      issueDesc: 'Issue Description',
      notSet: 'Not set',
      emptyState: 'No work orders found',
      deleteTitle: 'Delete Work Order?',
      deleteMsg: 'This action cannot be undone.',
      allOrderTypes: 'All Order Types',
    },
    employees: {
      title: 'Employees',
      subtitle: 'Manage your team',
      addBtn: 'Add Employee',
      firstName: 'First Name',
      lastName: 'Last Name',
      department: 'Department',
      position: 'Position',
      hireDate: 'Hire Date',
      emptyState: 'No employees found.',
      deleteTitle: 'Delete Employee?',
      deleteMsg: 'This cannot be undone.',
      searchPlaceholder: 'Search...',
      allDepartments: 'All Departments',
    },
    employeeEvals: {
      title: 'Employee Evaluations',
      subtitle: 'evaluation records — auto-computed from Work Orders & Feedback',
      scoreBanner: 'Punctuality 30% + Completion 30% + Task Quality 40% = Overall Score',
      scoreBannerSub: 'Task Quality auto-updates when Feedback is submitted',
      allEngineers: 'All Engineers',
      emptyState: 'No evaluations yet — they are generated automatically',
    },
    followUps: {
      title: 'Follow-Ups',
      subtitle: 'Post-service customer follow-up calls',
      addBtn: '+ New Follow-Up',
      issueSolved: 'Issue Solved?',
      yesSolved: 'Yes — Solved',
      noUnresolved: 'No — Unresolved',
      reasonNotSolving: 'Reason for Not Solving',
      followUpDate: 'Follow-Up Date',
      emptyState: 'No follow-ups found.',
      deleteTitle: 'Delete Follow-Up?',
      deleteMsg: 'This action cannot be undone.',
      all: 'All',
      solvedLabel: 'Solved',
      unresolvedLabel: 'Unresolved',
      reasonPlaceholder: 'Explain why…',
      notesPlaceholder: 'Call notes…',
    },
    feedback: {
      title: 'Feedback',
      subtitle: 'Post-service quality ratings · auto-updates EmployeeEvaluation',
      addBtn: '+ New Feedback',
      ratingOp: 'Rating — Operation Quality (1–5)',
      ratingCs: 'Rating — Customer Service (1–5)',
      emptyState: 'No feedback found.',
      deleteTitle: 'Delete Feedback?',
      deleteMsg: 'This action cannot be undone.',
      notesPlaceholder: 'Customer comments…',
    },
    inventoryItems: {
      title: 'Inventory Items',
      subtitle: 'Spare parts & stock management',
      addBtn: '+ New Item',
      itemName: 'Item Name',
      stockNumber: 'Stock Number (SKU)',
      stockCount: 'Stock Count',
      supplierDetails: 'Supplier Details',
      supplierName: 'Supplier Name',
      supplierPhone: 'Phone',
      supplierAddress: 'Address',
      emptyState: 'No items found.',
      deleteTitle: 'Delete Item?',
      deleteMsg: 'This action cannot be undone.',
      searchPlaceholder: 'Search items…',
    },
    products: {
      title: 'Products',
      subtitle: 'Product catalog & stock levels',
      addBtn: 'Add Product',
      category: 'Category',
      unitPrice: 'Unit Price',
      costPrice: 'Cost Price',
      unit: 'Unit',
      initialStock: 'Initial Stock',
      lowStockAlert: 'Low Stock Alert',
      lowStock: 'Low Stock',
      emptyState: 'No products found.',
      deleteTitle: 'Delete Product?',
      deleteMsg: 'This cannot be undone.',
      searchPlaceholder: 'Search products...',
    },
    categories: {
      title: 'Categories',
      subtitle: 'Organize your product catalog',
      addBtn: 'New Category',
      parentCategory: 'Parent Category',
      isActive: 'Active',
      noneRoot: '— None (Root) —',
      emptyState: 'No categories found.',
      deleteTitle: 'Delete Category?',
      deleteMsg: 'This cannot be undone.',
      searchPlaceholder: 'Search categories...',
    },
    stockMovements: {
      title: 'Stock Movements',
      subtitle: 'Track stock in/out operations',
      addBtn: 'Record Movement',
      product: 'Product',
      quantity: 'Quantity',
      reference: 'Reference',
      by: 'By',
      currentStock: 'Current Stock',
      selectProduct: '— Select product —',
      stockIn: 'Stock In (+)',
      stockOut: 'Stock Out (-)',
      adjustment: 'Adjustment (=)',
      emptyState: 'No movements recorded.',
      deleteTitle: 'Delete Movement?',
      deleteMsg: 'Note: This will NOT reverse the stock change.',
      deleteNote: 'Note: This will NOT reverse the stock change.',
      allProducts: 'All Products',
    },
    invoices: {
      title: 'Invoices',
      subtitle: 'Manage billing & payments',
      addBtn: 'New Invoice',
      client: 'Client',
      dueDate: 'Due Date',
      subtotal: 'Subtotal',
      tax: 'Tax %',
      totalAmount: 'Total',
      items: 'Items',
      itemDesc: 'Description',
      qty: 'Qty',
      unitPrice: 'Unit Price',
      addItem: '+ Add Item',
      removeItem: 'Remove',
      emptyState: 'No invoices found.',
      deleteTitle: 'Delete Invoice?',
      deleteMsg: 'This action cannot be undone.',
      searchPlaceholder: 'Search invoices...',
      draft: 'Draft',
      sent: 'Sent',
      paid: 'Paid',
      overdue: 'Overdue',
      cancelled: 'Cancelled',
    },
    tasks: {
      title: 'Tasks',
      subtitle: 'Manage team tasks & assignments',
      addBtn: 'New Task',
      titleField: 'Title',
      priority: 'Priority',
      dueDate: 'Due Date',
      assignedTo: 'Assigned To',
      relatedClient: 'Related Client',
      emptyState: 'No tasks found.',
      deleteTitle: 'Delete Task?',
      deleteMsg: 'This action cannot be undone.',
      searchPlaceholder: 'Search tasks...',
      allPriorities: 'All Priorities',
      todo: 'To-do',
      inProgressStatus: 'In Progress',
      done: 'Done',
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      urgent: 'Urgent',
    },
  },
  lang: {
    en: 'English',
    ar: 'العربية',
  },
  theme: {
    light: 'Light',
    dark: 'Dark',
  },
};

export default en;
