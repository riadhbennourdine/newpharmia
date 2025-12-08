import React, { useState, useRef, useEffect } from 'react';
import { User } from '../../types';
import Select from 'react-select';
import { GroupBase, OptionsOrGroups } from 'react-select/dist/declarations/src/types';

// Définir les types pour les templates
interface Template {
  id: string;
  name: string;
  component: React.FC<TemplateProps>;
}

interface TemplateProps {
  recipientName: string;
  content: string;
  youtubeUrl?: string;
  imageUrl?: string;
}

const getYoutubeEmbedUrl = (url: string) => {
  if (!url) return '';
  try {
    const urlObj = new URL(url);
    let videoId = urlObj.searchParams.get('v');
    if (urlObj.hostname === 'youtu.be') {
      videoId = urlObj.pathname.slice(1);
    }
    if (videoId) {
      return {
          embedUrl: `https://www.youtube.com/embed/${videoId}`,
          thumbnailUrl: `https://img.youtube.com/vi/${videoId}/0.jpg`
      };
    }
  } catch (e) {
    console.error("Invalid YouTube URL:", e);
    return null;
  }
  return null;
};


// Template 1: Simple avec image (Table-based layout)


const SimpleTemplate: React.FC<TemplateProps> = ({ recipientName, content, youtubeUrl, imageUrl }) => {
    const videoDetails = youtubeUrl ? getYoutubeEmbedUrl(youtubeUrl) : null;

    const videoEmbedCode = videoDetails ? `
        <table cellPadding="0" cellSpacing="0" border="0" style="width: 100%; margin-top: 24px;">
            <tbody>
                <tr>
                    <td align="center">
                        <a href="${youtubeUrl}" style="display: block;">
                            <img src="${videoDetails.thumbnailUrl}" alt="YouTube video thumbnail" style="display: block; border: 0; max-width: 536px; width: 100%;" />
                        </a>
                    </td>
                </tr>
            </tbody>
        </table>
    ` : '';

    const imageEmbedCode = imageUrl ? `
        <table cellPadding="0" cellSpacing="0" border="0" style="width: 100%; margin-top: 24px;">
            <tbody>
                <tr>
                    <td align="center">
                        <img src="${imageUrl}" alt="Embedded Image" style="display: block; border: 0; max-width: 536px; width: 100%; height: auto;" />
                    </td>
                </tr>
            </tbody>
        </table>
    ` : '';

    let finalContent = content;
    if (finalContent.includes('{{YOUTUBE_VIDEO}}')) {
        finalContent = finalContent.replace('{{YOUTUBE_VIDEO}}', videoEmbedCode);
    } else {
        finalContent += videoEmbedCode;
    }

    if (finalContent.includes('{{IMAGE_URL}}')) {
        finalContent = finalContent.replace('{{IMAGE_URL}}', imageEmbedCode);
    } else {
        finalContent += imageEmbedCode;
    }

    return (
      <>
        <style type="text/css" dangerouslySetInnerHTML={{ __html: `
          @media only screen and (max-width: 600px) {
            .email-container {
              width: 100% !important;
            }
                      .mobile-title {
                        font-size: 36px !important;
                        line-height: 1.2 !important;
                      }
                      .main-content-text {
                        font-size: 20px !important;
                        line-height: 1.8 !important;
                      }
                      .header-slogan {
                        font-size: 20px !important;
                      }
                      .footer-text p {
                        font-size: 18px !important;
                      }          }
        `}} />
        <table cellPadding="0" cellSpacing="0" border={0} className="email-container" style={{ width: '100%', backgroundColor: '#f3f4f6' }}>
        <tbody>
        <tr>
          <td align="center" style={{ padding: '20px' }}>
            {/* FIX: Changed string "0" to number {0} for the border attribute to resolve TypeScript error. */}
            <table cellPadding="0" cellSpacing="0" border={0} style={{ width: '600px', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
              <tbody>
              {/* Header */}
              <tr>
                <td style={{ padding: '24px', borderBottom: '1px solid #e5e7eb', textAlign: 'center' }}>
                  <img src="https://pharmaconseilbmb.com/photos/site/23.png" alt="Favicon" width={30} style={{ marginRight: '10px', verticalAlign: 'middle' }} />
                  <img src="https://pharmaconseilbmb.com/photos/site/logo-pharmia.png" alt="PharmIA Logo" width={150} style={{ verticalAlign: 'middle' }} />
                  <p class="header-slogan" style={{ fontSize: '16px', color: '#6b7280', margin: 0, marginTop: '10px' }}>Devenez un expert du conseil à l'officine.</p>
                </td>
              </tr>
              {/* Main Content */}
              <tr>
                <td style={{ padding: '24px 32px', fontFamily: 'Poppins, Arial, sans-serif', color: '#111827' }}>
                  <h2 class="mobile-title" style={{ fontSize: '28px', fontWeight: 'bold', marginTop: 0, marginBottom: 16, fontFamily: 'Poppins, Arial, sans-serif', color: '#111827' }} dangerouslySetInnerHTML={{ __html: `Bonjour ${recipientName},` }}></h2>
                  {imageUrl && (
                    <table cellPadding="0" cellSpacing="0" border={0} style={{ width: '100%', marginTop: 24 }}>
                     <tbody>
                      <tr>
                        <td align="center">
                            <img src={imageUrl} alt="Embedded Image" style={{ display: 'block', border: 0, maxWidth: '536px', width: '100%', height: 'auto' }} />
                        </td>
                      </tr>
                      </tbody>
                    </table>
                  )}
                  <div class="main-content-text" style={{ lineHeight: 1.8, color: '#4b5563', margin: 0, fontSize: '18px', fontFamily: 'Poppins, Arial, sans-serif' }} dangerouslySetInnerHTML={{ __html: content }}></div>
                </td>
              </tr>
              {/* Footer */}
              <tr>
                <td class="footer-text" style={{ backgroundColor: '#f3f4f6', padding: '20px 32px', textAlign: 'center', fontSize: '14px', color: '#6b7280', fontFamily: 'Arial, sans-serif' }}>
                  <p style={{ marginTop: 0, marginBottom: 8 }}><a href="https://newpharmia-production.up.railway.app/" style={{ color: '#0d9488', textDecoration: 'none', fontWeight: 'bold' }}>PharmIA</a> | By PharmaConseil BMB - Formation continue à l'officine</p>
                  {/* FIX: Changed margin from a string to a number to resolve TypeScript error. */}
                  <p style={{ margin: 0 }}><a href={`/#/unsubscribe?email={{EMAIL_DESTINATAIRE}}`} style={{ color: '#0d9488', textDecoration: 'none' }}>Se désinscrire</a></p>
                </td>
              </tr>
              </tbody>
            </table>
          </td>
        </tr>
        </tbody>
      </table>
      </>
    );
};

const ExpiredTrialTemplate: React.FC<TemplateProps> = ({ recipientName }) => {
    return (
        <>
            <style type="text/css" dangerouslySetInnerHTML={{ __html: `
              @media only screen and (max-width: 600px) {
                .email-container { width: 100% !important; }
                .mobile-title { font-size: 24px !important; line-height: 1.2 !important; }
                .main-content-text { font-size: 16px !important; line-height: 1.6 !important; }
                .footer-text p { font-size: 12px !important; }
                .cta-button { padding: 12px 20px !important; font-size: 16px !important; }
              }
            `}} />
            <table cellPadding="0" cellSpacing="0" border={0} className="email-container" style={{ width: '100%', backgroundColor: '#f3f4f6' }}>
                <tbody>
                    <tr>
                        <td align="center" style={{ padding: '20px' }}>
                            <table cellPadding="0" cellSpacing="0" border={0} style={{ width: '600px', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', fontFamily: 'Poppins, Arial, sans-serif' }}>
                                <tbody>
                                    {/* Header */}
                                    <tr>
                                        <td style={{ padding: '24px', borderBottom: '1px solid #e5e7eb', textAlign: 'center' }}>
                                            <img src="https://pharmaconseilbmb.com/photos/site/logo-pharmia.png" alt="PharmIA Logo" width={150} />
                                            <p style={{ fontSize: '16px', color: '#6b7280', margin: 0, marginTop: '10px' }}>Votre expert du conseil officinal.</p>
                                        </td>
                                    </tr>
                                    {/* Main Content */}
                                    <tr>
                                        <td style={{ padding: '32px', color: '#111827' }}>
                                            <h2 className="mobile-title" style={{ fontSize: '22px', fontWeight: 'bold', marginTop: 0, marginBottom: '20px' }}>
                                                Votre essai gratuit PharmIA est terminé. Et maintenant ?
                                            </h2>
                                            <p className="main-content-text" style={{ lineHeight: 1.7, color: '#4b5563', margin: 0, fontSize: '16px' }}>
                                                Bonjour {recipientName},<br /><br />
                                                Votre période d'essai de 7 jours sur PharmIA est arrivée à son terme. Nous espérons que vous avez pu découvrir la richesse de nos contenus et l'efficacité de notre plateforme pour renforcer votre expertise au comptoir.
                                                <br /><br />
                                                Votre avis nous est précieux ! L'application a-t-elle suscité votre intérêt ?
                                                <br /><br />
                                                Pour continuer à bénéficier d'un accès illimité à toutes nos mémofiches, quiz interactifs et parcours d'apprentissage, nous vous invitons à choisir la formule d'abonnement qui vous convient.
                                            </p>
                                            
                                            {/* Subscription Highlight */}
                                            <table cellPadding="0" cellSpacing="0" border={0} style={{ width: '100%', marginTop: '25px', marginBottom: '25px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px dashed #0d9488' }}>
                                                <tbody>
                                                    <tr>
                                                        <td style={{ padding: '20px', textAlign: 'center' }}>
                                                            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0d9488', marginTop: 0, marginBottom: '10px' }}>Offre Spéciale Annuelle</h3>
                                                            <p style={{ fontSize: '15px', color: '#374151', margin: 0 }}>
                                                                Engagez-vous pour un an et bénéficiez de <strong>3 mois gratuits !</strong> C'est l'occasion idéale pour maîtriser le conseil à l'officine tout au long de l'année.
                                                            </p>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>

                                            {/* CTA Button */}
                                            <table cellPadding="0" cellSpacing="0" border={0} style={{ width: '100%' }}>
                                                <tbody>
                                                    <tr>
                                                        <td align="center">
                                                            <a href="https://newpharmia-production.up.railway.app/#/pricing" className="cta-button" style={{ 
                                                                display: 'inline-block',
                                                                backgroundColor: '#0d9488', 
                                                                color: '#ffffff', 
                                                                padding: '14px 28px', 
                                                                borderRadius: '8px', 
                                                                textDecoration: 'none', 
                                                                fontWeight: 'bold',
                                                                fontSize: '16px'
                                                            }}>
                                                                Voir les formules d'abonnement
                                                            </a>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </td>
                                    </tr>
                                    {/* Footer */}
                                    <tr>
                                        <td className="footer-text" style={{ backgroundColor: '#f3f4f6', padding: '20px 32px', textAlign: 'center', fontSize: '14px', color: '#6b7280' }}>
                                            <p style={{ marginTop: 0, marginBottom: 8 }}><a href="https://newpharmia-production.up.railway.app/" style={{ color: '#0d9488', textDecoration: 'none', fontWeight: 'bold' }}>PharmIA</a> | By PharmaConseil BMB</p>
                                            <p style={{ margin: 0 }}><a href={`/#/unsubscribe?email={{EMAIL_DESTINATAIRE}}`} style={{ color: '#0d9488', textDecoration: 'none' }}>Se désinscrire</a></p>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </td>
                    </tr>
                </tbody>
            </table>
        </>
    );
};


interface FormalGroup {
  _id: string;
  name: string;
  memberCount?: number; // Ajouté pour afficher le nombre de membres si disponible
}

interface Group {
  name: string;
  count: number;
}

const Newsletter: React.FC = () => {
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [sendStatus, setSendStatus] = useState('');
  const [roles, setRoles] = useState<Group[]>([]);
  const [cities, setCities] = useState<Group[]>([]);
  const [statuses, setStatuses] = useState<Group[]>([]);
  const [staff, setStaff] = useState<Group | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [formalGroups, setFormalGroups] = useState<FormalGroup[]>([]);
  const [selectedFormalGroupIds, setSelectedFormalGroupIds] = useState<string[]>([]);
  const [testEmail, setTestEmail] = useState('');
  const [pharmacists, setPharmacists] = useState<{ value: string; label: string }[]>([]);
  const [selectedTestEmails, setSelectedTestEmails] = useState<{ value: string; label: string }[]>([]);
  const [webinars, setWebinars] = useState<{ value: string; label: string; googleMeetLink?: string; description?: string; }[]>([]);
  const [selectedWebinar, setSelectedWebinar] = useState<{ value: string; label: string; googleMeetLink?: string; description?: string; } | null>(null);
  const [expiredTrialUsers, setExpiredTrialUsers] = useState<User[]>([]);
  const [sendToExpired, setSendToExpired] = useState(false);


  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch subscriber groups (existing logic)
        const subscriberResponse = await fetch('/api/newsletter/subscriber-groups');
        if (!subscriberResponse.ok) {
          throw new Error('Failed to fetch subscriber groups');
        }
        const { roles, cities, staff, statuses } = await subscriberResponse.json();
        setRoles(roles);
        setCities(cities);
        setStaff(staff);
        setStatuses(statuses);

        // Fetch formal groups
        const formalGroupsResponse = await fetch('/api/admin/groups');
        if (!formalGroupsResponse.ok) {
          throw new Error('Failed to fetch formal groups');
        }
        const formalGroupsData = await formalGroupsResponse.json();
        setFormalGroups(formalGroupsData);

        // Fetch pharmacists for test email field
        const pharmacistsResponse = await fetch('/api/users/pharmacists');
        if (!pharmacistsResponse.ok) {
            throw new Error('Failed to fetch pharmacists');
        }
        const pharmacistsData = await pharmacistsResponse.json();
        const pharmacistOptions = pharmacistsData.map((p: User) => ({
            value: p.email,
            label: `${p.firstName} ${p.lastName} (${p.email})`
        }));
        setPharmacists(pharmacistOptions);

        // Fetch webinars
        const webinarsResponse = await fetch('/api/webinars');
        if (!webinarsResponse.ok) {
            throw new Error('Failed to fetch webinars');
        }
        const webinarsData = await webinarsResponse.json();
        const webinarOptions = webinarsData.map((w: any) => ({
            value: w._id,
            label: w.title,
            googleMeetLink: w.googleMeetLink,
            description: w.description,
        }));
        setWebinars(webinarOptions);

      } catch (err: any) {
        console.error(err);
      }
    };
    fetchInitialData();
  }, []);

  const handleRoleToggle = (role: string) => {
    setSelectedRoles(prev => 
        prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  const handleCityToggle = (city: string) => {
    setSelectedCities(prev => 
        prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city]
    );
  };

  const handleStatusToggle = (status: string) => {
    setSelectedStatuses(prev =>
        prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const handleFormalGroupToggle = (groupId: string) => {
    setSelectedFormalGroupIds(prev =>
      prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
    );
  };

  const handleExpiredTrialToggle = async (checked: boolean) => {
    setSendToExpired(checked);
    if (checked) {
      try {
        const response = await fetch('/api/users/expired-trial');
        if (!response.ok) {
          throw new Error('Failed to fetch expired trial users');
        }
        const users: User[] = await response.json();
        setExpiredTrialUsers(users);
      } catch (err: any) {
        console.error(err);
      }
    } else {
      setExpiredTrialUsers([]);
    }
  };

  const handleSendTest = async () => {
    if (!previewRef.current) {
      setSendStatus('Erreur: Impossible de récupérer le contenu de la prévisualisation.');
      return;
    }
    if (selectedTestEmails.length === 0) {
      setSendStatus('Veuillez sélectionner au moins une adresse e-mail de test.');
      return;
    }

    const testEmails = selectedTestEmails.map(o => o.value);
    const htmlContentToSend = previewRef.current.innerHTML;
    setSendStatus(`Envoi d'un test à ${testEmails.join(', ')}...`);

    console.log('[handleSendTest] Selected Webinar:', selectedWebinar);
    try {
      const response = await fetch('/api/newsletter/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          subject, 
          htmlContent: htmlContentToSend, 
          testEmails,
          webinarId: selectedWebinar ? selectedWebinar.value : null,
          sendToExpired,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Échec de l\'envoi de l\'e-mail de test.');
      }
      setSendStatus(data.message || 'E-mail de test envoyé avec succès.');
    } catch (error: any) {
      console.error("Error sending test newsletter:", error);
      setSendStatus(error.message || 'Erreur lors de l\'envoi de l\'e-mail de test.');
    } finally {
      setTimeout(() => setSendStatus(''), 5000);
    }
  };

  const insertTag = (tag: string) => {
    if (contentRef.current) {
      const { selectionStart, selectionEnd, value } = contentRef.current;
      const newContent = 
        value.substring(0, selectionStart) + `{{${tag}}}` + value.substring(selectionEnd);
      setContent(newContent);
      setTimeout(() => {
        if (contentRef.current) {
          contentRef.current.focus();
          const newCursorPosition = selectionStart + tag.length + 4;
          contentRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
        }
      }, 0);
    }
  };

  const handleSend = async () => {
    if (!previewRef.current) {
      setSendStatus('Erreur: Impossible de récupérer le contenu de la prévisualisation.');
      return;
    }
    const htmlContentToSend = previewRef.current.innerHTML;
    setSendStatus('Envoi en cours...');

    try {
      const response = await fetch('/api/newsletter/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          subject, 
          htmlContent: htmlContentToSend, 
          roles: selectedRoles, 
          cities: selectedCities, 
          statuses: selectedStatuses, 
          formalGroupIds: selectedFormalGroupIds,
          webinarId: selectedWebinar ? selectedWebinar.value : null,
          googleMeetLink: selectedWebinar ? selectedWebinar.googleMeetLink : null,
          sendToExpired,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Échec de l\'envoi de la newsletter.');
      }
      setSendStatus(data.message || "Newsletter envoyée avec succès.");
    } catch (error: any) {
      console.error("Error sending newsletter:", error);
      setSendStatus(error.message || 'Erreur lors de l\'envoi de la newsletter.');
    } finally {
      setTimeout(() => setSendStatus(''), 5000);
    }
  };

  const formatContentForHtml = (text: string) => {
    return `
      ${text.split('\n').join('<br />')}
      
    `;
  };

  const templates: Template[] = [
      { id: 'simple', name: 'Simple', component: SimpleTemplate },
      { id: 'expired-trial', name: 'Relance Essai Expiré', component: ExpiredTrialTemplate }
  ];

  const [selectedTemplate, setSelectedTemplate] = useState<Template>(templates[0]);

  const PreviewComponent = selectedTemplate.component;

  return (
    <div className="mb-4">
        <label htmlFor="template" className="block text-sm font-medium text-gray-700">Template</label>
        <Select
            id="template"
            options={templates.map(t => ({ value: t.id, label: t.name }))}
            defaultValue={{ value: templates[0].id, label: templates[0].name }}
            onChange={(option) => {
                const template = templates.find(t => t.id === option?.value);
                if (template) {
                    setSelectedTemplate(template);
                }
            }}
        />
    </div>
    <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
      <h3 className="text-xl font-bold text-gray-800 mb-3">Création de Newsletter</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="mb-4">
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700">Sujet de l'email</label>
            <input type="text" id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Envoyer aux rôles</label>
            <div className="mt-2 flex flex-wrap gap-2">
                {staff && (
                    <div key={staff.name} className="flex items-center">
                        <input type="checkbox" id={`role-select-${staff.name}`} checked={selectedRoles.includes(staff.name)} onChange={() => handleRoleToggle(staff.name)} className="h-4 w-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500" disabled={!!selectedWebinar} />
                        <label htmlFor={`role-select-${staff.name}`} className="ml-2 text-sm text-gray-700">{staff.name} ({staff.count})</label>
                    </div>
                )}
                {roles.map(role => (
                    <div key={role.name} className="flex items-center">
                        <input type="checkbox" id={`role-select-${role.name}`} checked={selectedRoles.includes(role.name)} onChange={() => handleRoleToggle(role.name)} className="h-4 w-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500" disabled={!!selectedWebinar} />
                        <label htmlFor={`role-select-${role.name}`} className="ml-2 text-sm text-gray-700">{role.name} ({role.count})</label>
                    </div>
                ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Envoyer par Statut CRM</label>
            <div className="mt-2 flex flex-wrap gap-2">
                {statuses.map(status => (
                    <div key={status.name} className="flex items-center">
                        <input type="checkbox" id={`status-select-${status.name}`} checked={selectedStatuses.includes(status.name)} onChange={() => handleStatusToggle(status.name)} className="h-4 w-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500" disabled={!!selectedWebinar} />
                        <label htmlFor={`status-select-${status.name}`} className="ml-2 text-sm text-gray-700">{status.name} ({status.count})</label>
                    </div>
                ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Envoyer aux villes</label>
            <Select
              isMulti
              options={cities.map(c => ({ value: c.name, label: `${c.name} (${c.count})` }))}
              onChange={(selectedOptions) => {
                setSelectedCities(selectedOptions.map(o => o.value));
              }}
              className="mt-1"
              placeholder="Sélectionner des villes..."
              isDisabled={!!selectedWebinar}
            />
            <p className="text-xs text-gray-500 mt-1">Si aucun groupe n'est sélectionné, la newsletter sera envoyée à tous les abonnés.</p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Envoyer aux groupes formels</label>
            <Select
              isMulti
              options={formalGroups.map(g => ({ value: g._id, label: `${g.name} ${g.memberCount ? `(${g.memberCount})` : ''}` }))}
              onChange={(selectedOptions) => {
                setSelectedFormalGroupIds(selectedOptions.map(o => o.value));
              }}
              className="mt-1"
              placeholder="Sélectionner des groupes..."
              isDisabled={!!selectedWebinar}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Envoyer aux apprenants à période expirée</label>
            <div className="mt-2 flex items-center">
                <input type="checkbox" id="expired-trial-select" checked={sendToExpired} onChange={(e) => handleExpiredTrialToggle(e.target.checked)} className="h-4 w-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500" disabled={!!selectedWebinar} />
                <label htmlFor="expired-trial-select" className="ml-2 text-sm text-gray-700">Apprenants à période expirée ({expiredTrialUsers.length})</label>
            </div>
          </div>

          <div className="mb-4 p-4 border-t border-b border-gray-200">
            <label className="block text-sm font-medium text-gray-700">Ou envoyer aux participants d'un webinaire</label>
            <Select
              options={webinars}
              isClearable
              onChange={(selectedOption) => {
                setSelectedWebinar(selectedOption);
                if (selectedOption) {
                  // Clear other selections
                  setSelectedRoles([]);
                  setSelectedCities([]);
                  setSelectedStatuses([]);
                  setSelectedFormalGroupIds([]);
                  // Set content to webinar description and add meeting link
                  setContent(`${selectedOption.description}\n\nRejoignez-nous via ce lien : {{LIEN_MEETING}}`);
                  // Also set subject to webinar title
                  setSubject(selectedOption.label);
                } else {
                  // Clear content if no webinar is selected
                  setContent('');
                  setSubject('');
                }
              }}
              className="mt-1"
              placeholder="Sélectionner un webinaire..."
            />
             <p className="text-xs text-gray-500 mt-1">Ceci désactivera les autres options de ciblage.</p>
          </div>

          <div className="mb-4">
            <label htmlFor="content" className="block text-sm font-medium text-gray-700">Contenu de la newsletter</label>
            <div className="mt-1 mb-2 flex flex-wrap gap-2">
              <button onClick={() => insertTag('NOM_DESTINATAIRE')} className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300">Nom du destinataire</button>
              <button onClick={() => insertTag('YOUTUBE_VIDEO')} className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300">Vidéo YouTube</button>
              <button onClick={() => insertTag('IMAGE_URL')} className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300">Image URL</button>
              {selectedWebinar && (
                <button onClick={() => insertTag('WEBINAR_DESCRIPTION')} className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300">Description Webinaire</button>
              )}
            </div>
            <textarea ref={contentRef} id="content" rows={10} value={content} onChange={(e) => setContent(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" placeholder="Écrivez votre contenu ici..." />
          </div>

          <div className="mb-4">
            <label htmlFor="youtubeUrl" className="block text-sm font-medium text-gray-700">URL de la vidéo YouTube (Optionnel)</label>
            <input type="text" id="youtubeUrl" value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" placeholder="https://www.youtube.com/watch?v=..." />
          </div>

          <div className="mb-4">
            <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700">URL de l'image (Optionnel)</label>
            <input type="text" id="imageUrl" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" placeholder="https://example.com/image.jpg" />
          </div>

          <div className="mb-4 p-4 border border-gray-200 rounded-lg">
            <label htmlFor="testEmail" className="block text-sm font-medium text-gray-700">Adresses e-mail de test</label>
            <div className="mt-1 flex gap-2">
                <Select
                    isMulti
                    options={pharmacists}
                    value={selectedTestEmails}
                    onChange={(selectedOptions) => {
                        setSelectedTestEmails(selectedOptions as any);
                    }}
                    className="flex-grow"
                    placeholder="Rechercher des pharmaciens..."
                />
              <button onClick={handleSendTest} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">Envoyer un test</button>
            </div>
          </div>

          <button onClick={handleSend} className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-lg transition-colors w-full">Envoyer la Newsletter</button>
          {sendStatus && <p className="mt-4 text-sm text-gray-600">{sendStatus}</p>}
        </div>

        <div>
          <h4 className="text-lg font-bold text-gray-800 mb-2">Prévisualisation</h4>
          <div className="border rounded-lg overflow-hidden">
            <div className="p-4 bg-gray-100">
              <p className="text-sm text-gray-600">De: Votre Nom &lt;newsletter@pharmia.fr&gt;</p>
              <p className="text-sm text-gray-600">Sujet: {subject}</p>
            </div>
            <div ref={previewRef}>
              <PreviewComponent recipientName="{{NOM_DESTINATAIRE}}" content={formatContentForHtml(content)} youtubeUrl={youtubeUrl} imageUrl={imageUrl} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Newsletter;