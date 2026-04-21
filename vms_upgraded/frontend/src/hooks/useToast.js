import { useState, useCallback } from 'react';

const useToast = () => {
  const [toast, setToast] = useState(null);

  const show = useCallback((message, type = 'success', duration = 3500) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), duration);
  }, []);

  const hide = useCallback(() => setToast(null), []);

  return { toast, show, hide };
};

export default useToast;
