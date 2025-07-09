import React from 'react';
import styles from './CurrentUsage.module.css';

const CurrentUsage = () => {
  return (
    <div className={styles.usageContainer}>
      <h2 className={styles.usageHeading}>Billing & Plans</h2>
      <p className={styles.usageSubtext}>Choose the perfect plan for your automation needs</p>
      <div className={styles.usageBox}>
        <h3 className={styles.usageTitle}>Current Usage</h3>
        <div className={styles.usageDetails}>
          <div className={styles.usageItem}>
            <span className={styles.usageValue}>50</span>
            <span className={styles.usageLabel}>Credits Used</span>
          </div>
          <div className={styles.usageItem}>
            <span className={styles.usageValue}>3</span>
            <span className={styles.usageLabel}>Active Workflows</span>
          </div>
          <div className={styles.usageItem}>
            <span className={styles.usageValue}>Free</span>
            <span className={styles.usageLabel}>Current Plan</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CurrentUsage;