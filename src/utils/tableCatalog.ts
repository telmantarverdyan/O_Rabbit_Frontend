export interface ColumnInfo {
  name: string;
  type: string;
  isPk?: boolean;
  isRecommendedCursor?: boolean;
  nullable?: boolean;
}

export interface TableCatalogEntry {
  name: string;
  rowsEstimate: number;
  sizeBytes: number;
  columns: ColumnInfo[];
  sampleRows: any[][];
  description: string;
}

export const REAL_TABLE_CATALOG: Record<string, TableCatalogEntry> = {
  orders: {
    name: 'orders',
    rowsEstimate: 1940250,
    sizeBytes: 246850000,
    description: 'E-Commerce order headers and fulfillment status',
    columns: [
      { name: 'order_id', type: 'BIGINT', isPk: true, isRecommendedCursor: true },
      { name: 'customer_id', type: 'BIGINT', nullable: false },
      { name: 'order_number', type: 'VARCHAR(32)', nullable: false },
      { name: 'total_amount', type: 'DECIMAL(12,2)', nullable: false },
      { name: 'currency', type: 'VARCHAR(3)', nullable: false },
      { name: 'status', type: 'VARCHAR(24)', nullable: false },
      { name: 'shipping_city', type: 'VARCHAR(64)', nullable: true },
      { name: 'payment_method', type: 'VARCHAR(32)', nullable: true },
      { name: 'created_at', type: 'TIMESTAMPTZ', isRecommendedCursor: true },
      { name: 'updated_at', type: 'TIMESTAMPTZ', isRecommendedCursor: true },
    ],
    sampleRows: [
      ['5001201', '10842', 'ORD-2026-9921', 349.50, 'USD', 'DELIVERED', 'San Francisco', 'STRIPE_CC', '2026-08-31T08:14:22Z', '2026-08-31T14:20:00Z'],
      ['5001202', '24910', 'ORD-2026-9922', 1299.00, 'EUR', 'PROCESSING', 'Berlin', 'SEPA_DEBIT', '2026-08-31T09:05:10Z', '2026-08-31T09:05:10Z'],
      ['5001203', '38192', 'ORD-2026-9923', 89.95, 'USD', 'SHIPPED', 'New York', 'APPLE_PAY', '2026-08-31T09:42:30Z', '2026-08-31T11:15:22Z'],
      ['5001204', '49102', 'ORD-2026-9924', 450.00, 'GBP', 'DELIVERED', 'London', 'STRIPE_CC', '2026-08-31T10:18:45Z', '2026-08-31T16:30:10Z'],
      ['5001205', '15201', 'ORD-2026-9925', 24.50, 'USD', 'CANCELLED', 'Austin', 'PAYPAL', '2026-08-31T11:00:12Z', '2026-08-31T11:04:19Z'],
      ['5001206', '67190', 'ORD-2026-9926', 2150.00, 'USD', 'PROCESSING', 'Seattle', 'WIRE_TRANSFER', '2026-08-31T11:32:00Z', '2026-08-31T11:32:00Z'],
      ['5001207', '89123', 'ORD-2026-9927', 185.20, 'EUR', 'DELIVERED', 'Paris', 'STRIPE_CC', '2026-08-31T12:10:40Z', '2026-08-31T18:00:00Z'],
      ['5001208', '94102', 'ORD-2026-9928', 620.00, 'USD', 'SHIPPED', 'Chicago', 'GOOGLE_PAY', '2026-08-31T12:55:18Z', '2026-08-31T14:40:05Z'],
    ],
  },
  transactions: {
    name: 'transactions',
    rowsEstimate: 4820100,
    sizeBytes: 580200000,
    description: 'Financial ledger transactions & settlement records',
    columns: [
      { name: 'tx_id', type: 'UUID', isPk: true, isRecommendedCursor: true },
      { name: 'account_id', type: 'BIGINT', nullable: false },
      { name: 'amount', type: 'DECIMAL(18,4)', nullable: false },
      { name: 'fee', type: 'DECIMAL(8,4)', nullable: false },
      { name: 'tx_type', type: 'VARCHAR(24)', nullable: false },
      { name: 'status', type: 'VARCHAR(16)', nullable: false },
      { name: 'destination_iban', type: 'VARCHAR(34)', nullable: true },
      { name: 'timestamp', type: 'TIMESTAMPTZ', isRecommendedCursor: true },
    ],
    sampleRows: [
      ['a18f9210-4819-42b1-912a-89a01f82c191', '1004921', 4500.0000, 2.5000, 'TRANSFER', 'SETTLED', 'DE89370400440532013000', '2026-08-31T14:01:22Z'],
      ['b29e8102-5920-43c2-823b-90b12e93d202', '2049102', 120.5000, 0.2500, 'PAYMENT', 'SETTLED', 'GB29NWBK60161331926819', '2026-08-31T14:02:45Z'],
      ['c30d7093-6031-44d3-734c-01c23f04e313', '3910281', 89000.0000, 15.0000, 'WIRE', 'PENDING', 'FR7630006000011234567890189', '2026-08-31T14:05:10Z'],
      ['d41c6184-7142-45e4-645d-12d34a15f424', '1004921', 34.9000, 0.0000, 'REFUND', 'SETTLED', 'DE89370400440532013000', '2026-08-31T14:07:33Z'],
      ['e52b5275-8253-46f5-556e-23e45b26a535', '4819203', 1250.0000, 1.0000, 'TRANSFER', 'SETTLED', 'CH9300762011623852957', '2026-08-31T14:10:00Z'],
      ['f63a4366-9364-47a6-467f-34f56c37b646', '5920194', 450.0000, 0.5000, 'PAYMENT', 'SETTLED', 'US64SVBKUS6S3300958879', '2026-08-31T14:12:18Z'],
      ['07493457-0475-48b7-378a-45a67d48c757', '6031285', 15.0000, 0.1000, 'FEE', 'SETTLED', null, '2026-08-31T14:15:02Z'],
      ['18582548-1586-49c8-289b-56b78e59d868', '7142396', 3200.0000, 3.0000, 'TRANSFER', 'FAILED', 'ES9121000418450200051332', '2026-08-31T14:18:40Z'],
    ],
  },
  users: {
    name: 'users',
    rowsEstimate: 680240,
    sizeBytes: 84500000,
    description: 'System user identity and profile credentials',
    columns: [
      { name: 'id', type: 'BIGINT', isPk: true, isRecommendedCursor: true },
      { name: 'email', type: 'VARCHAR(255)', nullable: false },
      { name: 'username', type: 'VARCHAR(64)', nullable: false },
      { name: 'full_name', type: 'VARCHAR(120)', nullable: true },
      { name: 'status', type: 'VARCHAR(16)', nullable: false },
      { name: 'subscription_tier', type: 'VARCHAR(24)', nullable: false },
      { name: 'created_at', type: 'TIMESTAMPTZ', isRecommendedCursor: true },
      { name: 'last_login_at', type: 'TIMESTAMPTZ', isRecommendedCursor: true },
    ],
    sampleRows: [
      ['1001', 'telman@orabbit.io', 'telmant', 'Telman Tarverdyan', 'ACTIVE', 'ENTERPRISE', '2026-01-15T09:00:00Z', '2026-08-31T15:12:00Z'],
      ['1002', 'alice.m@lakehouse.dev', 'alicem', 'Alice Miller', 'ACTIVE', 'GROWTH', '2026-02-01T10:14:00Z', '2026-08-31T14:20:00Z'],
      ['1003', 'bob.dev@altinity.com', 'bobdev', 'Bob Developer', 'ACTIVE', 'ENTERPRISE', '2026-02-12T11:45:00Z', '2026-08-31T13:45:00Z'],
      ['1004', 'charlie@clickhouse.com', 'charliec', 'Charlie Click', 'ACTIVE', 'GROWTH', '2026-03-05T14:30:00Z', '2026-08-31T12:05:00Z'],
      ['1005', 'diana.k@datastream.io', 'dianak', 'Diana Knight', 'SUSPENDED', 'STARTER', '2026-03-20T08:15:00Z', '2026-08-25T11:10:00Z'],
      ['1006', 'edward.s@fastmail.com', 'edwards', 'Edward Scott', 'ACTIVE', 'ENTERPRISE', '2026-04-02T16:00:00Z', '2026-08-31T11:30:00Z'],
      ['1007', 'fiona.g@iceberg.apache.org', 'fionag', 'Fiona Green', 'ACTIVE', 'GROWTH', '2026-04-18T12:45:00Z', '2026-08-31T09:15:00Z'],
      ['1008', 'george.b@postgres.org', 'georgeb', 'George Brown', 'ACTIVE', 'STARTER', '2026-05-10T15:20:00Z', '2026-08-30T18:40:00Z'],
    ],
  },
  payments: {
    name: 'payments',
    rowsEstimate: 2310000,
    sizeBytes: 310800000,
    description: 'Payment gateway intents, captures, and authorization codes',
    columns: [
      { name: 'payment_id', type: 'VARCHAR(64)', isPk: true, isRecommendedCursor: true },
      { name: 'order_id', type: 'BIGINT', nullable: false },
      { name: 'provider', type: 'VARCHAR(32)', nullable: false },
      { name: 'amount', type: 'DECIMAL(12,2)', nullable: false },
      { name: 'currency', type: 'VARCHAR(3)', nullable: false },
      { name: 'status', type: 'VARCHAR(24)', nullable: false },
      { name: 'card_last4', type: 'VARCHAR(4)', nullable: true },
      { name: 'auth_code', type: 'VARCHAR(32)', nullable: true },
      { name: 'captured_at', type: 'TIMESTAMPTZ', isRecommendedCursor: true },
    ],
    sampleRows: [
      ['pay_99201481920', '5001201', 'STRIPE', 349.50, 'USD', 'CAPTURED', '4242', 'AUTH_99182', '2026-08-31T08:14:25Z'],
      ['pay_99201481921', '5001202', 'ADYEN', 1299.00, 'EUR', 'AUTHORIZED', null, 'AUTH_99183', '2026-08-31T09:05:15Z'],
      ['pay_99201481922', '5001203', 'APPLE_PAY', 89.95, 'USD', 'CAPTURED', '8812', 'AUTH_99184', '2026-08-31T09:42:35Z'],
      ['pay_99201481923', '5001204', 'STRIPE', 450.00, 'GBP', 'CAPTURED', '1109', 'AUTH_99185', '2026-08-31T10:18:50Z'],
      ['pay_99201481924', '5001205', 'PAYPAL', 24.50, 'USD', 'REFUNDED', null, 'AUTH_99186', '2026-08-31T11:00:15Z'],
      ['pay_99201481925', '5001206', 'BANK_WIRE', 2150.00, 'USD', 'PENDING', null, 'AUTH_99187', '2026-08-31T11:32:05Z'],
      ['pay_99201481926', '5001207', 'STRIPE', 185.20, 'EUR', 'CAPTURED', '3341', 'AUTH_99188', '2026-08-31T12:10:45Z'],
      ['pay_99201481927', '5001208', 'GOOGLE_PAY', 620.00, 'USD', 'CAPTURED', '5520', 'AUTH_99189', '2026-08-31T12:55:22Z'],
    ],
  },
  audit_logs: {
    name: 'audit_logs',
    rowsEstimate: 12450000,
    sizeBytes: 1480000000,
    description: 'System-wide compliance and security event logs',
    columns: [
      { name: 'log_id', type: 'BIGINT', isPk: true, isRecommendedCursor: true },
      { name: 'actor_id', type: 'VARCHAR(64)', nullable: false },
      { name: 'action', type: 'VARCHAR(64)', nullable: false },
      { name: 'resource', type: 'VARCHAR(128)', nullable: false },
      { name: 'ip_address', type: 'INET', nullable: true },
      { name: 'status_code', type: 'INT', nullable: false },
      { name: 'recorded_at', type: 'TIMESTAMPTZ', isRecommendedCursor: true },
    ],
    sampleRows: [
      ['9001001', 'user_1001', 'IAM_ROLE_BIND', 'dataset/transactions', '192.168.1.45', 200, '2026-08-31T14:10:02Z'],
      ['9001002', 'worker_node_2', 'TASK_LEASE_ACQUIRE', 'task/task-99120', '10.0.4.12', 200, '2026-08-31T14:10:05Z'],
      ['9001003', 'user_1004', 'ICEBERG_SNAPSHOT_COMMIT', 'raw/orders', '192.168.1.18', 200, '2026-08-31T14:10:12Z'],
      ['9001004', 'api_gateway', 'AUTH_TOKEN_GENERATE', 'service/orabbit-master', '10.0.0.1', 200, '2026-08-31T14:10:18Z'],
      ['9001005', 'user_1002', 'QUERY_EXECUTE', 'iceberg.default.users', '172.16.8.99', 200, '2026-08-31T14:10:25Z'],
      ['9001006', 'admin_sys', 'DRAIN_WORKER_INIT', 'worker/worker-03', '127.0.0.1', 200, '2026-08-31T14:10:30Z'],
      ['9001007', 'user_1005', 'LOGIN_FAILED', 'auth/ldap', '45.33.32.156', 401, '2026-08-31T14:10:35Z'],
      ['9001008', 'worker_node_1', 'PARQUET_S3_FLUSH', 's3://lakehouse/raw/orders', '10.0.4.11', 200, '2026-08-31T14:10:42Z'],
    ],
  },
  events: {
    name: 'events',
    rowsEstimate: 18200000,
    sizeBytes: 2150000000,
    description: 'High-volume product analytics clickstream events',
    columns: [
      { name: 'event_id', type: 'UUID', isPk: true, isRecommendedCursor: true },
      { name: 'session_id', type: 'VARCHAR(64)', nullable: false },
      { name: 'user_id', type: 'BIGINT', nullable: true },
      { name: 'event_name', type: 'VARCHAR(64)', nullable: false },
      { name: 'url_path', type: 'VARCHAR(255)', nullable: false },
      { name: 'client_os', type: 'VARCHAR(32)', nullable: true },
      { name: 'timestamp', type: 'TIMESTAMPTZ', isRecommendedCursor: true },
    ],
    sampleRows: [
      ['e101-8491-4921-912a', 'sess_99182', '1001', 'PAGE_VIEW', '/dashboard/overview', 'macOS', '2026-08-31T14:20:00Z'],
      ['e102-8492-4922-912b', 'sess_99182', '1001', 'BUTTON_CLICK', '/dashboard/runs', 'macOS', '2026-08-31T14:20:15Z'],
      ['e103-8493-4923-912c', 'sess_10293', '1004', 'QUERY_RUN', '/query-console', 'Linux', '2026-08-31T14:20:22Z'],
      ['e104-8494-4924-912d', 'sess_49102', '1002', 'EXPORT_CSV', '/datasets', 'Windows', '2026-08-31T14:20:30Z'],
      ['e105-8495-4925-912e', 'sess_88291', '1006', 'PAGE_VIEW', '/workers', 'macOS', '2026-08-31T14:20:45Z'],
      ['e106-8496-4926-912f', 'sess_77192', null, 'PAGE_VIEW', '/login', 'iOS', '2026-08-31T14:21:00Z'],
      ['e107-8497-4927-9120', 'sess_33910', '1007', 'SETTINGS_UPDATE', '/settings', 'Android', '2026-08-31T14:21:10Z'],
      ['e108-8498-4928-9121', 'sess_99182', '1001', 'COMPACTION_TRIGGER', '/maintenance', 'macOS', '2026-08-31T14:21:25Z'],
    ],
  },
  inventory: {
    name: 'inventory',
    rowsEstimate: 340000,
    sizeBytes: 42100000,
    description: 'Warehouse SKU stock levels and replenishment triggers',
    columns: [
      { name: 'sku', type: 'VARCHAR(32)', isPk: true, isRecommendedCursor: true },
      { name: 'warehouse_id', type: 'VARCHAR(16)', nullable: false },
      { name: 'quantity_available', type: 'INT', nullable: false },
      { name: 'quantity_reserved', type: 'INT', nullable: false },
      { name: 'reorder_point', type: 'INT', nullable: false },
      { name: 'unit_cost', type: 'DECIMAL(10,2)', nullable: false },
      { name: 'last_counted_at', type: 'TIMESTAMPTZ', isRecommendedCursor: true },
    ],
    sampleRows: [
      ['SKU-NV-5090', 'WH-US-EAST', 142, 18, 50, 1999.00, '2026-08-30T18:00:00Z'],
      ['SKU-NV-5080', 'WH-US-EAST', 480, 52, 100, 999.00, '2026-08-30T18:00:00Z'],
      ['SKU-MAC-M4MAX', 'WH-EU-CENTRAL', 89, 12, 25, 3499.00, '2026-08-30T18:00:00Z'],
      ['SKU-SSD-4TB', 'WH-US-WEST', 1250, 140, 200, 280.00, '2026-08-30T18:00:00Z'],
      ['SKU-RAM-64GB', 'WH-US-WEST', 890, 95, 150, 185.00, '2026-08-30T18:00:00Z'],
      ['SKU-SWITCH-100G', 'WH-EU-NORTH', 34, 4, 10, 4800.00, '2026-08-30T18:00:00Z'],
      ['SKU-CABLE-QSFP', 'WH-US-EAST', 3400, 210, 500, 45.00, '2026-08-30T18:00:00Z'],
      ['SKU-SFP28-25G', 'WH-US-EAST', 2100, 180, 300, 65.00, '2026-08-30T18:00:00Z'],
    ],
  },
  customers: {
    name: 'customers',
    rowsEstimate: 520000,
    sizeBytes: 68200000,
    description: 'Customer directory, CRM accounts, and billing addresses',
    columns: [
      { name: 'customer_id', type: 'BIGINT', isPk: true, isRecommendedCursor: true },
      { name: 'company_name', type: 'VARCHAR(128)', nullable: false },
      { name: 'contact_email', type: 'VARCHAR(255)', nullable: false },
      { name: 'country', type: 'VARCHAR(2)', nullable: false },
      { name: 'lifetime_value', type: 'DECIMAL(14,2)', nullable: false },
      { name: 'account_manager', type: 'VARCHAR(64)', nullable: true },
      { name: 'created_at', type: 'TIMESTAMPTZ', isRecommendedCursor: true },
    ],
    sampleRows: [
      ['10842', 'Datastream Technologies Ltd', 'billing@datastream.io', 'US', 84200.00, 'Sarah Connor', '2025-04-12T10:00:00Z'],
      ['24910', 'CloudScale GmbH', 'finance@cloudscale.de', 'DE', 142500.00, 'Max Mustermann', '2025-06-18T11:30:00Z'],
      ['38192', 'Nordic Lakehouse AB', 'ops@nordiclake.se', 'SE', 49100.00, 'Erik Lindqvist', '2025-08-01T09:15:00Z'],
      ['49102', 'Apex Financial Systems', 'accounts@apexfin.co.uk', 'GB', 312000.00, 'James Bond', '2025-09-22T14:40:00Z'],
      ['15201', 'Quantum AI Labs', 'admin@quantumai.com', 'US', 95000.00, 'Sarah Connor', '2025-11-05T16:20:00Z'],
      ['67190', 'Tokyo Data Grid KK', 'tokyo@datagrid.jp', 'JP', 189000.00, 'Kenji Sato', '2026-01-10T08:00:00Z'],
      ['89123', 'Paris Analytics SAS', 'compta@parisanalytics.fr', 'FR', 67400.00, 'Max Mustermann', '2026-02-14T12:00:00Z'],
      ['94102', 'Chicago Trading Group', 'tech@chicagotrading.com', 'US', 520000.00, 'Sarah Connor', '2026-03-01T15:30:00Z'],
    ],
  },
};

