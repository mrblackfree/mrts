// Entry of the static preview bundle (scripts/build-preview.mjs): the same Workspace the Next app renders, mounted
// in the browser with no server behind it.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Workspace from '@/components/Workspace';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Workspace />
  </StrictMode>,
);
