import React from 'react';

export const FormSection: React.FC<{title: string, children: React.ReactNode}> = ({ title, children }) => (
    <div className="border p-4 rounded-lg bg-white shadow-sm">
      <h3 className="text-xl font-semibold text-slate-800 mb-4">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
);

export const Label: React.FC<{htmlFor?: string, children: React.ReactNode, className?: string}> = ({ htmlFor, children, className = "" }) => (
  <label htmlFor={htmlFor} className={`block text-sm font-medium text-slate-700 ${className}`}>{children}</label>
);

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input {...props} className={`mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 ${props.className || ''}`} />
);

export const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
  <textarea {...props} className={`mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 ${props.className || ''}`} />
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
    <select {...props} className={`mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 ${props.className || ''}`}>
        {props.children}
    </select>
);
