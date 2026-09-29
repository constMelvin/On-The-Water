import { Icon } from '@/components/otw';

/** Cream box with rosy-dark text and border. Renders nothing when there is no error. */
export function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p className="ferr" role="alert">
      <Icon name="alert" size={18} />
      {error}
    </p>
  );
}
