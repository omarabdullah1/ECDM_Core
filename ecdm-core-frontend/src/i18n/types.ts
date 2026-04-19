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
    contentTracker: string; campaignResults: string;
    sales: string; salesLeads: string; salesData: string; salesFollowUps: string; salesOrders: string;
    customer: string; customersList: string; customerOrders: string; customerFollowUp: string; customerFeedback: string;
    finance: string; invoices: string; orderFinance: string; generalExpenses: string; salaries: string;

    operations: string; workOrder: string; priceList: string; reportOperation: string;
    hr: string; hrEmployees: string; hrAttendance: string;
    rnd: string; personalBoard: string; rndProjects: string; myPerformance: string;
    administration: string; userManagement: string; modificationRequests: string; auditLogs: string; netProfitReport: string;
    salesInsights: string; marketingInsights: string;
    erpPlatform: string;
    nonPotential: string;
  };
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
  header: {
    search: string;
    signOut: string;
  };
  lang: { en: string; ar: string; };
  theme: { light: string; dark: string; };
}
