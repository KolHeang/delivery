'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { saasApi, Plan, CouponValidation } from '@/lib/saas-api';
import { isAuthenticated } from '@/lib/auth';
import {
  MdCheckCircle,
  MdStar,
  MdBolt,
  MdSupportAgent,
  MdShield,
  MdAutorenew,
  MdLocalOffer,
  MdCardGiftcard,
  MdLogin,
  MdArrowForward,
  MdWorkspacePremium,
  MdRocketLaunch,
} from 'react-icons/md';

function PricingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refCode = searchParams.get('ref') || searchParams.get('coupon') || '';

  const [plans, setPlans] = useState<Plan[]>([]);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(true);
  const [discountInfo, setDiscountInfo] = useState<CouponValidation['coupon'] | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  useEffect(() => {
    if (refCode) {
      validateRefCode(refCode);
    }
  }, [refCode]);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const data = await saasApi.getPlans();
      setPlans(data);
    } catch (err) {
      console.error('Failed to load plans:', err);
    } finally {
      setLoading(false);
    }
  };

  const validateRefCode = async (code: string) => {
    try {
      const res = await saasApi.validateCoupon(code, 100);
      if (res && res.coupon) {
        setDiscountInfo(res.coupon);
      }
    } catch (err) {
      setDiscountInfo(null);
    }
  };

  const handleSelectPlan = (plan: Plan) => {
    const params = new URLSearchParams({
      planId: plan.id.toString(),
      cycle: billingCycle,
    });
    if (refCode) {
      params.set('ref', refCode);
    }
    router.push(`/checkout?${params.toString()}`);
  };

  const calculateDiscountedPrice = (originalPrice: number) => {
    if (!discountInfo) return originalPrice;
    if (discountInfo.discountType === 'percentage') {
      const discounted = originalPrice * (1 - Number(discountInfo.discountValue) / 100);
      return Math.max(0, discounted);
    } else {
      return Math.max(0, originalPrice - Number(discountInfo.discountValue));
    }
  };

  return (
    <div style={{ width: '100%', paddingBottom: 40, position: 'relative' }}>
      {/* Ambient background glow */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '800px',
          height: '350px',
          background: 'radial-gradient(ellipse at top, rgba(99, 102, 241, 0.12), transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Referral / Partner Discount Banner */}
      {refCode && (
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            background: 'linear-gradient(135deg, #064e3b 0%, #047857 100%)',
            borderRadius: 20,
            padding: '20px 28px',
            marginBottom: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 20,
            flexWrap: 'wrap',
            color: '#fff',
            boxShadow: '0 16px 36px -10px rgba(6, 78, 59, 0.35)',
            border: '1px solid rgba(255,255,255,0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: 14,
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 26,
                flexShrink: 0,
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              🎁
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span
                  style={{
                    background: '#ecfdf5',
                    color: '#065f46',
                    padding: '3px 12px',
                    borderRadius: 20,
                    fontSize: 11.5,
                    fontWeight: 800,
                    letterSpacing: '0.5px',
                  }}
                >
                  PARTNER DISCOUNT
                </span>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#ffffff' }}>
                  កូដបញ្ចុះតម្លៃដៃគូសហការ ({refCode.toUpperCase()}) ត្រូវបានភ្ជាប់រួចរាល់!
                </h3>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 13.5, color: '#a7f3d0' }}>
                {discountInfo ? (
                  <>
                    អ្នកទទួលបានការបញ្ចុះតម្លៃ{' '}
                    <strong style={{ color: '#fff', textDecoration: 'underline' }}>
                      {discountInfo.discountType === 'percentage'
                        ? `${discountInfo.discountValue}%`
                        : `$${discountInfo.discountValue}`}
                    </strong>{' '}
                    រាល់ការជាវគ្រប់កញ្ចប់សេវាទាំងអស់ (កាត់តម្លៃដោយស្វ័យប្រវត្តពេល Checkout)
                  </>
                ) : (
                  <>កូដ {refCode.toUpperCase()} នឹងត្រូវអនុវត្តដោយស្វ័យប្រវត្តនៅពេលទូទាត់ប្រាក់</>
                )}
              </p>
            </div>
          </div>

          <div
            style={{
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(8px)',
              padding: '8px 16px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.25)',
              fontSize: 13,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <MdCheckCircle size={18} color="#6ee7b7" />
            <span>Auto Applied</span>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div style={{ textAlign: 'center', marginBottom: 48, position: 'relative', zIndex: 1 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 18px',
            borderRadius: 30,
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            color: '#4f46e5',
            fontWeight: 700,
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          <MdRocketLaunch size={16} /> ផែនការតម្លៃដែលអាចបត់បែនបាន (Flexible SaaS Pricing)
        </div>

        <h1
          style={{
            fontSize: 34,
            fontWeight: 900,
            color: '#0f172a',
            margin: '0 0 14px',
            letterSpacing: '-0.5px',
            lineHeight: 1.3,
          }}
        >
          ជ្រើសរើសកញ្ចប់សេវាដែលស័ក្តិសមជាមួយអាជីវកម្មរបស់អ្នក
        </h1>
        <p
          style={{
            fontSize: 16,
            color: '#64748b',
            maxWidth: 620,
            margin: '0 auto 32px',
            lineHeight: 1.6,
          }}
        >
          បង្កើនប្រសិទ្ធភាពគ្រប់គ្រងការដឹកជញ្ជូន តាមដានចំណូលចំណាយ និងពង្រីកសាខាដោយគ្មានដែនកំណត់
        </p>

        {/* Billing Cycle Switcher */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: '#f1f5f9',
            padding: 5,
            borderRadius: 36,
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          <button
            onClick={() => setBillingCycle('monthly')}
            style={{
              padding: '10px 26px',
              borderRadius: 30,
              border: 'none',
              background: billingCycle === 'monthly' ? '#ffffff' : 'transparent',
              color: billingCycle === 'monthly' ? '#0f172a' : '#64748b',
              fontWeight: 800,
              fontSize: 14,
              cursor: 'pointer',
              boxShadow:
                billingCycle === 'monthly'
                  ? '0 4px 14px rgba(0,0,0,0.08)'
                  : 'none',
              transition: 'all 0.25s ease',
            }}
          >
            បង់ប្រចាំខែ (Monthly)
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            style={{
              padding: '10px 24px',
              borderRadius: 30,
              border: 'none',
              background: billingCycle === 'yearly' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
              color: billingCycle === 'yearly' ? '#ffffff' : '#64748b',
              fontWeight: 800,
              fontSize: 14,
              cursor: 'pointer',
              boxShadow:
                billingCycle === 'yearly'
                  ? '0 6px 18px rgba(99,102,241,0.35)'
                  : 'none',
              transition: 'all 0.25s ease',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>បង់ប្រចាំឆ្នាំ (Yearly)</span>
            <span
              style={{
                fontSize: 11,
                background: billingCycle === 'yearly' ? '#ec4899' : '#10b981',
                color: '#fff',
                padding: '2px 8px',
                borderRadius: 14,
                fontWeight: 800,
                letterSpacing: '0.3px',
              }}
            >
              សន្សំ 20%
            </span>
          </button>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#64748b', fontSize: 16 }}>
          កំពុងទាញយកព័ត៌មានកញ្ចប់សេវា...
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 28,
            marginBottom: 56,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {plans.map((plan) => {
            const isPopular = plan.isPopular;
            const originalPrice =
              billingCycle === 'yearly'
                ? Number(plan.priceYearly)
                : Number(plan.priceMonthly);

            const finalPrice = calculateDiscountedPrice(originalPrice);
            const hasDiscount = discountInfo && finalPrice < originalPrice;

            return (
              <div
                key={plan.id}
                style={{
                  background: isPopular ? '#ffffff' : '#ffffff',
                  borderRadius: 24,
                  padding: '36px 30px',
                  border: isPopular
                    ? '2px solid #6366f1'
                    : hasDiscount
                    ? '2px solid #10b981'
                    : '1px solid #e2e8f0',
                  boxShadow: isPopular
                    ? '0 20px 45px -10px rgba(99, 102, 241, 0.25), 0 0 0 1px rgba(99, 102, 241, 0.2)'
                    : '0 12px 30px -8px rgba(15, 23, 42, 0.06), 0 0 0 1px rgba(226, 232, 240, 0.6)',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  transition: 'all 0.3s ease',
                  transform: isPopular ? 'scale(1.02)' : 'none',
                }}
              >
                {/* Popular Badge */}
                {isPopular && (
                  <div
                    style={{
                      position: 'absolute',
                      top: -14,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      color: '#ffffff',
                      fontSize: 12,
                      fontWeight: 800,
                      padding: '5px 16px',
                      borderRadius: 20,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow: '0 6px 16px rgba(99,102,241,0.35)',
                      letterSpacing: '0.5px',
                    }}
                  >
                    <MdBolt size={15} /> ពេញនិយមបំផុត (POPULAR)
                  </div>
                )}

                {hasDiscount && !isPopular && (
                  <div
                    style={{
                      position: 'absolute',
                      top: -14,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: '#ffffff',
                      fontSize: 12,
                      fontWeight: 800,
                      padding: '5px 16px',
                      borderRadius: 20,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow: '0 6px 16px rgba(16,185,129,0.3)',
                    }}
                  >
                    <MdLocalOffer size={14} /> បញ្ចុះតម្លៃដៃគូ
                  </div>
                )}

                <div style={{ marginBottom: 20 }}>
                  <h3
                    style={{
                      fontSize: 22,
                      fontWeight: 900,
                      color: '#0f172a',
                      marginBottom: 8,
                    }}
                  >
                    {plan.name}
                  </h3>
                  <p
                    style={{
                      fontSize: 13.5,
                      color: '#64748b',
                      minHeight: 42,
                      lineHeight: 1.5,
                      margin: 0,
                    }}
                  >
                    {plan.description}
                  </p>
                </div>

                {/* Price Display */}
                <div
                  style={{
                    background: '#f8fafc',
                    borderRadius: 16,
                    padding: '20px',
                    marginBottom: 24,
                    border: '1px solid #f1f5f9',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                    {hasDiscount && (
                      <span
                        style={{
                          fontSize: 20,
                          fontWeight: 700,
                          color: '#94a3b8',
                          textDecoration: 'line-through',
                        }}
                      >
                        ${originalPrice.toFixed(2)}
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: 42,
                        fontWeight: 900,
                        color: hasDiscount ? '#059669' : '#0f172a',
                        letterSpacing: '-1px',
                        lineHeight: 1,
                      }}
                    >
                      ${finalPrice.toFixed(2)}
                    </span>
                    <span style={{ fontSize: 14, color: '#64748b', fontWeight: 600 }}>
                      / {billingCycle === 'yearly' ? 'ឆ្នាំ (year)' : 'ខែ (month)'}
                    </span>
                  </div>

                  {hasDiscount && (
                    <div
                      style={{
                        display: 'inline-block',
                        marginTop: 8,
                        fontSize: 12,
                        color: '#047857',
                        background: '#dcfce7',
                        padding: '3px 10px',
                        borderRadius: 8,
                        fontWeight: 800,
                      }}
                    >
                      សន្សំ ${(originalPrice - finalPrice).toFixed(2)} ជាមួយកូដ {refCode.toUpperCase()}
                    </div>
                  )}

                  {billingCycle === 'yearly' && (
                    <div style={{ fontSize: 12, color: '#10b981', fontWeight: 700, marginTop: 6 }}>
                      ស្មើនឹង ${(finalPrice / 12).toFixed(2)} ក្នុងមួយខែ
                    </div>
                  )}
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => handleSelectPlan(plan)}
                  style={{
                    width: '100%',
                    padding: '15px',
                    borderRadius: 14,
                    border: 'none',
                    background: isPopular
                      ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'
                      : hasDiscount
                      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                      : '#0f172a',
                    color: '#ffffff',
                    fontSize: 15,
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: isPopular
                      ? '0 8px 24px rgba(99,102,241,0.4)'
                      : hasDiscount
                      ? '0 8px 24px rgba(16,185,129,0.35)'
                      : '0 4px 12px rgba(15,23,42,0.15)',
                    marginBottom: 28,
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <span>ជ្រើសរើសកញ្ចប់នេះ (Get Started)</span>
                  <MdArrowForward size={17} />
                </button>

                {/* Feature List */}
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 22, flex: 1 }}>
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: '#94a3b8',
                      textTransform: 'uppercase',
                      letterSpacing: '0.8px',
                      marginBottom: 14,
                    }}
                  >
                    លក្ខណៈពិសេសរួមមាន៖
                  </p>
                  <ul
                    style={{
                      listStyle: 'none',
                      padding: 0,
                      margin: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 13,
                    }}
                  >
                    <li style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: '#334155' }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <MdCheckCircle color="#10b981" size={16} />
                      </div>
                      <span>រហូតដល់ <strong>{plan.maxOrdersPerMonth}</strong> Orders/ខែ</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: '#334155' }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <MdCheckCircle color="#10b981" size={16} />
                      </div>
                      <span>បុគ្គលិកប្រើប្រាស់រហូតដល់ <strong>{plan.maxUsers}</strong> នាក់</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: '#334155' }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <MdCheckCircle color="#10b981" size={16} />
                      </div>
                      <span>អ្នកដឹកជញ្ជូនរហូតដល់ <strong>{plan.maxDrivers}</strong> Drivers</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: '#334155' }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <MdCheckCircle color="#10b981" size={16} />
                      </div>
                      <span>Telegram Instant Alerts</span>
                    </li>
                    {plan.features?.customReports && (
                      <li style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: '#334155' }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <MdCheckCircle color="#10b981" size={16} />
                        </div>
                        <span>របាយការណ៍កម្រិតខ្ពស់ & Export Excel</span>
                      </li>
                    )}
                    {plan.features?.apiAccess && (
                      <li style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: '#334155' }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <MdCheckCircle color="#10b981" size={16} />
                        </div>
                        <span>Open API Access for Developers</span>
                      </li>
                    )}
                    {plan.features?.customBranding && (
                      <li style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: '#334155' }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <MdCheckCircle color="#10b981" size={16} />
                        </div>
                        <span>Custom Domain & Brand Logo</span>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Value Props & Bento Box */}
      <div
        style={{
          background: 'linear-gradient(135deg, #ffffff, #f8fafc)',
          borderRadius: 24,
          padding: '36px 32px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 10px 30px -10px rgba(0,0,0,0.04)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 28,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ display: 'flex', gap: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)',
              color: '#4338ca',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <MdShield size={26} />
          </div>
          <div>
            <h4 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
              សុវត្ថិភាពទិន្នន័យ 100%
            </h4>
            <p style={{ fontSize: 13.5, color: '#64748b', lineHeight: 1.6, margin: 0 }}>
              ទិន្នន័យរបស់អ្នកត្រូវបានការពារ និង Backup ដោយស្វ័យប្រវត្តិជារៀងរាល់ថ្ងៃ។
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
              color: '#b45309',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <MdAutorenew size={26} />
          </div>
          <div>
            <h4 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
              បត់បែន និងដំឡើងកញ្ចប់ពេលណាក៏បាន
            </h4>
            <p style={{ fontSize: 13.5, color: '#64748b', lineHeight: 1.6, margin: 0 }}>
              អាច Upgrade, Downgrade ឬ Cancel បានគ្រប់ពេលវេលាដោយគ្មានកិច្ចសន្យាចងភ្ជាប់។
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
              color: '#15803d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <MdSupportAgent size={26} />
          </div>
          <div>
            <h4 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
              ការគាំទ្របច្ចេកទេស 24/7
            </h4>
            <p style={{ fontSize: 13.5, color: '#64748b', lineHeight: 1.6, margin: 0 }}>
              ក្រុមការងារជំនាញបច្ចេកទេសប្រចាំការជួយដោះស្រាយគ្រប់បញ្ហារបស់លោកអ្នក។
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PricingPage() {
  const [isLogged, setIsLogged] = useState(true);
  const router = useRouter();

  useEffect(() => {
    setIsLogged(isAuthenticated());
  }, []);

  if (!isLogged) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
        {/* Public Header */}
        <header
          style={{
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid #e2e8f0',
            padding: '16px 28px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 800,
                fontSize: 20,
                boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
              }}
            >
              📦
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 900, margin: 0, color: '#0f172a', letterSpacing: '-0.3px' }}>
                EBS<span style={{ color: '#4f46e5' }}>Express</span>
              </h2>
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Delivery SaaS Platform</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => router.push('/auth')}
              style={{
                padding: '10px 22px',
                borderRadius: 12,
                border: '1px solid #cbd5e1',
                background: '#fff',
                color: '#0f172a',
                fontWeight: 700,
                fontSize: 13.5,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
              }}
            >
              <MdLogin size={16} /> ចូលប្រព័ន្ធ (Login)
            </button>
          </div>
        </header>

        <Suspense fallback={<div style={{ textAlign: 'center', padding: 60 }}>កំពុងទាញយក...</div>}>
          <PricingContent />
        </Suspense>
      </div>
    );
  }

  return (
    <MainLayout>
      <Suspense fallback={<div style={{ textAlign: 'center', padding: 60 }}>កំពុងទាញយក...</div>}>
        <PricingContent />
      </Suspense>
    </MainLayout>
  );
}