export function getTableCatalogList(): TableCatalogEntry[] {
  return Object.values(REAL_TABLE_CATALOG);
}

export function getTableDetails(name: string): TableCatalogEntry {
  const cleanName = (name || 'users').toLowerCase().replace(/^(public|raw|cdc|default)\./, '').replace(/^(s3:\/\/|raw\/|default\/)/, '');
  if (REAL_TABLE_CATALOG[cleanName]) {
    return REAL_TABLE_CATALOG[cleanName];
  }

  // Dynamic fallback generator for any custom table name
  const rowsEst = Math.max(10000, (Math.abs(cleanName.split('').reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0)) % 5000000) + 125000);
  const size = Math.round(rowsEst * 128);

  return {
    name: cleanName,
    rowsEstimate: rowsEst,
    sizeBytes: size,
    description: `Operational table for ${cleanName}`,
    columns: [
      { name: 'id', type: 'BIGINT', isPk: true, isRecommendedCursor: true },
      { name: `${cleanName}_code`, type: 'VARCHAR(64)', nullable: false },
      { name: 'status', type: 'VARCHAR(24)', nullable: false },
      { name: 'amount', type: 'DECIMAL(12,2)', nullable: true },
      { name: 'metadata_json', type: 'JSONB', nullable: true },
      { name: 'created_at', type: 'TIMESTAMPTZ', isRecommendedCursor: true },
      { name: 'updated_at', type: 'TIMESTAMPTZ', isRecommendedCursor: true },
    ],
    sampleRows: [
      ['1001', `${cleanName.toUpperCase()}-001`, 'ACTIVE', 450.00, '{"version": 1}', '2026-08-31T10:00:00Z', '2026-08-31T10:00:00Z'],
      ['1002', `${cleanName.toUpperCase()}-002`, 'ACTIVE', 1290.50, '{"version": 1}', '2026-08-31T10:15:00Z', '2026-08-31T10:15:00Z'],
      ['1003', `${cleanName.toUpperCase()}-003`, 'PENDING', 89.00, '{"version": 2}', '2026-08-31T10:30:00Z', '2026-08-31T10:30:00Z'],
      ['1004', `${cleanName.toUpperCase()}-004`, 'ACTIVE', 3200.00, '{"version": 1}', '2026-08-31T10:45:00Z', '2026-08-31T10:45:00Z'],
      ['1005', `${cleanName.toUpperCase()}-005`, 'SUSPENDED', 12.00, '{"version": 1}', '2026-08-31T11:00:00Z', '2026-08-31T11:00:00Z'],
      ['1006', `${cleanName.toUpperCase()}-006`, 'ACTIVE', 540.25, '{"version": 2}', '2026-08-31T11:15:00Z', '2026-08-31T11:15:00Z'],
    ],
  };
}
