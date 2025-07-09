import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { format } from 'date-fns';

// Define styles for the invoice
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    padding: 30,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#1e3a8a', // Dark blue
    padding: 20,
    borderRadius: 8,
    marginBottom: 20,
    color: '#ffffff',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerSub: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 5,
    opacity: 0.9,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    border: '1px solid #e5e7eb',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e3a8a',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    fontSize: 12,
  },
  label: {
    color: '#4b5563',
    fontWeight: 'medium',
  },
  value: {
    color: '#111827',
    fontWeight: 'bold',
  },
  table: {
    border: '1px solid #e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  tableHeader: {
    backgroundColor: '#3b82f6', // Blue
    flexDirection: 'row',
    padding: 8,
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderTop: '1px solid #e5e7eb',
    padding: 8,
    fontSize: 11,
    backgroundColor: '#ffffff',
  },
  tableCell: {
    flex: 1,
    textAlign: 'left',
  },
  total: {
    backgroundColor: '#fef3c7', // Light yellow
    padding: 10,
    borderRadius: 4,
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#b45309',
  },
  footer: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: 10,
    color: '#6b7280',
    borderTop: '1px solid #e5e7eb',
    paddingTop: 10,
  },
  statusBadge: {
    padding: '4 8',
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  statusPaid: { backgroundColor: '#22c55e', color: '#ffffff' }, // Green
  statusPending: { backgroundColor: '#facc15', color: '#111827' }, // Yellow
  statusFailed: { backgroundColor: '#ef4444', color: '#ffffff' }, // Red
});

// InvoiceDocument component
const InvoiceDocument = ({ invoice }) => {
  if (!invoice) {
    return (
      <Document>
        <Page size='A4' style={styles.page}>
          <Text style={{ fontSize: 12, textAlign: 'center', color: '#ef4444' }}>
            No invoice data provided
          </Text>
        </Page>
      </Document>
    );
  }

  const {
    invoiceNumber = 'N/A',
    userId = 'N/A',
    amount = 0,
    creditsPurchased = 0,
    date = new Date(),
    status = 'Unknown',
    paymentTransactionId = 'N/A',
  } = invoice;

  const formattedDate = date ? format(new Date(date), 'MMMM dd, yyyy') : 'N/A';
  const statusStyle =
    status === 'Paid'
      ? styles.statusPaid
      : status === 'Pending'
      ? styles.statusPending
      : styles.statusFailed;

  return (
    <Document>
      <Page size='A4' style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Invoice #{invoiceNumber}</Text>
          <Text style={styles.headerSub}>Billing System</Text>
          <Text style={styles.headerSub}>
            Generated on {format(new Date(), 'MMMM dd, yyyy')}
          </Text>
        </View>

        {/* Billing Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Billing Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Invoice Number:</Text>
            <Text style={styles.value}>{invoiceNumber}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>User ID:</Text>
            <Text style={styles.value}>{userId}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Date:</Text>
            <Text style={styles.value}>{formattedDate}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Status:</Text>
            <Text style={[styles.value, statusStyle]}>{status}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Transaction ID:</Text>
            <Text style={styles.value}>{paymentTransactionId}</Text>
          </View>
        </View>

        {/* Transaction Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transaction Summary</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, { flex: 2 }]}>Description</Text>
              <Text style={styles.tableCell}>Quantity</Text>
              <Text style={styles.tableCell}>Unit Price</Text>
              <Text style={styles.tableCell}>Total</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 2 }]}>
                Credit Purchase
              </Text>
              <Text style={styles.tableCell}>
                {creditsPurchased.toLocaleString()} Credits
              </Text>
              <Text style={styles.tableCell}>
                Rs.{(amount / creditsPurchased).toFixed(2)}
              </Text>
              <Text style={styles.tableCell}>Rs.{amount.toLocaleString()}</Text>
            </View>
          </View>
          <View style={styles.total}>
            <Text>Total Amount</Text>
            <Text>Rs.{amount.toLocaleString()}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Thank you for your purchase!</Text>
          <Text>
            Contact: support@billing-system.com | www.billing-system.com
          </Text>
          <Text>123 Business Ave, Suite 100, Tech City</Text>
        </View>
      </Page>
    </Document>
  );
};

export default InvoiceDocument;
