import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Check, QrCode, X } from 'lucide-react';
import './Paywall.css';

const Paywall = ({ onAccessGranted, onClose }) => {
  const [step, setStep] = useState(1);
  const [isLogin, setIsLogin] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [plan, setPlan] = useState('1_month');
  const [coupon, setCoupon] = useState('');
  const [discount, setDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [pendingSubInfo, setPendingSubInfo] = useState(null);
  const [qrError, setQrError] = useState(false);

  const plans = {
    '1_month': { title: '1 Month', originalPrice: 60, discountedPrice: 39 },
    '3_months': { title: '3 Months', originalPrice: 120, discountedPrice: 69 },
    'lifetime': { title: 'Lifetime', originalPrice: 500, discountedPrice: 250 }
  };

  useEffect(() => {
    const savedPhone = localStorage.getItem('svar_user_phone');
    if (savedPhone) {
      setPhone(savedPhone);
      checkSubscriptionStatus(savedPhone);
    }
  }, []);

  useEffect(() => {
    if (!pendingSubInfo) return;

    const interval = setInterval(async () => {
      const { data: checkSub } = await supabase
        .from('subscriptions')
        .select('status, expires_at')
        .eq('id', pendingSubInfo.subId)
        .single();
      
      if (checkSub?.status === 'approved') {
        onAccessGranted(pendingSubInfo.user, checkSub);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [pendingSubInfo, onAccessGranted]);

  const checkSubscriptionStatus = async (phoneNumber) => {
    try {
      const { data: user } = await supabase
        .from('users')
        .select('id, name, phone_number')
        .eq('phone_number', phoneNumber)
        .single();

      if (user) {
        setName(user.name);
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (sub) {
          if (sub.status === 'approved') {
            const now = new Date();
            const expires = new Date(sub.expires_at);
            if (expires > now) {
              localStorage.setItem('svar_user_phone', phoneNumber);
              onAccessGranted(user, sub);
              return 'active';
            } else {
              setStep(1);
              return 'expired';
            }
          } else if (sub.status === 'pending') {
            localStorage.setItem('svar_user_phone', phoneNumber);
            setStep(3);
            setStatus('pending');
            setPendingSubInfo({ user, subId: sub.id });
            return 'pending';
          }
        }
      }
      return 'none';
    } catch (err) {
      console.error(err);
      return 'none';
    } finally {
      setIsChecking(false);
    }
  };

  const handleApplyCoupon = async () => {
    if (!coupon) return;
    setError('');
    setLoading(true);
    try {
      const { data: couponData } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', coupon.toUpperCase())
        .eq('is_active', true)
        .single();
        
      if (couponData) {
        if (couponData.usage_limit && couponData.usage_count >= couponData.usage_limit) {
          setError('This coupon has reached its usage limit');
          setDiscount(0);
          setAppliedCoupon(null);
        } else {
          setDiscount(couponData.discount_percentage);
          setAppliedCoupon(couponData);
        }
      } else {
        setError('Invalid or expired coupon code');
        setDiscount(0);
        setAppliedCoupon(null);
      }
    } catch (e) {
      setError('Error applying coupon');
    }
    setLoading(false);
  };

  const handleProceed = async () => {
    if ((!isLogin && !name) || phone.length < 10) {
      setError('Please enter a valid phone number (and name if new user)');
      return;
    }
    setError('');
    setLoading(true);
    
    const subStatus = await checkSubscriptionStatus(phone);
    setLoading(false);
    
    if (subStatus === 'none' || subStatus === 'expired') {
      if (isLogin) {
        setError('No active subscription found for this phone number. Please subscribe as a New User.');
      } else {
        setStep(2);
      }
    }
  };

  const handlePaid = async () => {
    setLoading(true);
    setError('');
    try {
      let userId;
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('phone_number', phone)
        .maybeSingle();

      if (existingUser) {
        userId = existingUser.id;
        await supabase.from('users').update({ name }).eq('id', userId);
      } else {
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert([{ phone_number: phone, name }])
          .select()
          .single();
          
        if (createError) throw createError;
        userId = newUser.id;
      }

      let finalPrice = plans[plan].originalPrice;
      if (discount > 0) {
        finalPrice = finalPrice - (finalPrice * (discount / 100));
      }
      if (discount === 100) finalPrice = 0;

      const isFree = finalPrice === 0;
      let expires_at = null;
      if (isFree) {
        const date = new Date();
        if (plan === 'lifetime') {
          date.setFullYear(date.getFullYear() + 100);
        } else {
          date.setMonth(date.getMonth() + (plan === '1_month' ? 1 : 3));
        }
        expires_at = date.toISOString();
      }

      const { data: newSub, error: subError } = await supabase
        .from('subscriptions')
        .insert([{
          user_id: userId,
          plan_type: plan,
          amount_paid: finalPrice,
          status: isFree ? 'approved' : 'pending',
          expires_at: expires_at
        }])
        .select()
        .single();

      if (subError) throw subError;

      if (appliedCoupon) {
        await supabase
          .from('coupons')
          .update({ usage_count: (appliedCoupon.usage_count || 0) + 1 })
          .eq('id', appliedCoupon.id);
      }

      localStorage.setItem('svar_user_phone', phone);
      
      if (isFree) {
        onAccessGranted({ id: userId, name, phone_number: phone }, newSub);
      } else {
        setStep(3);
        setStatus('pending');
        checkSubscriptionStatus(phone);
      }

    } catch (err) {
      console.error(err);
      setError('Something went wrong connecting to the database.');
    }
    setLoading(false);
  };

  let finalPrice = plans[plan].originalPrice;
  if (discount > 0) {
    finalPrice = finalPrice - (finalPrice * (discount / 100));
  }
  if (discount === 100) finalPrice = 0;

  return (
    <div className="paywall-overlay">
      <div className="paywall-container" style={{ position: 'relative' }}>
        {onClose && (
          <button 
            onClick={onClose} 
            style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', zIndex: 10 }}
          >
            <X size={24} />
          </button>
        )}
        
        {step === 1 && (
          <>
            <div className="paywall-header">
              <h2>{isLogin ? 'Login to Svar' : 'Unlock Svar Premium'}</h2>
              <p>{isLogin ? 'Enter your registered phone number to restore access.' : 'Ad-free songs, unlimited downloads, and premium quality.'}</p>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '12px' }}>
              <button 
                onClick={() => setIsLogin(false)}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: !isLogin ? 'var(--primary-color)' : 'transparent', color: 'white', fontWeight: 'bold', cursor: 'pointer', transition: '0.3s' }}
              >
                New User
              </button>
              <button 
                onClick={() => setIsLogin(true)}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: isLogin ? 'var(--primary-color)' : 'transparent', color: 'white', fontWeight: 'bold', cursor: 'pointer', transition: '0.3s' }}
              >
                Existing User
              </button>
            </div>

            {!isLogin && (
              <div className="plans-grid">
                {Object.entries(plans).map(([key, p]) => (
                  <div 
                    key={key} 
                    className={`plan-card ${plan === key ? 'selected' : ''}`}
                    onClick={() => setPlan(key)}
                  >
                    <h3>{p.title}</h3>
                    <div className="price">
                      {discount > 0 && discount !== 100 ? (
                        <>
                          <span style={{textDecoration: 'line-through', color: 'var(--text-secondary)', fontSize: '1rem', marginRight: '8px'}}>₹{p.originalPrice}</span>
                          ₹{(p.originalPrice - (p.originalPrice * (discount / 100))).toFixed(2)}
                        </>
                      ) : discount === 100 ? (
                        <>
                          <span style={{textDecoration: 'line-through', color: 'var(--text-secondary)', fontSize: '1rem', marginRight: '8px'}}>₹{p.originalPrice}</span>
                          ₹0
                        </>
                      ) : (
                        <>₹{p.originalPrice}</>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isLogin && (
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Enter your name" />
              </div>
            )}

            <div className="form-group">
              <label>Phone Number</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="10-digit mobile number" />
            </div>

            {!isLogin && (
              <div className="coupon-group">
                <input 
                  type="text" 
                  value={coupon} 
                  onChange={e => setCoupon(e.target.value)} 
                  placeholder="Coupon code (optional)" 
                  style={{ textTransform: 'uppercase' }}
                />
                <button onClick={handleApplyCoupon} disabled={!coupon || loading}>
                  Apply
                </button>
              </div>
            )}
            
            {!isLogin && discount > 0 && <div className="discount-success">Coupon applied successfully!</div>}
            {error && <div className="error-text" style={{color: '#ff5252', marginTop: '1rem'}}>{error}</div>}

            <button className="primary-btn checkout-btn" onClick={handleProceed} disabled={loading}>
              {loading ? 'Checking Account...' : (isLogin ? 'Login' : `Proceed to Pay ₹${Math.max(0, finalPrice).toFixed(2)}`)}
            </button>

            <button 
              onClick={() => {
                localStorage.setItem('svar_skipped_paywall', 'true');
                onAccessGranted({ id: 'guest', name: 'Guest' }, null);
              }}
              style={{marginTop: '1rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', textDecoration: 'underline'}}
            >
              Skip for now
            </button>
          </>
        )}

        {step === 2 && (
          <div className="qr-step">
            <h2>Scan & Pay</h2>
            <p>Scan the QR code below using GPay, PhonePe, or Paytm to pay <strong style={{color:'var(--primary-color)'}}>₹{finalPrice.toFixed(2)}</strong>.</p>
            <p style={{fontSize: '0.9rem', color: 'var(--text-secondary)'}}>You will see <strong>Svar (or State Bank of India)</strong> as the payment receiver.</p>
            
            <div className="qr-container" style={{margin: '1.5rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
              {!qrError ? (
                <img 
                  src="/qrcode.png" 
                  alt="UPI QR Code" 
                  style={{maxWidth: '250px', borderRadius: '12px', marginBottom: '1rem'}} 
                  onError={() => setQrError(true)} 
                />
              ) : (
                <div className="qr-fallback" style={{display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem', background: '#222', borderRadius: '12px', marginBottom: '1rem'}}>
                  <QrCode size={64} color="var(--primary-color)" />
                  <p style={{marginTop: '1rem'}}>UPI ID: 6005806900@nyes</p>
                </div>
              )}
              
              <a 
                href={`upi://pay?pa=6005806900@nyes&pn=Svar&am=${finalPrice.toFixed(2)}&cu=INR`}
                className="primary-btn" 
                style={{textDecoration: 'none', display: 'inline-block', width: '100%', marginBottom: '1rem', background: '#fff', color: '#000'}}
              >
                Pay directly with UPI App
              </a>
            </div>

            {error && <div className="error-text" style={{color: '#ff5252', marginBottom: '1rem'}}>{error}</div>}

            <button className="primary-btn checkout-btn" onClick={handlePaid} disabled={loading}>
              {loading ? 'Processing...' : 'I have paid'}
            </button>
            <button onClick={() => setStep(1)} style={{marginTop: '1rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer'}}>
              Go Back
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="waiting-room" style={{textAlign: 'center', padding: '2rem 0'}}>
            <h2>Verifying Payment...</h2>
            <p style={{marginTop: '1rem'}}>Please wait 10-20 minutes for admin verification.</p>
            <p style={{color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '1.5rem', lineHeight: '1.5'}}>
              Once your payment of ₹{finalPrice.toFixed(2)} is verified, the app will automatically unlock on this device.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

export default Paywall;
