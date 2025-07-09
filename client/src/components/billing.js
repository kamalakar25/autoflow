import { pdf, PDFViewer } from '@react-pdf/renderer';
import Chart from 'chart.js/auto';
import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import InvoiceDocument from './InvoiceDocument';

const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

const BillingDashboard = () => {
  // Hardcoded authenticated user data
  // const userId = '6868b286340422c44031b149';
  const userId = localStorage.getItem("userId")
  // const userEmail = 'kamalsai@example.com';
  // const userPhone = '9876543211';

  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [, setSelectedPackage] = useState(null);
  const [showAllInvoicesModal, setShowAllInvoicesModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [creditData, setCreditData] = useState({
    currentCredits: 0,
    totalCreditsUsed: 0,
    creditUsagePercentage: 0,
    autoTopup: {
      enabled: false,
      threshold: 100,
      amount: 1000,
      lastTopUpTimestamp: null,
      count: 0,
    },
    monthlySpend: 0,
    creditsPerDay: 0,
    apiCalls: 0,
    nextBillingDate: null,
  });
  const [, setTransactions] = useState([]);
  const [sixMonthTransactions, setSixMonthTransactions] = useState([]);
  const [oneYearTransactions, setOneYearTransactions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [creditPackages, setCreditPackages] = useState([]);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [, setTransactionsPage] = useState(1);
  const [invoicesPage, setInvoicesPage] = useState(1);
  const [, setTransactionsTotalPages] = useState(1);
  const [invoicesTotalPages, setInvoicesTotalPages] = useState(1);
  const [loadingMoreInvoices, setLoadingMoreInvoices] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [currentInvoice] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState('6months');
  const [newPaymentMethod, setNewPaymentMethod] = useState({
    type: 'Visa',
    cardNumber: '',
    expiry: '',
    cvv: '',
    isDefault: false,
  });
  const [editingPaymentMethodId, setEditingPaymentMethodId] = useState(null);
  const [expiryError, setExpiryError] = useState(null);
  const [cardNumberError, setCardNumberError] = useState(null);
  const [cvvError, setCvvError] = useState(null);
  const [isWebSocketLoading, setIsWebSocketLoading] = useState(false);
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  // Luhn Algorithm for card number validation
  const luhnCheck = (cardNumber) => {
    let sum = 0;
    let isEven = false;
    for (let i = cardNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cardNumber[i]);
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      isEven = !isEven;
    }
    return sum % 10 === 0;
  };

  // Validate Card Number
  const validateCardNumber = (cardNumber) => {
    if (!/^\d{16}$/.test(cardNumber)) {
      return 'Card number must be 16 digits';
    }
    if (!luhnCheck(cardNumber)) {
      return 'Invalid card number (fails Luhn check)';
    }
    return null;
  };

  // Validate Expiry Date
  const validateExpiryDate = (expiry) => {
    const regex = /^(0[1-9]|1[0-2])\/([0-9]{2})$/;
    if (!regex.test(expiry)) {
      return 'Invalid format. Use MM/YY (e.g., 07/25)';
    }

    const [month, year] = expiry.split('/').map(Number);
    const fullYear = 2000 + year;
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    if (
      fullYear < currentYear ||
      (fullYear === currentYear && month < currentMonth)
    ) {
      return 'Expiry date must be in the present or future';
    }

    return null;
  };

  // Validate CVV
  const validateCvv = (cvv) => {
    if (!/^\d{3,4}$/.test(cvv)) {
      return 'CVV must be 3 or 4 digits';
    }
    return null;
  };

  // Fetch payment methods
  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch(
        `${BASE_URL}/api/billing/payment-methods?userId=${userId}`,
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setPaymentMethods(Array.isArray(data) ? data : []);
    } catch (error) {
      // console.error('Error fetching payment methods:', error);
      setErrorMessage(`Failed to load payment methods: ${error.message}`);
    }
  };

  // Fetch initial data
  const fetchData = useCallback(
    async (reset = false) => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const [
          creditRes,
          sixMonthTransactionsRes,
          oneYearTransactionsRes,
          invoicesRes,
          creditPackagesRes,
        ] = await Promise.all([
          fetch(`${BASE_URL}/api/billing/credit-usage?userId=${userId}`, {
            headers: { 'Content-Type': 'application/json' },
          }),
          fetch(
            `${BASE_URL}/api/billing/transactions?userId=${userId}&page=1&limit=50&range=6months`,
            {
              headers: { 'Content-Type': 'application/json' },
            }
          ),
          fetch(
            `${BASE_URL}/api/billing/transactions?userId=${userId}&page=1&limit=50&range=1year`,
            {
              headers: { 'Content-Type': 'application/json' },
            }
          ),
          fetch(
            `${BASE_URL}/api/billing/invoices?userId=${userId}&page=1&limit=10`,
            {
              headers: { 'Content-Type': 'application/json' },
            }
          ),
          fetch(`${BASE_URL}/api/billing/packages`, {
            headers: { 'Content-Type': 'application/json' },
          }),
        ]);

        if (!creditRes.ok)
          throw new Error(`Credit usage request failed: ${creditRes.status}`);
        if (!sixMonthTransactionsRes.ok)
          throw new Error(
            `6-month transactions request failed: ${sixMonthTransactionsRes.status}`
          );
        if (!oneYearTransactionsRes.ok)
          throw new Error(
            `1-year transactions request failed: ${oneYearTransactionsRes.status}`
          );
        if (!invoicesRes.ok)
          throw new Error(`Invoices request failed: ${invoicesRes.status}`);
        if (!creditPackagesRes.ok)
          throw new Error(
            `Packages request failed: ${creditPackagesRes.status}`
          );

        const [
          creditData,
          sixMonthTransactionsData,
          oneYearTransactionsData,
          invoicesData,
          creditPackagesData,
        ] = await Promise.all([
          creditRes.json(),
          sixMonthTransactionsRes.json(),
          oneYearTransactionsRes.json(),
          invoicesRes.json(),
          creditPackagesRes.json(),
        ]);

        const enrichedSixMonthTransactions = Array.isArray(
          sixMonthTransactionsData.transactions
        )
          ? sixMonthTransactionsData.transactions.map((t) => ({
              ...t,
              credits:
                creditPackagesData.find((pkg) => pkg.id === t.creditPackageId)
                  ?.credits ||
                t.amount ||
                0,
            }))
          : [];
        const enrichedOneYearTransactions = Array.isArray(
          oneYearTransactionsData.transactions
        )
          ? oneYearTransactionsData.transactions.map((t) => ({
              ...t,
              credits:
                creditPackagesData.find((pkg) => pkg.id === t.creditPackageId)
                  ?.credits ||
                t.amount ||
                0,
            }))
          : [];

        const nextBillingDate = new Date();
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

        setCreditData({
          currentCredits: creditData.currentCredits || 0,
          totalCreditsUsed: creditData.totalCreditsUsed || 0,
          creditUsagePercentage: Number.isFinite(
            creditData.creditUsagePercentage
          )
            ? Math.min(creditData.creditUsagePercentage, 100)
            : 0,
          autoTopup: {
            enabled: creditData.autoTopup?.enabled || false,
            threshold: creditData.autoTopup?.threshold || 100,
            amount: creditData.autoTopup?.amount || 1000,
            lastTopUpTimestamp:
              creditData.autoTopup?.lastTopUpTimestamp || null,
            count: creditData.autoTopup?.count || 0,
          },
          monthlySpend: creditData.monthlySpend || 0,
          creditsPerDay: creditData.creditsPerDay || 0,
          apiCalls: creditData.apiCalls || 0,
          nextBillingDate: nextBillingDate.toISOString(),
        });
        setSixMonthTransactions(enrichedSixMonthTransactions);
        setOneYearTransactions(enrichedOneYearTransactions);
        setTransactions(
          selectedTimeframe === '6months'
            ? enrichedSixMonthTransactions
            : enrichedOneYearTransactions
        );
        setTransactionsTotalPages(
          Number.isFinite(sixMonthTransactionsData.totalPages)
            ? sixMonthTransactionsData.totalPages
            : 1
        );
        setInvoices(
          Array.isArray(invoicesData.invoices) ? invoicesData.invoices : []
        );
        setInvoicesTotalPages(
          Number.isFinite(invoicesData.totalPages) ? invoicesData.totalPages : 1
        );
        setCreditPackages(
          Array.isArray(creditPackagesData) ? creditPackagesData : []
        );
        setErrorMessage(null);

        if (reset) {
          setTransactionsPage(1);
          setInvoicesPage(1);
        }
      } catch (error) {
        // console.error('Error fetching data:', error);
        setErrorMessage(
          `Failed to load billing data: ${error.message}. Please try again.`
        );
        setSixMonthTransactions([]);
        setOneYearTransactions([]);
        setTransactions([]);
        setInvoices([]);
        setCreditPackages([]);
      } finally {
        setLoading(false);
      }
    },
    [userId, selectedTimeframe]
  );

  // WebSocket setup
  useEffect(() => {
    const socket = io(BASE_URL);
    socket.on('connect', () => {
      // console.log('Connected to WebSocket server');
      socket.emit('join', userId);
    });
    socket.on('autoTopup', (data) => {
      setIsWebSocketLoading(true);
      setCreditData((prev) => ({
        ...prev,
        currentCredits: data.currentCredits || prev.currentCredits,
        autoTopup: {
          ...prev.autoTopup,
          count: data.autoTopupCount || prev.autoTopup.count,
          lastTopUpTimestamp:
            data.lastTopUpTimestamp || prev.autoTopup.lastTopUpTimestamp,
        },
      }));
      setSixMonthTransactions((prev) => [
        ...prev,
        ...(data.transaction ? [data.transaction] : []),
      ]);
      setOneYearTransactions((prev) => [
        ...prev,
        ...(data.transaction ? [data.transaction] : []),
      ]);
      setTransactions((prev) => [
        ...prev,
        ...(data.transaction ? [data.transaction] : []),
      ]);
      setInvoices((prev) => [...prev, ...(data.invoice ? [data.invoice] : [])]);
      setErrorMessage(null);
      setTimeout(() => {
        setIsWebSocketLoading(false);
        alert('Auto top-up completed! Credits added.');
      }, 1000);
    });
    socket.on('paymentVerified', (data) => {
      setIsWebSocketLoading(true);
      setCreditData((prev) => ({
        ...prev,
        currentCredits: data.currentCredits || prev.currentCredits,
        autoTopup: {
          ...prev.autoTopup,
          lastTopUpTimestamp:
            data.transaction?.timestamp || prev.autoTopup.lastTopUpTimestamp,
        },
      }));
      setSixMonthTransactions((prev) => [
        ...prev,
        ...(data.transaction ? [data.transaction] : []),
      ]);
      setOneYearTransactions((prev) => [
        ...prev,
        ...(data.transaction ? [data.transaction] : []),
      ]);
      setTransactions((prev) => [
        ...prev,
        ...(data.transaction ? [data.transaction] : []),
      ]);
      setInvoices((prev) => [...prev, ...(data.invoice ? [data.invoice] : [])]);
      setErrorMessage(null);
      setTimeout(() => {
        setIsWebSocketLoading(false);
        alert('Payment successful! Credits added.');
      }, 1000);
    });
    socket.on('error', (error) => {
      // console.error('WebSocket error:', error);
      setErrorMessage(`WebSocket error: ${error.message}`);
      setIsWebSocketLoading(false);
    });
    return () => socket.disconnect();
  }, [userId]);

  // Initial data fetch
  useEffect(() => {
    Promise.all([fetchData(true), fetchPaymentMethods()]).catch((error) => {
      // console.error('Error during initial fetch:', error);
      setErrorMessage('Failed to load initial data. Please try again.');
      setLoading(false);
    });
  }, [fetchData]);

  const downloadInvoice = async (invoice) => {
    const blob = await pdf(<InvoiceDocument invoice={invoice} />).toBlob();

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const fileName = `Invoice_${invoice.invoiceNumber || 'unknown'}.pdf`;

    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();

    // Cleanup
    link.remove();
    URL.revokeObjectURL(url);
  };

  const loadMoreInvoices = async () => {
    setLoadingMoreInvoices(true);
    try {
      const response = await fetch(
        `${BASE_URL}/api/billing/invoices?userId=${userId}&page=${
          invoicesPage + 1
        }&limit=10`
      );
      if (!response.ok) throw new Error('Failed to load invoices');
      const data = await response.json();
      setInvoices((prev) => [...prev, ...data.invoices]);
      setInvoicesPage(data.page);
      setInvoicesTotalPages(data.totalPages);
    } catch (error) {
      setErrorMessage(`Failed to load invoices: ${error.message}`);
    } finally {
      setLoadingMoreInvoices(false);
    }
  };

  const handleExportTransactions = async () => {
    let XLSX;
    try {
      XLSX = window.XLSX;
      if (!XLSX) {
        setErrorMessage('Loading Excel library... Please wait.');
        const script = document.createElement('script');
        script.src =
          'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
        script.async = true;
        document.head.appendChild(script);
        await new Promise((resolve, reject) => {
          script.onload = () => resolve();
          script.onerror = () =>
            reject(new Error('Failed to load Excel library.'));
        });
        XLSX = window.XLSX;
        if (!XLSX) throw new Error('Excel library not loaded.');
        setErrorMessage(null);
      }
    } catch (error) {
      // console.error('Error loading XLSX:', error);
      setErrorMessage('Failed to load Excel library.');
      return;
    }

    const allTransactions = [
      ...sixMonthTransactions,
      ...oneYearTransactions.filter(
        (t) => !sixMonthTransactions.some((s) => s._id === t._id)
      ),
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (allTransactions.length === 0) {
      setErrorMessage('No transactions available to export.');
      return;
    }

    const data = allTransactions.map((transaction) => ({
      Type: transaction.type
        ? transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)
        : 'Unknown',
      Description: transaction.description || 'N/A',
      Credits: transaction.credits || 0,
      Amount: transaction.cost ? `₹${transaction.cost.toLocaleString()}` : '-',
      Date: transaction.timestamp
        ? new Date(transaction.timestamp).toLocaleDateString()
        : 'N/A',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');

    const colWidths = [
      { wch: 15 },
      { wch: 30 },
      { wch: 10 },
      { wch: 15 },
      { wch: 15 },
    ];
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(
      workbook,
      `Transaction_History_${new Date().toISOString().split('T')[0]}.xlsx`
    );
    setShowExportModal(false);
    setErrorMessage(null);
  };

  const getStatusBadge = (status) => (
    <span
      className={`inline-block px-2 py-1 text-white rounded ${
        status === 'Paid'
          ? 'bg-green-500'
          : status === 'Pending'
          ? 'bg-yellow-500'
          : status === 'Failed'
          ? 'bg-red-500'
          : 'bg-gray-500'
      }`}
    >
      {status || 'Unknown'}
    </span>
  );

  const handlePurchase = async (pkg) => {
    if (!pkg || !pkg.id || !pkg.price) {
      setErrorMessage('Invalid package selected.');
      return;
    }
    try {
      const response = await fetch(`${BASE_URL}/api/billing/purchase-credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          creditPackageId: pkg.id,
          amount: pkg.price,
        }),
      });

      if (!response.ok)
        throw new Error(`Failed to create payment order: ${response.status}`);

      const { orderId } = await response.json();

      const razorpayKeyId = process.env.REACT_APP_RAZORPAY_KEY_ID;
      if (!razorpayKeyId) throw new Error('Razorpay Key ID is not configured');

      const options = {
        key: razorpayKeyId,
        amount: pkg.price * 100,
        currency: 'INR',
        name: 'Billing System',
        description: `Purchase ${pkg.credits} Credits`,
        order_id: orderId,
        handler: async (response) => {
          try {
            const verifyResponse = await fetch(
              `${BASE_URL}/api/billing/verify-payment`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  creditPackageId: pkg.id,
                }),
              }
            );

            if (!verifyResponse.ok)
              throw new Error(
                `Payment verification failed: ${verifyResponse.status}`
              );

            const result = await verifyResponse.json();
            if (result.success) {
              setShowPurchaseModal(false);
              setErrorMessage(null);
              setSuccessMessage('Payment successful! Credits added.');
              setTimeout(() => setSuccessMessage(null), 3000);
            } else {
              setErrorMessage(result.error || 'Payment verification failed.');
            }
          } catch (error) {
            setErrorMessage(`Payment verification error: ${error.message}`);
          }
        },
        theme: { color: '#3399cc' },
        modal: {
          ondismiss: () => {
            setErrorMessage('Payment cancelled.');
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response) => {
        setErrorMessage(`Payment failed: ${response.error.description}`);
      });
      rzp.open();
    } catch (error) {
      setErrorMessage(`Purchase error: ${error.message}`);
    }
  };

  const handleAutoTopupSave = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const config = {
      userId,
      enable: formData.get('autoTopup') === 'on',
      threshold: parseInt(formData.get('threshold')) || 100,
      amount: parseInt(formData.get('topupAmount')) || 1000,
    };
    try {
      const response = await fetch(
        `${BASE_URL}/api/billing/auto-topup-config`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Failed to save auto top-up: ${response.status}`
        );
      }

      const result = await response.json();
      setCreditData((prev) => ({
        ...prev,
        autoTopup: {
          enabled: result.config.enabled,
          threshold: result.config.threshold,
          amount: result.config.amount,
          lastTopUpTimestamp: prev.autoTopup.lastTopUpTimestamp,
          count: prev.autoTopup.count,
        },
      }));
      setErrorMessage(null);
      setSuccessMessage('Auto top-up configuration saved.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      setErrorMessage(`Failed to save auto top-up: ${error.message}`);
    }
  };

  const handleAddPaymentMethod = async (e) => {
    e.preventDefault();
    setIsSavingPayment(true);
    setErrorMessage(null);

    const expiryValidationError = validateExpiryDate(newPaymentMethod.expiry);
    const cardNumberValidationError = validateCardNumber(
      newPaymentMethod.cardNumber
    );
    const cvvValidationError = validateCvv(newPaymentMethod.cvv);

    if (cardNumberValidationError) {
      setCardNumberError(cardNumberValidationError);
      setIsSavingPayment(false);
      return;
    }
    if (expiryValidationError) {
      setExpiryError(expiryValidationError);
      setIsSavingPayment(false);
      return;
    }
    if (cvvValidationError) {
      setCvvError(cvvValidationError);
      setIsSavingPayment(false);
      return;
    }

    // Validate editingPaymentMethodId
    if (
      editingPaymentMethodId &&
      !paymentMethods.some((m) => m.id === parseInt(editingPaymentMethodId))
    ) {
      setErrorMessage('Payment method not found in current list');
      setIsSavingPayment(false);
      return;
    }

    const maxRetries = 3;
    let attempt = 0;
    let lastError = null;

    while (attempt < maxRetries) {
      try {
        const url = editingPaymentMethodId
          ? `${BASE_URL}/api/billing/payment-methods/${editingPaymentMethodId}?userId=${userId}`
          : `${BASE_URL}/api/billing/payment-methods?userId=${userId}`;
        const method = editingPaymentMethodId ? 'PUT' : 'POST';

        // console.log(`Attempting ${method} for payment method, id: ${editingPaymentMethodId || "new"}`);

        const payload = {
          type: newPaymentMethod.type,
          cardNumber: newPaymentMethod.cardNumber,
          expiry: newPaymentMethod.expiry,
          isDefault: newPaymentMethod.isDefault,
        };

        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          let errorMessage =
            errorData.error ||
            `Failed to ${
              editingPaymentMethodId ? 'update' : 'add'
            } payment method`;
          if (response.status === 401) {
            errorMessage = 'Unauthorized: Please check your login credentials.';
          } else if (response.status === 400) {
            errorMessage = `Invalid data: ${
              errorData.error || 'Please check your input.'
            }`;
          } else if (response.status === 404) {
            errorMessage = `Not found: ${
              errorData.error || 'Payment method or user not found.'
            }`;
          } else if (response.status === 500) {
            errorMessage = 'Server error: Please try again later.';
          }
          throw new Error(errorMessage);
        }

        const data = await response.json();
        setPaymentMethods(Array.isArray(data) ? data : []);
        setNewPaymentMethod({
          type: 'Visa',
          cardNumber: '',
          expiry: '',
          cvv: '',
          isDefault: false,
        });
        setEditingPaymentMethodId(null);
        setShowAddPaymentModal(false);
        setExpiryError(null);
        setCardNumberError(null);
        setCvvError(null);
        setSuccessMessage(
          `Payment method ${
            editingPaymentMethodId ? 'updated' : 'added'
          } successfully.`
        );
        setTimeout(() => setSuccessMessage(null), 3000);
        await fetchPaymentMethods();
        return;
      } catch (error) {
        // console.error(`Attempt ${attempt + 1} failed:`, error);
        lastError = error;
        attempt++;
        if (attempt < maxRetries) {
          const delay = 1000 * attempt;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      } finally {
        setIsSavingPayment(false);
      }
    }

    setErrorMessage(
      `Failed to ${
        editingPaymentMethodId ? 'update' : 'add'
      } payment method after ${maxRetries} attempts: ${lastError.message}`
    );
  };

  const handleRemovePaymentMethod = async (id) => {
    try {
      if (!paymentMethods.some((m) => m.id === parseInt(id))) {
        setErrorMessage('Payment method not found in current list');
        return;
      }

      // console.log(`Attempting to remove payment method with id: ${id}`);

      const response = await fetch(
        `${BASE_URL}/api/billing/payment-methods/${id}?userId=${userId}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error ||
            `Failed to remove payment method: ${response.status}`
        );
      }

      const data = await response.json();
      setPaymentMethods(Array.isArray(data) ? data : []);
      setErrorMessage(null);
      setSuccessMessage('Payment method removed successfully.');
      setTimeout(() => setSuccessMessage(null), 3000);
      await fetchPaymentMethods();
    } catch (error) {
      setErrorMessage(`Failed to remove payment method: ${error.message}`);
    }
  };

  const handleEditPaymentMethod = (id) => {
    const method = paymentMethods.find((m) => m.id === parseInt(id));
    if (!method) {
      setErrorMessage('Payment method not found');
      return;
    }
    setNewPaymentMethod({ ...method, cardNumber: '', cvv: '' });
    setEditingPaymentMethodId(id);
    setShowAddPaymentModal(true);
    setExpiryError(null);
    setCardNumberError(null);
    setCvvError(null);
    setErrorMessage(null);
  };

  const handleCancelEditPaymentMethod = () => {
    setNewPaymentMethod({
      type: 'Visa',
      cardNumber: '',
      expiry: '',
      cvv: '',
      isDefault: false,
    });
    setEditingPaymentMethodId(null);
    setShowAddPaymentModal(false);
    setErrorMessage(null);
    setExpiryError(null);
    setCardNumberError(null);
    setCvvError(null);
  };

  const handleSetDefaultPaymentMethod = async (id) => {
    try {
      if (!paymentMethods.some((m) => m.id === parseInt(id))) {
        setErrorMessage('Payment method not found in current list');
        return;
      }

      // console.log(`Attempting to set default payment method with id: ${id}`);

      const response = await fetch(
        `${BASE_URL}/api/billing/payment-methods/${id}/set-default?userId=${userId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error ||
            `Failed to set default payment method: ${response.status}`
        );
      }

      const data = await response.json();
      setPaymentMethods(Array.isArray(data) ? data : []);
      setErrorMessage(null);
      setSuccessMessage('Default payment method set successfully.');
      setTimeout(() => setSuccessMessage(null), 3000);
      await fetchPaymentMethods();
    } catch (error) {
      setErrorMessage(`Failed to set default payment method: ${error.message}`);
    }
  };

  const getChartData = useCallback(() => {
    const now = new Date();
    const monthsToShow = selectedTimeframe === '6months' ? 6 : 12;
    const labels = [];
    const availableCreditsData = [];
    const usedCreditsData = [];

    for (let i = monthsToShow - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(
        date.toLocaleString('default', { month: 'short', year: 'numeric' })
      );
      availableCreditsData.push(0);
      usedCreditsData.push(0);
    }

    const transactionsToUse =
      selectedTimeframe === '6months'
        ? sixMonthTransactions
        : oneYearTransactions;

    let runningAvailableCredits = 0;
    let runningUsedCredits = 0;

    const sortedTransactions = [...transactionsToUse].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );

    sortedTransactions.forEach((t) => {
      const transactionDate = new Date(t.timestamp);
      const monthIndex =
        monthsToShow -
        1 -
        (now.getMonth() -
          transactionDate.getMonth() +
          12 * (now.getFullYear() - transactionDate.getFullYear()));

      if (monthIndex >= 0 && monthIndex < monthsToShow) {
        if (t.type === 'purchase' || t.type === 'top-up') {
          runningAvailableCredits += t.credits || 0;
        } else if (t.type === 'deduction') {
          runningUsedCredits += Math.abs(t.credits || 0);
          runningAvailableCredits -= Math.abs(t.credits || 0);
        }
        availableCreditsData[monthIndex] = Math.max(runningAvailableCredits, 0);
        usedCreditsData[monthIndex] = runningUsedCredits;
      }
    });

    availableCreditsData[monthsToShow - 1] = creditData.currentCredits;
    usedCreditsData[monthsToShow - 1] = creditData.totalCreditsUsed;

    return { labels, availableCreditsData, usedCreditsData };
  }, [
    selectedTimeframe,
    sixMonthTransactions,
    oneYearTransactions,
    creditData,
  ]);

  useEffect(() => {
    if (chartRef.current) {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      const { labels, availableCreditsData, usedCreditsData } = getChartData();

      chartInstance.current = new Chart(chartRef.current, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Available Credits',
              data: availableCreditsData,
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              tension: 0.4,
              fill: true,
              pointRadius: 4,
              pointHoverRadius: 6,
            },
            {
              label: 'Total Credits Used',
              data: usedCreditsData,
              borderColor: '#ef4444',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              tension: 0.4,
              fill: true,
              pointRadius: 4,
              pointHoverRadius: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Credits',
                font: { size: 14, weight: 'bold' },
              },
              ticks: { font: { size: 12 } },
              grid: { color: 'rgba(200, 200, 200, 0.2)' },
            },
            x: {
              title: {
                display: true,
                text: 'Months',
                font: { size: 14, weight: 'bold' },
              },
              ticks: { font: { size: 12 } },
              grid: { color: 'rgba(200, 200, 200, 0.2)' },
            },
          },
          plugins: {
            legend: {
              position: 'top',
              labels: { font: { size: 14, weight: 'bold' } },
            },
            tooltip: {
              enabled: true,
              mode: 'index',
              intersect: false,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              titleFont: { size: 14 },
              bodyFont: { size: 12 },
              borderColor: 'rgba(255, 255, 255, 0.1)',
              borderWidth: 1,
              callbacks: {
                label: (context) => {
                  const label = context.dataset.label || '';
                  const value = context.parsed.y;
                  return `${label}: ${value.toLocaleString()} Credits`;
                },
              },
            },
          },
          elements: {
            point: { backgroundColor: '#fff', borderWidth: 2 },
          },
        },
      });
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [
    getChartData,
    chartRef,
    selectedTimeframe,
    creditData,
    sixMonthTransactions,
    oneYearTransactions,
  ]);

  const handleTimeframeChange = (timeframe) => {
    setSelectedTimeframe(timeframe);
    setTransactions(
      timeframe === '6months' ? sixMonthTransactions : oneYearTransactions
    );
  };

  return (
    <div className='container mx-auto p-4'>
      {errorMessage && (
        <div className='bg-red-100 text-red-800 p-3 rounded mb-4'>
          {errorMessage}
          <button
            className='ml-2 text-red-600 underline'
            onClick={() => setErrorMessage(null)}
          >
            Dismiss
          </button>
        </div>
      )}
      {successMessage && (
        <div className='bg-green-100 text-green-800 p-3 rounded mb-4'>
          {successMessage}
          <button
            className='ml-2 text-green-600 underline'
            onClick={() => setSuccessMessage(null)}
          >
            Dismiss
          </button>
        </div>
      )}
      {loading && (
        <div className='text-center p-4'>Loading billing data...</div>
      )}
      {isWebSocketLoading && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white rounded-lg p-6 flex flex-col items-center'>
            <div className='animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500 border-solid'></div>
            <p className='mt-4 text-gray-700'>Processing payment...</p>
          </div>
        </div>
      )}
      {!loading && (
        <>
          <div className='flex flex-col sm:flex-row justify-between items-center mb-4 space-y-4 sm:space-y-0'>
            <h1 className='text-xl sm:text-2xl font-bold'>
              💳 Billing & Credits
            </h1>
            <div className='flex flex-wrap gap-2 justify-center sm:justify-end'>
              <button
                className='bg-blue-500 text-white px-3 py-2 rounded text-sm sm:text-base w-full sm:w-auto'
                onClick={() => setShowPurchaseModal(true)}
              >
                💰 Buy Credits
              </button>
              <button
                className='border border-blue-500 text-blue-500 px-3 py-2 rounded text-sm sm:text-base w-full sm:w-auto'
                onClick={() => setShowExportModal(true)}
              >
                📥 Export Transactions
              </button>
              <button
                className='border border-blue-500 text-blue-500 px-3 py-2 rounded text-sm sm:text-base w-full sm:w-auto'
                onClick={() => setShowAllInvoicesModal(true)}
              >
                📄 Invoices
              </button>
            </div>
          </div>
<div className='grid grid-cols-1 lg:grid-cols- md:grid-cols-2 gap-4 mb-4'>
  <div className='bg-white shadow rounded p-4'>
    <h5 className='text-lg lg:text-base font-bold'>💎 Credit Balance</h5>
    <div className='grid grid-cols-1 md:grid-cols-2'>
      <div className='text-center mb-3'>
        <div className='text-4xl lg:text-2xl font-bold text-green-500'>
          {creditData.currentCredits.toLocaleString()}
        </div>
        <div className='text-gray-500 text-sm lg:text-xs'>Available Credits</div>
      </div>
      <div className='text-center mb-3'>
        <div className='text-3xl lg:text-xl font-bold text-blue-500'>
          {creditData.totalCreditsUsed.toLocaleString()}
        </div>
        <div className='text-gray-500 text-sm lg:text-xs'>Total Used</div>
      </div>
    </div>
    <div className='mb-3'>
      <div className='flex justify-between text-sm lg:text-xs mb-1'>
        <span>Usage Percentage</span>
        <span>{creditData.creditUsagePercentage.toFixed(2)}%</span>
      </div>
      <div className='w-full bg-gray-200 rounded-full h-2.5'>
        <div
          className='bg-blue-500 h-2.5 rounded-full'
          style={{
            width: `${Math.min(creditData.creditUsagePercentage, 100)}%`,
          }}
        ></div>
      </div>
    </div>
  </div>

 

  <div className='bg-white shadow rounded p-4 text-center'>
    <div className='text-4xl lg:text-2xl text-yellow-500 mb-2'>📅</div>
    <h5 className='mb-1 text-base lg:text-sm'>Next Billing</h5>
    <h3 className='text-yellow-500 text-xl lg:text-lg'>
      {creditData.nextBillingDate
        ? new Date(creditData.nextBillingDate).toLocaleDateString()
        : 'N/A'}
    </h3>
  </div>
</div>


          <div className='bg-blue-100 text-blue-800 p-3 rounded mb-2'>
            <strong>💡 Tip:</strong> Enable auto top-up to never run out of
            credits during important automation jobs.
          </div>

         <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4'>
  <div className='bg-white shadow rounded p-4 text-center'>
    <div className='text-3xl lg:text-2xl text-green-500 mb-2'>💰</div>
    <h5 className='mb-1 text-base lg:text-sm'>This Month</h5>
    <h3 className='text-green-500 text-xl lg:text-lg'>
      ₹{creditData.monthlySpend?.toLocaleString() || 0}
    </h3>
  </div>

  <div className='bg-white shadow rounded p-4 text-center'>
    <div className='text-3xl lg:text-2xl text-blue-500 mb-2'>📊</div>
    <h5 className='mb-1 text-base lg:text-sm'>Credits/Day</h5>
    <h3 className='text-blue-500 text-xl lg:text-lg'>
      {creditData.creditsPerDay || 0}
    </h3>
  </div>

  <div className='bg-white shadow rounded p-4 text-center'>
    <div className='text-3xl lg:text-2xl text-blue-500 mb-2'>🔄</div>
    <h5 className='mb-1 text-base lg:text-sm'>Auto Top-up</h5>
    <h3 className='text-blue-500 text-xl lg:text-lg'>
      {creditData.autoTopup.count || 0}
    </h3>
  </div>

  <div className='bg-white shadow rounded p-4 text-center'>
    <div className='text-3xl lg:text-2xl text-yellow-500 mb-2'>📄</div>
    <h5 className='mb-1 text-base lg:text-sm'>Invoices</h5>
    <h3 className='text-yellow-500 text-xl lg:text-lg'>
      {invoices.length || 0}
    </h3>
  </div>
</div>


          <div className='mb-6'>
            <div className='bg-white shadow-lg rounded-lg p-6 mb-4'>
              <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6'>
                <h3 className='text-lg font-semibold'>Credit Trends</h3>
                <div className='flex bg-gray-100 rounded-lg p-1'>
                  <button
                    onClick={() => handleTimeframeChange('6months')}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                      selectedTimeframe === '6months'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    6 Months
                  </button>
                  <button
                    onClick={() => handleTimeframeChange('1year')}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                      selectedTimeframe === '1year'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    1 Year
                  </button>
                </div>
              </div>
              <div className='h-80 w-full'>
                <canvas ref={chartRef}></canvas>
              </div>
            </div>
            <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
              <div className='bg-white shadow rounded p-4'>
                <h6 className='font-bold mb-3'>🔄 Auto Top-up Status</h6>
                <div className='flex justify-between items-center mb-3'>
                  <span>Status:</span>
                  <span
                    className={`text-white px-2 py-1 rounded ${
                      creditData.autoTopup.enabled
                        ? 'bg-green-500'
                        : 'bg-red-500'
                    }`}
                  >
                    {creditData.autoTopup.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className='flex justify-between items-center mb-3'>
                  <span>Threshold:</span>
                  <span className='font-bold'>
                    {creditData.autoTopup.threshold} credits
                  </span>
                </div>
                <div className='flex justify-between items-center mb-3'>
                  <span>Top-up Amount:</span>
                  <span className='font-bold'>
                    {creditData.autoTopup.amount} credits
                  </span>
                </div>
                <div className='flex justify-between items-center mb-3'>
                  <span>Last Top-up:</span>
                  <span className='text-gray-500'>
                    {creditData.autoTopup.lastTopUpTimestamp
                      ? new Date(
                          creditData.autoTopup.lastTopUpTimestamp
                        ).toLocaleDateString()
                      : 'N/A'}
                  </span>
                </div>
                <div className='mb-3'>
                  <label className='block font-bold'>Payment Method</label>
                  <div className='border rounded p-3'>
                    <div className='flex justify-between items-center'>
                      <div>
                        <strong>
                          💳{' '}
                          {paymentMethods.find((m) => m.isDefault)
                            ?.displayCardNumber || 'N/A'}
                        </strong>
                        <div className='text-gray-500 text-sm'>
                          Expires{' '}
                          {paymentMethods.find((m) => m.isDefault)?.expiry ||
                            'N/A'}
                        </div>
                      </div>
                      <button
                        className='border border-blue-500 text-blue-500 px-2 py-1 rounded'
                        onClick={() => {
                          setNewPaymentMethod({
                            type: 'Visa',
                            cardNumber: '',
                            expiry: '',
                            cvv: '',
                            isDefault: false,
                          });
                          setEditingPaymentMethodId(null);
                          setShowAddPaymentModal(true);
                          setExpiryError(null);
                          setCardNumberError(null);
                          setCvvError(null);
                        }}
                      >
                        Change
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  className='bg-white border border-gray-600 text-black px-4 py-2 rounded'
                  onClick={() => {
                    setNewPaymentMethod({
                      type: 'Visa',
                      cardNumber: '',
                      expiry: '',
                      cvv: '',
                      isDefault: false,
                    });
                    setEditingPaymentMethodId(null);
                    setShowAddPaymentModal(true);
                    setExpiryError(null);
                    setCardNumberError(null);
                    setCvvError(null);
                  }}
                >
                  + Add Payment Method
                </button>
              </div>
              <div className='bg-white shadow rounded p-4'>
                <h5 className='text-lg font-bold mb-4'>
                  🔄 Configure Auto Top-up
                </h5>
                <form onSubmit={handleAutoTopupSave}>
                  <div className='mb-3'>
                    <label className='flex items-center'>
                      <input
                        type='checkbox'
                        name='autoTopup'
                        defaultChecked={creditData.autoTopup.enabled}
                        className='mr-2'
                      />
                      Enable Auto Top-up
                    </label>
                    <p className='text-gray-500 text-sm'>
                      Automatically purchase credits when your balance gets low
                    </p>
                  </div>
                  <div className='mb-3'>
                    <label className='block font-bold'>Trigger Threshold</label>
                    <select
                      name='threshold'
                      defaultValue={creditData.autoTopup.threshold || 100}
                      className='w-full border rounded p-2'
                    >
                      <option value='50'>50 credits</option>
                      <option value='100'>100 credits</option>
                      <option value='200'>200 credits</option>
                      <option value='500'>500 credits</option>
                    </select>
                    <p className='text-gray-500 text-sm'>
                      Auto top-up when credits fall below this amount
                    </p>
                  </div>
                  <div className='mb-3'>
                    <label className='block font-bold'>Top-up Amount</label>
                    <select
                      name='topupAmount'
                      defaultValue={creditData.autoTopup.amount || 1000}
                      className='w-full border rounded p-2'
                    >
                      {creditPackages.map((pkg) => (
                        <option key={pkg.id} value={pkg.credits}>
                          {pkg.credits.toLocaleString()} credits (₹
                          {pkg.price.toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className='flex justify-end gap-2 mt-4'>
                    <button
                      type='submit'
                      className='bg-blue-500 text-white px-4 py-2 rounded'
                    >
                      Save Configuration
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          <div className='bg-blue-100 text-blue-800 p-3 rounded mb-3'>
            <strong>ℹ️ Note:</strong> You'll receive an email notification
            whenever auto top-up occurs. You can disable this feature at any
            time.
          </div>

       <div className='mb-6'>
  <div className='bg-white shadow rounded p-4 mb-4 border border-blue-200 flex flex-col'>
    <div className='flex justify-between items-center mb-4'>
      <h5 className='text-lg font-bold'>Payment Methods</h5>

      {/* Desktop Button */}
      <button
        className='bg-blue-600 text-white px-4 py-2 rounded hidden md:block'
        onClick={() => {
          setNewPaymentMethod({
            type: 'Visa',
            cardNumber: '',
            expiry: '',
            cvv: '',
            isDefault: false,
          });
          setEditingPaymentMethodId(null);
          setShowAddPaymentModal(true);
          setExpiryError(null);
          setCardNumberError(null);
          setCvvError(null);
        }}
      >
        + Add Payment Method
      </button>
    </div>

    <p className='text-gray-500 text-sm mb-4'>
      Manage your payment methods
    </p>

    {paymentMethods.length === 0 && (
      <div className='text-center p-4 text-gray-500'>
        No payment methods added.
      </div>
    )}

    {paymentMethods.map((method) => (
      <div
        key={method.id}
        className='flex items-center justify-between p-2 border-b border-gray-200'
      >
        <div className='flex items-center'>
          <span className='mr-2'>📌</span>
          <div>
            <div className={`${method.isDefault ? 'text-green-500' : ''}`}>
              {method.type} {method.displayCardNumber}{' '}
              {method.isDefault && '(Default)'}
            </div>
            <div className='text-gray-500 text-sm'>
              Expires {method.expiry}
            </div>
          </div>
        </div>
        <div className='flex gap-2'>
          <button
            className='text-blue-500 hover:text-blue-700'
            onClick={() => handleEditPaymentMethod(method.id)}
          >
            ✎ Edit
          </button>
          <button
            className='text-blue-500 hover:text-blue-700'
            onClick={() => handleSetDefaultPaymentMethod(method.id)}
            disabled={method.isDefault}
          >
            Set Default
          </button>
          <button
            className='text-red-500 hover:text-red-700'
            onClick={() => handleRemovePaymentMethod(method.id)}
            disabled={method.isDefault}
          >
            🗑️ Remove
          </button>
        </div>
      </div>
    ))}

    {/* Mobile Button inside the container */}
    <div className='mt-4 md:hidden'>
      <button
        className='bg-blue-600 text-white px-4 py-2 rounded w-full'
        onClick={() => {
          setNewPaymentMethod({
            type: 'Visa',
            cardNumber: '',
            expiry: '',
            cvv: '',
            isDefault: false,
          });
          setEditingPaymentMethodId(null);
          setShowAddPaymentModal(true);
          setExpiryError(null);
          setCardNumberError(null);
          setCvvError(null);
        }}
      >
        + Add Payment Method
      </button>
    </div>
  </div>
</div>


          {showAddPaymentModal && (
            <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
              <div className='bg-white rounded-lg p-6 w-full max-w-md'>
                <div className='flex justify-between items-center mb-4'>
                  <h4 className='text-xl font-bold'>
                    {editingPaymentMethodId
                      ? 'Edit Payment Method'
                      : 'Add Payment Method'}
                  </h4>
                  <button
                    onClick={handleCancelEditPaymentMethod}
                    className='text-gray-500 text-2xl'
                    disabled={isSavingPayment}
                  >
                    ✕
                  </button>
                </div>
                <form onSubmit={handleAddPaymentMethod}>
                  <div className='mb-3'>
                    <label className='block font-bold'>Card Type</label>
                    <select
                      value={newPaymentMethod.type}
                      onChange={(e) =>
                        setNewPaymentMethod({
                          ...newPaymentMethod,
                          type: e.target.value,
                        })
                      }
                      className='w-full border rounded p-2'
                      disabled={isSavingPayment}
                    >
                      <option value='Visa'>Visa</option>
                      <option value='Mastercard'>Mastercard</option>
                      <option value='Amex'>Amex</option>
                    </select>
                  </div>
                  <div className='mb-3'>
                    <label className='block font-bold'>Card Number</label>
                    <input
                      type='text'
                      value={newPaymentMethod.cardNumber}
                      onChange={(e) => {
                        const value = e.target.value
                          .replace(/\D/g, '')
                          .slice(0, 16);
                        setNewPaymentMethod({
                          ...newPaymentMethod,
                          cardNumber: value,
                        });
                        const error = validateCardNumber(value);
                        setCardNumberError(error);
                        setErrorMessage(null);
                      }}
                      placeholder='Enter 16-digit card number'
                      maxLength='16'
                      className={`w-full border rounded p-2 ${
                        cardNumberError ? 'border-red-500' : ''
                      }`}
                      required
                      disabled={isSavingPayment}
                    />
                    {cardNumberError && (
                      <p className='text-red-500 text-sm mt-1'>
                        {cardNumberError}
                      </p>
                    )}
                  </div>
                  <div className='mb-3'>
                    <label className='block font-bold'>Expiry Date</label>
                    <input
                      type='text'
                      value={newPaymentMethod.expiry}
                      onChange={(e) => {
                        let value = e.target.value.replace(/[^0-9/]/g, '');
                        if (value.length >= 2 && !value.includes('/')) {
                          value = value.slice(0, 2) + '/' + value.slice(2);
                        }
                        value = value.slice(0, 5);
                        setNewPaymentMethod({
                          ...newPaymentMethod,
                          expiry: value,
                        });
                        const error = validateExpiryDate(value);
                        setExpiryError(error);
                        setErrorMessage(null);
                      }}
                      placeholder='MM/YY'
                      maxLength='5'
                      className={`w-full border rounded p-2 ${
                        expiryError ? 'border-red-500' : ''
                      }`}
                      required
                      disabled={isSavingPayment}
                    />
                    {expiryError && (
                      <p className='text-red-500 text-sm mt-1'>{expiryError}</p>
                    )}
                  </div>
                  <div className='mb-3'>
                    <label className='block font-bold'>CVV</label>
                    <input
                      type='text'
                      value={newPaymentMethod.cvv}
                      onChange={(e) => {
                        const value = e.target.value
                          .replace(/\D/g, '')
                          .slice(0, 4);
                        setNewPaymentMethod({
                          ...newPaymentMethod,
                          cvv: value,
                        });
                        const error = validateCvv(value);
                        setCvvError(error);
                        setErrorMessage(null);
                      }}
                      placeholder='Enter 3-4 digit CVV'
                      maxLength='4'
                      className={`w-full border rounded p-2 ${
                        cvvError ? 'border-red-500' : ''
                      }`}
                      required
                      disabled={isSavingPayment}
                    />
                    {cvvError && (
                      <p className='text-red-500 text-sm mt-1'>{cvvError}</p>
                    )}
                  </div>
                  <div className='mb-3'>
                    <label className='flex items-center'>
                      <input
                        type='checkbox'
                        checked={newPaymentMethod.isDefault}
                        onChange={(e) =>
                          setNewPaymentMethod({
                            ...newPaymentMethod,
                            isDefault: e.target.checked,
                          })
                        }
                        className='mr-2'
                        disabled={isSavingPayment}
                      />
                      Set as Default
                    </label>
                  </div>
                  <div className='flex justify-end gap-2'>
                    <button
                      type='button'
                      className='bg-gray-500 text-white px-4 py-2 rounded'
                      onClick={handleCancelEditPaymentMethod}
                      disabled={isSavingPayment}
                    >
                      Cancel
                    </button>
                    <button
                      type='submit'
                      className={`bg-blue-500 text-white px-4 py-2 rounded flex items-center ${
                        cardNumberError ||
                        expiryError ||
                        cvvError ||
                        isSavingPayment
                          ? 'opacity-50 cursor-not-allowed'
                          : ''
                      }`}
                      disabled={
                        !!cardNumberError ||
                        !!expiryError ||
                        !!cvvError ||
                        isSavingPayment
                      }
                    >
                      {isSavingPayment ? (
                        <>
                          <svg
                            className='animate-spin h-5 w-5 mr-2 text-white'
                            xmlns='http://www.w3.org/2000/svg'
                            fill='none'
                            viewBox='0 0 24 24'
                          >
                            <circle
                              className='opacity-25'
                              cx='12'
                              cy='12'
                              r='10'
                              stroke='currentColor'
                              strokeWidth='4'
                            ></circle>
                            <path
                              className='opacity-75'
                              fill='currentColor'
                              d='M4 12a8 8 0 018-8v8h8a8 8 0 01-16 0z'
                            ></path>
                          </svg>
                          Saving...
                        </>
                      ) : (
                        'Save'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

  {showPurchaseModal && (
  <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
    <div className='bg-white rounded-lg p-4 sm:p-6 w-full max-w-[95vw] sm:max-w-[90vw] md:max-w-3xl max-h-[90vh] overflow-y-auto mx-2 sm:mx-4 lg:mr-64'>
      <div className='flex justify-between items-center mb-4'>
        <h4 className='text-lg sm:text-xl font-bold'>💰 Purchase Credits</h4>
        <button
          onClick={() => {
            setShowPurchaseModal(false);
            setSelectedPackage(null);
          }}
          className='text-gray-500 text-xl sm:text-2xl'
        >
          ✕
        </button>
      </div>
      <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'>
        {creditPackages.map((pkg) => (
          <div
            key={pkg.id}
            className={`border rounded p-4 text-center ${
              pkg.popular ? 'border-blue-500 bg-blue-50' : ''
            }`}
          >
            {pkg.popular && (
              <div className='bg-blue-500 text-white text-sm font-bold py-1 mb-2 rounded'>
                Most Popular
              </div>
            )}
            <h5 className='text-base sm:text-lg font-bold'>{pkg.name}</h5>
            <div className='text-xl sm:text-2xl font-bold mb-2'>
              ₹{pkg.price.toLocaleString()}
            </div>
            <div className='text-gray-500 mb-2 text-sm sm:text-base'>
              {pkg.credits.toLocaleString()} Credits
            </div>
            <ul className='text-xs sm:text-sm text-gray-600 mb-4'>
              {pkg.features.map((feature, index) => (
                <li key={index}>{feature}</li>
              ))}
            </ul>
            <button
              className='bg-blue-500 text-white px-3 sm:px-4 py-2 rounded w-full text-sm sm:text-base'
              onClick={() => handlePurchase(pkg)}
            >
              Buy Now
            </button>
          </div>
        ))}
      </div>
      <div className='mt-4 flex justify-end gap-2'>
        <button
          className='bg-gray-500 text-white px-3 sm:px-4 py-2 rounded text-sm sm:text-base'
          onClick={() => {
            setShowPurchaseModal(false);
            setSelectedPackage(null);
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}
          {showInvoiceModal && currentInvoice && (
            <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
              <div className='bg-white rounded-lg p-6 w-full max-w-6xl h-5/6 flex flex-col'>
                <div className='flex justify-between items-center mb-4'>
                  <h4 className='text-xl font-bold'>
                    Invoice #{currentInvoice.invoiceNumber}
                  </h4>
                  <button
                    onClick={() => setShowInvoiceModal(false)}
                    className='text-gray-500 text-2xl'
                  >
                    ✕
                  </button>
                </div>
                <div className='flex-1 overflow-hidden'>
                  <PDFViewer width='100%' height='100%'>
                    <InvoiceDocument invoice={currentInvoice} />
                  </PDFViewer>
                </div>
                <div className='mt-4 flex justify-end gap-2'>
                  <button
                    className='bg-gray-500 text-white px-4 py-2 rounded'
                    onClick={() => setShowInvoiceModal(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

       {showAllInvoicesModal && (
  <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]'>
    <div className='bg-white rounded-lg p-4 sm:p-6 w-full max-w-[95vw] sm:max-w-[90vw] md:max-w-4xl max-h-[90vh] overflow-y-auto mx-2 sm:mx-4 lg:mr-64'>
      <div className='flex justify-between items-center mb-4'>
        <h4 className='text-lg sm:text-xl font-bold'>
          📄 All Invoices
        </h4>
        <button
          onClick={() => setShowAllInvoicesModal(false)}
          className='text-gray-500 text-xl sm:text-2xl'
        >
          ✕
        </button>
      </div>
      <div className='p-2 sm:p-4'>
        {invoices.length === 0 && (
          <div className='text-center p-4 text-gray-500 text-sm sm:text-base'>
            No invoices found.
          </div>
        )}
        {invoices.map((invoice) => (
          <div
            key={invoice._id}
            className='flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 pb-3 border-b gap-2'
          >
            <div>
              <div className='font-bold text-sm sm:text-base'>
                {invoice.invoiceNumber || 'N/A'}
              </div>
              <div className='text-gray-500 text-xs sm:text-sm'>
                {invoice.date
                  ? new Date(invoice.date).toLocaleDateString()
                  : 'N/A'}
              </div>
            </div>
            <div className='text-left sm:text-right w-full sm:w-auto'>
              <div className='font-bold text-sm sm:text-base'>
                ₹{invoice.amount?.toLocaleString() || 0}
              </div>
              <div className='flex items-center justify-start sm:justify-end gap-2 mt-2 sm:mt-0'>
                {getStatusBadge(invoice.status)}
                <button
                  onClick={() => downloadInvoice(invoice)}
                  className='text-blue-500 hover:text-blue-700 text-sm sm:text-base'
                  title='Download Invoice as PDF'
                >
                  📥 Download
                </button>
              </div>
            </div>
          </div>
        ))}
        {invoicesPage < invoicesTotalPages && (
          <div className='text-center mt-4'>
            <button
              className='w-full sm:w-auto border border-blue-500 text-blue-500 px-3 sm:px-4 py-2 rounded text-sm sm:text-base'
              onClick={loadMoreInvoices}
              disabled={loadingMoreInvoices}
            >
              {loadingMoreInvoices
                ? 'Loading...'
                : 'Load More Invoices'}
            </button>
          </div>
        )}
      </div>
    </div>
  </div>
)}

          {showExportModal && (
            <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
              <div className='bg-white rounded-lg p-6 w-full max-w-md'>
                <div className='flex justify-between items-center mb-4'>
                  <h4 className='text-xl font-bold'>📥 Export Transactions</h4>
                  <button
                    onClick={() => setShowExportModal(false)}
                    className='text-gray-500 text-2xl'
                  >
                    ✕
                  </button>
                </div>
                <p className='text-gray-500 mb-4'>
                  Export your transaction history as an Excel file.
                </p>
                <div className='flex justify-end gap-2'>
                  <button
                    className='bg-gray-500 text-white px-4 py-2 rounded'
                    onClick={() => setShowExportModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className='bg-blue-500 text-white px-4 py-2 rounded'
                    onClick={handleExportTransactions}
                  >
                    Export
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BillingDashboard;
