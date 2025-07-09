import React from 'react';
import styles from './PlanCard.module.css';

const PlanCard = ({ title, price, credits, features, buttonText, popular }) => {
  return (
    <div className="col-md-4">
      <div className={styles.planCard}>
        {popular && <div className={styles.planPopular}>Most Popular</div>}
        <div className={styles.planContent}>
          <h4 className={styles.planTitle}>{title}</h4>
          <p className={styles.planPrice}>{price}</p>
          <p className={styles.planCredits}>{credits}</p>
          <ul className={styles.planFeatures}>
            {features.map((feature, index) => (
              <li key={index} className={styles.planFeature}>{feature}</li>
            ))}
          </ul>
          <button className="btn btn-primary w-100" style={{ backgroundColor: popular ? '#6f42c1' : '' }}>
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlanCard;