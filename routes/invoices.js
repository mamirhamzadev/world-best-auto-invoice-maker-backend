import express from 'express';
const router = express.Router();
import asyncHandler from 'express-async-handler';
import Invoice from '../models/Invoice.js';
import { isObjectIdOrHexString } from 'mongoose';

// Get all invoices
router.get('/', asyncHandler(async (req, res) => {
  const invoices = await Invoice.find().sort({ createdAt: -1 });
  res.json(invoices);
}));

// Create new invoice
router.post('/', asyncHandler(async (req, res) => {
  const payload = req.body;
  const invoice = await Invoice.create(payload);
  if (invoice)
    return res.json({ message: "Invoice created successfully", invoiceId: invoice._id });
  return res.status(400).json({ message: "Invoice creation failed" });
}));

// Get single invoice
router.get('/:id', asyncHandler(async (req, res) => {
  const id = req.params.id;
  if (!isObjectIdOrHexString(id || "")) return res.status(404).json({ message: "Invoice not found" });

  const invoice = await Invoice.findById(id).populate('customer').populate('items.item');
  res.json(invoice);

  // if (!isObjectIdOrHexString(id)) return res.send('<h3 style="color: red;">Invoice not found</h3>');
  // const invoice = await Invoice.findById(id).populate('customer').populate('items.item');
  // if (!invoice) return res.send('<h3 style="color: red;">Invoice not found</h3>');

  // const pdfBuffer = await generateInvoicePDF(invoice);
  // res.setHeader('Content-Type', 'application/pdf');
  // res.setHeader('Content-Disposition', 'inline; filename=pos-invoice.pdf');
  // res.send(pdfBuffer);
}));

router.get('/search', asyncHandler(async (req, res) => {
  const query = req.query.q;
  const invoices = await Invoice.find({
    $or: [
      { invoiceNumber: { $regex: query, $options: 'i' } },
      { customerName: { $regex: query, $options: 'i' } },
      { vehicleVIN: { $regex: query, $options: 'i' } },
    ],
  }).sort({ createdAt: -1 });
  res.json(invoices);
}));

export default router;


