const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'app', 'payment', 'shop', 'page.tsx');
let content = fs.readFileSync(file, 'utf8');

const regex = /const mOrders = orders\.filter\(o => o\.merchantId === m\.id\);([\s\S]*?)\/\/ Package counts stats \(all orders\)/;
const replacement = `let mOrders = orders.filter(o => o.merchantId === m.id);

      // Apply date filters
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        mOrders = mOrders.filter(o => {
          const d = o.deliveredAt ? new Date(o.deliveredAt) : new Date(o.createdAt);
          return d >= start;
        });
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        mOrders = mOrders.filter(o => {
          const d = o.deliveredAt ? new Date(o.deliveredAt) : new Date(o.createdAt);
          return d <= end;
        });
      }

      // Apply order status filter if not empty
      if (statusFilter) {
        mOrders = mOrders.filter(o => o.status === statusFilter);
      }

      // Package counts stats (all orders)`;

content = content.replace(regex, replacement);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed logic block!');
