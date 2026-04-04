import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';
export default function ActivityLogScreen() {
  const navigate = useNavigate();
  const activities = [
    {icon:'log-in',label:'Logged in from Chrome on MacOS',time:'2m ago',color:'text-primary'},
    {icon:'edit',label:'Updated profile bio',time:'1h ago',color:'text-primary'},
    {icon:'lock',label:'Password changed',time:'2d ago',color:'text-yellow-400'},
    {icon:'link',label:'Connected Discord account',time:'3d ago',color:'text-primary'},
    {icon:'users',label:'Joined squad "Apex Predators"',time:'5d ago',color:'text-primary'},
    {icon:'shield',label:'Enabled 2FA',time:'1w ago',color:'text-green-400'},
  ];
  return (
    <div className="screen-container min-h-screen flex flex-col">
      <header className="flex items-center gap-3 px-5 pt-12 pb-4"><button onClick={()=>navigate(-1)} className="text-white/80"><Icon name="arrow-left" size={24}/></button><h1 className="text-white font-syne font-bold text-lg">Activity Log</h1></header>
      <main className="flex-1 px-5 pb-8">{activities.map((a,i)=>(
        <div key={i} className="flex items-start gap-3 py-4 border-b border-surface-border/30">
          <Icon name={a.icon} size={18} className={a.color}/><div className="flex-1"><p className="text-white text-sm">{a.label}</p><p className="text-text-secondary text-xs">{a.time}</p></div>
        </div>))}</main>
    </div>);
}
