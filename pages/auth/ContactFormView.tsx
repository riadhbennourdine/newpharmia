import React, { useState } from 'react';

const ContactFormView: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [status, setStatus] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Sending...');

    const formData = new FormData();
    formData.append('name', name);
    formData.append('email', email);
    formData.append('message', message);
    if (attachment) {
      formData.append('attachment', attachment);
    }

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send message.');
      }

      setStatus('Message sent successfully!');
      setName('');
      setEmail('');
      setMessage('');
      setAttachment(null);
    } catch (err: any) {
      setStatus(err.message || 'An error occurred.');
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-4xl font-bold text-center text-gray-800 mb-10">
        Contactez-nous
      </h1>
      <form
        onSubmit={handleSubmit}
        className="max-w-xl mx-auto bg-white p-8 rounded-lg shadow-md"
      >
        <div className="mb-4">
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700"
          >
            Nom
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
            required
          />
        </div>
        <div className="mb-4">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700"
          >
            Email
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
            required
          />
        </div>
        <div className="mb-4">
          <label
            htmlFor="message"
            className="block text-sm font-medium text-gray-700"
          >
            Message
          </label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
            required
          ></textarea>
        </div>
        <div className="mb-4">
          <label
            htmlFor="attachment"
            className="block text-sm font-medium text-gray-700"
          >
            Pièce jointe (preuve de paiement)
          </label>
          <input
            type="file"
            id="attachment"
            onChange={(e) =>
              setAttachment(e.target.files ? e.target.files[0] : null)
            }
            className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
          />
        </div>
        <div className="text-center">
          <button
            type="submit"
            className="px-6 py-3 bg-teal-600 text-white rounded-md text-lg font-medium hover:bg-teal-700 transition-colors duration-200"
          >
            Envoyer
          </button>
        </div>
        {status && (
          <p className="mt-4 text-center text-sm text-gray-500">{status}</p>
        )}
      </form>
    </div>
  );
};

export default ContactFormView;
