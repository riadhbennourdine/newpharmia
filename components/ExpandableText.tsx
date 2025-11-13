import React, { useState } from 'react';

interface ExpandableTextProps {
  text: string;
  maxLength: number;
  className?: string;
  youtubeShortUrl?: string; // New prop for YouTube Short URL
}

const ExpandableText: React.FC<ExpandableTextProps> = ({ text, maxLength, className, youtubeShortUrl }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const displayText = isExpanded ? text : text.substring(0, maxLength);

  // Convert YouTube Short URL to embed URL with autoplay
  const getEmbedUrl = (url: string) => {
    const videoId = url.split('/').pop()?.split('?')[0];
    return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1` : ''; // Mute to allow autoplay in most browsers
  };

  return (
    <div className={className}>
      <p dangerouslySetInnerHTML={{ __html: displayText }} />
      {isExpanded && youtubeShortUrl && (
        <div className="mt-4">
          <iframe
            width="100%"
            height="315"
            src={getEmbedUrl(youtubeShortUrl)}
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          ></iframe>
        </div>
      )}
      {text.length > maxLength && (
        <button onClick={toggleExpanded} className="text-teal-600 hover:text-teal-800 font-medium mt-1">
          {isExpanded ? 'Voir moins' : '... Voir plus'}
        </button>
      )}
    </div>
  );
  
};

export default ExpandableText;
