import React, { useState, useEffect, FormEvent } from 'react';
import { Webinar, UserRole } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { Spinner, TrashIcon, PencilIcon } from '../../components/Icons';

const WebinarManagement: React.FC = () => {
    const [webinars, setWebinars] = useState<Webinar[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { token } = useAuth();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentWebinar, setCurrentWebinar] = useState<Partial<Webinar> | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const formData = new FormData();
            formData.append('webinarImage', file);

            setIsUploading(true);
            setError(null);

            try {
                const response = await fetch('/api/upload/image', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                    body: formData,
                });

                if (!response.ok) {
                    throw new Error('File upload failed');
                }

                const data = await response.json();
                setCurrentWebinar({ ...currentWebinar, imageUrl: data.imageUrl });

            } catch (err) {
                setError(err.message);
            } finally {
                setIsUploading(false);
            }
        }
    };

    const fetchWebinars = async () => {
        try {
            setIsLoading(true);
            const response = await fetch('/api/webinars');
            if (!response.ok) throw new Error('Failed to fetch webinars');
            const data = await response.json();
            setWebinars(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchWebinars();
    }, []);

    const handleOpenModal = (webinar: Partial<Webinar> | null = null) => {
        setCurrentWebinar(webinar ? { ...webinar } : { title: '', description: '', presenter: '', date: new Date() });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentWebinar(null);
    };

    const handleSaveWebinar = async (e: FormEvent) => {
        e.preventDefault();
        if (!currentWebinar) return;

        const method = currentWebinar._id ? 'PUT' : 'POST';
        const url = currentWebinar._id ? `/api/webinars/${currentWebinar._id}` : '/api/webinars';

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(currentWebinar),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to save webinar');
            }

            await fetchWebinars(); // Refresh the list
            handleCloseModal();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDeleteWebinar = async (id: string) => {
        if (window.confirm('Êtes-vous sûr de vouloir supprimer ce webinaire ?')) {
            try {
                const response = await fetch(`/api/webinars/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` },
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to delete webinar');
                }

                await fetchWebinars(); // Refresh the list
            } catch (err) {
                setError(err.message);
            }
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (!currentWebinar) return;
        const { name, value } = e.target;
        setCurrentWebinar({ ...currentWebinar, [name]: value });
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!currentWebinar) return;
        setCurrentWebinar({ ...currentWebinar, date: new Date(e.target.value) });
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-slate-800">Gestion des Webinaires</h1>
                <button onClick={() => handleOpenModal()} className="bg-teal-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-teal-700">
                    + Créer un Webinaire
                </button>
            </div>

            {isLoading && <Spinner />}
            {error && <p className="text-red-500">{error}</p>}

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <ul className="divide-y divide-slate-200">
                    {webinars.map(webinar => (
                        <li key={webinar._id} className="p-4 flex justify-between items-center">
                            <div>
                                <p className="font-semibold text-slate-800">{webinar.title}</p>
                                <p className="text-sm text-slate-500">{new Date(webinar.date).toLocaleDateString('fr-FR')} - {webinar.presenter}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleOpenModal(webinar)} className="p-2 text-slate-500 hover:text-blue-600"><PencilIcon /></button>
                                <button onClick={() => handleDeleteWebinar(webinar._id.toString())} className="p-2 text-slate-500 hover:text-red-600"><TrashIcon /></button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            {isModalOpen && currentWebinar && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4">
                    <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-2xl">
                        <h2 className="text-2xl font-bold mb-6">{currentWebinar._id ? 'Modifier' : 'Créer'} un Webinaire</h2>
                        <form onSubmit={handleSaveWebinar}>
                            <div className="mb-4">
                                <label htmlFor="title" className="block text-sm font-medium text-slate-700">Titre</label>
                                <input type="text" name="title" id="title" value={currentWebinar.title} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm" required />
                            </div>
                            <div className="mb-4">
                                <label htmlFor="presenter" className="block text-sm font-medium text-slate-700">Présentateur</label>
                                <input type="text" name="presenter" id="presenter" value={currentWebinar.presenter} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm" required />
                            </div>
                            <div className="mb-4">
                                <label htmlFor="date" className="block text-sm font-medium text-slate-700">Date</label>
                                <input type="datetime-local" name="date" id="date" value={currentWebinar.date ? new Date(currentWebinar.date).toISOString().substring(0, 16) : ''} onChange={handleDateChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm" required />
                            </div>
                            <div className="mb-4">
                                <label htmlFor="description" className="block text-sm font-medium text-slate-700">Description</label>
                                <textarea name="description" id="description" value={currentWebinar.description} onChange={handleInputChange} rows={6} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm" required />
                            </div>
                            <div className="mb-4">
                                <label htmlFor="imageUrl" className="block text-sm font-medium text-slate-700">Image</label>
                                <input type="file" id="imageUrl" onChange={handleFileChange} className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100" />
                                {isUploading && <Spinner className="h-5 w-5 mt-2" />}
                                {currentWebinar.imageUrl && (
                                    <div className="mt-4">
                                        <img src={currentWebinar.imageUrl} alt="Preview" className="w-full h-auto rounded-lg shadow-sm" />
                                    </div>
                                )}
                            </div>
                            <div className="mb-4">
                                <label htmlFor="googleMeetLink" className="block text-sm font-medium text-slate-700">Lien Google Meet</label>
                                <input type="text" name="googleMeetLink" id="googleMeetLink" value={currentWebinar.googleMeetLink || ''} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm" />
                            </div>
                            <div className="flex justify-end gap-4 mt-8">
                                <button type="button" onClick={handleCloseModal} className="bg-slate-200 text-slate-800 font-bold py-2 px-4 rounded-lg hover:bg-slate-300">Annuler</button>
                                <button type="submit" className="bg-teal-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-teal-700">Enregistrer</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WebinarManagement;
