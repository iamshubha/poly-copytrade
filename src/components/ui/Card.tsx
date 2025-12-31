import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
}

export function Card({
  children,
  variant = 'default',
  padding = 'md',
  hoverable = false,
  className = '',
  ...props
}: CardProps) {
  const baseStyles = 'rounded-lg bg-white';
  
  const variantStyles = {
    default: 'border border-gray-200',
    bordered: 'border-2 border-gray-300',
    elevated: 'shadow-lg',
  };
  
  const paddingStyles = {
    none: '',
    sm: 'p-3',
    md: 'p-6',
    lg: 'p-8',
  };
  
  const hoverStyle = hoverable ? 'transition-shadow hover:shadow-xl cursor-pointer' : '';
  
  return (
    <div
      className={`${baseStyles} ${variantStyles[variant]} ${paddingStyles[padding]} ${hoverStyle} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
}

export function CardHeader({ title, subtitle, children, className = '', ...props }: CardHeaderProps) {
  return (
    <div className={`mb-4 ${className}`} {...props}>
      {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
      {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
      {children}
    </div>
  );
}

export interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CardBody({ children, className = '', ...props }: CardBodyProps) {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
}

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CardFooter({ children, className = '', ...props }: CardFooterProps) {
  return (
    <div className={`mt-4 pt-4 border-t border-gray-200 ${className}`} {...props}>
      {children}
    </div>
  );
}
