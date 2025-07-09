import React, { useState } from 'react';
import './HelpCenter.css';

const HelpCenter = () => {
  // FAQ Component
  const FAQItem = ({ question, answer }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <div className="hc-faq-border hc-faq-padding transition-all duration-300 hover:bg-gray-50 rounded-lg">
        <button
          className="hc-faq-button flex justify-between w-full text-left text-lg font-semibold text-gray-900 hover:text-indigo-600 transition-colors duration-200"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="hc-faq-question">{question}</span>
          <span className="hc-faq-toggle text-2xl transition-transform duration-200 transform">{isOpen ? '−' : '+'}</span>
        </button>
        {isOpen && (
          <div className="hc-faq-answer mt-3 text-gray-700 leading-relaxed animate-fadeIn">{answer}</div>
        )}
      </div>
    );
  };

  // FAQs Data
  const faqs = [
    {
      question: 'What is this CRM system used for?',
      answer: 'This CRM system helps businesses manage interactions with current and potential customers. It includes features like contact management, sales tracking, lead generation, and support ticket handling.',
    },
    {
      question: 'How can I create a new customer entry?',
      answer: 'Navigate to the Customers section, click on "Add Customer", and fill in the required details such as name, email, phone, and company information.',
    },
    {
      question: 'How do I track customer interactions?',
      answer: 'You can view all customer interactions by opening the customer profile and reviewing the Activity Log or Notes section.',
    },
    {
      question: 'Can I assign tasks to team members?',
      answer: 'Yes, tasks can be created and assigned under the Tasks or Activities section, where you can set due dates, priorities, and assignees.',
    },
  ];

  return (
    <div className="hc-container min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center py-16">
      <div className="hc-content-container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl w-full">
        <h1 className="hc-main-title text-4xl sm:text-5xl font-extrabold text-center mb-12 text-gray-900 tracking-tight">
          Help Center
        </h1>
        <div className="hc-faq-section bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
          <h2 className="hc-faq-title text-2xl sm:text-3xl font-bold mb-6 text-gray-900">Frequently Asked Questions</h2>
          {faqs.map((faq, index) => (
            <FAQItem key={index} question={faq.question} answer={faq.answer} />
          ))}

          <h2 className="hc-contact-title text-2xl sm:text-3xl font-bold mt-10 mb-6 text-gray-900">Contact Details</h2>
          <div className="hc-contact-details bg-gray-50 p-6 rounded-lg flex flex-col md:flex-row gap-6">
            <div className="hc-contact-info flex-1">
              <p className="hc-contact-email text-gray-700 mb-3">
                Email:{' '}
                <a
                  href="mailto:support@example.com"
                  className="text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  Your@example.com
                </a>
              </p>
              <p className="hc-contact-phone text-gray-700 mb-3">
                Phone:{' '}
                <a
                  href="tel:+1234567890"
                  className="text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  +1 (234) 567-890
                </a>
              </p>
              <p className="hc-contact-address text-gray-700">
                Address: 123 Help Street, Support City, SC 12345
              </p>
            </div>
            <div className="hc-contact-map flex-1">
              <iframe
                className="w-full h-64 rounded-lg shadow-sm"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3153.086108153548!2d-122.4194156846813!3d37.77492977975966!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMznCsDQ2JzI5LjciTiAxMjLCsDI1JzA4LjkiVw!5e0!3m2!1sen!2sus!4v1631234567890!5m2!1sen!2sus"
                allowFullScreen=""
                loading="lazy"
                title="Support Office Location"
              ></iframe>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpCenter;
