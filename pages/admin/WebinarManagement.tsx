import React, { useState, useEffect, FormEvent, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Webinar, UserRole, WebinarGroup, User, WebinarStatus, WebinarResource } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { Spinner, TrashIcon, PencilIcon, ShareIcon, MediaIcon } from '../../components/Icons';
import ImageGalleryModal from '../../components/ImageGalleryModal';
import ManageWebinarResourcesModal from '../../components/ManageWebinarResourcesModal';
import EmbeddableViewer from '../../components/EmbeddableViewer';

const getUserDisplayName = (user: Partial<User>): string => {
    if (typeof user !== 'object' || user === null) return 'ID Inconnu';
    if (user.firstName && user.lastName) {
        return `${user.firstName} ${user.lastName}`;
    }
    return user.username || user.email || 'Utilisateur inconnu';
};

const AttendeesList: React.FC<{ 
    attendees: Webinar['attendees'], 
    webinarId: string, 
    presenter: string, 
    onConfirmPayment: (webinarId: string, userId: string) => void, 
    isConfirmingPayment: boolean,
    onMatchProof: (attendee: any, webinarId: string) => void,
    user: User | null
}> = ({ attendees, webinarId, presenter, onConfirmPayment, isConfirmingPayment, onMatchProof, user }) => {
    const getTranslatedStatus = (status: string | undefined): string => {
        switch (status) {
            case 'CONFIRMED': return 'CONFIRMÉ';
            case 'PENDING': return 'EN ATTENTE DE PAIEMENT';
            case 'PAYMENT_SUBMITTED': return 'EN ATTENTE DE VALIDATION';
            default: return status || 'Inconnu';
        }
    };

    const transformProofUrl = (url: string | undefined): string => {
        if (!url) return '#';
        return url;
    };

    const participants = attendees.filter(att => getUserDisplayName(att.userId as User) !== presenter);
    const participantCount = participants.length;

    const groupedByTimeSlot = attendees.reduce((acc, attendee) => {
        const slots = attendee.timeSlots && attendee.timeSlots.length > 0 ? attendee.timeSlots : ['Non spécifié'];
        slots.forEach(slot => {
            if (!acc[slot]) acc[slot] = [];
            acc[slot].push(attendee);
        });
        return acc;
    }, {} as Record<string, Webinar['attendees']>);

    return (
        <div className="mt-4 p-3 bg-slate-50 rounded-md">
            <h3 className="text-md font-semibold text-slate-700 mb-2">Participants ({participantCount})</h3>
            {Object.entries(groupedByTimeSlot).map(([timeSlot, groupAttendees]) => (
                <div key={timeSlot} className="mt-3">
                    <p className="text-sm font-bold text-slate-600 border-b pb-1 mb-2">{timeSlot} ({groupAttendees.length})</p>
                    <ul className="space-y-2">
                        {groupAttendees.map(attendee => (
                            <li key={(attendee.userId as User)?._id?.toString()} className="flex items-center justify-between text-sm text-slate-600">
                                <div className="flex items-center flex-wrap">
                                    <span>
                                        {getUserDisplayName(attendee.userId as User)} - <span className={`font-medium ${attendee.status === 'CONFIRMED' ? 'text-green-600' : attendee.status === 'PENDING' ? 'text-orange-500' : 'text-blue-500'}`}>{getTranslatedStatus(attendee.status)}</span>
                                    </span>
                                    {attendee.proofUrl && (
                                        <a href={transformProofUrl(attendee.proofUrl)} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-500 hover:underline">(Voir)</a>
                                    )}
                                    {user?.role === UserRole.ADMIN && (
                                        <button onClick={() => onMatchProof(attendee, webinarId)} className="ml-2 text-gray-400 hover:text-teal-600" title="Associer une nouvelle preuve de paiement">
                                            <ShareIcon className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                                {attendee.status === 'PAYMENT_SUBMITTED' && (
                                    <button
                                        onClick={() => onConfirmPayment(webinarId, (attendee.userId as User)._id.toString())}
                                        disabled={isConfirmingPayment}
                                        className="ml-4 px-3 py-1 bg-green-500 text-white rounded-md text-xs hover:bg-green-600 disabled:bg-gray-400"
                                    >
                                        {isConfirmingPayment ? 'Confirmation...' : 'Confirmer'}
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    );
};


const WebinarManagement: React.FC = () => {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const [filterGroup, setFilterGroup] = useState<string>('ALL');
    const [soonestWebinar, setSoonestWebinar] = useState<Webinar | null>(null);
    const [otherWebinars, setOtherWebinars] = useState<Webinar[]>([]);
    const [pastWebinars, setPastWebinars] = useState<Webinar[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // State for Modals
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const [isMatcherOpen, setIsMatcherOpen] = useState(false);
    const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
    
    // State for editing
    const [currentWebinar, setCurrentWebinar] = useState<Partial<Webinar> | null>(null);
    const [currentWebinarForResources, setCurrentWebinarForResources] = useState<Webinar | null>(null);
    const [currentAttendee, setCurrentAttendee] = useState<any | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);

    // State for File Matcher
    const [volumeFiles, setVolumeFiles] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
            const [isUpdating, setIsUpdating] = useState(false);
        
        
            const fetchWebinars = useCallback(async () => {
                if (!token) return;
                try {
                    setIsLoading(true);
                    const response = await fetch('/api/webinars', { 
                        headers: { 'Authorization': `Bearer ${token}` },
                    });
                    if (!response.ok) throw new Error('Failed to fetch webinars');
                    const data: Webinar[] = await response.json();
        
                    let allWebinars = data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                    
                    // Filter by group if selected
                    if (filterGroup !== 'ALL') {
                        allWebinars = allWebinars.filter(w => w.group === filterGroup);
                    }

                    const now = new Date();
                    
                    const upcoming = allWebinars.filter(w => new Date(w.date) >= now);
                    const past = allWebinars.filter(w => new Date(w.date) < now);
        
                    setPastWebinars(past.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                    
                    if (upcoming.length > 0) {
                        setSoonestWebinar(upcoming[0]);
                        setOtherWebinars(upcoming.slice(1));
                    } else {
                        setSoonestWebinar(null);
                        setOtherWebinars([]);
                    }
                } catch (err: any) {
                    setError(err.message);
                } finally {
                    setIsLoading(false);
                }
            }, [token, filterGroup]);
        
    useEffect(() => {
        if (token) {
            fetchWebinars();
        }
    }, [token, fetchWebinars]);

    useEffect(() => {
        const fetchVolumeFiles = async () => {
            if (!token) return;
            try {
                const res = await fetch('/api/debug/list-volume', { headers: { 'Authorization': `Bearer ${token}` } });
                if (!res.ok) throw new Error('Failed to fetch volume files.');
                const data = await res.json();
                setVolumeFiles(data.files || []);
            } catch (err) {
                console.error("Could not fetch volume files for matcher.", err);
            }
        };

        if (token) {
            fetchVolumeFiles();
        }
    }, [token]);

    const handleOpenModal = (webinar: Partial<Webinar> | null = null) => {
        setCurrentWebinar(webinar ? { ...webinar } : { 
            title: '', 
            description: '', 
            presenter: '', 
            date: new Date(), 
            imageUrl: '', 
            googleMeetLink: '', 
            group: filterGroup !== 'ALL' ? (filterGroup as WebinarGroup) : WebinarGroup.CROP_TUNIS // Default to filtered group or CROP_TUNIS
        });
        setIsModalOpen(true);
    };

    const handleOpenResourceModal = (webinar: Webinar) => {
        setCurrentWebinarForResources(webinar);
        setIsResourceModalOpen(true);
    };

    const handleSaveResources = async (webinarId: string, resources: WebinarResource[]) => {
        if (!token) return;
        try {
            const response = await fetch(`/api/webinars/${webinarId}/resources`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ resources }),
            });

            if (!response.ok) {
                throw new Error('Failed to save resources');
            }

            await fetchWebinars(); // Refresh the list
            setIsResourceModalOpen(false);
            setCurrentWebinarForResources(null);

        } catch (err: any) {
            setError(err.message);
            // Optionally, provide feedback to the user in the modal
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentWebinar(null);
    };

    const handleOpenMatcher = (attendee: any, webinarId: string) => {
        setCurrentAttendee({ ...attendee, webinarId });
        setIsMatcherOpen(true);
        setSearchTerm('');
    };

    const handleConfirmMatch = async (selectedFile: string) => {
        if (!currentAttendee) return;
        setIsUpdating(true);

        const newUrl = `/uploads/${selectedFile.replace(/^uploads\/?/, '')}`;
        
        try {
            const res = await fetch(`/api/webinars/${currentAttendee.webinarId}/attendees/${(currentAttendee.userId as User)._id}/payment-proof`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ proofUrl: newUrl })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Update failed');
            }
            await fetchWebinars();
        } catch (err: any) {
            setError(err.message);
            alert(`Error updating proof: ${err.message}`);
        } finally {
            setIsUpdating(false);
            setIsMatcherOpen(false);
            setCurrentAttendee(null);
        }
    };


    const handleSaveWebinar = async (e: FormEvent) => {
        e.preventDefault();
        if (!currentWebinar) return;

        const method = currentWebinar._id ? 'PUT' : 'POST';
        const url = currentWebinar._id ? `/api/webinars/${currentWebinar._id}` : '/api/webinars';

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(currentWebinar),
            });

            if (!response.ok) throw new Error((await response.json()).message || 'Failed to save webinar');
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
                if (!response.ok) throw new Error((await response.json()).message || 'Failed to delete webinar');
                await fetchWebinars();
            } catch (err: any) {
                setError(err.message);
            }
        }
    };

    const handleConfirmPayment = async (webinarId: string, userId: string) => {
        if (!window.confirm('Êtes-vous sûr de vouloir confirmer le paiement pour cet utilisateur ?')) return;
        setIsConfirmingPayment(true);
        setError(null);
        try {
            const response = await fetch(`/api/webinars/${webinarId}/attendees/${userId}/confirm`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!response.ok) throw new Error((await response.json()).message || 'Failed to confirm payment');
            await fetchWebinars();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsConfirmingPayment(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        if (!currentWebinar) return;
        setCurrentWebinar({ ...currentWebinar, [e.target.name]: e.target.value });
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!currentWebinar) return;
        setCurrentWebinar({ ...currentWebinar, date: new Date(e.target.value) });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const formData = new FormData();
            formData.append('file', file);
            setUploadingImage(true);
            setError(null);

            try {
                const response = await fetch('/api/upload/file', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData,
                });
                if (!response.ok) throw new Error('Image upload failed');
                const data = await response.json();
                setCurrentWebinar(prev => prev ? { ...prev, imageUrl: data.fileUrl } : null);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setUploadingImage(false);
            }
        }
    };
    
    const filteredVolumeFiles = useMemo(() => {
        if (!searchTerm) return volumeFiles;
        return volumeFiles.filter(file =>
            file.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, volumeFiles]);

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Navigation and Filters */}
            <div className="mb-8 flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                <div className="flex space-x-4 mb-4 md:mb-0">
                    <button onClick={() => navigate('/webinars')} className="text-teal-600 hover:text-teal-800 font-medium">
                        &larr; Retour aux Webinaires
                    </button>
                    <span className="text-slate-300">|</span>
                    <select
                        value={filterGroup}
                        onChange={(e) => setFilterGroup(e.target.value)}
                        className="form-select block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm rounded-md"
                    >
                        <option value="ALL">Tous les groupes</option>
                        <option value={WebinarGroup.CROP_TUNIS}>CROP Tunis</option>
                        <option value={WebinarGroup.MASTER_CLASS}>Master Class</option>
                        <option value={WebinarGroup.PHARMIA}>PharmIA</option>
                    </select>
                </div>
                {(user?.role === UserRole.ADMIN) && (
                    <button onClick={() => handleOpenModal()} className="bg-teal-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-teal-700">
                        + Créer un Webinaire
                    </button>
                )}
            </div>

            <div className="flex justify-between items-center mb-2">
                <h1 className="text-3xl font-bold text-slate-800">Gestion des Webinaires</h1>
            </div>

            {isLoading && <div className="flex justify-center items-center h-64"><Spinner /></div>}
            {error && <p className="text-red-500 bg-red-100 p-3 rounded-md">{error}</p>}

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
                                    {(user?.role === UserRole.ADMIN || user?.role === UserRole.ADMIN_WEBINAR) && (
                                        <div className="flex gap-2 flex-shrink-0 ml-4">
                                            <button onClick={() => handleOpenModal(soonestWebinar)} className="p-2 text-slate-500 hover:text-blue-600"><PencilIcon className="h-5 w-5" /></button>
                                            <button onClick={() => handleDeleteWebinar(soonestWebinar._id.toString())} className="p-2 text-slate-500 hover:text-red-600"><TrashIcon className="h-5 w-5" /></button>
                                        </div>
                                    )}
                                </div>
                                {soonestWebinar.attendees && soonestWebinar.attendees.length > 0 && (
                                    <AttendeesList 
                                        attendees={soonestWebinar.attendees} 
                                        webinarId={soonestWebinar._id.toString()}
                                        presenter={soonestWebinar.presenter}
                                        onConfirmPayment={handleConfirmPayment}
                                        isConfirmingPayment={isConfirmingPayment}
                                        onMatchProof={handleOpenMatcher}
                                        user={user}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {otherWebinars.length > 0 && (
                <div className="mb-12">
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
                                        {(user?.role === UserRole.ADMIN || user?.role === UserRole.ADMIN_WEBINAR) && (
                                            <div className="flex gap-2">
                                                <button onClick={() => handleOpenModal(webinar)} className="p-2 text-slate-500 hover:text-blue-600"><PencilIcon className="h-5 w-5" /></button>
                                                <button onClick={() => handleDeleteWebinar(webinar._id.toString())} className="p-2 text-slate-500 hover:text-red-600"><TrashIcon className="h-5 w-5" /></button>
                                            </div>
                                        )}
                                    </div>
                                    {webinar.attendees && webinar.attendees.length > 0 && (
                                        <AttendeesList 
                                            attendees={webinar.attendees} 
                                            webinarId={webinar._id.toString()}
                                            presenter={webinar.presenter}
                                            onConfirmPayment={handleConfirmPayment}
                                            isConfirmingPayment={isConfirmingPayment}
                                            onMatchProof={handleOpenMatcher}
                                            user={user}
                                        />
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
            
            {pastWebinars.length > 0 && (
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-4 border-b-2 border-slate-300 pb-2">Webinaires Passés</h2>
                    <div className="bg-white shadow-md rounded-lg overflow-hidden">
                        <ul className="divide-y divide-slate-200">
                            {pastWebinars.map(webinar => (
                                <li key={webinar._id.toString()} className="p-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <div>
                                            <p className="font-semibold text-slate-800">{webinar.title}</p>
                                            <p className="text-sm text-slate-500">{new Date(webinar.date).toLocaleString('fr-FR')} - {webinar.presenter}</p>
                                        </div>
                                        {(user?.role === UserRole.ADMIN || user?.role === UserRole.ADMIN_WEBINAR) && (
                                            <div className="flex gap-2">
                                                <button onClick={() => handleOpenModal(webinar)} className="p-2 text-slate-500 hover:text-blue-600" title="Modifier le wébinaire"><PencilIcon className="h-5 w-5" /></button>
                                                <button onClick={() => handleOpenResourceModal(webinar)} className="p-2 text-slate-500 hover:text-teal-600" title="Gérer les médias"><MediaIcon className="h-5 w-5" /></button>
                                            </div>
                                        )}
                                    </div>
                                    {webinar.attendees && webinar.attendees.length > 0 && (
                                        <AttendeesList 
                                            attendees={webinar.attendees} 
                                            webinarId={webinar._id.toString()}
                                            presenter={webinar.presenter}
                                            onConfirmPayment={handleConfirmPayment}
                                            isConfirmingPayment={isConfirmingPayment}
                                            onMatchProof={handleOpenMatcher}
                                            user={user}
                                        />
                                    )}
                                    {/* Resource Display */}
                                    {webinar.resources && webinar.resources.length > 0 && (
                                        <div className="mt-4">
                                            <h4 className="text-md font-semibold text-slate-700 mb-2">Ressources</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {webinar.resources.map((resource, index) => (
                                                    <div key={index} className="border p-3 rounded-md">
                                                        <p className="font-bold">{resource.title}</p>
                                                        {resource.type === 'Diaporama' ? (
                                                            <EmbeddableViewer source={resource.source} />
                                                        ) : (
                                                            <a href={resource.source} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                                                                Voir la ressource
                                                            </a>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
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
                            <form onSubmit={handleSaveWebinar} className="space-y-6">
                                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                                    <div className="sm:col-span-2">
                                        <label htmlFor="title" className="block text-sm font-medium text-slate-700">Titre</label>
                                        <input type="text" name="title" id="title" value={currentWebinar.title || ''} onChange={handleInputChange} required className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm" />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label htmlFor="description" className="block text-sm font-medium text-slate-700">Description</label>
                                        <textarea name="description" id="description" value={currentWebinar.description || ''} onChange={handleInputChange} rows={4} required className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"></textarea>
                                    </div>
                                    <div>
                                        <label htmlFor="presenter" className="block text-sm font-medium text-slate-700">Présentateur</label>
                                        <input type="text" name="presenter" id="presenter" value={currentWebinar.presenter || ''} onChange={handleInputChange} required className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm" />
                                    </div>
                                    <div>
                                        <label htmlFor="date" className="block text-sm font-medium text-slate-700">Date</label>
                                        <input type="datetime-local" name="date" id="date" value={currentWebinar.date ? new Date(currentWebinar.date).toISOString().slice(0, 16) : ''} onChange={handleDateChange} required className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm" />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label htmlFor="imageUrl" className="block text-sm font-medium text-slate-700">URL de l'image</label>
                                        <div className="mt-1 flex rounded-md shadow-sm">
                                            <input type="text" name="imageUrl" id="imageUrl" value={currentWebinar.imageUrl || ''} onChange={handleInputChange} className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md focus:ring-teal-500 focus:border-teal-500 sm:text-sm border-slate-300" />
                                            <button type="button" onClick={() => setIsGalleryOpen(true)} className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-slate-300 bg-slate-50 text-slate-500 text-sm">
                                                Galerie
                                            </button>
                                        </div>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label htmlFor="googleMeetLink" className="block text-sm font-medium text-slate-700">Lien Google Meet</label>
                                        <input type="text" name="googleMeetLink" id="googleMeetLink" value={currentWebinar.googleMeetLink || ''} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm" />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label htmlFor="group" className="block text-sm font-medium text-slate-700">Groupe</label>
                                        <select name="group" id="group" value={currentWebinar.group || ''} onChange={handleInputChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm rounded-md">
                                            <option value={WebinarGroup.CROP_TUNIS}>CROP Tunis</option>
                                            <option value={WebinarGroup.PHARMIA}>PharmIA</option>
                                            <option value={WebinarGroup.MASTER_CLASS}>Master Class Officine 2026</option>
                                        </select>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label htmlFor="price" className="block text-sm font-medium text-slate-700">Prix (optionnel)</label>
                                        <input 
                                            type="number" 
                                            name="price" 
                                            id="price" 
                                            value={currentWebinar.price !== undefined ? currentWebinar.price : ''} 
                                            onChange={(e) => setCurrentWebinar({ ...currentWebinar, price: e.target.value ? parseFloat(e.target.value) : undefined })}
                                            placeholder="Laissez vide pour utiliser le prix par défaut du groupe"
                                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm" 
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-4 pt-4">
                                    <button type="button" onClick={handleCloseModal} className="bg-white py-2 px-4 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500">Annuler</button>
                                    <button type="submit" className="bg-teal-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500">Sauvegarder</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {isResourceModalOpen && currentWebinarForResources && (
                <ManageWebinarResourcesModal
                    webinarId={currentWebinarForResources._id.toString()}
                    resources={currentWebinarForResources.resources || []}
                    onClose={() => setIsResourceModalOpen(false)}
                    onSave={handleSaveResources}
                />
            )}

            {isMatcherOpen && currentAttendee && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col">
                        <h3 className="text-xl font-bold mb-4">Associer une Preuve pour "{getUserDisplayName(currentAttendee.userId)}"</h3>
                        <input
                            type="text"
                            placeholder="Rechercher un fichier dans le volume..."
                            className="w-full p-2 border rounded-md mb-4"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                        <div className="overflow-y-auto flex-grow border rounded-md">
                            <ul className="divide-y">
                                {filteredVolumeFiles.map(file => (
                                <li key={file} className="p-2 hover:bg-teal-50 flex justify-between items-center">
                                    <span className="text-sm">{file}</span>
                                    <button 
                                        onClick={() => handleConfirmMatch(file)}
                                        disabled={isUpdating}
                                        className="bg-blue-500 text-white text-sm px-3 py-1 rounded-md hover:bg-blue-600 disabled:bg-gray-400"
                                    >
                                    {isUpdating ? '...' : 'Associer'}
                                    </button>
                                </li>
                                ))}
                            </ul>
                        </div>
                        <button onClick={() => setIsMatcherOpen(false)} className="mt-4 bg-gray-200 text-gray-800 px-4 py-2 rounded-md">
                            Annuler
                        </button>
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