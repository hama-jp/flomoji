import React, { createContext, useContext, ReactNode } from 'react';

const HandleLabelsContext = createContext<boolean>(true);

interface HandleLabelsProviderProps {
  children: ReactNode;
  showHandleLabels: boolean;
}

export const HandleLabelsProvider = ({ children, showHandleLabels }: HandleLabelsProviderProps) => {
  return (
    <HandleLabelsContext.Provider value={showHandleLabels}>
      {children}
    </HandleLabelsContext.Provider>
  );
};

export const useHandleLabels = () => {
  return useContext(HandleLabelsContext);
};