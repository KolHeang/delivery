const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'app', 'payment', 'shop', 'page.tsx');
let content = fs.readFileSync(file, 'utf8');

// Update UI Dropdown
const oldDropdown = `<select
                    className="form-control"
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    style={{ width: '200px', height: '38px', padding: '6px 12px', borderRadius: '4px', border: '1px solid #d1d5db', backgroundColor: '#fff' }}
                  >
                    <option value="unpaid">{lang === 'km' ? 'មិនទាន់ទូទាត់ (Unpaid)' : 'Unpaid'}</option>
                    <option value="paid">{lang === 'km' ? 'ទូទាត់រួច (Paid)' : 'Paid'}</option>
                  </select>`;

const newDropdown = `<select
                    className="form-control"
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    style={{ width: '200px', height: '38px', padding: '6px 12px', borderRadius: '4px', border: '1px solid #d1d5db', backgroundColor: '#fff' }}
                  >
                    <option value="">{lang === 'km' ? 'ជ្រើសរើសស្ថានភាព' : 'Select Status'}</option>
                    <option value="pending">Pending</option>
                    <option value="in-warehouse">In-Warehouse</option>
                    <option value="assigned">Assigned</option>
                    <option value="picked-up">Picked-Up</option>
                    <option value="in-transit">In-Transit</option>
                    <option value="delivered">Delivered</option>
                    <option value="failed">Failed</option>
                    <option value="returned">Returned</option>
                  </select>`;

content = content.replace(oldDropdown, newDropdown);

// Update status filter logic
const oldLogic = `      // Filtered orders for payouts (status: delivered, matching shop payout status)
      const paymentOrders = mOrders.filter(o => 
        o.status === 'delivered' && 
        o.merchantPaymentStatus === statusFilter
      );`;

const newLogic = `      // Apply order status filter if not empty
      if (statusFilter) {
        mOrders = mOrders.filter(o => o.status === statusFilter);
      }

      // Filtered orders for payouts (status: delivered, unpaid payouts)
      const paymentOrders = mOrders.filter(o => 
        o.status === 'delivered' && 
        o.merchantPaymentStatus === 'unpaid'
      );`;

content = content.replace(oldLogic, newLogic);

// Change initial state of statusFilter to empty string
content = content.replace(`const [statusFilter, setStatusFilter] = useState('unpaid');`, `const [statusFilter, setStatusFilter] = useState('');`);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed status filter UI and logic!');
