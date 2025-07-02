import { useEffect } from 'react';

export const useBeforeUnloadWarning = (shouldWarn: boolean, message: string = 'You have unsaved changes. Are you sure you want to leave?') => {
  useEffect(() => {
    if (!shouldWarn) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Modern browsers ignore the return value and show their own message
      // but we set it for legacy support
      e.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [shouldWarn, message]);
}; 