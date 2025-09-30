import React from 'react';
import Newsletter from './Newsletter';

const NewsletterManager: React.FC = () => {
  // Tabs have been moved to the main AdminPanel.
  // This component now directly renders the newsletter editor.
  return <Newsletter />;
};

export default NewsletterManager;
