import React, { useState, useEffect, FormEvent } from 'react';
import { Webinar, UserRole, WebinarGroup, User } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { Spinner, TrashIcon, PencilIcon } from '../../components/Icons';
import ImageGalleryModal from '../../components/ImageGalleryModal';

const getUserDisplayName = (user: Partial<User>): string => {
    if (typeof user !== 'object' || user === null) return 'ID Inconnu';
    if (user.firstName && user.lastName) {
        return `${user.firstName} ${user.lastName}`;
    }
    return user.username || user.email || 'Utilisateur inconnu';
};

const AttendeesList: React.FC<{ attendees: Webinar['attendees'], webinarId: string, onConfirmPayment: (webinarId: string, userId: string) => void, isConfirmingPayment: boolean }> = ({ attendees, webinarId, onConfirmPayment, isConfirmingPayment }) => {
    const groupedByTimeSlot = attendees.reduce((acc, attendee) => {
        const slots = attendee.timeSlots && attendee.timeSlots.length > 0 ? attendee.timeSlots : ['Non spécifié'];
        slots.forEach(slot => {
            if (!acc[slot]) {
                acc[slot] = [];
            }
            acc[slot].push(attendee);
        });
        return acc;
    }, {} as Record<string, Webinar['attendees']>);

    return (
        <div className="mt-4 p-3 bg-slate-50 rounded-md">
            <h3 className="text-md font-semibold text-slate-700 mb-2">Participants ({attendees.length})</h3>
            {Object.entries(groupedByTimeSlot).map(([timeSlot, groupAttendees]) => (
                <div key={timeSlot} className="mt-3">
                    <p className="text-sm font-bold text-slate-600 border-b pb-1 mb-2">{timeSlot}</p>
                    <ul className="space-y-2">
                        {groupAttendees.map(attendee => {

                            return (
                                <li key={(attendee.userId as User)._id.toString()} className="flex items-center justify-between text-sm text-slate-600">
                                    <span>
                                        {getUserDisplayName(attendee.userId as User)} - <span className={`font-medium ${attendee.status === 'CONFIRMED' ? 'text-green-600' : attendee.status === 'PENDING' ? 'text-orange-500' : 'text-blue-500'}`}>{attendee.status}</span>
                                        {attendee.timeSlots && attendee.timeSlots.length > 0 && <span className="ml-2 font-semibold text-slate-800">({attendee.timeSlots.join(', ')})</span>}
                                        {attendee.proofUrl && (
                                            <a href={attendee.proofUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-500 hover:underline">
                                                (Voir justificatif)
                                            </a>
                                        )}
                                    </span>
                                    {attendee.status === 'PAYMENT_SUBMITTED' && (
                                        <button
                                            onClick={() => onConfirmPayment(webinarId, (attendee.userId as User)._id.toString())}
                                            disabled={isConfirmingPayment}
                                            className="ml-4 px-3 py-1 bg-green-500 text-white rounded-md text-xs hover:bg-green-600 disabled:bg-gray-400"
                                        >
                                            {isConfirmingPayment ? 'Confirmation...' : 'Confirmer Paiement'}
                                        </button>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            ))}
        </div>
    );
};


const WebinarManagement: React.FC = () => {
    const [soonestWebinar, setSoonestWebinar] = useState<Webinar | null>(null);
    const [otherWebinars, setOtherWebinars] = useState<Webinar[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { token } = useAuth();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const [currentWebinar, setCurrentWebinar] = useState<Partial<Webinar> | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);

    const fetchWebinars = async () => {
        if (!token) return;
        try {
            setIsLoading(true);
            const response = await fetch('/api/webinars', {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!response.ok) throw new Error('Failed to fetch webinars');
            const data: Webinar[] = await response.json();

            const upcomingWebinars = data
                .filter(w => new Date(w.date) > new Date())
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            if (upcomingWebinars.length > 0) {
                setSoonestWebinar(upcomingWebinars[0]);
                setOtherWebinars(upcomingWebinars.slice(1));
            } else {
                setSoonestWebinar(null);
                setOtherWebinars([]);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchWebinars();
    }, [token]);

    const handleOpenModal = (webinar: Partial<Webinar> | null = null) => {
        setCurrentWebinar(webinar ? { ...webinar } : { title: '', description: '', presenter: '', date: new Date(), imageUrl: '', googleMeetLink: '', group: WebinarGroup.PHARMIA });
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

            await fetchWebinars();
            handleCloseModal();
        } catch (err: any) {
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

                await fetchWebinars();
            } catch (err: any) {
                setError(err.message);
            }
        }
    };

    const handleConfirmPayment = async (webinarId: string, userId: string) => {
        if (!window.confirm('Êtes-vous sûr de vouloir confirmer le paiement pour cet utilisateur ?')) {
            return;
        }

        setIsConfirmingPayment(true);
        setError(null);

        try {
            const response = await fetch(`/api/webinars/${webinarId}/attendees/${userId}/confirm`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to confirm payment');
            }

            await fetchWebinars(); // Refresh the list
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsConfirmingPayment(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        if (!currentWebinar) return;
        const { name, value } = e.target;
        setCurrentWebinar({ ...currentWebinar, [name]: value });
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!currentWebinar) return;
        setCurrentWebinar({ ...currentWebinar, date: new Date(e.target.value) });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const formData = new FormData();
            formData.append('imageFile', file);
            formData.append('name', currentWebinar?.title || 'Image de wébinaire');
            formData.append('theme', 'Wébinaire');

            setUploadingImage(true);
            setError(null);

            try {
                const response = await fetch('/api/upload/image', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData,
                });

                if (!response.ok) throw new Error('Image upload failed');

                const data = await response.json();
                setCurrentWebinar(prev => prev ? { ...prev, imageUrl: data.imageUrl } : null);

            } catch (err: any) {
                setError(err.message);
            } finally {
                setUploadingImage(false);
            }
        }
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

            {soonestWebinar && (
                <div className="mb-12">
                    <h2 className="text-2xl font-bold text-slate-800 mb-4 border-b-2 border-teal-500 pb-2">Prochain Webinaire</h2>
                    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                        <div className="md:flex">
                            <div className="md:flex-shrink-0">
                                <img className="h-48 w-full object-cover md:w-48" src={soonestWebinar.imageUrl || 'https://via.placeholder.com/150'} alt={soonestWebinar.title} />
                            </div>
                            <div className="p-4 flex-grow">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-xl text-slate-800">{soonestWebinar.title}</p>
                                        <p className="text-md text-slate-600">{new Date(soonestWebinar.date).toLocaleString('fr-FR')} - {soonestWebinar.presenter}</p>
                                    </div>
                                    <div className="flex gap-2 flex-shrink-0 ml-4">
                                        <button onClick={() => handleOpenModal(soonestWebinar)} className="p-2 text-slate-500 hover:text-blue-600"><PencilIcon className="h-5 w-5" /></button>
                                        <button onClick={() => handleDeleteWebinar(soonestWebinar._id.toString())} className="p-2 text-slate-500 hover:text-red-600"><TrashIcon className="h-5 w-5" /></button>
                                    </div>
                                </div>
                                {soonestWebinar.attendees && soonestWebinar.attendees.length > 0 && (
                                    <AttendeesList 
                                        attendees={soonestWebinar.attendees} 
                                        webinarId={soonestWebinar._id.toString()}
                                        onConfirmPayment={handleConfirmPayment}
                                        isConfirmingPayment={isConfirmingPayment}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {otherWebinars.length > 0 && (
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-4 border-b-2 border-slate-300 pb-2">Autres webinaires à venir</h2>
                    <div className="bg-white shadow-md rounded-lg overflow-hidden">
                        <ul className="divide-y divide-slate-200">
                            {otherWebinars.map(webinar => (
                                <li key={webinar._id.toString()} className="p-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <div>
                                            <p className="font-semibold text-slate-800">{webinar.title}</p>
                                            <p className="text-sm text-slate-500">{new Date(webinar.date).toLocaleString('fr-FR')} - {webinar.presenter}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleOpenModal(webinar)} className="p-2 text-slate-500 hover:text-blue-600"><PencilIcon className="h-5 w-5" /></button>
                                            <button onClick={() => handleDeleteWebinar(webinar._id.toString())} className="p-2 text-slate-500 hover:text-red-600"><TrashIcon className="h-5 w-5" /></button>
                                        </div>
                                    </div>
                                    {webinar.attendees && webinar.attendees.length > 0 && (
                                        <AttendeesList 
                                            attendees={webinar.attendees} 
                                            webinarId={webinar._id.toString()}
                                            onConfirmPayment={handleConfirmPayment}
                                            isConfirmingPayment={isConfirmingPayment}
                                        />
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {isModalOpen && currentWebinar && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-full overflow-y-auto">
                        <div className="p-4 sm:p-6">
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
                                    <label htmlFor="group" className="block text-sm font-medium text-slate-700">Groupe</label>
                                    <select
                                        name="group"
                                        id="group"
                                        value={currentWebinar.group}
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full rounded-md border-slate-300 shadow-sm"
                                        required
                                    >
                                        <option value={WebinarGroup.PHARMIA}>{WebinarGroup.PHARMIA}</option>
                                        <option value={WebinarGroup.CROP_TUNIS}>{WebinarGroup.CROP_TUNIS}</option>
                                    </select>
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
                                    <label htmlFor="imageUrl" className="block text-sm font-medium text-slate-700">URL de l'image</label>
                                    <div className="mt-1 flex rounded-md shadow-sm">
                                        <input type="text" name="imageUrl" id="imageUrl" value={currentWebinar.imageUrl || ''} onChange={handleInputChange} className="flex-1 block w-full min-w-0 rounded-none rounded-l-md border-slate-300" placeholder="https://..." />
                                        <label htmlFor="imageUpload" className="relative inline-flex items-center px-3 py-2 border border-l-0 border-slate-300 bg-slate-50 text-sm font-medium text-slate-700 cursor-pointer hover:bg-slate-100">
                                            <span>{uploadingImage ? 'Chargement...' : 'Téléverser'}</span>
                                            <input id="imageUpload" name="imageUpload" type="file" className="sr-only" onChange={handleImageUpload} disabled={uploadingImage} />
                                        </label>
                                        <button type="button" onClick={() => setIsGalleryOpen(true)} className="relative inline-flex items-center px-3 py-2 border border-l-0 border-slate-300 bg-slate-50 text-sm font-medium text-slate-700 rounded-r-md hover:bg-slate-100">
                                            Galerie
                                        </button>
                                    </div>
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
                </div>
            )}

            <ImageGalleryModal
                isOpen={isGalleryOpen}
                onClose={() => setIsGalleryOpen(false)}
                onSelectImage={(url) => {
                    setCurrentWebinar(prev => prev ? { ...prev, imageUrl: url } : null);
                    setIsGalleryOpen(false);
                }}
            />
        </div>
    );
};

export default WebinarManagement;
