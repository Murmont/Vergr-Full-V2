import { createContext, useContext, useState } from 'react';

const LayoutContext = createContext(null);

export function LayoutProvider({ children }) {
  const [rightPanel, setRightPanel] = useState(null);
  const [contentAlign, setContentAlign] = useState('center');
  const [layout, setLayout] = useState('standard');

  return (
    <LayoutContext.Provider
      value={{
        rightPanel,
        setRightPanel,
        contentAlign,
        setContentAlign,
        layout,
        setLayout,
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
}

export const useLayout = () => {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error('useLayout must be used within LayoutProvider');
  return ctx;
};