/**
 * Simple, Clean & Standard Printable Invoice Generator
 */
export const printInvoicePdf = (inv: any) => {
  if (typeof window === 'undefined') return;

  const printWindow = window.open('', '_blank', 'width=880,height=980');
  if (!printWindow) {
    alert('Please allow popups to download/print the invoice PDF');
    return;
  }

  const invoiceNumber = inv.invoiceNumber || `INV-${inv.id}`;
  const companyName = inv.subscription?.companyName || inv.tenant?.name || inv.user?.name || 'Company Client';
  const cleanSlug = (inv.subscription?.subdomain || inv.tenant?.slug || companyName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')).replace(/^-|-$/g, '');
  const subdomain = cleanSlug ? `${cleanSlug}.ebsexpress.com` : 'workspace.ebsexpress.com';
  const planName = inv.subscription?.plan?.name || inv.plan?.name || 'Professional';

  // Determine Billing Cycle (without parentheses)
  const rawCycle = inv.billingCycle || inv.subscription?.billingCycle;
  const isYearly = rawCycle === 'yearly' || (
    inv.dueDate && inv.createdAt && (new Date(inv.dueDate).getTime() - new Date(inv.createdAt).getTime() > 180 * 24 * 3600 * 1000)
  );
  const billingCycle = isYearly ? 'ប្រចាំឆ្នាំ' : 'ប្រចាំខែ';

  // Correct financial numbers extraction
  const totalAmount = Number(
    inv.totalAmount !== undefined ? inv.totalAmount :
    inv.total !== undefined ? inv.total :
    inv.amount !== undefined ? inv.amount : 0
  );
  const subtotalAmount = Number(
    inv.subtotal !== undefined && Number(inv.subtotal) > 0 ? inv.subtotal : (totalAmount > 0 ? totalAmount : (isYearly ? 490 : 49))
  );
  const discountAmount = Number(
    inv.discountAmount !== undefined && Number(inv.discountAmount) > 0 ? inv.discountAmount : (subtotalAmount > totalAmount ? subtotalAmount - totalAmount : 0)
  );

  const amountStr = totalAmount.toFixed(2);
  const subtotalStr = subtotalAmount.toFixed(2);
  const discountStr = discountAmount.toFixed(2);
  const isPaid = inv.status === 'paid';

  const formatIsoDate = (dStr?: string | Date | null) => {
    if (!dStr) return '-';
    try {
      const d = new Date(dStr);
      if (isNaN(d.getTime())) return '-';
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    } catch {
      return '-';
    }
  };

  const issueDate = formatIsoDate(inv.createdAt || new Date());
  const dueDate = inv.dueDate ? formatIsoDate(inv.dueDate) : '-';
  const paidDate = inv.paidAt ? formatIsoDate(inv.paidAt) : issueDate;
  const userEmail = inv.user?.email || inv.subscription?.user?.email || `admin@${cleanSlug}.com`;
  const userPhone = inv.user?.phone || inv.subscription?.user?.phone || '';

  const html = `
    <!DOCTYPE html>
    <html lang="km">
    <head>
      <meta charset="UTF-8">
      <title>Invoice #${invoiceNumber} - ${companyName}</title>
      <link href="https://fonts.googleapis.com/css2?family=Kantumruy+Pro:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Kantumruy Pro', 'Inter', -apple-system, sans-serif;
          background: #f8fafc;
          color: #0f172a;
          padding: 40px 20px;
          display: flex;
          justify-content: center;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .invoice-card {
          background: #ffffff;
          max-width: 800px;
          width: 100%;
          padding: 48px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          position: relative;
        }

        /* Header */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #0f172a;
          padding-bottom: 20px;
          margin-bottom: 28px;
        }
        .brand-title {
          font-size: 24px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.5px;
        }
        .brand-title span {
          color: #2563eb;
        }
        .brand-subtitle {
          font-size: 12.5px;
          color: #64748b;
          margin-top: 4px;
        }

        .invoice-title-block {
          text-align: right;
        }
        .invoice-title {
          font-size: 22px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: 0.5px;
        }
        .invoice-num {
          font-size: 13.5px;
          color: #2563eb;
          font-weight: 700;
          margin-top: 4px;
        }

        /* Info Grid (Simple 2 Columns) */
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 36px;
          margin-bottom: 32px;
        }
        .info-col-title {
          font-size: 11.5px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 4px;
        }
        .client-name {
          font-size: 16px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 6px;
        }
        .info-row {
          font-size: 13px;
          color: #475569;
          margin-bottom: 4px;
          line-height: 1.5;
        }
        .info-row strong {
          color: #0f172a;
        }

        /* Table */
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 24px;
        }
        thead th {
          background: #2b529a;
          color: #ffffff;
          font-size: 12.5px;
          font-weight: 700;
          padding: 11px 14px;
          text-align: left;
          letter-spacing: 0.3px;
        }
        thead th:last-child {
          text-align: right;
        }
        tbody td {
          padding: 14px;
          border-bottom: 1px solid #f1f5f9;
          font-size: 13.5px;
          color: #334155;
        }
        tbody td:last-child {
          text-align: right;
          font-weight: 600;
          color: #0f172a;
        }

        /* Summary Section */
        .summary-container {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 32px;
        }
        .summary-table {
          width: 280px;
        }
        .summary-line {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          font-size: 13.5px;
          color: #475569;
        }
        .summary-line.total {
          border-top: 2px solid #0f172a;
          margin-top: 6px;
          padding-top: 8px;
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
        }

        /* Payment Status Note */
        .status-note {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 12px 16px;
          margin-bottom: 32px;
          font-size: 13px;
          color: #334155;
        }
        .status-note strong {
          color: #0f172a;
        }

        /* Footer */
        .footer {
          border-top: 1px solid #e2e8f0;
          padding-top: 16px;
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #94a3b8;
        }

        /* Print Button */
        .print-btn-bar {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 100;
        }
        .btn-print {
          background: #0f172a;
          color: #ffffff;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 13.5px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        @media print {
          body { background: #ffffff; padding: 0; }
          .invoice-card { box-shadow: none; border: none; padding: 0; max-width: 100%; }
          .print-btn-bar { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="print-btn-bar">
        <button class="btn-print" onclick="window.print()">
          🖨️ បោះពុម្ព / Save as PDF
        </button>
      </div>

      <div class="invoice-card">
        <!-- Header -->
        <div class="header">
          <div>
            <div class="brand-title">EBS <span>Express</span></div>
            <div class="brand-subtitle">SaaS Delivery Cloud Management Platform</div>
          </div>
          <div class="invoice-title-block">
            <div class="invoice-title">វិក្កយបត្រ / INVOICE</div>
            <div class="invoice-num">#${invoiceNumber}</div>
          </div>
        </div>

        <!-- Info Grid -->
        <div class="info-grid">
          <div>
            <div class="info-col-title">ចេញជូន</div>
            <div class="client-name">${companyName}</div>
            <div class="info-row">Workspace: <strong>${subdomain}</strong></div>
            <div class="info-row">អ៊ីមែល: <strong>${userEmail}</strong></div>
            ${userPhone ? `<div class="info-row">ទូរស័ព្ទ: <strong>${userPhone}</strong></div>` : ''}
          </div>

          <div>
            <div class="info-col-title">ព័ត៌មានវិក្កយបត្រ</div>
            <div class="info-row">ថ្ងៃចេញវិក្កយបត្រ: <strong>${issueDate}</strong></div>
            <div class="info-row">ថ្ងៃផុតកំណត់: <strong>${dueDate}</strong></div>
            <div class="info-row">ស្ថានភាព: <strong style="color: ${isPaid ? '#16a34a' : '#ea580c'};">${isPaid ? 'បានទូទាត់' : 'រង់ចាំទូទាត់'}</strong></div>
          </div>
        </div>

        <!-- Table -->
        <table>
          <thead>
            <tr>
              <th style="width: 50%;">ការពិពណ៌នាសេវាកម្ម</th>
              <th style="width: 25%;">វដ្តទូទាត់</th>
              <th style="width: 10%; text-align: center;">ចំនួន</th>
              <th style="width: 15%;">តម្លៃសរុប</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong style="color: #0f172a;">កញ្ចប់សេវា ${planName}</strong>
                <div style="font-size: 12px; color: #64748b; margin-top: 2px;">ការជាវប្រព័ន្ធគ្រប់គ្រងការដឹកជញ្ជូន Cloud Platform</div>
              </td>
              <td>${billingCycle}</td>
              <td style="text-align: center;">1</td>
              <td>$${subtotalStr}</td>
            </tr>
          </tbody>
        </table>

        <!-- Summary -->
        <div class="summary-container">
          <div class="summary-table">
            <div class="summary-line">
              <span>តម្លៃដើម:</span>
              <span>$${subtotalStr}</span>
            </div>
            ${discountAmount > 0 ? `
              <div class="summary-line" style="color: #16a34a;">
                <span>បញ្ចុះតម្លៃ:</span>
                <span>-$${discountStr}</span>
              </div>
            ` : ''}
            <div class="summary-line total">
              <span>សរុប:</span>
              <span>$${amountStr}</span>
            </div>
          </div>
        </div>

        ${isPaid ? `
          <div class="status-note">
            ✓ វិក្កយបត្រនេះបានទូទាត់រួចរាល់នៅថ្ងៃទី <strong>${paidDate}</strong> តាមរយៈ <strong>${inv.paymentMethod || 'KHQR / Bank Transfer'}</strong>។
          </div>
        ` : ''}

        <!-- Footer -->
        <div class="footer">
          <div>អរគុណសម្រាប់ការប្រើប្រាស់សេវាកម្ម EBS Express</div>
          <div>www.ebsexpress.com</div>
        </div>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 350);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
};
