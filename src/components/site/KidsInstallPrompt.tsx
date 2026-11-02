import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const InstallContext = createContext<{ event: InstallEvent | null; standalone: boolean }>({ event: null, standalone: false });

export function KidsInstallPromptProvider({ children }: { children: ReactNode }) {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [standalone, setStandalone] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(display-mode: standalone)');
    const update = () => setStandalone(media.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    const capture = (e: Event) => { e.preventDefault(); setEvent(e as InstallEvent); };
    const installed = () => { setEvent(null); update(); };
    update();
    window.addEventListener('beforeinstallprompt', capture);
    window.addEventListener('appinstalled', installed);
    media.addEventListener('change', update);
    return () => { window.removeEventListener('beforeinstallprompt', capture); window.removeEventListener('appinstalled', installed); media.removeEventListener('change', update); };
  }, []);
  return <InstallContext.Provider value={{ event, standalone }}>{children}</InstallContext.Provider>;
}

export const useKidsInstallPrompt = () => useContext(InstallContext);