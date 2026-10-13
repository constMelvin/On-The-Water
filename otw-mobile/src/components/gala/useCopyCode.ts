import * as Clipboard from 'expo-clipboard';
import { useGala } from '@/lib/otw/gala-store';
import { burst, toast } from '@/lib/otw/feedback';

/** Copies the gala code, then toast + sparkle (same as the web). */
export function useCopyCode() {
  const { gala } = useGala();
  return () => {
    void Clipboard.setStringAsync(gala.code);
    toast('Gala code copied.');
    burst();
  };
}
