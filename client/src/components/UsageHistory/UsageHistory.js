import React from 'react';
import styles from './UsageHistory.module.css';

const UsageHistory = () => {
  const history = [
    { year: '2024', month: 'Dec', creditsWorkflows: '100 credits + 5 workflows', cost: '$0 [Free]' },
    { year: '2024', month: 'Nov', creditsWorkflows: '90 credits + 3 workflows', cost: '$0 [Free]' },
    { year: '2024', month: 'Oct', creditsWorkflows: '45 credits + 2 workflows', cost: '$0 [Free]' },
  ];

  return (
    <div className={styles.historyContainer}>
      <h3 className={styles.historyTitle}>Usage History</h3>
      {history.map((item, index) => (
        <div key={index} className={styles.historyItem}>
          <div className={styles.historyDateContainer}>
            <div className={styles.historyDate}>
              <span className={styles.historyMonth}>{item.month}</span>
              <span className={styles.historyYear}>{item.year}</span>
            </div>
            <span className={styles.historyCreditsWorkflows}>{item.creditsWorkflows}</span>
          </div>
          <span className={styles.historyCost}>{item.cost}</span>
        </div>
      ))}
    </div>
  );
};

export default UsageHistory;