import Icon from '../../components/Icon';
export default function NetworkErrorScreen() {
  return (
    <div className="screen-container min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-8"><Icon name="wifi_off" size={36} className="text-red-400"/></div>
      <h1 className="font-syne text-text-primary text-2xl font-bold text-center mb-3">No Connection</h1>
      <p className="text-text-secondary text-base text-center max-w-[280px] mb-8">Check your internet connection and try again.</p>
      <button onClick={()=>window.location.reload()} className="btn-primary w-full max-w-[360px] py-4 rounded-2xl text-lg font-bold">Retry</button>
    </div>);
}
