import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import './AdminPanel.css';
import { Check, X, LogOut, Ticket, RefreshCw } from 'lucide-react';

const AdminPanel = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPhone, setAdminPhone] = useState('');
  const [loginError, setLoginError] = useState('');
  
  const [activeTab, setActiveTab] = useState('pending'); // pending, approved, coupons
  
  const [subscriptions, setSubscriptions] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  // New Coupon State
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDiscount, setNewCouponDiscount] = useState(10);
  const [newCouponLimit, setNewCouponLimit] = useState('');

  useEffect(() => {
    const savedAdmin = localStorage.getItem('svar_admin_logged_in');
    if (savedAdmin) {
      setIsAdmin(true);
      fetchData();
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('phone_number', adminPhone)
        .eq('role', 'admin')
        .single();
        
      if (data) {
        setIsAdmin(true);
        localStorage.setItem('svar_admin_logged_in', 'true');
        fetchData();
      } else {
        setLoginError('Invalid admin phone number.');
      }
    } catch (err) {
      setLoginError('Authentication failed. Are you sure you ran the SQL script?');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('svar_admin_logged_in');
    setIsAdmin(false);
  };

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchSubscriptions(), fetchCoupons(), fetchUsers()]);
    setLoading(false);
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .neq('role', 'admin')
      .order('created_at', { ascending: false });
    if (data) setAllUsers(data);
  };

  const fetchSubscriptions = async () => {
    const { data } = await supabase
      .from('subscriptions')
      .select(`
        *,
        users ( name, phone_number )
      `)
      .order('created_at', { ascending: false });
      
    if (data) {
      setSubscriptions(data);
    }
  };

  const fetchCoupons = async () => {
    const { data } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setCoupons(data);
  };

  const approvePayment = async (subId, planType) => {
    if (!window.confirm('Are you sure you received the payment for this user?')) return;
    
    // Calculate expiry date
    const date = new Date();
    if (planType === 'lifetime') {
      date.setFullYear(date.getFullYear() + 100);
    } else {
      date.setMonth(date.getMonth() + (planType === '1_month' ? 1 : 3));
    }
    
    await supabase
      .from('subscriptions')
      .update({ status: 'approved', expires_at: date.toISOString() })
      .eq('id', subId);
      
    fetchSubscriptions();
  };

  const rejectPayment = async (subId) => {
    if (!window.confirm('Are you sure you want to reject this payment?')) return;
    await supabase
      .from('subscriptions')
      .update({ status: 'rejected' })
      .eq('id', subId);
    fetchSubscriptions();
  };

  const createCoupon = async (e) => {
    e.preventDefault();
    if (!newCouponCode) return;
    
    try {
      const { error } = await supabase
        .from('coupons')
        .insert([{ 
          code: newCouponCode.toUpperCase().trim(), 
          discount_percentage: newCouponDiscount,
          usage_limit: newCouponLimit ? Number(newCouponLimit) : null,
          usage_count: 0
        }]);
        
      if (error) {
        if (error.code === 'PGRST204' || error.message?.includes('usage_limit')) {
          alert('Database columns missing! Please run this SQL command in your Supabase SQL Editor:\n\nALTER TABLE coupons ADD COLUMN usage_limit INTEGER DEFAULT NULL;\nALTER TABLE coupons ADD COLUMN usage_count INTEGER DEFAULT 0;');
        } else {
          alert('Error creating coupon: ' + error.message);
        }
      } else {
        setNewCouponCode('');
        setNewCouponDiscount(10);
        setNewCouponLimit('');
        fetchCoupons();
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const toggleCouponStatus = async (id, currentStatus) => {
    await supabase
      .from('coupons')
      .update({ is_active: !currentStatus })
      .eq('id', id);
    fetchCoupons();
  };

  const deleteCoupon = async (id) => {
    if (!window.confirm('Are you sure you want to delete this coupon?')) return;
    await supabase.from('coupons').delete().eq('id', id);
    fetchCoupons();
  };

  const deleteUser = async (userId) => {
    if (!window.confirm('Are you absolutely sure you want to delete this user? This cannot be undone.')) return;
    
    // Delete their subscriptions first to avoid foreign key constraints
    await supabase.from('subscriptions').delete().eq('user_id', userId);
    
    // Then delete the user
    await supabase.from('users').delete().eq('id', userId);
    
    fetchData(); // Refresh all data
  };

  if (!isAdmin) {
    return (
      <div className="admin-login-container">
        <form className="admin-login-box" onSubmit={handleLogin}>
          <h2>Admin Login</h2>
          <p>Enter your admin phone number to access the dashboard.</p>
          <input 
            type="text" 
            placeholder="e.g. 1234567890" 
            value={adminPhone} 
            onChange={e => setAdminPhone(e.target.value)} 
          />
          {loginError && <p className="error-text">{loginError}</p>}
          <button type="submit" className="primary-btn">Login</button>
        </form>
      </div>
    );
  }

  const pendingSubs = subscriptions.filter(s => s.status === 'pending');
  const otherSubs = subscriptions.filter(s => s.status !== 'pending');

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <div>
          <h1>Svar Admin Panel</h1>
          <p>Verify payments, manage subscriptions, and create coupons.</p>
        </div>
        <div style={{display: 'flex', gap: '1rem'}}>
          <button className="admin-action-btn" onClick={fetchData} title="Refresh Data">
            <RefreshCw size={20} />
          </button>
          <button className="admin-action-btn logout" onClick={handleLogout}>
            <LogOut size={20} /> Logout
          </button>
        </div>
      </div>

      <div className="admin-tabs">
        <button className={activeTab === 'pending' ? 'active' : ''} onClick={() => setActiveTab('pending')}>
          Pending Verifications ({pendingSubs.length})
        </button>
        <button className={activeTab === 'approved' ? 'active' : ''} onClick={() => setActiveTab('approved')}>
          Subscription History
        </button>
        <button className={activeTab === 'coupons' ? 'active' : ''} onClick={() => setActiveTab('coupons')}>
          Discount Coupons
        </button>
        <button className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')}>
          All Users ({allUsers.length})
        </button>
      </div>

      <div className="admin-content">
        {loading ? (
          <div className="loading-state">Loading data...</div>
        ) : (
          <>
            {activeTab === 'pending' && (
              <div className="data-table-container">
                {pendingSubs.length === 0 ? (
                  <p>No pending payments to verify.</p>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>User Name</th>
                        <th>Phone Number</th>
                        <th>Plan</th>
                        <th>Amount Paid</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingSubs.map(sub => (
                        <tr key={sub.id}>
                          <td>{new Date(sub.created_at).toLocaleString()}</td>
                          <td><strong>{sub.users?.name || 'Unknown'}</strong></td>
                          <td>{sub.users?.phone_number || 'Unknown'}</td>
                          <td>{sub.plan_type === '1_month' ? '1 Month' : (sub.plan_type === '3_months' ? '3 Months' : 'Lifetime')}</td>
                          <td style={{color: 'var(--primary-color)', fontWeight: 'bold'}}>₹{sub.amount_paid}</td>
                          <td className="actions-cell">
                            <button className="approve-btn" onClick={() => approvePayment(sub.id, sub.plan_type)}>
                              <Check size={18} /> Approve
                            </button>
                            <button className="reject-btn" onClick={() => rejectPayment(sub.id)}>
                              <X size={18} /> Reject
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeTab === 'approved' && (
              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>User Name</th>
                      <th>Phone Number</th>
                      <th>Plan</th>
                      <th>Expires At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {otherSubs.map(sub => {
                      const isExpired = sub.status === 'approved' && new Date(sub.expires_at) < new Date();
                      return (
                        <tr key={sub.id}>
                          <td>
                            <span className={`status-badge ${sub.status} ${isExpired ? 'expired' : ''}`}>
                              {isExpired ? 'expired' : sub.status}
                            </span>
                          </td>
                          <td>{sub.users?.name || 'Unknown'}</td>
                          <td>{sub.users?.phone_number || 'Unknown'}</td>
                          <td>{sub.plan_type === '1_month' ? '1 Month' : (sub.plan_type === '3_months' ? '3 Months' : 'Lifetime')}</td>
                          <td>{sub.plan_type === 'lifetime' ? 'Never' : (sub.expires_at ? new Date(sub.expires_at).toLocaleDateString() : '-')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'coupons' && (
              <div className="coupons-section">
                <div className="create-coupon-card">
                  <h3>Create New Coupon</h3>
                  <form onSubmit={createCoupon} style={{display: 'flex', gap: '1rem', marginTop: '1rem', alignItems: 'flex-end'}}>
                    <div className="form-group" style={{margin: 0, flex: 2}}>
                      <label>Coupon Code (e.g. DIWALI50)</label>
                      <input type="text" value={newCouponCode} onChange={e => setNewCouponCode(e.target.value)} required />
                    </div>
                    <div className="form-group" style={{margin: 0, flex: 1}}>
                      <label>Discount % (1-100)</label>
                      <input type="number" min="1" max="100" value={newCouponDiscount} onChange={e => setNewCouponDiscount(Number(e.target.value))} required />
                    </div>
                    <div className="form-group" style={{margin: 0, flex: 1}}>
                      <label>Usage Limit (Leave empty for unlimited)</label>
                      <input type="number" min="1" placeholder="e.g. 50" value={newCouponLimit} onChange={e => setNewCouponLimit(e.target.value)} />
                    </div>
                    <button type="submit" className="primary-btn" style={{padding: '0.8rem 1.5rem'}}>
                      <Ticket size={20} style={{marginRight: '8px'}} /> Create
                    </button>
                  </form>
                </div>

                <div className="data-table-container" style={{marginTop: '2rem'}}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Coupon Code</th>
                        <th>Discount</th>
                        <th>Usage</th>
                        <th>Created At</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coupons.map(coupon => (
                        <tr key={coupon.id}>
                          <td><strong>{coupon.code}</strong></td>
                          <td>{coupon.discount_percentage}% OFF</td>
                          <td>
                            {coupon.usage_limit 
                              ? `${coupon.usage_count || 0} / ${coupon.usage_limit}`
                              : `${coupon.usage_count || 0} / ∞`}
                          </td>
                          <td>{new Date(coupon.created_at).toLocaleDateString()}</td>
                          <td>
                            <span className={`status-badge ${coupon.is_active ? 'active' : 'inactive'}`}>
                              {coupon.is_active ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td style={{display: 'flex', gap: '8px'}}>
                            <button className="secondary-btn" onClick={() => toggleCouponStatus(coupon.id, coupon.is_active)} style={{padding: '4px 12px', fontSize: '0.9rem'}}>
                              {coupon.is_active ? 'Disable' : 'Enable'}
                            </button>
                            <button className="reject-btn" onClick={() => deleteCoupon(coupon.id)} style={{padding: '4px 12px', fontSize: '0.9rem'}}>
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {activeTab === 'users' && (
              <div className="data-table-container">
                {allUsers.length === 0 ? (
                  <p>No registered users found.</p>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Joined Date</th>
                        <th>Name</th>
                        <th>Phone Number</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allUsers.map(user => (
                        <tr key={user.id}>
                          <td>{new Date(user.created_at).toLocaleDateString()}</td>
                          <td><strong>{user.name || 'Unknown'}</strong></td>
                          <td>{user.phone_number}</td>
                          <td className="actions-cell">
                            <button className="reject-btn" onClick={() => deleteUser(user.id)}>
                              <X size={18} /> Delete User
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
