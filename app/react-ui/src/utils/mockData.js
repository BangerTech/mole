// Mock database tables for demonstration
export const generateMockTables = () => [
  { name: 'users', type: 'TABLE', rows: 234, size: '5.2 MB', columns: 12, lastUpdated: '2023-05-15' },
  { name: 'products', type: 'TABLE', rows: 1245, size: '12.6 MB', columns: 18, lastUpdated: '2023-05-12' },
  { name: 'orders', type: 'TABLE', rows: 4892, size: '28.9 MB', columns: 15, lastUpdated: '2023-05-16' },
  { name: 'categories', type: 'TABLE', rows: 28, size: '0.4 MB', columns: 7, lastUpdated: '2023-05-01' },
  { name: 'order_details', type: 'VIEW', columns: 8, lastUpdated: '2023-05-05' },
  { name: 'active_users', type: 'VIEW', columns: 5, lastUpdated: '2023-05-10' }
];

// Database structure for demonstration - updated for multiple tables
export const generateMockStructure = (tableName) => {
  switch (tableName?.toLowerCase()) {
    case 'products':
      return [
        { name: 'id', type: 'INT', nullable: false, default: null, key: 'PRI', extra: 'auto_increment' },
        { name: 'name', type: 'VARCHAR(255)', nullable: false, default: null, key: '', extra: '' },
        { name: 'description', type: 'TEXT', nullable: true, default: null, key: '', extra: '' },
        { name: 'price', type: 'DECIMAL(10,2)', nullable: true, default: null, key: '', extra: '' },
        { name: 'stock', type: 'INT', nullable: false, default: '0', key: '', extra: '' },
      ];
    case 'orders':
      return [
        { name: 'id', type: 'INT', nullable: false, default: null, key: 'PRI', extra: 'auto_increment' },
        { name: 'user_id', type: 'INT', nullable: false, default: null, key: 'MUL', extra: '' }, // Foreign key indication
        { name: 'order_date', type: 'TIMESTAMP', nullable: false, default: 'CURRENT_TIMESTAMP', key: '', extra: '' },
        { name: 'total_amount', type: 'DECIMAL(10,2)', nullable: true, default: null, key: '', extra: '' },
        { name: 'status', type: 'VARCHAR(50)', nullable: false, default: 'pending', key: '', extra: '' },
      ];
    case 'categories':
       return [
        { name: 'id', type: 'INT', nullable: false, default: null, key: 'PRI', extra: 'auto_increment' },
        { name: 'name', type: 'VARCHAR(100)', nullable: false, default: null, key: 'UNI', extra: '' },
        { name: 'description', type: 'VARCHAR(255)', nullable: true, default: null, key: '', extra: '' },
      ];
    case 'users': // Fall through to default for users
    default:
      return [
        { name: 'id', type: 'INT', nullable: false, default: 'AUTO_INCREMENT', key: 'PRI', extra: 'auto_increment' },
        { name: 'name', type: 'VARCHAR(255)', nullable: false, default: null, key: '', extra: '' },
        { name: 'email', type: 'VARCHAR(255)', nullable: true, default: null, key: 'UNI', extra: '' },
        { name: 'created_at', type: 'TIMESTAMP', nullable: false, default: 'CURRENT_TIMESTAMP', key: '', extra: '' },
        { name: 'updated_at', type: 'TIMESTAMP', nullable: false, default: 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', key: '', extra: '' },
        { name: 'status', type: 'TINYINT(1)', nullable: false, default: '1', key: '', extra: '' }
      ];
  }
};

// Mock data rows for demonstration - updated for multiple tables
export const generateMockDataRows = (tableName, rowCount = 50) => {
  const rows = [];
  const users = ['Max Mustermann', 'Lisa Schmidt', 'Tom Müller', 'Anna Wagner', 'Felix Weber'];
  const products = ['Laptop', 'Mouse', 'Keyboard', 'Monitor', 'Webcam'];
  const categories = ['Electronics', 'Office', 'Gaming', 'Peripherals'];
  const orderStatus = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

  for (let i = 1; i <= rowCount; i++) {
    let row = { id: i };
    switch (tableName?.toLowerCase()) {
      case 'products':
        row = {
          ...row,
          name: products[Math.floor(Math.random() * products.length)] + ` ${i}`,
          description: `Description for product ${i}`,
          price: (Math.random() * 1000 + 50).toFixed(2),
          stock: Math.floor(Math.random() * 200),
        };
        break;
      case 'orders':
         row = {
          ...row,
          user_id: Math.floor(Math.random() * 234) + 1, // Assuming 234 users exist
          order_date: new Date(Date.now() - Math.random() * 2e10).toISOString(),
          total_amount: (Math.random() * 500 + 20).toFixed(2),
          status: orderStatus[Math.floor(Math.random() * orderStatus.length)],
        };
        break;
       case 'categories':
         row = {
          ...row,
          name: categories[i % categories.length] || `Category ${i}`,
          description: `Details about category ${i}`,
        };
        // Limit rows for categories
        if (i > categories.length * 2) break; 
        break;
      case 'users': // Fall through to default for users
      default:
        row = {
          ...row,
          name: users[Math.floor(Math.random() * users.length)],
          email: `user${i}@example.com`,
          created_at: new Date(Date.now() - Math.random() * 1e10).toISOString(),
          updated_at: new Date(Date.now() - Math.random() * 1e9).toISOString(),
          status: Math.random() > 0.3 ? 1 : 0,
        };
        break;
    }
    if (Object.keys(row).length > 1 || row.id) { // Add row only if it was populated
         rows.push(row);
    }
  }
  return rows;
}; 