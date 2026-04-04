import Icon from '../../components/Icon';
import VergrLogo from '../../components/VergrLogo';
export default function ForceUpdateScreen() {
  return (
    <div className="screen-container min-h-screen flex flex-col items-center justify-center p-6">
      <VergrLogo size={48}/><div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center my-8"><Icon name="download" size={36} className="text-primary"/></div>
      <h1 className="font-syne text-text-primary text-2xl font-bold text-center mb-3">Update Required</h1>
      <p className="text-text-secondary text-base text-center max-w-[280px] mb-8">A new version of VERGR is available with important improvements and fixes.</p>
      <button className="btn-primary w-full max-w-[360px] py-4 rounded-2xl text-lg font-bold">Update Now</button>
    </div>);
}
