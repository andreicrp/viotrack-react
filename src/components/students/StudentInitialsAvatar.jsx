import React, { useEffect, useState } from 'react';

export const StudentInitialsAvatar = ({
  student,
  size = 40,
  className,
  style,
  alt
}) => {
  const image = String(student?.image || '').trim();
  const initials = `${student?.fname?.trim()?.[0] || ''}${student?.lname?.trim()?.[0] || ''}`.toUpperCase() || '?';
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [image]);

  const avatarStyle = {
    width: size,
    height: size,
    minWidth: size,
    borderRadius: '50%',
    objectFit: 'cover',
    flexShrink: 0,
    ...style
  };

  if (image && !imageFailed) {
    return (
      <img
        src={image}
        alt={alt || `${student?.fname || ''} ${student?.lname || ''}`.trim() || 'Student'}
        className={className}
        style={avatarStyle}
        loading="lazy"
        decoding="async"
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <div
      className={className}
      role="img"
      aria-label={alt || `${student?.fname || ''} ${student?.lname || ''}`.trim() || 'Student'}
      style={{
        ...avatarStyle,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#e8eef5',
        color: '#07345f',
        fontSize: Math.max(11, Math.round(size * 0.34)),
        fontWeight: 800,
        lineHeight: 1
      }}
    >
      {initials}
    </div>
  );
};
