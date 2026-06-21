const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'app', 'payment', 'shop', 'page.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Add Missing Imports
if (!content.includes('import DateInput')) {
  content = content.replace(
    `import { useLanguage } from '@/lib/LanguageContext';`,
    `import { useLanguage } from '@/lib/LanguageContext';\nimport DateInput, { formatDateToDDMMYYYY } from '@/components/ui/DateInput';`
  );
}

// 2. Add startDate and endDate states
if (!content.includes('const [startDate')) {
  const stateRegex = /const \[statusFilter, setStatusFilter\] = useState\('unpaid'\);/;
  content = content.replace(stateRegex, `const [statusFilter, setStatusFilter] = useState('');\n\n  const [startDate, setStartDate] = useState(() => {\n    const d = new Date();\n    const year = d.getFullYear();\n    const month = String(d.getMonth() + 1).padStart(2, '0');\n    return \`\${year}-\${month}-01\`;\n  });\n  const [endDate, setEndDate] = useState(() => {\n    const d = new Date();\n    const year = d.getFullYear();\n    const month = String(d.getMonth() + 1).padStart(2, '0');\n    const day = String(d.getDate()).padStart(2, '0');\n    return \`\${year}-\${month}-\${day}\`;\n  });`);
}

// 3. Fix mOrders Logic Block
const logicRegex = /const mOrders = orders\.filter\(o => o\.merchantId === m\.id\);([\s\S]*?)const paymentOrders = mOrders\.filter\(o =>[\s\S]*?o\.status === 'delivered' &&[\s\S]*?o\.merchantPaymentStatus === statusFilter[\s\S]*?\);/;
const replacementLogic = `let mOrders = orders.filter(o => o.merchantId === m.id);

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

      $1const paymentOrders = mOrders.filter(o => 
        o.status === 'delivered' && 
        o.merchantPaymentStatus === 'unpaid'
      );`;
content = content.replace(logicRegex, replacementLogic);

