import React, { createContext, useContext } from 'react';

const HandleLabelsContext = createContext();

export const HandleLabelsProvider = ({ children, showHandleLabels }) => {
  return (
    <HandleLabelsContext.Provider value={showHandleLabels}>
      {children}
    </HandleLabelsContext.Provider>
  );
};

export const useHandleLabels = () => {
  return useContext(HandleLabelsContext);
};