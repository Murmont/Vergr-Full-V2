import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';
import { useLayout } from '../../context/LayoutContext';
import useResponsive from '../../hooks/useResponsive';
export default function PrivacyPolicyScreen() {
  const { isDesktop } = useResponsive();
  const { setRightPanel, setContentAlign } = useLayout();

  useEffect(() => {
    setRightPanel(null);
    if (isDesktop) setContentAlign('left');
    return () => { setRightPanel(null); setContentAlign('center'); };
  }, [setRightPanel, setContentAlign, isDesktop]);
  const navigate = useNavigate();
  const sections = [
    {title:'Information We Collect',content:'We collect information you provide directly, such as your profile details, posts, and messages. We also collect usage data to improve our services.'},
    {title:'How We Use Your Information',content:'Your information is used to provide and improve VERGR services, personalize your experience, and communicate with you about updates and features.'},
    {title:'Data Sharing',content:'We do not sell your personal data. We may share data with service providers who help us operate the platform, subject to strict confidentiality agreements.'},
    {title:'Your Rights',content:'You have the right to access, correct, or delete your personal data. You can export your data or request account deletion from Settings.'},
    {title:'Security',content:'We implement industry-standard security measures to protect your data, including encryption in transit and at rest.'},
    {title:'Contact Us',content:'For privacy inquiries, contact us at privacy@vergr.gg'},
  ];
  return (
    <div className={isDesktop ? "min-h-screen flex flex-col" : "screen-container min-h-screen flex flex-col"}>
      <header className="flex items-center gap-3 px-5 pt-12 pb-4"><button onClick={()=>navigate(-1)} className="text-white/80"><Icon name="arrow_back" size={24}/></button><h1 className="text-white font-syne font-bold text-lg">Privacy Policy</h1></header>
      <main className="flex-1 px-5 pb-8 overflow-y-auto">
        <p className="text-text-secondary text-xs mb-6">Last updated: March 2026</p>
        {sections.map(s=>(
          <div key={s.title} className="mb-6"><h3 className="text-white font-bold mb-2">{s.title}</h3><p className="text-text-secondary text-sm leading-relaxed">{s.content}</p></div>))}
      </main>
    </div>);
}
