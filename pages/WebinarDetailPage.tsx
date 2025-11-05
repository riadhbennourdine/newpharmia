import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Webinar, User } from '../types';
import { useAuth } from '../hooks/useAuth';
import { Spinner, CalendarIcon, UserIcon, ClockIcon } from '../components/Icons';

const WebinarDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [webinar, setWebinar] = useState<Webinar | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isRegistering, setIsRegistering] = useState(false);
    const [registrationMessage, setRegistrationMessage] = useState<string | null>(null);
    const { user, token } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchWebinar = async () => {
            try {
                const response = await fetch(`/api/webinars/${id}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch webinar details');
                }
                const data = await response.json();
                setWebinar(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        if (id) {
            fetchWebinar();
        }
    }, [id]);

    const handleRegister = async () => {
        if (!user) {
            navigate('/login');
            return;
        }

        setIsRegistering(true);
        setRegistrationMessage(null);

        try {
            const response = await fetch(`/api/webinars/${id}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Registration failed');
            }

            setRegistrationMessage(data.message || 'Successfully registered!');
            // Refresh webinar data to show updated attendee list if needed
            const updatedWebinarResponse = await fetch(`/api/webinars/${id}`);
            const updatedWebinarData = await updatedWebinarResponse.json();
            setWebinar(updatedWebinarData);

        } catch (err) {
            setRegistrationMessage(err.message);
        } finally {
            setIsRegistering(false);
        }
    };

    const isUserRegistered = webinar && user && webinar.attendees.includes(user._id);

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen"><Spinner className="h-16 w-16 text-teal-600" /></div>;
    }

    if (error) {
        return <div className="text-center py-20 bg-red-50 text-red-700">Error: {error}</div>;
    }

    if (!webinar) {
        return <div className="text-center py-20">Webinar not found.</div>;
    }

    return (
        <div className="bg-gray-50 min-h-screen">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
                    <div className="p-8">
                        <h1 className="text-4xl font-extrabold text-slate-900 mb-4">{webinar.title}</h1>
                        
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-slate-600 mb-6">
                            <div className="flex items-center gap-2">
                                <CalendarIcon className="h-5 w-5" />
                                <span className="font-medium">{new Date(webinar.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <ClockIcon className="h-5 w-5" />
                                <span className="font-medium">{new Date(webinar.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <UserIcon className="h-5 w-5" />
                                <span className="font-medium">Animé par {webinar.presenter}</span>
                            </div>
                        </div>

                        <div className="prose prose-lg max-w-none text-slate-700 mb-8">
                           {webinar.description}
                        </div>

                        <div className="bg-slate-50 p-6 rounded-lg">
                            <h2 className="text-2xl font-bold text-slate-800 mb-4">Inscription</h2>
                            {isUserRegistered ? (
                                <div className="text-center">
                                    <p className="text-green-600 font-semibold mb-4">Vous êtes déjà inscrit à ce webinaire.</p>
                                    {webinar.googleMeetLink && (
                                        <a 
                                            href={webinar.googleMeetLink} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center justify-center bg-blue-600 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-blue-700 transition-colors"
                                        >
                                            Rejoindre avec Google Meet
                                        </a>
                                    )}
                                </div>
                            ) : (
                                <button 
                                    onClick={handleRegister}
                                    disabled={isRegistering}
                                    className="w-full bg-teal-600 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-teal-700 disabled:bg-gray-400 transition-colors"
                                >
                                    {isRegistering ? 'Inscription en cours...' : 'S\'inscrire à ce webinaire'}
                                </button>
                            )}
                            {registrationMessage && <p className="mt-4 text-center text-sm font-medium">{registrationMessage}</p>}
                        </div>

                        {user?.role === UserRole.ADMIN && (
                             <div className="mt-8 p-4 border-t border-gray-200">
                                <h3 className="text-xl font-semibold text-slate-800">Participants ({webinar.attendees.length})</h3>
                                {/* In a real app, you'd fetch user details for these IDs */}
                                <ul className="list-disc list-inside mt-2 text-slate-600">
                                    {webinar.attendees.map(attendeeId => (
                                        <li key={attendeeId.toString()}>{attendeeId.toString()}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WebinarDetailPage;
