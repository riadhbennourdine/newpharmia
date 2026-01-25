import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Order, OrderStatus, ProductType } from '../../types';
import {
  Spinner,
  CheckCircleIcon,
  DocumentTextIcon,
} from '../../components/Icons';

interface OrderWithUser extends Order {
  user: {
    firstName?: string;
    lastName?: string;
    email: string;
  };
}

const OrderManager: React.FC = () => {
  const { token } = useAuth();
  const [orders, setOrders] = useState<OrderWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(
    null,
  );
  const [filterType, setFilterType] = useState<
    'ALL' | 'MASTER_CLASS' | 'CROP_TUNIS'
  >('ALL');
  const [filteredOrders, setFilteredOrders] = useState<OrderWithUser[]>([]);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [currentInvoiceUrlInput, setCurrentInvoiceUrlInput] =
    useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // New state for file upload
  const [uploadingFile, setUploadingFile] = useState<boolean>(false); // New state for upload status

  useEffect(() => {
    let currentFilteredOrders = orders;
    if (filterType === 'MASTER_CLASS') {
      currentFilteredOrders = orders.filter((order) =>
        (order.items || []).some((item) => item.type === ProductType.PACK),
      );
    } else if (filterType === 'CROP_TUNIS') {
      currentFilteredOrders = orders.filter((order) =>
        (order.items || []).some((item) => item.type === ProductType.WEBINAR),
      );
    }
    setFilteredOrders(currentFilteredOrders);
  }, [orders, filterType]);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/orders?status=PAYMENT_SUBMITTED', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch orders');
      const data = await response.json();

      if (Array.isArray(data)) {
        setOrders(data);
      } else {
        console.error('API response is not an array:', data);
        setOrders([]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [token]);

  const handleConfirmOrder = async (orderId: string) => {
    if (!window.confirm('Confirmer ce paiement et créditer le compte client ?'))
      return;

    setProcessingOrderId(orderId);
    try {
      const response = await fetch(`/api/orders/${orderId}/confirm`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Confirmation failed');

      alert('Commande confirmée avec succès.');
      // Refresh list
      setOrders(orders.filter((o) => o._id.toString() !== orderId));
    } catch (err: any) {
      alert(`Erreur: ${err.message}`);
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleSaveInvoiceUrl = async (orderId: string) => {
    setProcessingOrderId(orderId);
    try {
      const response = await fetch(`/api/orders/${orderId}/invoiceUrl`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          invoiceUrl:
            currentInvoiceUrlInput === '' ? null : currentInvoiceUrlInput,
        }),
      });

      if (!response.ok) throw new Error('Failed to update invoice URL');

      alert('URL de la facture mise à jour avec succès.');
      setEditingInvoiceId(null);
      setCurrentInvoiceUrlInput('');
      fetchOrders(); // Refresh orders to show updated invoice URL
    } catch (err: any) {
      alert(`Erreur: ${err.message}`);
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleFileUpload = async (orderId: string) => {
    if (!selectedFile) {
      alert('Veuillez sélectionner un fichier PDF à télécharger.');
      return;
    }

    setUploadingFile(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch('/api/upload/file', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          // Note: Content-Type header is usually not set manually for FormData
        },
        body: formData,
      });

      if (!response.ok) throw new Error('Échec du téléchargement du fichier.');

      const data = await response.json();
      setCurrentInvoiceUrlInput(data.fileUrl); // Set the returned URL to the input field
      alert(
        "Fichier téléchargé avec succès. Vous pouvez maintenant sauvegarder l'URL.",
      );
    } catch (err: any) {
      console.error('Error uploading file:', err);
      alert(`Erreur lors du téléchargement: ${err.message}`);
    } finally {
      setUploadingFile(false);
      setSelectedFile(null); // Clear selected file after upload attempt
    }
  };

  if (isLoading)
    return (
      <div className="flex justify-center p-12">
        <Spinner className="h-8 w-8 text-teal-600" />
      </div>
    );
  if (error) return <div className="text-red-500 p-8">Erreur: {error}</div>;

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">
          Gestion des Commandes
        </h1>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="form-select block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm rounded-md"
        >
          <option value="ALL">Toutes les commandes</option>
          <option value="MASTER_CLASS">Master Class (Packs)</option>
          <option value="CROP_TUNIS">CROP Tunis (Webinaires)</option>
        </select>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow text-center text-slate-500">
          Aucune commande en attente de validation.
        </div>
      ) : (
        <div className="grid gap-6">
          {filteredOrders.map((order) => (
            <div
              key={order._id.toString()}
              className="bg-white rounded-lg shadow-md p-6 border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center"
            >
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                    {order.status}
                  </span>
                  {(order.items || []).some(
                    (item) => item.type === ProductType.PACK,
                  ) && (
                    <span className="bg-teal-100 text-teal-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                      MASTER CLASS
                    </span>
                  )}
                  {(order.items || []).some(
                    (item) => item.type === ProductType.WEBINAR,
                  ) && (
                    <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                      CROP TUNIS
                    </span>
                  )}
                  <span className="text-slate-400 text-sm">
                    #{order._id.toString()}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-800">
                  {order.user?.firstName} {order.user?.lastName} (
                  {order.user?.email})
                </h3>
                <div className="mt-2 text-sm text-slate-600">
                  <ul className="list-disc list-inside">
                    {(order.items || []).map((item, idx) => (
                      <li key={idx}>
                        {item.type === ProductType.PACK
                          ? `Pack ${item.packId}`
                          : `Webinaire ${item.webinarId}`}
                        {item.slots && ` (${item.slots.join(', ')})`}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-2 font-bold text-teal-600">
                  Total: {order.totalAmount.toFixed(3)} DT
                </div>
              </div>

              <div className="mt-4 md:mt-0 md:ml-6 flex flex-col items-end space-y-3">
                {order.paymentProofUrl ? (
                  <a
                    href={order.paymentProofUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    <DocumentTextIcon className="h-5 w-5 mr-1" />
                    Voir la preuve de paiement
                  </a>
                ) : (
                  <span className="text-red-500 text-sm italic">
                    Pas de preuve téléversée
                  </span>
                )}

                {editingInvoiceId === order._id.toString() ? (
                  <div className="flex flex-col items-end space-y-2">
                    <div className="w-full md:w-64">
                      <input
                        type="text"
                        value={currentInvoiceUrlInput}
                        onChange={(e) =>
                          setCurrentInvoiceUrlInput(e.target.value)
                        }
                        placeholder="URL de la facture (coller ou télécharger)"
                        className="w-full p-2 border border-slate-300 rounded-md text-sm mb-2"
                      />
                      <input
                        type="file"
                        onChange={(e) =>
                          setSelectedFile(
                            e.target.files ? e.target.files[0] : null,
                          )
                        }
                        className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {selectedFile && (
                        <p className="text-xs text-slate-600 mt-1">
                          Fichier sélectionné: {selectedFile.name}
                        </p>
                      )}
                      <button
                        onClick={() => handleFileUpload(order._id.toString())}
                        disabled={uploadingFile || !selectedFile}
                        className="w-full mt-2 bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded shadow-sm disabled:opacity-50 text-sm flex items-center justify-center"
                      >
                        {uploadingFile ? (
                          <Spinner className="h-4 w-4 mr-2" />
                        ) : (
                          "Télécharger et obtenir l'URL"
                        )}
                      </button>
                    </div>
                    <div className="flex space-x-2 mt-2">
                      <button
                        onClick={() =>
                          handleSaveInvoiceUrl(order._id.toString())
                        }
                        disabled={
                          processingOrderId === order._id.toString() ||
                          uploadingFile
                        }
                        className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-1 px-3 rounded shadow-sm disabled:opacity-50 text-sm"
                      >
                        {processingOrderId === order._id.toString() ? (
                          <Spinner className="h-4 w-4 mr-2" />
                        ) : (
                          "Sauvegarder l'URL"
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setEditingInvoiceId(null);
                          setCurrentInvoiceUrlInput('');
                          setSelectedFile(null);
                        }}
                        className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-1 px-3 rounded shadow-sm text-sm"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-end space-y-2">
                    {order.invoiceUrl && (
                      <a
                        href={order.invoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-green-600 hover:text-green-800 text-sm font-medium"
                      >
                        <DocumentTextIcon className="h-5 w-5 mr-1" />
                        Voir la facture attachée
                      </a>
                    )}
                    <button
                      onClick={() => {
                        setEditingInvoiceId(order._id.toString());
                        setCurrentInvoiceUrlInput(order.invoiceUrl || '');
                      }}
                      className="bg-gray-200 hover:bg-gray-300 text-slate-700 font-bold py-1 px-3 rounded shadow-sm text-sm"
                    >
                      Attacher/Modifier Facture
                    </button>
                  </div>
                )}

                <button
                  onClick={() => handleConfirmOrder(order._id.toString())}
                  disabled={processingOrderId === order._id.toString()}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded shadow-sm disabled:opacity-50 flex items-center"
                >
                  {processingOrderId === order._id.toString() ? (
                    <Spinner className="h-4 w-4 mr-2" />
                  ) : (
                    <CheckCircleIcon className="h-5 w-5 mr-2" />
                  )}
                  Valider le paiement
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrderManager;
