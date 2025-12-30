
export const ICONS = {
    'ordonnance': '14.png',
    'analyseOrdonnance': '15.png',
    'conseilsTraitement': '18.png',
    'informationsMaladie': '16.png',
    'conseilsHygieneDeVie': '20.png',
    'conseilsAlimentaires': '21.png',
    'ventesAdditionnelles': '19.png',
    'references': '22.png',
    'patientSituation': '14.png',
    'keyQuestions': '15.png',
    'pathologyOverview': '16.png',
    'redFlags': '17.png',
    'mainTreatment': '18.png',
    'associatedProducts': '19.png',
    'lifestyleAdvice': '20.png',
    'dietaryAdvice': '21.png',
    'memo': '9.png',
    'flashcards': '10.png',
    'quiz': 'quiz-2.png',
    'kahoot': 'icons8-kahoot-48.png',
    'glossary': '12.png',
    'media': '13.png',
    'diaporama': '13.png',
    'video-explainer': '13.png',
};

export function getIconUrl(iconName: keyof typeof ICONS): string {
    const baseUrl = "https://pharmaconseilbmb.com/photos/site/icone/";
    const quizBaseUrl = "https://pharmaconseilbmb.com/photos/site/";
    const kahootBaseUrl = "https://pharmaconseilbmb.com/photos/site/";

    if (iconName === 'quiz') {
        return `${quizBaseUrl}${ICONS[iconName]}`;
    }
    if (iconName === 'kahoot') {
        return `${kahootBaseUrl}${ICONS[iconName]}`;
    }
    return `${baseUrl}${ICONS[iconName]}`;
}
