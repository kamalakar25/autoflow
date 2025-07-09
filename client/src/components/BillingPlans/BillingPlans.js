import React, { useState } from 'react';
import styles from './BillingPlans.module.css';
import PlanCard from '../PlanCard/PlanCard';

const BillingPlans = () => {
  const [isMonthly, setIsMonthly] = useState(true);

  const plans = [
    {
      title: 'Starter',
      monthlyPrice: '$29/month',
      annualPrice: '$290/year',
      creditsMonthly: '1,000 credits/month',
      creditsAnnual: '12,000 credits/year',
      features: ['Basic workflow automation', '5 active workflows', 'Standard data sources', 'Email support', 'CSV/Excel exports'],
      buttonText: 'Upgrade Now',
    },
    {
      title: 'Professional',
      monthlyPrice: '$79/month',
      annualPrice: '$790/year',
      creditsMonthly: '5,000 credits/month',
      creditsAnnual: '60,000 credits/year',
      features: ['Advanced workflow automation', 'Unlimited workflows', 'Premium data sources', 'Priority support', 'CRM integrations', 'API access', 'Team collaboration'],
      buttonText: 'Upgrade Now',
      popular: true,
    },
    {
      title: 'Enterprise',
      monthlyPrice: '$199/month',
      annualPrice: '$1,990/year',
      creditsMonthly: '20,000 credits/month',
      creditsAnnual: '240,000 credits/year',
      features: ['Enterprise workflow automation', 'Custom integrations', 'Dedicated account manager', '24/7 phone support', 'Advanced security', 'Custom data sources', 'White-label options'],
      buttonText: 'Upgrade Now',
    },
  ];

  return (
    <div className={styles.billingContainer}>
      <div className={styles.toggleContainer}>
        <button
          className={`btn ${styles.toggleButton} ${isMonthly ? styles.active : ''}`}
          onClick={() => setIsMonthly(true)}
        >
          Monthly
        </button>
        <button
          className={`btn ${styles.toggleButton} ${!isMonthly ? styles.active : ''}`}
          onClick={() => setIsMonthly(false)}
        >
          Annual <span className={styles.saveBadge}>Save 20%</span>
        </button>
      </div>
      <div className="row g-4 justify-content-center">
        {plans.map((plan, index) => (
          <PlanCard
            key={index}
            title={plan.title}
            price={isMonthly ? plan.monthlyPrice : plan.annualPrice}
            credits={isMonthly ? plan.creditsMonthly : plan.creditsAnnual}
            features={plan.features}
            buttonText={plan.buttonText}
            popular={plan.popular}
          />
        ))}
      </div>
    </div>
  );
};

export default BillingPlans;