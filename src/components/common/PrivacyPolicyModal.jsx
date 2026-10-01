import React from 'react';
import { LegalModal } from '../legal/LegalModal';

export const PrivacyPolicyModal = ({ isOpen, onClose, initialTab = 'privacy' }) => {
  return (
    <LegalModal
      isOpen={isOpen}
      onClose={onClose}
      initialTab={initialTab}
    />
  );
};

export default PrivacyPolicyModal;
