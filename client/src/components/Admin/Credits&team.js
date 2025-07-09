import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Avatar,
  Container,
  Modal,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  Pagination,
  FormControl,
  InputLabel,
  Grid,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AdminDashboard from './AdminDashboard';
import axios from 'axios';

const TeamCreditManagement = () => {
  const [teamMembers, setTeamMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openLogs, setOpenLogs] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(5);
  const [sortConfig, setSortConfig] = useState({ field: 'createdAt', order: 'desc' });
  const [filter, setFilter] = useState('all');
  const BASE_URL =
    process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

  
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        setLoading(true);
        const usersResponse = await axios.get(`${BASE_URL}/users/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const users = Array.isArray(usersResponse.data) ? usersResponse.data : usersResponse.data.users;

        const teamMembersData = await Promise.all(
          users.map(async (user) => {
            try {
              const creditResponse = await axios.get(
                `${BASE_URL}/api/billing/credit-usage?userId=${user._id}`,
                {
                  headers: { Authorization: `Bearer ${token}` },
                }
              );
              const credits = creditResponse.data;

              const lastActivity = user.updatedAt
                ? new Date(user.updatedAt).toLocaleString('en-US', {
                    hour: 'numeric',
                    minute: 'numeric',
                    hour12: true,
                  })
                : 'Unknown';
              const totalCredit = credits.currentCredits + credits.totalCreditsUsed;
              const isOverLimit = credits.currentCredits < 0;

              return {
                id: user._id,
                name: `${user.firstName} ${user.lastName}`,
                email: user.email,
                lastActivity,
                credit: `${credits.currentCredits} / ${totalCredit}`,
                status: user.role.toLowerCase(),
                secondaryStatus: isOverLimit ? 'over limit' : 'active',
                usedCredit: credits.totalCreditsUsed,
                totalCredit,
                createdAt: user.createdAt,
              };
            } catch (creditError) {
              console.error(`Error fetching credits for user ${user._id}:`, creditError);
              return null;
            }
          })
        );

        const validMembers = teamMembersData.filter((member) => member !== null);
        setTeamMembers(validMembers);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching team members:', err);
        setError('Failed to load team members');
        setLoading(false);
      }
    };

    fetchTeamMembers();
  }, [token]);

  useEffect(() => {
    let filtered = [...teamMembers];
    if (filter !== 'all') {
      filtered = teamMembers.filter((member) =>
        filter === 'active' || filter === 'over limit'
          ? member.secondaryStatus === filter
          : member.status === filter
      );
    }

    const sorted = filtered.sort((a, b) => {
      const { field, order } = sortConfig;
      const multiplier = order === 'asc' ? 1 : -1;
      if (field === 'name' || field === 'email') {
        return multiplier * a[field].localeCompare(b[field]);
      } else if (field === 'usedCredit') {
        return multiplier * (a.usedCredit - b.usedCredit);
      } else if (field === 'createdAt') {
        return multiplier * (new Date(a.createdAt) - new Date(b.createdAt));
      }
      return 0;
    });

    setFilteredMembers(sorted);
    setPage(1);
  }, [teamMembers, sortConfig, filter]);

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await axios.delete(`${BASE_URL}/users/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTeamMembers(teamMembers.filter((member) => member.id !== userId));
        setFilteredMembers(filteredMembers.filter((member) => member.id !== userId));
      } catch (err) {
        console.error('Error deleting user:', err);
        alert('Failed to delete user');
      }
    }
  };

  const handleViewLogs = async (userId) => {
    try {
      const response = await axios.get(`${BASE_URL}/api/billing/transactions`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { userId, page: 1, limit: 10, range: '6months' },
      });
      setTransactions(response.data.transactions || []);
      setSelectedUser(userId);
      setOpenLogs(true);
    } catch (err) {
      console.error('Error fetching user logs:', err);
      alert('Failed to fetch user logs');
    }
  };

  const handleCloseLogs = () => {
    setOpenLogs(false);
    setSelectedUser(null);
    setTransactions([]);
  };

  const handleSortChange = (event) => {
    const [field, order] = event.target.value.split(':');
    setSortConfig({ field, order });
  };

  const handleFilterChange = (event) => {
    setFilter(event.target.value);
  };

  const handlePageChange = (event, value) => {
    setPage(value);
  };

  const getInitials = (name) => {
    const [firstName, lastName] = name.split(' ');
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const getProgressWidth = (used, total) => {
    const percentage = total ? (used / total) * 100 : 0;
    return `${Math.min(percentage, 100)}%`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'admin':
        return '#ff9800';
      case 'active':
        return '#4caf50';
      case 'manager':
        return '#2196f3';
      case 'over limit':
        return '#d32f2f';
      case 'viewer':
        return { backgroundColor: '#ffffff', color: '#000000', border: '1px solid #e0e0e0' };
      default:
        return 'text.secondary';
    }
  };

  const paginatedMembers = filteredMembers.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  if (loading) return <Typography variant="h6" sx={{ p: 2, textAlign: 'center' }}>Loading...</Typography>;
  if (error) return <Typography variant="h6" color="error" sx={{ p: 2, textAlign: 'center' }}>{error}</Typography>;

  return (
    <>
      <AdminDashboard />
      <Container
        maxWidth={false}
        sx={{
          bgcolor: '#f5f7fa',
          minHeight: '100vh',
          py: { xs: 2, sm: 3 },
        }}
      >
        <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 1, sm: 2 } }}>
          <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 'bold',
                  fontSize: { xs: '1.5rem', sm: '2rem' },
                  color: '#1976d2',
                }}
              >
                Team Credit Management
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: { xs: 'flex-start', sm: 'flex-end' }, flexWrap: 'wrap' }}>
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel id="sort-label">Sort By</InputLabel>
                  <Select
                    labelId="sort-label"
                    value={`${sortConfig.field}:${sortConfig.order}`}
                    onChange={handleSortChange}
                    label="Sort By"
                  >
                    <MenuItem value="name:asc">Name (A-Z)</MenuItem>
                    <MenuItem value="name:desc">Name (Z-A)</MenuItem>
                    <MenuItem value="email:asc">Email (A-Z)</MenuItem>
                    <MenuItem value="email:desc">Email (Z-A)</MenuItem>
                    <MenuItem value="usedCredit:asc">Credit Usage (Low to High)</MenuItem>
                    <MenuItem value="usedCredit:desc">Credit Usage (High to Low)</MenuItem>
                    <MenuItem value="createdAt:desc">Newest to Oldest</MenuItem>
                    <MenuItem value="createdAt:asc">Oldest to Newest</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel id="filter-label">Filter By</InputLabel>
                  <Select
                    labelId="filter-label"
                    value={filter}
                    onChange={handleFilterChange}
                    label="Filter By"
                  >
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="admin">Admin</MenuItem>
                    <MenuItem value="viewer">Viewer</MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Grid>
          </Grid>
          <Paper
            sx={{
              p: { xs: 1, sm: 2 },
              borderRadius: 2,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              bgcolor: '#fff',
            }}
          >
            {paginatedMembers.length === 0 && (
              <Typography sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                No users match the selected filter.
              </Typography>
            )}
            {paginatedMembers.map((member) => (
              <Box
                key={member.id}
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: { sm: 'center' },
                  py: 1.5,
                  px: 2,
                  mb: 1,
                  borderBottom: '1px solid #e0e0e0',
                  '&:last-child': { borderBottom: 'none' },
                  '&:hover': { bgcolor: '#f8fafc' },
                  borderRadius: 1,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 1, sm: 0 }, width: { xs: '100%', sm: '40%' } }}>
                  <Avatar
                    sx={{
                      width: 36,
                      height: 36,
                      bgcolor: '#1976d2',
                      color: '#fff',
                      mr: 2,
                      fontSize: '0.9rem',
                      fontWeight: 'bold',
                    }}
                  >
                    {getInitials(member.name)}
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography
                      variant="body1"
                      sx={{ fontWeight: '600', fontSize: { xs: '0.95rem', sm: '1rem' }, color: 'text.primary' }}
                    >
                      {member.name}
                      <Typography
                        component="span"
                        sx={{
                          fontSize: { xs: '0.8rem', sm: '0.9rem' },
                          ml: 1,
                          ...(typeof getStatusColor(member.status) === 'string'
                            ? { color: getStatusColor(member.status) }
                            : getStatusColor(member.status)),
                        }}
                      >
                        ({member.status}
                        {member.secondaryStatus && (
                          <span style={{ color: getStatusColor(member.secondaryStatus) }}>
                            , {member.secondaryStatus}
                          </span>
                        )})
                      </Typography>
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontSize: { xs: '0.8rem', sm: '0.85rem' } }}
                    >
                      {member.email}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontSize: { xs: '0.75rem', sm: '0.8rem' } }}
                    >
                      Last Activity: {member.lastActivity}
                    </Typography>
                  </Box>
                </Box>
                <Box
                  sx={{
                    width: { xs: '100%', sm: '30%' },
                    mr: { sm: 2 },
                    mt: { xs: 1, sm: 0 },
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Box
                    sx={{
                      flexGrow: 1,
                      mr: 1,
                      height: 8,
                      bgcolor: '#e0e0e0',
                      borderRadius: 4,
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      sx={{
                        width: getProgressWidth(member.usedCredit, member.totalCredit),
                        height: '100%',
                        bgcolor: member.secondaryStatus === 'over limit' ? '#d32f2f' : '#1976d2',
                        transition: 'width 0.3s',
                      }}
                    />
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: '600',
                      fontSize: { xs: '0.85rem', sm: '0.9rem' },
                      minWidth: '80px',
                      textAlign: 'right',
                    }}
                  >
                    {member.credit}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    width: { xs: '100%', sm: '30%' },
                    justifyContent: { xs: 'flex-end', sm: 'flex-start' },
                    gap: 1,
                  }}
                >
                  <Button
                    variant="outlined"
                    size="small"
                    sx={{
                      borderRadius: 1,
                      textTransform: 'none',
                      borderColor: '#1976d2',
                      color: '#1976d2',
                      fontSize: { xs: '0.75rem', sm: '0.85rem' },
                      px: 2,
                      '&:hover': { borderColor: '#1976d2', bgcolor: 'rgba(25, 118, 210, 0.1)' },
                    }}
                    onClick={() => handleViewLogs(member.id)}
                  >
                    View Logs
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    sx={{
                      borderRadius: 1,
                      textTransform: 'none',
                      borderColor: '#d32f2f',
                      color: '#d32f2f',
                      fontSize: { xs: '0.75rem', sm: '0.85rem' },
                      px: 2,
                      '&:hover': { borderColor: '#d32f2f', bgcolor: 'rgba(211, 47, 47, 0.1)' },
                    }}
                    onClick={() => handleDeleteUser(member.id)}
                  >
                    Delete
                  </Button>
                </Box>
              </Box>
            ))}
          </Paper>
          <Pagination
            count={Math.ceil(filteredMembers.length / rowsPerPage)}
            page={page}
            onChange={handlePageChange}
            sx={{
              display: 'flex',
              justifyContent: 'center',
              mt: 2,
              '& .MuiPaginationItem-root': {
                fontSize: { xs: '0.9rem', sm: '1rem' },
              },
            }}
          />
        </Box>
      </Container>

      <Modal open={openLogs} onClose={handleCloseLogs}>
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            bgcolor: 'background.paper',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            p: { xs: 2, sm: 3 },
            width: { xs: '90%', sm: 600 },
            maxHeight: '80vh',
            overflow: 'auto',
            borderRadius: 2,
            outline: 'none',
          }}
        >
          <Typography
            variant="h6"
            sx={{ mb: 2, fontWeight: 'bold', color: '#1976d2' }}
          >
            Transaction Logs for {teamMembers.find((m) => m.id === selectedUser)?.name}
          </Typography>
          {transactions.length === 0 ? (
            <Typography sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
              No transactions found.
            </Typography>
          ) : (
            <Table size="small" sx={{ mb: 2 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', color: 'text.primary' }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: 'text.primary' }}>Amount</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: 'text.primary' }}>Description</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: 'text.primary' }}>Timestamp</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx._id}>
                    <TableCell sx={{ fontSize: '0.85rem' }}>{tx.type}</TableCell>
                    <TableCell sx={{ fontSize: '0.85rem' }}>{tx.amount}</TableCell>
                    <TableCell sx={{ fontSize: '0.85rem' }}>{tx.description}</TableCell>
                    <TableCell sx={{ fontSize: '0.85rem' }}>
                      {new Date(tx.timestamp).toLocaleString('en-US', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              onClick={handleCloseLogs}
              sx={{
                borderRadius: 1,
                textTransform: 'none',
                bgcolor: '#1976d2',
                '&:hover': { bgcolor: '#1565c0' },
                px: 3,
                fontSize: '0.9rem',
              }}
            >
              Close
            </Button>
          </Box>
        </Box>
      </Modal>
    </>
  );
};

export default TeamCreditManagement;