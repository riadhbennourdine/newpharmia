import React, { useState, useRef, useEffect } from 'react';

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
                  <div class="main-content-text" style={{ lineHeight: 1.8, color: '#4b5563', margin: 0, fontSize: '16px', fontFamily: 'Poppins, Arial, sans-serif' }} dangerouslySetInnerHTML={{ __html: content }}></div>
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

  useEffect(() => {
    const fetchSubscriberGroupsAndFormalGroups = async () => {
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

      } catch (err: any) {
        console.error(err);
      }
    };
    fetchSubscriberGroupsAndFormalGroups();
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

  const handleSendTest = async () => {
    if (!previewRef.current) {
      setSendStatus('Erreur: Impossible de récupérer le contenu de la prévisualisation.');
      return;
    }
    if (!testEmail || !/\S+@\S+\.\S+/.test(testEmail)) {
      setSendStatus('Veuillez entrer une adresse e-mail de test valide.');
      return;
    }

    const htmlContentToSend = previewRef.current.innerHTML;
    setSendStatus(`Envoi d'un test à ${testEmail}...`);

    try {
      const response = await fetch('/api/newsletter/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, htmlContent: htmlContentToSend, testEmail }),
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
        body: JSON.stringify({ subject, htmlContent: htmlContentToSend, roles: selectedRoles, cities: selectedCities, statuses: selectedStatuses, formalGroupIds: selectedFormalGroupIds }),
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

  const PreviewComponent = SimpleTemplate;

  return (
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
                        <input type="checkbox" id={`role-select-${staff.name}`} checked={selectedRoles.includes(staff.name)} onChange={() => handleRoleToggle(staff.name)} className="h-4 w-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500" />
                        <label htmlFor={`role-select-${staff.name}`} className="ml-2 text-sm text-gray-700">{staff.name} ({staff.count})</label>
                    </div>
                )}
                {roles.map(role => (
                    <div key={role.name} className="flex items-center">
                        <input type="checkbox" id={`role-select-${role.name}`} checked={selectedRoles.includes(role.name)} onChange={() => handleRoleToggle(role.name)} className="h-4 w-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500" />
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
                        <input type="checkbox" id={`status-select-${status.name}`} checked={selectedStatuses.includes(status.name)} onChange={() => handleStatusToggle(status.name)} className="h-4 w-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500" />
                        <label htmlFor={`status-select-${status.name}`} className="ml-2 text-sm text-gray-700">{status.name} ({status.count})</label>
                    </div>
                ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Envoyer aux villes</label>
            <div className="mt-2 flex flex-wrap gap-2">
                {cities.map(city => (
                    <div key={city.name} className="flex items-center">
                        <input type="checkbox" id={`city-select-${city.name}`} checked={selectedCities.includes(city.name)} onChange={() => handleCityToggle(city.name)} className="h-4 w-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500" />
                        <label htmlFor={`city-select-${city.name}`} className="ml-2 text-sm text-gray-700">{city.name} ({city.count})</label>
                    </div>
                ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">Si aucun groupe n'est sélectionné, la newsletter sera envoyée à tous les abonnés.</p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Envoyer aux groupes formels</label>
            <div className="mt-2 flex flex-wrap gap-2">
                {formalGroups.map(group => (
                    <div key={group._id} className="flex items-center">
                        <input type="checkbox" id={`formal-group-select-${group._id}`} checked={selectedFormalGroupIds.includes(group._id)} onChange={() => handleFormalGroupToggle(group._id)} className="h-4 w-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500" />
                        <label htmlFor={`formal-group-select-${group._id}`} className="ml-2 text-sm text-gray-700">{group.name} {group.memberCount ? `(${group.memberCount})` : ''}</label>
                    </div>
                ))}
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="content" className="block text-sm font-medium text-gray-700">Contenu de la newsletter</label>
            <div className="mt-1 mb-2 flex flex-wrap gap-2">
              <button onClick={() => insertTag('NOM_DESTINATAIRE')} className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300">Nom du destinataire</button>
              <button onClick={() => insertTag('YOUTUBE_VIDEO')} className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300">Vidéo YouTube</button>
              <button onClick={() => insertTag('IMAGE_URL')} className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300">Image URL</button>
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
            <label htmlFor="testEmail" className="block text-sm font-medium text-gray-700">Adresse e-mail de test</label>
            <div className="mt-1 flex gap-2">
              <input type="email" id="testEmail" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} className="flex-grow p-2 border border-gray-300 rounded-md" placeholder="test@example.com" />
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