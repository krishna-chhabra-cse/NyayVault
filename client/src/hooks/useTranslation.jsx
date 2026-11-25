import { createContext, useContext, useState, useEffect } from 'react';

const translations = {
  en: {
    // Brand & General
    'NyayVault': 'NyayVault',
    'Secure Evidence Portal': 'Secure Evidence Portal',
    'Towards Data-Driven Justice': 'Towards Data-Driven Justice',
    'Secure Cloud Evidence Portal': 'Secure Cloud Evidence Portal',
    'Active Investigations & Evidence Vault': 'Active Investigations & Evidence Vault',
    'Welcome back,': 'Welcome back,',
    'Here is your live evidence custody summary and active proceedings overview.': 'Here is your live evidence custody summary and active proceedings overview.',

    // Navigation
    'Dashboard': 'Dashboard',
    'Cases': 'Cases',
    'Evidence': 'Evidence',
    'Search': 'Search',
    'Analysis': 'Analysis',
    'Timeline': 'Timeline',
    'Audit': 'Audit',
    'Reports': 'Reports',
    'Users': 'Users',
    'Settings': 'Settings',

    // TopHeader
    'Search evidence, cases, people...': 'Search evidence, cases, people...',
    'Investigator': 'Investigator',
    'Magistrate': 'Magistrate',
    'Defense': 'Defense Counsel',
    'Prosecutor': 'Public Prosecutor',
    'Registrar': 'Court Registrar',
    'Sign Out': 'Sign Out',
    'Toggle Language': 'Toggle Language',
    'Switch to Hindi': 'Switch to Hindi',
    'Switch to English': 'Switch to English',

    // Notifications
    'Notifications': 'Notifications',
    'Mark all as read': 'Mark all as read',
    'All': 'All',
    'Unread': 'Unread',
    'No notifications': 'No notifications',
    'All caught up! No unread notifications.': 'All caught up! No unread notifications.',
    'Clear all': 'Clear all',
    'New': 'New',

    // Dashboard Metric Cards
    'Active Cases': 'Active Cases',
    'Total Evidence': 'Total Evidence',
    'Needs Review': 'Needs Review',
    'Team Members': 'Team Members',

    // Active Investigations Table
    'Active Investigations': 'Active Investigations',
    'View All': 'View All',
    'Case ID': 'Case ID',
    'Title': 'Title',
    'Priority': 'Priority',
    'Status': 'Status',
    'Last Updated': 'Last Updated',
    'High': 'High',
    'Medium': 'Medium',
    'Active': 'Active',
    'Review': 'Review',
    'Closed': 'Closed',

    // Recent Evidence
    'Recent Evidence': 'Recent Evidence',
    'Name': 'Name',
    'Type': 'Type',
    'Uploaded At': 'Uploaded At',
    'Verified': 'Verified',
    'Pending': 'Pending',

    // Case Overview
    'Case Overview': 'Case Overview',
    'View Details': 'View Details',
    'Evidence Artifacts': 'Evidence Artifacts',
    'Processing': 'Processing',
    'Under Review': 'Under Review',

    // Quick Actions
    'Quick Actions': 'Quick Actions',
    'Create Case': 'Create Case',
    'Upload Evidence': 'Upload Evidence',
    'Run Analysis': 'Run Analysis',
    'Generate Report': 'Generate Report',
    'Share Case': 'Share Case',

    // Evidence Activity
    'Evidence Activity': 'Evidence Activity',
    'Evidence verified': 'Evidence verified',
    'Document uploaded': 'Document uploaded',
    'Report accessed': 'Report accessed',
    'Chain of custody updated': 'Chain of custody updated',
    'Case updated': 'Case updated',

    // System Status Bar
    'System Status:': 'System Status:',
    'All Systems Operational': 'All Systems Operational',
    'Storage:': 'Storage:',
    'Processing:': 'Processing:',
    'AI Services:': 'AI Services:',
    'Integrity:': 'Integrity:',
    'Operational': 'Operational',
    'Last Checked:': 'Last Checked:',

    // Create Case Modal
    'Create New Case Docket': 'Create New Case Docket',
    'Case Number': 'Case Number',
    'Description': 'Description',
    'Cancel': 'Cancel',
    'Create Docket': 'Create Docket',
    'Brief summary of the incident and seized devices/exhibits...': 'Brief summary of the incident and seized devices/exhibits...',

    // Case Vault / List
    'Active Investigation Vaults': 'Active Investigation Vaults',
    'Select an investigation file to access evidence, transcripts, and cryptographic audits.': 'Select an investigation file to access evidence, transcripts, and cryptographic audits.',
    'Open New Case File': 'Open New Case File',
    'Access Vault': 'Access Vault',
    'No active cases found.': 'No active cases found.',
    'Open a new case file to start digitizing evidence.': 'Open a new case file to start digitizing evidence.',

    // Global Evidence Vault
    'Global Evidence Vault': 'Global Evidence Vault',
    'Centralized repository of all seized artifacts, digital exhibits, FIRs, and forensic records with live cryptographic SHA-256 chain of custody.': 'Centralized repository of all seized artifacts, digital exhibits, FIRs, and forensic records with live cryptographic SHA-256 chain of custody.',
    'Search evidence by name, case number, badge, or hash...': 'Search evidence by name, case number, badge, or hash...',
    'All Categories': 'All Categories',
    'All Statuses': 'All Statuses',
    'Tamper-Free Verified': 'Tamper-Free Verified',
    'Forensic Media': 'Forensic Media',
    'BSA Sec 63 Certified': 'BSA Sec 63 Certified',
    'Inspect & Intel': 'Inspect & Intel',
    'Sec 63 Cert': 'Sec 63 Cert',
    'Verify SHA-256': 'Verify SHA-256',
    'Copy Hash': 'Copy Hash',
    'Copied!': 'Copied!',
    'Open Case Docket': 'Open Case Docket',
    'No evidence files found matching your filters.': 'No evidence files found matching your filters.',
    'All Evidence': 'All Evidence'
  },
  hi: {
    // Brand & General
    'NyayVault': 'न्यायवॉल्ट',
    'Secure Evidence Portal': 'सुरक्षित साक्ष्य पोर्टल',
    'Towards Data-Driven Justice': 'डेटा-आधारित न्याय की ओर',
    'Secure Cloud Evidence Portal': 'सुरक्षित क्लाउड साक्ष्य पोर्टल',
    'Active Investigations & Evidence Vault': 'सक्रिय जांच एवं साक्ष्य वॉल्ट',
    'Welcome back,': 'स्वागत है,',
    'Here is your live evidence custody summary and active proceedings overview.': 'यहाँ आपका लाइव साक्ष्य कस्टडी सारांश और सक्रिय कार्यवाही का अवलोकन है।',

    // Navigation
    'Dashboard': 'डैशबोर्ड',
    'Cases': 'मामले',
    'Evidence': 'साक्ष्य',
    'Search': 'खोज',
    'Analysis': 'विश्लेषण',
    'Timeline': 'समय-रेखा',
    'Audit': 'ऑडिट',
    'Reports': 'रिपोर्ट',
    'Users': 'उपयोगकर्ता',
    'Settings': 'सेटिंग्स',

    // TopHeader
    'Search evidence, cases, people...': 'साक्ष्य, मामले, लोग खोजें...',
    'Investigator': 'जांच अधिकारी',
    'Magistrate': 'मजिस्ट्रेट',
    'Defense': 'बचाव पक्ष',
    'Prosecutor': 'सरकारी अभियोजक',
    'Registrar': 'न्यायालय रजिस्ट्रार',
    'Sign Out': 'लॉग आउट',
    'Toggle Language': 'भाषा बदलें',
    'Switch to Hindi': 'हिन्दी में बदलें',
    'Switch to English': 'अंग्रेजी में बदलें',

    // Notifications
    'Notifications': 'सूचनाएं',
    'Mark all as read': 'सभी पढ़े गए चिह्नित करें',
    'All': 'सभी',
    'Unread': 'अपठित',
    'No notifications': 'कोई नई सूचना नहीं',
    'All caught up! No unread notifications.': 'सब अद्यतित है! कोई अपठित सूचना नहीं।',
    'Clear all': 'सभी हटाएं',
    'New': 'नई',

    // Dashboard Metric Cards
    'Active Cases': 'सक्रिय मामले',
    'Total Evidence': 'कुल साक्ष्य',
    'Needs Review': 'समीक्षा आवश्यक',
    'Team Members': 'दल के सदस्य',

    // Active Investigations Table
    'Active Investigations': 'सक्रिय जांच सूची',
    'View All': 'सभी देखें',
    'Case ID': 'केस संख्या',
    'Title': 'शीर्षक',
    'Priority': 'प्राथमिकता',
    'Status': 'स्थिति',
    'Last Updated': 'अंतिम अपडेट',
    'High': 'उच्च',
    'Medium': 'मध्यम',
    'Active': 'सक्रिय',
    'Review': 'समीक्षा',
    'Closed': 'बंद',

    // Recent Evidence
    'Recent Evidence': 'हालिया साक्ष्य',
    'Name': 'नाम',
    'Type': 'प्रकार',
    'Uploaded At': 'अपलोड समय',
    'Verified': 'सत्यापित',
    'Pending': 'लंबित',

    // Case Overview
    'Case Overview': 'मामला विवरण',
    'View Details': 'विवरण देखें',
    'Evidence Artifacts': 'साक्ष्य सामग्री',
    'Processing': 'प्रोसेसिंग',
    'Under Review': 'समीक्षाधीन',

    // Quick Actions
    'Quick Actions': 'त्वरित कार्य',
    'Create Case': 'नया मामला बनाएं',
    'Upload Evidence': 'साक्ष्य अपलोड करें',
    'Run Analysis': 'विश्लेषण चलाएं',
    'Generate Report': 'रिपोर्ट बनाएं',
    'Share Case': 'मामला साझा करें',

    // Evidence Activity
    'Evidence Activity': 'साक्ष्य गतिविधि',
    'Evidence verified': 'साक्ष्य सत्यापित',
    'Document uploaded': 'दस्तावेज़ अपलोड हुआ',
    'Report accessed': 'रिपोर्ट देखी गई',
    'Chain of custody updated': 'कस्टडी श्रृंखला अपडेट हुई',
    'Case updated': 'मामला अपडेट हुआ',

    // System Status Bar
    'System Status:': 'सिस्टम स्थिति:',
    'All Systems Operational': 'सभी प्रणालियां सक्रिय',
    'Storage:': 'भंडारण:',
    'Processing:': 'प्रोसेसिंग:',
    'AI Services:': 'एआई सेवाएं:',
    'Integrity:': 'अखंडता:',
    'Operational': 'सक्रिय',
    'Last Checked:': 'अंतिम जांच:',

    // Create Case Modal
    'Create New Case Docket': 'नया केस डॉकेट बनाएं',
    'Case Number': 'केस संख्या',
    'Description': 'विवरण',
    'Cancel': 'रद्द करें',
    'Create Docket': 'डॉकेट बनाएं',
    'Brief summary of the incident and seized devices/exhibits...': 'घटना और जब्त उपकरणों/प्रदर्शों का संक्षिप्त विवरण...',

    // Case Vault / List
    'Active Investigation Vaults': 'सक्रिय जांच वॉल्ट',
    'Select an investigation file to access evidence, transcripts, and cryptographic audits.': 'साक्ष्य, प्रतिलेख और क्रिप्टोग्राफिक ऑडिट देखने के लिए एक जांच फाइल चुनें।',
    'Open New Case File': 'नई केस फाइल खोलें',
    'Access Vault': 'वॉल्ट खोलें',
    'No active cases found.': 'कोई सक्रिय मामला नहीं मिला।',
    'Open a new case file to start digitizing evidence.': 'साक्ष्य डिजिटाइज़ करने के लिए एक नई केस फाइल खोलें।',

    // Global Evidence Vault
    'Global Evidence Vault': 'ग्लोबल साक्ष्य वॉल्ट',
    'Centralized repository of all seized artifacts, digital exhibits, FIRs, and forensic records with live cryptographic SHA-256 chain of custody.': 'लाइव क्रिप्टोग्राफिक SHA-256 कस्टडी श्रृंखला के साथ सभी जब्त सामग्री, डिजिटल साक्ष्य, एफआईआर और फोरेंसिक रिकॉर्ड का केंद्रीकृत भंडार।',
    'Search evidence by name, case number, badge, or hash...': 'नाम, केस नंबर, बैज या हैश द्वारा साक्ष्य खोजें...',
    'All Categories': 'सभी श्रेणियां',
    'All Statuses': 'सभी स्थितियां',
    'Tamper-Free Verified': 'सत्यापित अखंडता',
    'Forensic Media': 'फोरेंसिक मीडिया',
    'BSA Sec 63 Certified': 'बीएसए धारा 63 प्रमाणित',
    'Inspect & Intel': 'निरीक्षण एवं विश्लेषण',
    'Sec 63 Cert': 'धारा 63 प्रमाण',
    'Verify SHA-256': 'SHA-256 सत्यापित करें',
    'Copy Hash': 'हैश कॉपी करें',
    'Copied!': 'कॉपी किया!',
    'Open Case Docket': 'केस फ़ाइल खोलें',
    'No evidence files found matching your filters.': 'आपके फ़िल्टर से मेल खाती कोई साक्ष्य फ़ाइल नहीं मिली।',
    'All Evidence': 'सभी साक्ष्य'
  }
};

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('nv_language') || 'en';
  });

  useEffect(() => {
    localStorage.setItem('nv_language', language);
  }, [language]);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'hi' : 'en');
  };

  const t = (key) => {
    if (!translations[language]) return key;
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    return { language: 'en', setLanguage: () => {}, toggleLanguage: () => {}, t: (k) => k };
  }
  return context;
};