// 4. Fix UI Status Dropdown and add Date Inputs
const uiRegex = /<select[\s\S]*?className="form-control"[\s\S]*?value=\{statusFilter\}[\s\S]*?onChange=\{e => setStatusFilter\(e\.target\.value\)\}[\s\S]*?style=\{\{ width: '200px'[\s\S]*?\}[\s\S]*?>[\s\S]*?<option value="unpaid">\{lang === 'km' \? 'មិនទាន់ទូទាត់ \(Unpaid\)' : 'Unpaid'\}<\/option>[\s\S]*?<option value="paid">\{lang === 'km' \? 'ទូទាត់រួច \(Paid\)' : 'Paid'\}<\/option>[\s\S]*?<\/select>\s*<\/div>\s*<\/div>/;
const uiReplacement = `<select
                    className="form-control"
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    style={{ width: '200px', height: '38px', padding: '6px 12px', borderRadius: '4px', border: '1px solid #d1d5db', backgroundColor: '#fff' }}
                  >
                    <option value="">{lang === 'km' ? 'ជ្រើសរើសស្ថានភាព' : 'Select Status'}</option>
                    <option value="pending">{lang === 'km' ? 'កំពុងរង់ចាំ (Pending)' : 'Pending'}</option>
                    <option value="in-warehouse">{lang === 'km' ? 'ក្នុងឃ្លាំង (In-Warehouse)' : 'In-Warehouse'}</option>
                    <option value="assigned">{lang === 'km' ? 'បានចាត់តាំង (Assigned)' : 'Assigned'}</option>
                    <option value="picked-up">{lang === 'km' ? 'បានយក (Picked-Up)' : 'Picked-Up'}</option>
                    <option value="in-transit">{lang === 'km' ? 'កំពុងដឹកជញ្ជូន (In-Transit)' : 'In-Transit'}</option>
                    <option value="delivered">{lang === 'km' ? 'បានបញ្ជូន (Delivered)' : 'Delivered'}</option>
                    <option value="failed">{lang === 'km' ? 'បរាជ័យ (Failed)' : 'Failed'}</option>
                    <option value="returned">{lang === 'km' ? 'ត្រឡប់មកវិញ (Returned)' : 'Returned'}</option>
                  </select>
                </div>

                <DateInput
                  labelEn="Start Date"
                  labelKh="ចាប់ពីថ្ងៃ"
                  value={startDate}
                  onChange={setStartDate}
                  style={{ minWidth: 220 }}
                />
                <DateInput
                  labelEn="End Date"
                  labelKh="ដល់"
                  value={endDate}
                  onChange={setEndDate}
                  style={{ minWidth: 220 }}
                />
              </div>`;
content = content.replace(uiRegex, uiReplacement);

// 5. Restore detailed Print Layout
const printRegex = /<table style=\{\{ width: '100%', borderCollapse: 'collapse', marginTop: 16, fontSize: 12 \}\}>\s*<thead>\s*<tr style=\{\{ borderBottom: '2px solid #000' \}\}>\s*<th[^>]*>Merchant Shop<\/th>\s*<th[^>]*>Net Payable Amount<\/th>\s*<\/tr>\s*<\/thead>\s*<tbody>\s*\{groupedData\.map\(\(row\) => \(\s*<tr key=\{row\.merchant\.id\}[^>]*>\s*<td[^>]*>[\s\S]*?<\/td>\s*<td[^>]*>[\s\S]*?<\/td>\s*<\/tr>\s*\)\)\}\s*<\/tbody>\s*<\/table>/;
const detailedLayout = `
        {merchantFilter && groupedData.length > 0 ? (
          (() => {
            const row = groupedData[0];
            const financials = row.financials;
            return (
              <>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16, fontSize: 12 }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <th rowSpan={2} style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #000' }}>ល.រ</th>
                      <th rowSpan={2} style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #000' }}>កាលបរិច្ឆេទ</th>
                      <th rowSpan={2} style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #000' }}>បរិយាយ</th>
                      <th colSpan={2} style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #000' }}>ទឹកប្រាក់ដើមមាន<br/>(ដុល្លារ / ៛)</th>
                      <th colSpan={2} style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #000' }}>ទឹកប្រាក់ទទួលបាន<br/>(ដុល្លារ / ៛)</th>
                      <th rowSpan={2} style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #000' }}>សេវាដឹក</th>
                      <th rowSpan={2} style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #000' }}>ផ្សេងៗ</th>
                    </tr>
                    <tr></tr>
                  </thead>
                  <tbody>
                    {/* Delivered Section */}
                    {(() => {
                      const deliveredOrders = row.orders.filter((o: any) => o.status === 'delivered');
                      if (deliveredOrders.length === 0) return null;
                      return (
                        <>
                          <tr>
                            <td colSpan={9} style={{ backgroundColor: '#2ecc71', color: '#fff', fontWeight: 'bold', padding: '6px', border: '1px solid #000' }}>អីវ៉ាន់ដឹកបានជោគជ័យ</td>
                          </tr>
                          {deliveredOrders.map((o: any, idx: number) => {
                            const isUSD = o.codCurrency === 'USD';
                            const codVal = parseFloat(o.cod || 0);
                            return (
                              <tr key={o.id}>
                                <td style={{ textAlign: 'center', padding: '6px 4px', border: '1px solid #000' }}>{idx + 1}</td>
                                <td style={{ padding: '6px 4px', border: '1px solid #000', textAlign: 'center' }}>{formatDateToDDMMYYYY(o.createdAt)}</td>
                                <td style={{ padding: '6px 4px', border: '1px solid #000' }}>{o.trackingCode} {o.receiverPhone ? \`(\${o.receiverPhone})\` : ''}</td>
                                <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000', borderRight: '1px dashed #000', width: '60px' }}>$ {isUSD ? codVal.toFixed(2) : '0.00'}</td>
                                <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000', borderLeft: 'none', width: '70px' }}>{!isUSD ? codVal.toLocaleString() : '0'} ៛</td>
                                <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000', borderRight: '1px dashed #000', width: '60px' }}>$ {isUSD ? codVal.toFixed(2) : '0.00'}</td>
                                <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000', borderLeft: 'none', width: '70px' }}>{!isUSD ? codVal.toLocaleString() : '0'} ៛</td>
                                <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000' }}>$ {parseFloat(o.deliveryFee || 0).toFixed(2)}</td>
                                <td style={{ padding: '6px 4px', border: '1px solid #000', textAlign: 'center' }}></td>
                              </tr>
                            );
                          })}
                          <tr>
                            <td colSpan={3} style={{ textAlign: 'right', fontWeight: 'bold', padding: '6px 4px', border: '1px solid #000' }}>សរុប</td>
                            <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '6px 4px', border: '1px solid #000', borderRight: '1px dashed #000' }}>$ {financials.totalUSD.toFixed(2)}</td>
                            <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '6px 4px', border: '1px solid #000', borderLeft: 'none' }}>{financials.totalKHR.toLocaleString()} ៛</td>
                            <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '6px 4px', border: '1px solid #000', borderRight: '1px dashed #000' }}>$ {financials.totalUSD.toFixed(2)}</td>
                            <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '6px 4px', border: '1px solid #000', borderLeft: 'none' }}>{financials.totalKHR.toLocaleString()} ៛</td>
                            <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '6px 4px', border: '1px solid #000' }}>$ {financials.deliveryFee.toFixed(2)}</td>
                            <td style={{ border: '1px solid #000' }}></td>
                          </tr>
                        </>
                      );
                    })()}

                    {/* In Transit Section */}
                    {(() => {
                      const inTransitOrders = row.orders.filter((o: any) => o.status === 'in-transit' || o.status === 'picked-up' || o.status === 'pending');
                      if (inTransitOrders.length === 0) return null;
                      return (
                        <>
                          <tr>
                            <td colSpan={9} style={{ backgroundColor: '#1abc9c', color: '#fff', fontWeight: 'bold', padding: '6px', border: '1px solid #000' }}>អីវ៉ាន់កំពុងដឹក</td>
                          </tr>
                          {inTransitOrders.map((o: any, idx: number) => {
                            const isUSD = o.codCurrency === 'USD';
                            const codVal = parseFloat(o.cod || 0);
                            return (
                              <tr key={o.id}>
                                <td style={{ textAlign: 'center', padding: '6px 4px', border: '1px solid #000' }}>{idx + 1}</td>
                                <td style={{ padding: '6px 4px', border: '1px solid #000', textAlign: 'center' }}>{formatDateToDDMMYYYY(o.createdAt)}</td>
                                <td style={{ padding: '6px 4px', border: '1px solid #000' }}>{o.trackingCode} {o.receiverPhone ? \`(\${o.receiverPhone})\` : ''}</td>
                                <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000', borderRight: '1px dashed #000', width: '60px' }}>$ {isUSD ? codVal.toFixed(2) : '0.00'}</td>
                                <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000', borderLeft: 'none', width: '70px' }}>{!isUSD ? codVal.toLocaleString() : '0'} ៛</td>
                                <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000', borderRight: '1px dashed #000', width: '60px' }}></td>
                                <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000', borderLeft: 'none', width: '70px' }}></td>
                                <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000' }}>$ {parseFloat(o.deliveryFee || 0).toFixed(2)}</td>
                                <td style={{ padding: '6px 4px', border: '1px solid #000', textAlign: 'center' }}>{o.status}</td>
                              </tr>
                            );
                          })}
                        </>
                      );
                    })()}

                    {/* Returned Section */}
                    {(() => {
                      const returnedOrders = row.orders.filter((o: any) => o.status === 'returned' || o.status === 'failed');
                      if (returnedOrders.length === 0) return null;
                      return (
                        <>
                          <tr>
                            <td colSpan={9} style={{ backgroundColor: '#e74c3c', color: '#fff', fontWeight: 'bold', padding: '6px', border: '1px solid #000' }}>អីវ៉ាន់ត្រឡប់ទៅហាង</td>
                          </tr>
                          {returnedOrders.map((o: any, idx: number) => {
                            const isUSD = o.codCurrency === 'USD';
                            const codVal = parseFloat(o.cod || 0);
                            return (
                              <tr key={o.id}>
                                <td style={{ textAlign: 'center', padding: '6px 4px', border: '1px solid #000' }}>{idx + 1}</td>
                                <td style={{ padding: '6px 4px', border: '1px solid #000', textAlign: 'center' }}>{formatDateToDDMMYYYY(o.createdAt)}</td>
                                <td style={{ padding: '6px 4px', border: '1px solid #000' }}>{o.trackingCode} {o.receiverPhone ? \`(\${o.receiverPhone})\` : ''}</td>
                                <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000', borderRight: '1px dashed #000', width: '60px' }}>$ {isUSD ? codVal.toFixed(2) : '0.00'}</td>
                                <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000', borderLeft: 'none', width: '70px' }}>{!isUSD ? codVal.toLocaleString() : '0'} ៛</td>
                                <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000', borderRight: '1px dashed #000', width: '60px' }}></td>
                                <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000', borderLeft: 'none', width: '70px' }}></td>
                                <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000' }}>$ {parseFloat(o.deliveryFee || 0).toFixed(2)}</td>
                                <td style={{ padding: '6px 4px', border: '1px solid #000', textAlign: 'center' }}>ភ្ញៀវសុំថយ</td>
                              </tr>
                            );
                          })}
                        </>
                      );
                    })()}
                  </tbody>
                </table>

                {/* Financial summaries Box */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                  <table style={{ borderCollapse: 'collapse', fontSize: 12 }}>
                    <tbody>
                      <tr>
                        <td style={{ padding: '6px 12px', border: '1px solid #000', textAlign: 'right' }}>ប្រាក់សរុប</td>
                        <td style={{ padding: '6px 12px', border: '1px solid #000', fontWeight: 'bold' }}>$ {financials.totalUSD.toFixed(2)} / {financials.totalKHR.toLocaleString()} ៛</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '6px 12px', border: '1px solid #000', textAlign: 'right' }}>សេវាដឹក</td>
                        <td style={{ padding: '6px 12px', border: '1px solid #000', fontWeight: 'bold' }}>$ {financials.deliveryFee.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '6px 12px', border: '1px solid #000', textAlign: 'right' }}>ប្រាក់ត្រូវទទួលបាន</td>
                        <td style={{ padding: '6px 12px', border: '1px solid #000', fontWeight: 'bold', color: '#dc2626' }}>\${financials.payableUSD.toFixed(2)} / {financials.payableKHR.toLocaleString()} ៛</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            );
          })()
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16, fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #000' }}>
                <th style={{ textAlign: 'left', padding: '6px 0', background: 'transparent', border: 'none' }}>Merchant Shop</th>
                <th style={{ textAlign: 'right', padding: '6px 0', background: 'transparent', border: 'none' }}>Net Payable Amount</th>
              </tr>
            </thead>
            <tbody>
              {groupedData.map((row) => (
                <tr key={row.merchant.id} style={{ borderBottom: '1px solid #cbd5e1' }}>
                  <td style={{ padding: '6px 0', border: 'none' }}>
                    {row.merchant.name} ({row.merchant.phone})
                  </td>
                  <td style={{ textAlign: 'right', padding: '6px 0', border: 'none', fontWeight: 'bold' }}>
                    \${row.financials.payableUSD.toFixed(2)} / {row.financials.payableKHR.toLocaleString()} ៛
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}`;

content = content.replace(printRegex, detailedLayout);

fs.writeFileSync(file, content, 'utf8');
console.log('All fixes applied successfully!');
