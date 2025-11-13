import React, { useState } from 'react';

interface ExpandableTextProps {
  text: string;
  maxLength: number;
  className?: string;
}

const ExpandableText: React.FC<ExpandableTextProps> = ({ text, maxLength, className }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const displayText = isExpanded ? text : text.substring(0, maxLength);

  return (
    <div className={className}>
      <p dangerouslySetInnerHTML={{ __html: displayText }} />
      {text.length > maxLength && (
        <button onClick={toggleExpanded} className="text-teal-600 hover:text-teal-800 font-medium mt-1">
          {isExpanded ? 'Voir moins' : '... Voir plus'}
        </button>
      )}
    </div>
  );
  
};

export default ExpandableText;
