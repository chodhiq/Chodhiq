'use client';

import { createContext, useContext, useEffect, type Dispatch, type SetStateAction } from 'react';

export const AdminTitleContext = createContext<Dispatch<SetStateAction<string>> | null>(null);

export function useAdminPageTitle(title: string) {
  const setTitle = useContext(AdminTitleContext);
  useEffect(() => {
    setTitle?.(title);
  }, [setTitle, title]);
}