function generateInvoiceHTML(invoice) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Calculate totals
  const subtotal = invoice.items.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = subtotal * (invoice.discount / 100);
  const amountAfterDiscount = subtotal - discountAmount;
  const taxAmount = amountAfterDiscount * (invoice.tax / 100);
  const grandTotal = amountAfterDiscount + taxAmount - invoice.deposit;

  // Generate items rows HTML
  let itemsRows = '';
  invoice.items.forEach(item => {
    itemsRows += `
      <tr>
        <td>${item.name}</td>
        <td>${item.quantity}</td>
        <td>${formatCurrency(item.price)}</td>
        <td>${formatCurrency(item.total)}</td>
      </tr>
    `;
  });

  // Generate conditional rows
  // In your generateInvoiceHTML function, update the discountRow generation:
  let discountRow = '';
  if (invoice.discount > 0) {
    discountRow = `
    <div class="total-row dashed-border discount-row">
      <span class="label">Discount (${invoice.discount}%)</span>
      <span class="amount">-${formatCurrency(discountAmount)}</span>
    </div>
  `;
  }

  // And deposit row:
  let depositRow = '';
  if (invoice.deposit > 0) {
    depositRow = `
    <div class="total-row dashed-border">
      <span class="label">Deposit</span>
      <span class="amount">-${formatCurrency(invoice.deposit)}</span>
    </div>
  `;
  }

  // Format date
  const invoiceDate = new Date(invoice.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  // Return complete HTML
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <title>Invoice ${invoice.invoiceNumber}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
        }
        .invoice {
            margin: 0 auto;
            background: #ffffff;
            border-radius: 8px;
            overflow: hidden;
        }
        .header {
            background: linear-gradient(90deg, #3b82f6, #6366f1);
            color: #fff;
            padding: 20px 30px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
        }
        .company-info {
            flex: 1;
        }
        .company-info h1 {
            margin: 0 0 5px 0;
            font-size: 20px;
            font-weight: bold;
        }
        .company-info p {
            margin: 2px 0;
            font-size: 12px;
        }
        .invoice-info {
            text-align: right;
            background: rgba(255, 255, 255, 0.15);
            padding: 10px;
            border-radius: 6px;
            min-width: 250px;
        }
        .info-row {
          margin-bottom: 5px;
          display: flex;
          justify-content: space-between;
          font-size: 13px;
        }
        .info-label {
          font-weight: 600;
          opacity: 0.9;
          margin-right: 15px;
          }
        .info-value {
          font-weight: 500;
        }
        .content-section {
            padding: 0px 40px;
        }
        .section-title {
            color: #374151;
            font-size: 15px;
            margin-bottom: 5px;
        }
        .bill-to-row {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 25px;
            padding: 15px;
            background: #f9fafb;
            border-radius: 8px;
        }
        .bill-item {
            display: flex;
            flex-direction: column;
        }
        .bill-label {
            font-weight: 600;
            color: #4b5563;
            font-size: 13px;
            margin-bottom: 4px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .bill-value {
            color: #111827;
            font-size: 12px;
            font-weight: 500;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th {
            background: #f3f4f6;
            color: #374151;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 12px;
            letter-spacing: 0.5px;
        }
        th, td {
            padding: 10px 16px;
            text-align: left;
            font-size: 12px;
            border-bottom: 1px solid #e5e7eb;
        }
        td{
          padding: 5px 16px;
        }
        tbody tr:hover {
            background-color: #f9fafb;
        }
        /* FIXED TOTALS SECTION STYLES */
        .totals {
            background: #ffffff;
            padding: 20px 0px;
        }
        .totals-header {
            font-size: 15px;
            font-weight: 700;
            color: #374151;
            margin-bottom: 10px;
            padding-bottom: 5px;
            border-bottom: 2px solid #3b82f6;
        }
        .total-row {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            align-items: center;
        }
        .total-row .label {
            font-weight: 500;
            color: #4b5563;
            font-size: 12px;
        }
        .total-row .amount {
            font-weight: 600;
            color: #111827;
            font-size: 12px;
            text-align: right;
            min-width: 120px;
        }
        .discount-row .amount {
            color: #dc2626;
        }
        .dashed-border {
            border-bottom: 1px dashed #e5e7eb;
        }
        .grand-total {
            margin-top: 5px;
            background: linear-gradient(90deg, rgba(37, 99, 235, 0.05) 0%, rgba(37, 99, 235, 0.02) 100%);
            padding: 10px;
            border-radius: 8px;
        }
        .grand-total .label {
            font-size: 15px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #374151;
        }
        .grand-total .amount {
            font-size: 20px;
            font-weight: 800;
            color: #2563eb;
        }
        /* END TOTALS SECTION STYLES */
        .paid {
            color: #059669;
            background: #d1fae5;
        }
        .unpaid {
            color: #dc2626;
            background: #fee2e2;
        }
        .payment-info {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-top: 30px;
            padding: 25px;
            background: #f9fafb;
            border-radius: 8px;
            align-items: center;
        }
        .payment-item {
            display: flex;
            flex-direction: column;
            min-height: 60px;
            justify-content: center;
        }
        .payment-label {
            font-weight: 600;
            color: #4b5563;
            font-size: 13px;
            margin-bottom: 6px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .payment-value {
            color: #111827;
            font-size: 15px;
            font-weight: 500;
        }
        .refund-item {
            display: flex;
            flex-direction: column;
            min-height: 60px;
            justify-content: center;
        }
        .footer {
            background: #111827;
            color: #d1d5db;
            text-align: center;
            padding: 15px;
            margin-top: 15px;
        }
        .footer h3 {
          color: #ffffff;
          font-size: 15px;
          margin:0;
          margin-bottom: 5px;  
          }
        .footer p {
          opacity: 0.8;
          font-size: 12px;
          margin: 0;  
        }
        .notes-section {
            padding: 10px;
            background: #fef3c7;
            border-radius: 6px;
            border-left: 4px solid #d97706;
        }
        .notes-section p {
            font-size: 12px;
            margin: 5px 0;
        }
        @media print {
            body {
                padding: 0;
                background: #fff;
            }
            .invoice {
                box-shadow: none;
            }
        }
    </style>
</head>
<body>
    <div class="invoice">
        <!-- HEADER SECTION -->
        <div class="header">
            <div class="company-info">
                <h1>WORLDS BEST AUTO LLC</h1>
                <p>247 North Main Street, Statesboro, GA</p>
                <p>91 26817671 | contact@worldsbestauto.com</p>
            </div>
            
            <div class="invoice-info">
                <div class="info-row">
                    <span class="info-label">Invoice #:</span>
                    <span class="info-value">${invoice.invoiceNumber}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Date:</span>
                    <span class="info-value">${invoiceDate}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">VIN:</span>
                    <span class="info-value">${invoice.vehicle?.vin || 'N/A'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Vehicle:</span>
                    <span class="info-value">${invoice.vehicle?.model || 'N/A'}</span>
                </div>
            </div>
        </div>

        <!-- CONTENT SECTION -->
        <div class="content-section">
            <h3 class="section-title">Customer Information</h3>
            <div class="bill-to-row">
                <div class="bill-item">
                    <span class="bill-label">Customer Name</span>
                    <span class="bill-value">${invoice.customer.name || 'N/A'}</span>
                </div>
                <div class="bill-item">
                    <span class="bill-label">Phone</span>
                    <span class="bill-value">${invoice.customer.phone || 'N/A'}</span>
                </div>
                <div class="bill-item">
                    <span class="bill-label">Address</span>
                    <span class="bill-value">${invoice.customer.address || 'N/A'}</span>
                </div>
            </div>

            <!-- ITEMS TABLE -->
            <h3 class="section-title">Services & Parts</h3>
            <table>
                <thead>
                    <tr>
                        <th>Description</th>
                        <th>Quantity</th>
                        <th>Unit Price</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsRows}
                </tbody>
            </table>

            <!-- FIXED TOTALS SECTION -->
            <div class="totals">
                <div class="totals-header">Invoice Summary</div>
                
                <div class="total-row dashed-border">
                    <span class="label">Method</span>
                    <span class="amount">${invoice.payment_method}</span>
                </div>
                
                <div class="total-row dashed-border ${invoice.payment_status.toLowerCase()}">
                    <span class="label">Status</span>
                    <span class="amount">${invoice.payment_status}</span>
                </div>

                <div class="total-row dashed-border">
                    <span class="label">Subtotal</span>
                    <span class="amount">${formatCurrency(subtotal)}</span>
                </div>
                
                ${discountRow}
                
                <div class="total-row dashed-border">
                    <span class="label">Tax (${invoice.tax}%)</span>
                    <span class="amount">${formatCurrency(taxAmount)}</span>
                </div>
                
                ${depositRow}
                
                <div class="total-row grand-total">
                    <span class="label">Total Amount Due</span>
                    <span class="amount">${formatCurrency(grandTotal)}</span>
                </div>
            </div>

            <!-- NOTES SECTION -->
            ${invoice.notes || invoice.refund_notes ? `
            <div class="notes-section">
                ${invoice.notes ? `<p><strong>Notes:</strong> ${invoice.notes}</p>` : ''}
                ${invoice.refund_notes ? `<p><strong>Refund Notes:</strong> ${invoice.refund_notes}</p>` : ''}
            </div>
            ` : ''}
        </div>

        <!-- FOOTER -->
        <div class="footer">
            <h3>Thank you for your business!</h3>
            <p>This is a computer-generated invoice. No signature required.</p>
        </div>
    </div>
</body>
</html>
  `;
}

// utils/pdfGenerator-simple.js
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
// Simplified working PDF generator
async function generateInvoicePDF(invoice) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4

  const font = await pdfDoc.embedFont('Helvetica');
  const boldFont = await pdfDoc.embedFont('Helvetica-Bold');

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Calculate totals
  const subtotal = invoice.items.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = subtotal * (invoice.discount / 100);
  const taxAmount = (subtotal - discountAmount) * (invoice.tax / 100);
  const grandTotal = subtotal - discountAmount + taxAmount - invoice.deposit;

  const invoiceDate = new Date(invoice.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  let y = 800;

  // Header
  page.drawText('WORLDS BEST AUTO LLC', {
    x: 50, y: y, size: 20, font: boldFont, color: rgb(0, 0.4, 0.8)
  });
  y -= 25;

  page.drawText('247 North Main Street, Statesboro, GA', {
    x: 50, y: y, size: 12, font, color: rgb(0, 0, 0)
  });
  y -= 15;

  page.drawText('91 26817671 | contact@worldsbestauto.com', {
    x: 50, y: y, size: 12, font, color: rgb(0, 0, 0)
  });
  y -= 30;

  // Invoice details
  page.drawText(`Invoice #: ${invoice.invoiceNumber}`, {
    x: 400, y: 775, size: 12, font: boldFont, color: rgb(0, 0, 0)
  });

  page.drawText(`Date: ${invoiceDate}`, {
    x: 400, y: 755, size: 12, font, color: rgb(0, 0, 0)
  });

  page.drawText(`VIN: ${invoice.vehicle?.vin || 'N/A'}`, {
    x: 400, y: 735, size: 12, font, color: rgb(0, 0, 0)
  });

  page.drawText(`Vehicle: ${invoice.vehicle?.model || 'N/A'}`, {
    x: 400, y: 715, size: 12, font, color: rgb(0, 0, 0)
  });

  y = 650;

  // Customer Information
  page.drawText('Customer Information', {
    x: 50, y: y, size: 16, font: boldFont, color: rgb(0, 0, 0)
  });
  y -= 30;

  page.drawText(`Name: ${invoice.customer.name || 'N/A'}`, {
    x: 50, y: y, size: 12, font, color: rgb(0, 0, 0)
  });
  y -= 20;

  page.drawText(`Phone: ${invoice.customer.phone || 'N/A'}`, {
    x: 50, y: y, size: 12, font, color: rgb(0, 0, 0)
  });
  y -= 20;

  page.drawText(`Address: ${invoice.customer.address || 'N/A'}`, {
    x: 50, y: y, size: 12, font, color: rgb(0, 0, 0)
  });
  y -= 40;

  // Items Table Header
  page.drawText('Services & Parts', {
    x: 50, y: y, size: 16, font: boldFont, color: rgb(0, 0, 0)
  });
  y -= 30;

  // Draw table headers
  page.drawText('Description', { x: 50, y, size: 12, font: boldFont });
  page.drawText('Qty', { x: 350, y, size: 12, font: boldFont });
  page.drawText('Price', { x: 400, y, size: 12, font: boldFont });
  page.drawText('Total', { x: 480, y, size: 12, font: boldFont });

  y -= 20;
  page.drawLine({
    start: { x: 50, y },
    end: { x: 550, y },
    thickness: 1,
    color: rgb(0, 0, 0),
  });
  y -= 20;

  // Items
  invoice.items.forEach(item => {
    // Wrap long descriptions
    const description = item.name.length > 40 ? item.name.substring(0, 40) + '...' : item.name;

    page.drawText(description, { x: 50, y, size: 10, font });
    page.drawText(item.quantity.toString(), { x: 350, y, size: 10, font });
    page.drawText(formatCurrency(item.price), { x: 400, y, size: 10, font });
    page.drawText(formatCurrency(item.total), { x: 480, y, size: 10, font });

    y -= 20;
  });

  y -= 30;

  // Totals
  page.drawText('Invoice Summary', {
    x: 50, y, size: 16, font: boldFont, color: rgb(0, 0, 0)
  });
  y -= 30;

  page.drawText('Subtotal:', { x: 350, y, size: 12, font });
  page.drawText(formatCurrency(subtotal), { x: 480, y, size: 12, font: boldFont });
  y -= 20;

  if (invoice.discount > 0) {
    page.drawText(`Discount (${invoice.discount}%):`, { x: 350, y, size: 12, font });
    page.drawText(`-${formatCurrency(discountAmount)}`, { x: 480, y, size: 12, font, color: rgb(1, 0, 0) });
    y -= 20;
  }

  page.drawText(`Tax (${invoice.tax}%):`, { x: 350, y, size: 12, font });
  page.drawText(formatCurrency(taxAmount), { x: 480, y, size: 12, font });
  y -= 20;

  if (invoice.deposit > 0) {
    page.drawText('Deposit:', { x: 350, y, size: 12, font });
    page.drawText(`-${formatCurrency(invoice.deposit)}`, { x: 480, y, size: 12, font, color: rgb(1, 0, 0) });
    y -= 20;
  }

  y -= 10;
  page.drawLine({
    start: { x: 350, y },
    end: { x: 550, y },
    thickness: 2,
    color: rgb(0, 0, 0),
  });
  y -= 20;

  page.drawText('Total Amount Due:', { x: 350, y, size: 14, font: boldFont });
  page.drawText(formatCurrency(grandTotal), {
    x: 480, y, size: 18, font: boldFont, color: rgb(0, 0.4, 0.8)
  });
  y -= 40;

  // Payment Info
  page.drawText(`Payment Status: ${invoice.payment_status}`, {
    x: 50, y, size: 12, font
  });
  y -= 20;

  page.drawText(`Payment Method: ${invoice.payment_method}`, {
    x: 50, y, size: 12, font
  });
  y -= 20;

  if (invoice.deposit > 0) {
    page.drawText(`Deposit Paid: ${formatCurrency(invoice.deposit)}`, {
      x: 50, y, size: 12, font
    });
    y -= 20;
  }

  if (invoice.refund_amount > 0) {
    page.drawText(`Refund Amount: ${formatCurrency(invoice.refund_amount)}`, {
      x: 50, y, size: 12, font
    });
    y -= 20;

    if (invoice.refund_notes) {
      page.drawText(`Refund Notes: ${invoice.refund_notes}`, {
        x: 50, y, size: 10, font, color: rgb(0.5, 0.5, 0.5)
      });
      y -= 20;
    }
  }

  // Notes
  if (invoice.notes) {
    y -= 20;
    page.drawText('Notes:', { x: 50, y, size: 12, font: boldFont });
    y -= 15;
    page.drawText(invoice.notes, { x: 50, y, size: 10, font });
  }

  // Footer
  page.drawText('Thank you for your business!', {
    x: 200, y: 50, size: 14, font: boldFont, color: rgb(0, 0, 0)
  });

  page.drawText('This is a computer-generated invoice. No signature required.', {
    x: 150, y: 30, size: 10, font, color: rgb(0.5, 0.5, 0.5)
  });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}