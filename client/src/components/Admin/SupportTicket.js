import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Container,
  Modal,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Select,
  MenuItem,
  Pagination,
  FormControl,
  InputLabel,
  Grid,
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AdminDashboard from './AdminDashboard';
import axios from 'axios';
const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';


const SupportTicket = () => {
  const [tickets, setTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(5);
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' for newest, 'asc' for oldest
 
  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${BASE_URL}/api/admin/tickets`);
        setTickets(res.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching tickets:', err);
        setLoading(false);
      }
    };

    fetchTickets();
  }, []);

  useEffect(() => {
    const sorted = [...tickets].sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
    setFilteredTickets(sorted);
    setPage(1); // Reset to first page on sort change
  }, [tickets, sortOrder]);

  const handleReplyClick = (ticket) => {
    setSelectedTicket(ticket);
    setReplyText(ticket.ticketAnswer || '');
  };

  const handleReplySubmit = async () => {
    try {
      setLoading(true);
      await axios.put(`${BASE_URL}/api/admin/tickets/${selectedTicket._id}/reply`, {
        ticketAnswer: replyText,
      });
      setSelectedTicket(null);
      setReplyText('');
      const res = await axios.get(`${BASE_URL}/api/admin/tickets`);
      setTickets(res.data);
      showToast('Reply sent successfully ✅');
    } catch (err) {
      alert('Failed to send reply');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(''), 2000);
  };

  const handleSortChange = (event) => {
    setSortOrder(event.target.value);
  };

  const handlePageChange = (event, value) => {
    setPage(value);
  };

  const paginatedTickets = filteredTickets.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  if (loading) return <Typography variant="h6" sx={{ p: 2, textAlign: 'center' }}>Loading...</Typography>;

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
        <Box sx={{ maxWidth: 1000, mx: 'auto', p: { xs: 1, sm: 2 } }}>
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
                Support Ticket Inbox
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel id="sort-label">Sort By</InputLabel>
                  <Select
                    labelId="sort-label"
                    value={sortOrder}
                    onChange={handleSortChange}
                    label="Sort By"
                  >
                    <MenuItem value="desc">Newest to Oldest</MenuItem>
                    <MenuItem value="asc">Oldest to Newest</MenuItem>
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
            {paginatedTickets.length === 0 && (
              <Typography sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                No tickets available.
              </Typography>
            )}
            {paginatedTickets.map((ticket) => (
              <Box
                key={ticket._id}
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: { sm: 'flex-start' },
                  py: 1.5,
                  px: 2,
                  mb: 1,
                  borderBottom: '1px solid #e0e0e0',
                  '&:last-child': { borderBottom: 'none' },
                  '&:hover': { bgcolor: '#f8fafc' },
                  borderRadius: 1,
                }}
              >
                <Box sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}>
                  <Typography
                    variant="caption"
                    sx={{ fontSize: '0.75rem', color: 'text.secondary', mb: 0.5 }}
                  >
                    Ticket ID: {ticket._id}
                  </Typography>
                  <Box sx={{ mb: 1 }}>
                    <Chip
                      label={ticket.category}
                      size="small"
                      sx={{
                        bgcolor: '#3498db',
                        color: '#fff',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        borderRadius: '20px',
                        mr: 1,
                      }}
                    />
                  </Box>
                  <Typography
                    variant="body1"
                    sx={{ fontWeight: '600', fontSize: { xs: '0.95rem', sm: '1rem' }, mb: 0.5 }}
                  >
                    {ticket.ticketQuery}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ fontSize: { xs: '0.85rem', sm: '0.9rem' }, color: 'text.secondary', mb: 1 }}
                  >
                    From: {ticket.ticketEmail}
                  </Typography>
                  {ticket.ticketAnswer && (
                    <Box sx={{ mt: 1 }}>
                      <Typography
                        variant="body2"
                        sx={{ fontSize: '0.85rem', fontStyle: 'italic', color: '#444' }}
                      >
                        <strong>Reply:</strong> {ticket.ticketAnswer}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ fontSize: '0.75rem', color: 'text.secondary' }}
                      >
                        🕒 {ticket.repliedAt ? new Date(ticket.repliedAt).toLocaleString('en-US', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        }) : ''}
                      </Typography>
                    </Box>
                  )}
                  <Button
                    variant="contained"
                    onClick={() => handleReplyClick(ticket)}
                    sx={{
                      mt: 1,
                      borderRadius: 1,
                      textTransform: 'none',
                      bgcolor: '#1c1f2e',
                      fontSize: { xs: '0.75rem', sm: '0.85rem' },
                      px: 2,
                      '&:hover': { bgcolor: '#2c3147' },
                    }}
                  >
                    ✉️ Reply
                  </Button>
                </Box>
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: { xs: '0.75rem', sm: '0.8rem' },
                    color: 'text.secondary',
                    minWidth: '140px',
                    textAlign: { sm: 'right' },
                  }}
                >
                  {new Date(ticket.createdAt).toLocaleString('en-US', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </Typography>
              </Box>
            ))}
          </Paper>
          <Pagination
            count={Math.ceil(filteredTickets.length / rowsPerPage)}
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

      {selectedTicket && (
        <Modal open={!!selectedTicket} onClose={() => setSelectedTicket(null)}>
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              bgcolor: 'background.paper',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              p: { xs: 2, sm: 3 },
              width: { xs: '90%', sm: 400 },
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
              Reply to: {selectedTicket.ticketEmail}
            </Typography>
            <Box
              component="textarea"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type your reply here..."
              sx={{
                width: '100%',
                height: '100px',
                p: 1,
                borderRadius: 1,
                border: '1px solid #ccc',
                resize: 'none',
                fontSize: '0.9rem',
                fontFamily: 'inherit',
                '&:focus': { outline: 'none', borderColor: '#1976d2' },
              }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, gap: 1 }}>
              <Button
                variant="contained"
                onClick={handleReplySubmit}
                disabled={loading}
                sx={{
                  borderRadius: 1,
                  textTransform: 'none',
                  bgcolor: '#1c1f2e',
                  '&:hover': { bgcolor: '#2c3147' },
                  px: 3,
                  fontSize: '0.9rem',
                }}
              >
                {loading ? 'Sending...' : 'Send Reply'}
              </Button>
              <Button
                variant="outlined"
                onClick={() => setSelectedTicket(null)}
                sx={{
                  borderRadius: 1,
                  textTransform: 'none',
                  borderColor: '#ccc',
                  color: '#000',
                  '&:hover': { borderColor: '#999', bgcolor: 'rgba(0,0,0,0.05)' },
                  px: 3,
                  fontSize: '0.9rem',
                }}
              >
                Cancel
              </Button>
            </Box>
          </Box>
        </Modal>
      )}

      {toast && (
        <Box
          sx={{
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            bgcolor: '#1c1f2e',
            color: '#fff',
            p: '10px 20px',
            borderRadius: 1,
            zIndex: 1000,
            fontWeight: '500',
            fontSize: '0.9rem',
          }}
        >
          {toast}
        </Box>
      )}
    </>
  );
};

export default SupportTicket;