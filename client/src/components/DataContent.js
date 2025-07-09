import { useState, useRef, useEffect } from 'react';
import '../styles/DataContent.css';

function DataContent() {
  const [activeTab, setActiveTab] = useState('batch');
  const [selectedFile, setSelectedFile] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [enrichmentProgress, setEnrichmentProgress] = useState(0);
  const [activityLog, setActivityLog] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    status: 'Active',
  });
  const fileInputRef = useRef(null);

  // Customer list state
  const [customers, setCustomers] = useState([
    {
      id: 1,
      name: "John Doe",
      company: "Tech Corp",
      email: "john@techcorp.com",
      phone: "+1-555-123-4567",
      status: "Active",
      enrichmentStatus: "Enriched",
      socialProfiles: { linkedin: "linkedin.com/in/johndoe" },
      source: "LinkedIn",
      missingFields: [],
    },
    {
      id: 2,
      name: "Jane Smith",
      company: "Web Solutions",
      email: "",
      phone: "+1-555-987-6543",
      status: "Inactive",
      enrichmentStatus: "Incomplete",
      socialProfiles: {},
      source: "",
      missingFields: ["email", "socialProfiles"],
    },
  ]);

  // Activity log initialization
  useEffect(() => {
    setActivityLog([
      { id: 1, activity: "Enriched John Doe", time: "June 18, 2025, 10:00 AM", status: "Success" },
      { id: 2, activity: "Attempted enrichment for Jane Smith", time: "June 17, 2025, 3:00 PM", status: "Incomplete" },
    ]);
  }, []);

  const dummyHistory = [
    { id: 1, date: "June 18, 2025", status: "Completed", records: 50 },
    { id: 2, date: "June 17, 2025", status: "In Progress", records: 30 },
  ];

  const handleStartEnrichment = () => {
    if (selectedFile) {
      setEnrichmentProgress(0);
      const interval = setInterval(() => {
        setEnrichmentProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            if (window.Swal) {
              window.Swal.fire({
                icon: 'success',
                title: 'Enrichment done successfully!',
                showConfirmButton: false,
                timer: 2000,
              });
            }
            setActivityLog((prev) => [
              {
                id: prev.length + 1,
                activity: `Enriched file: ${selectedFile}`,
                time: new Date().toLocaleString(),
                status: "Success",
              },
              ...prev,
            ]);
            return 100;
          }
          return prev + 10;
        });
      }, 200);
    }
  };

  const handleChooseFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    setSelectedFile(file ? file.name : null);
  };

  // Load SweetAlert2 CDN
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
    script.async = true;
    script.onload = () => console.log('SweetAlert2 loaded');
    script.onerror = () => console.error('Failed to load SweetAlert2');
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Quick Lookup States
  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [domain, setDomain] = useState('');

  const handleFindContactInfo = () => {
    const contactInfo = {
      name: fullName || 'John Doe',
      company: company || 'Tech Corp',
      email: `${(fullName || 'john.doe').toLowerCase().replace(/\s/g, '.')}${domain ? '@' + domain : '@techcorp.com'}`,
      phone: '+1-555-123-4567',
    };

    if (window.Swal) {
      window.Swal.fire({
        icon: 'info',
        title: 'Contact Information',
        html: `
          <p><strong>Name:</strong> ${contactInfo.name}</p>
          <p><strong>Company:</strong> ${contactInfo.company}</p>
          <p><strong>Email:</strong> ${contactInfo.email}</p>
          <p><strong>Phone:</strong> ${contactInfo.phone}</p>
        `,
        showConfirmButton: true,
        confirmButtonText: 'OK',
      });
    } else {
      alert('Contact Info: ' + JSON.stringify(contactInfo, null, 2));
    }
  };

  // Customer Table Handlers
  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleFilterChange = (e) => {
    setFilter(e.target.value);
  };

  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch = 
      (customer.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (customer.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (customer.company?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    if (filter === 'missing') return matchesSearch && customer.missingFields.length > 0;
    if (filter === 'duplicates') return matchesSearch;
    if (filter === 'enriched') return matchesSearch && customer.enrichmentStatus === 'Enriched';
    return matchesSearch;
  });

  const handleSelectCustomer = (id, e) => {
    e.stopPropagation();
    setSelectedCustomers((prev) =>
      prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (e) => {
    e.stopPropagation();
    if (selectedCustomers.length === filteredCustomers.length && filteredCustomers.length > 0) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(filteredCustomers.map((c) => c.id));
    }
  };

  // Add Customer
  const handleAddCustomer = (e) => {
    e.preventDefault();
    if (!newCustomer.name.trim()) {
      if (window.Swal) {
        window.Swal.fire({
          icon: 'error',
          title: 'Name is required!',
          showConfirmButton: false,
          timer: 2000,
        });
      } else {
        alert('Name is required!');
      }
      return;
    }
    const missingFields = [];
    if (!newCustomer.email) missingFields.push('email');
    if (!newCustomer.company) missingFields.push('company');
    const newId = customers.length ? Math.max(...customers.map(c => c.id)) + 1 : 1;
    const addedCustomer = {
      id: newId,
      ...newCustomer,
      enrichmentStatus: missingFields.length > 0 ? 'Incomplete' : 'Enriched',
      socialProfiles: {},
      source: '',
      missingFields,
    };
    setCustomers([...customers, addedCustomer]);
    setActivityLog((prev) => [
      {
        id: prev.length + 1,
        activity: `Added customer: ${newCustomer.name}`,
        time: new Date().toLocaleString(),
        status: "Success",
      },
      ...prev,
    ]);
    setNewCustomer({ name: '', company: '', email: '', phone: '', status: 'Active' });
    setShowAddForm(false);
    if (window.Swal) {
      window.Swal.fire({
        icon: 'success',
        title: 'Customer added successfully!',
        showConfirmButton: false,
        timer: 2000,
      });
    }
  };

  // Edit Customer
  const handleEditCustomer = () => {
    if (!selectedProfile || !selectedProfile.name.trim()) {
      if (window.Swal) {
        window.Swal.fire({
          icon: 'error',
          title: 'Name is required!',
          showConfirmButton: false,
          timer: 2000,
        });
      } else {
        alert('Name is required!');
      }
      return;
    }
    const missingFields = [];
    if (!selectedProfile.email) missingFields.push('email');
    if (!selectedProfile.company) missingFields.push('company');
    const updatedCustomers = customers.map((c) =>
      c.id === selectedProfile.id
        ? { ...selectedProfile, missingFields, enrichmentStatus: missingFields.length > 0 ? 'Incomplete' : 'Enriched' }
        : c
    );
    setCustomers(updatedCustomers);
    setActivityLog((prev) => [
      {
        id: prev.length + 1,
        activity: `Edited customer: ${selectedProfile.name}`,
        time: new Date().toLocaleString(),
        status: "Success",
      },
      ...prev,
    ]);
    setShowProfileModal(false);
    setSelectedProfile(null);
    if (window.Swal) {
      window.Swal.fire({
        icon: 'success',
        title: 'Customer updated successfully!',
        showConfirmButton: false,
        timer: 2000,
      });
    }
  };

  // Delete Customer(s)
  const handleDeleteCustomer = (id, e) => {
    e?.stopPropagation();
    if (window.Swal) {
      window.Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#7e00c5',
        cancelButtonColor: '#dc3545',
        confirmButtonText: 'Yes, delete it!'
      }).then((result) => {
        if (result.isConfirmed) {
          const deletedCustomer = customers.find((c) => c.id === id);
          setCustomers(customers.filter((c) => c.id !== id));
          setSelectedCustomers(selectedCustomers.filter((cid) => cid !== id));
          setActivityLog((prev) => [
            {
              id: prev.length + 1,
              activity: `Deleted customer: ${deletedCustomer?.name || 'Unknown'}`,
              time: new Date().toLocaleString(),
              status: "Success",
            },
            ...prev,
          ]);
          window.Swal.fire({
            icon: 'success',
            title: 'Customer deleted!',
            showConfirmButton: false,
            timer: 2000,
          });
          if (selectedProfile?.id === id) {
            setShowProfileModal(false);
            setSelectedProfile(null);
          }
        }
      });
    } else {
      if (window.confirm('Are you sure you want to delete this customer?')) {
        const deletedCustomer = customers.find((c) => c.id === id);
        setCustomers(customers.filter((c) => c.id !== id));
        setSelectedCustomers(selectedCustomers.filter((cid) => cid !== id));
        setActivityLog((prev) => [
          {
            id: prev.length + 1,
            activity: `Deleted customer: ${deletedCustomer?.name || 'Unknown'}`,
            time: new Date().toLocaleString(),
            status: "Success",
          },
          ...prev,
        ]);
        if (selectedProfile?.id === id) {
          setShowProfileModal(false);
          setSelectedProfile(null);
        }
      }
    }
  };

  const handleBulkDelete = () => {
    if (window.Swal) {
      window.Swal.fire({
        title: 'Are you sure?',
        text: `You are about to delete ${selectedCustomers.length} customer(s)!`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#7e00c5',
        cancelButtonColor: '#dc3545',
        confirmButtonText: 'Yes, delete them!'
      }).then((result) => {
        if (result.isConfirmed) {
          setCustomers(customers.filter((c) => !selectedCustomers.includes(c.id)));
          setActivityLog((prev) => [
            {
              id: prev.length + 1,
              activity: `Deleted ${selectedCustomers.length} customers`,
              time: new Date().toLocaleString(),
              status: "Success",
            },
            ...prev,
          ]);
          setSelectedCustomers([]);
          window.Swal.fire({
            icon: 'success',
            title: 'Customers deleted!',
            showConfirmButton: false,
            timer: 2000,
          });
        }
      });
    } else {
      if (window.confirm(`Are you sure you want to delete ${selectedCustomers.length} customer(s)?`)) {
        setCustomers(customers.filter((c) => !selectedCustomers.includes(c.id)));
        setActivityLog((prev) => [
          {
            id: prev.length + 1,
            activity: `Deleted ${selectedCustomers.length} customers`,
            time: new Date().toLocaleString(),
            status: "Success",
          },
          ...prev,
        ]);
        setSelectedCustomers([]);
      }
    }
  };

  // Enrichment Actions
  const handleRefreshData = () => {
    if (window.Swal) {
      window.Swal.fire({
        icon: 'success',
        title: 'Data refreshed from external sources!',
        showConfirmButton: false,
        timer: 2000,
      });
    }
    setActivityLog((prev) => [
      {
        id: prev.length + 1,
        activity: `Refreshed data for ${selectedCustomers.length} customers`,
        time: new Date().toLocaleString(),
        status: "Success",
      },
      ...prev,
    ]);
  };

  // Bulk Enrichment
  const handleBulkEnrich = () => {
    setEnrichmentProgress(0);
    const interval = setInterval(() => {
      setEnrichmentProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          if (window.Swal) {
            window.Swal.fire({
              icon: 'success',
              title: 'Bulk enrichment completed!',
              showConfirmButton: false,
              timer: 2000,
            });
          }
          setActivityLog((prev) => [
            {
              id: prev.length + 1,
              activity: `Bulk enriched ${selectedCustomers.length} customers`,
              time: new Date().toLocaleString(),
              status: "Success",
            },
            ...prev,
          ]);
          setSelectedCustomers([]);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  // Profile View Handlers
  const openProfileModal = (customer) => {
    setSelectedProfile({ ...customer });
    setShowProfileModal(true);
  };

  const closeProfileModal = () => {
    setShowProfileModal(false);
    setSelectedProfile(null);
  };

  const handleEnrichNow = () => {
    setEnrichmentProgress(0);
    const interval = setInterval(() => {
      setEnrichmentProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          if (window.Swal) {
            window.Swal.fire({
              icon: 'success',
              title: 'Profile enriched successfully!',
              showConfirmButton: false,
              timer: 2000,
            });
          }
          setActivityLog((prev) => [
            {
              id: prev.length + 1,
              activity: `Enriched profile for ${selectedProfile?.name || 'Unknown'}`,
              time: new Date().toLocaleString(),
              status: "Success",
            },
            ...prev,
          ]);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  // Handle input changes for edit form
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setSelectedProfile((prev) => ({ ...prev, [name]: value }));
  };

  // Handle input changes for add form
  const handleNewCustomerChange = (e) => {
    const { name, value } = e.target;
    setNewCustomer((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div>
      <div className="kContainer">
        <div className="kWrapper">
          <div className="kSidebar">
            <h5>Enrichment Types</h5>
            <ul className="kList">
              <li className="kListItem">
                <span>Email Enrichment</span>
                <span className="kPercentage">85%</span>
                <p className="kpara">Find and validate email addresses<br />Hunter.io, Clearbit, Apollo</p>
              </li>
              <li className="kListItem">
                <span>Phone Enrichment</span>
                <span className="kPercentage">72%</span>
                <p className="kpara">Discover phone numbers and contact info<br />Lusha, ZoomInfo, SignalHire</p>
              </li>
              <li className="kListItem">
                <span>Company Data</span>
                <span className="kPercentage">90%</span>
                <p className="kpara">Enrich with company information<br />Clearbit, Datanyze, BuiltWith</p>
              </li>
              <li className="kListItem">
                <span>Social Profiles</span>
                <span className="kPercentage">78%</span>
                <p className="kpara">Find LinkedIn and social media profiles<br />Proxycurl, Pipl, FullContact</p>
              </li>
            </ul>
            <div className="kActivityLog">
              <h5>Activity Log</h5>
              <ul className="kActivityList">
                {activityLog.slice(0, 5).map((log) => (
                  <li key={log.id} className="kActivityItem">
                    <span>{log.activity}</span>
                    <span className="kActivityTime">{log.time}</span>
                    <span className={`kActivityStatus kStatus${log.status}`}>
                      {log.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="kMainContent">
            <div className="kTabs">
              <span className="kTabText">Data Enrichment</span>
              <button className={`kTab ${activeTab === 'batch' ? 'active' : ''}`} onClick={() => setActiveTab('batch')}>Batch Enrichment</button>
              <button className={`kTab ${activeTab === 'customers' ? 'active' : ''}`} onClick={() => setActiveTab('customers')}>Customer List</button>
              <button className={`kTab ${activeTab === 'results' ? 'active' : ''}`} onClick={() => setActiveTab('results')}>Results</button>
              <button className={`kTab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>History</button>
            </div>
            <div className="kUploadArea">
              {activeTab === 'batch' && (
                <div className="kUploadSection">
                  <p>Upload your CSV file</p>
                  <p className="kSupportText">Support for CSV files with name, company, and domain columns</p>
                  <input
                    type="file"
                    className="kFileInput"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".csv"
                  />
                  <button className="kChooseFile" onClick={handleChooseFileClick}>
                    Choose File
                  </button>
                  {selectedFile && <p className="kFileName">Selected file: {selectedFile}</p>}
                  {enrichmentProgress > 0 && enrichmentProgress < 100 && (
                    <div className="kProgressBar">
                      <div
                        className="kProgressFill"
                        style={{ width: `${enrichmentProgress}%` }}
                      ></div>
                    </div>
                  )}
                  <p className="kManualText">Or paste data manually</p>
                  <textarea className="kTextArea" placeholder="Paste CSV data here"></textarea>
                  <button
                    className="kStartButton"
                    onClick={handleStartEnrichment}
                    disabled={!selectedFile}
                  >
                    Start Enrichment
                  </button>
                </div>
              )}
              {activeTab === 'customers' && (
                <div className="kCustomerList">
                  <div className="kTableControls">
                    <input
                      type="text"
                      className="kSearchInput"
                      placeholder="Search by name or company"
                      value={searchQuery}
                      onChange={handleSearch}
                    />
                    <div className="kFilterSelect">
                      <select value={filter} onChange={handleFilterChange}>
                        <option value="all">All</option>
                        <option value="missing">Missing Fields</option>
                        <option value="duplicates">Duplicates</option>
                        <option value="enriched">Enriched Profiles</option>
                      </select>
                    </div>
                    <button className="kAddButton" onClick={() => setShowAddForm(true)}>
                      Add Customer
                    </button>
                  </div>
                  {showAddForm && (
                    <div className="kAddForm">
                      <h6>Add New Customer</h6>
                      <div className="kFormGroup">
                        <label>Name *</label>
                        <input
                          type="text"
                          name="name"
                          value={newCustomer.name}
                          onChange={handleNewCustomerChange}
                          placeholder="Enter name"
                          required
                        />
                      </div>
                      <div className="kFormGroup">
                        <label>Company</label>
                        <input
                          type="text"
                          name="company"
                          value={newCustomer.company}
                          onChange={handleNewCustomerChange}
                          placeholder="Enter company"
                        />
                      </div>
                      <div className="kFormGroup">
                        <label>Email</label>
                        <input
                          type="email"
                          name="email"
                          value={newCustomer.email}
                          onChange={handleNewCustomerChange}
                          placeholder="Enter email"
                        />
                      </div>
                      <div className="kFormGroup">
                        <label>Phone</label>
                        <input
                          type="text"
                          name="phone"
                          value={newCustomer.phone}
                          onChange={handleNewCustomerChange}
                          placeholder="Enter phone"
                        />
                      </div>
                      <div className="kFormGroup">
                        <label>Status</label>
                        <select
                          name="status"
                          value={newCustomer.status}
                          onChange={handleNewCustomerChange}
                        >
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                      </div>
                      <div className="kFormActions">
                        <button className="kSaveButton" onClick={handleAddCustomer}>Save</button>
                        <button className="kCancelButton" onClick={() => setShowAddForm(false)}>Cancel</button>
                      </div>
                    </div>
                  )}
                  {selectedCustomers.length > 0 && (
                    <div className="kEnrichmentActions">
                      <button className="kActionButton" onClick={handleRefreshData}>
                        🔄 Refresh Data
                      </button>
                      <button className="kActionButton kEnrichSelected" onClick={handleBulkEnrich}>
                        Enrich Selected ({selectedCustomers.length})
                      </button>
                      <button className="kActionButton kDeleteSelected" onClick={handleBulkDelete}>
                        🗑️ Delete Selected ({selectedCustomers.length})
                      </button>
                    </div>
                  )}
                  {enrichmentProgress > 0 && enrichmentProgress < 100 && (
                    <div className="kProgressBar">
                      <div
                        className="kProgressFill"
                        style={{ width: `${enrichmentProgress}%` }}
                      ></div>
                    </div>
                  )}
                  <div className="kTableWrapper">
                    <table className="kCustomerTable">
                      <thead>
                        <tr>
                          <th>
                            <input
                              type="checkbox"
                              checked={selectedCustomers.length === filteredCustomers.length && filteredCustomers.length > 0}
                              onChange={handleSelectAll}
                            />
                          </th>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Phone</th>
                          <th>Status</th>
                          <th>Enrichment</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCustomers.map((customer) => (
                          <tr
                            key={customer.id}
                            onClick={() => openProfileModal(customer)}
                            className={customer.missingFields.length > 0 ? 'kIncompleteRow' : ''}
                          >
                            <td>
                              <input
                                type="checkbox"
                                checked={selectedCustomers.includes(customer.id)}
                                onChange={(e) => handleSelectCustomer(customer.id, e)}
                                onClick={(e) => e.stopPropagation()}
                                className="kCheckbox"
                                key={`checkbox-${customer.id}`}
                              />
                            </td>
                            <td>{customer.name}</td>
                            <td className={!customer.email ? 'kMissingField' : ''}>
                              {customer.email || 'N/A'}
                              {!customer.email && <span className="kSuggestionTooltip">Suggest Enrichment</span>}
                            </td>
                            <td>{customer.phone || 'N/A'}</td>
                            <td>{customer.status}</td>
                            <td>
                              <span className={`kEnrichmentStatus kStatus${customer.enrichmentStatus}`}>
                                {customer.enrichmentStatus === 'Enriched' ? '✓ Enriched' : '⚠️ Incomplete'}
                              </span>
                            </td>
                            <td>
                              <button
                                className="kActionIcon"
                                onClick={(e) => handleDeleteCustomer(customer.id, e)}
                                title="Delete"
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {activeTab === 'results' && (
                <div className="kResultsArea">
                  <h6>Enrichment Results</h6>
                  <ul className="kResultList">
                    {customers.map((result) => (
                      <li key={result.id} className="kResultItem">
                        {result.name} - {result.company || 'N/A'} - {result.email || 'N/A'}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {activeTab === 'history' && (
                <div className="kHistoryArea">
                  <h6>Enrichment History</h6>
                  <ul className="kHistoryList">
                    {dummyHistory.map((history) => (
                      <li key={history.id} className="kHistoryItem">
                        {history.date} - {history.status} - {history.records} records
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="kQuickLookupContainer">
        <div className="kQuickLookup">
          <h5>Quick Lookup</h5>
          <div className="kLookupForm">
            <label>Full Name</label>
            <input
              type="text"
              className="kInput"
              placeholder="John Smith"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <label>Company</label>
            <input
              type="text"
              className="kInput"
              placeholder="Tech Corp"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
            <label>Domain (optional)</label>
            <input
              type="text"
              className="kInput"
              placeholder="techcorp.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
            <button className="kFindButton" onClick={handleFindContactInfo}>
              Find Contact Info
            </button>
          </div>
        </div>
      </div>
      {showProfileModal && selectedProfile && (
        <div className="kProfileModal">
          <div className="kModalContent">
            <button className="kCloseModal" onClick={closeProfileModal}>×</button>
            <h5>Edit Profile</h5>
            <div className="kProfileDetails">
              <div className="kFormGroup">
                <label>Name *</label>
                <input
                  type="text"
                  name="name"
                  value={selectedProfile.name || ''}
                  onChange={handleProfileChange}
                  placeholder="Enter name"
                  required
                />
              </div>
              <div className="kFormGroup">
                <label>Company</label>
                <input
                  type="text"
                  name="company"
                  value={selectedProfile.company || ''}
                  onChange={handleProfileChange}
                  placeholder="Enter company"
                />
              </div>
              <div className="kFormGroup">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={selectedProfile.email || ''}
                  onChange={handleProfileChange}
                  placeholder="Enter email"
                />
              </div>
              <div className="kFormGroup">
                <label>Phone</label>
                <input
                  type="text"
                  name="phone"
                  value={selectedProfile.phone || ''}
                  onChange={handleProfileChange}
                  placeholder="Enter phone"
                />
              </div>
              <div className="kFormGroup">
                <label>Status</label>
                <select
                  name="status"
                  value={selectedProfile.status || 'Active'}
                  onChange={handleProfileChange}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <p><strong>Social Profiles:</strong> {selectedProfile.socialProfiles?.linkedin || 'None'}</p>
              <p><strong>Source:</strong> {selectedProfile.source || 'N/A'}</p>
              {selectedProfile.missingFields.length > 0 && (
                <p className="kMissingFields">
                  <strong>Missing Fields:</strong> {selectedProfile.missingFields.join(', ')}
                </p>
              )}
            </div>
            <div className="kTimeline">
              <h6>Timeline</h6>
              <ul>
                <li>Enriched on June 18, 2025</li>
                <li>Profile fetched from {selectedProfile.source || 'Unknown'}</li>
              </ul>
            </div>
            <div className="kProfileActions">
              <button className="kEnrichNowButton" onClick={handleEnrichNow}>
                Enrich Now
              </button>
              <button className="kSaveButton" onClick={handleEditCustomer}>
                Save Changes
              </button>
              <button className="kDeleteButton" onClick={(e) => handleDeleteCustomer(selectedProfile.id, e)}>
                Delete Profile
              </button>
            </div>
            {enrichmentProgress > 0 && enrichmentProgress < 100 && (
              <div className="kProgressBar">
                <div
                  className="kProgressFill"
                  style={{ width: `${enrichmentProgress}%` }}
                ></div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default DataContent;